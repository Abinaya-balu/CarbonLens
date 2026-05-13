import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import { computeActivityCo2, upsertDailyCarbonScore } from '../services/carbonCalculator.js';
import { fetchMockCommuteForDate } from '../services/googleMapsService.js';
import { fetchMockEnergyForDate } from '../services/smartMeterService.js';
import Integration from '../models/Integration.js';
import CarbonScore from '../models/CarbonScore.js';
import { generateAndSaveNudges } from '../services/nudgeEngine.js';
import { startJobRun, finishJobRun } from '../services/jobRunLogger.js';

const router = express.Router();

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function upsertIntegrationSync(userId, provider) {
  await Integration.findOneAndUpdate(
    { userId, provider },
    { $set: { isActive: true, lastSyncedAt: new Date() } },
    { upsert: true, new: true },
  );
}

function breakdownFromScore(score) {
  return {
    totalCo2Kg: score.totalCo2Kg,
    commuteCo2: score.commuteCo2,
    energyCo2: score.energyCo2,
    foodCo2: score.foodCo2,
    shoppingCo2: score.shoppingCo2,
    trend: score.trend,
  };
}

router.post('/manual', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ success: false, data: null, message: 'User not found' });

    const job = await startJobRun({
      scope: 'user',
      userId: String(req.userId),
      trigger: 'manual',
      jobType: 'sync_score',
      message: 'Manual ingest',
      metadata: { region: user.region },
    });

    const recAt = req.body?.recordedAt ? new Date(req.body.recordedAt) : new Date();
    if (Number.isNaN(recAt.getTime())) {
      return res.status(400).json({ success: false, data: null, message: 'recordedAt is invalid' });
    }

    const prev = await CarbonScore.findOne({ userId: req.userId, date: startOfDay(recAt) }).lean();
    const prevTotal = Number(prev?.totalCo2Kg || 0);

    const { type, valueRaw, unit, metadata, recordedAt } = req.body || {};
    if (!type || valueRaw === undefined || valueRaw === null || !unit) {
      return res
        .status(400)
        .json({ success: false, data: null, message: 'type, valueRaw, unit are required' });
    }

    const emissionFactorType =
      type === 'commute' ? `commute_${unit}` : type === 'energy' ? 'energy_kwh' : `${type}_${unit}`;

    const created = await Activity.create({
      userId: req.userId,
      type,
      source: 'manual',
      valueRaw: Number(valueRaw),
      unit: String(unit),
      co2Kg: 0,
      metadata: { ...(metadata || {}), emissionFactorType },
      recordedAt: recAt,
    });

    await computeActivityCo2(created._id, user.region);
    const score = await upsertDailyCarbonScore({ userId: String(req.userId), region: user.region }, recAt);

    let nudgesCreated = 0;
    if (Math.abs(Number(score.totalCo2Kg || 0) - prevTotal) >= 0.5) {
      const nudges = await generateAndSaveNudges({
        userId: String(req.userId),
        scoreId: String(score._id),
        region: user.region,
        breakdown: breakdownFromScore(score),
      });
      nudgesCreated = nudges.length;
    }

    await finishJobRun(String(job._id), {
      status: 'success',
      recordsIngested: 1,
      nudgesCreated,
      scoreTotalCo2Kg: Number(score.totalCo2Kg || 0),
      message: 'Manual ingest complete',
    });

    return res.json({
      success: true,
      data: { activityId: created._id, score, nudgesCreated },
      message: 'Activity saved',
    });
  } catch (err) {
    try {
      if (req.userId) {
        // best-effort job log on error
        const job = await startJobRun({
          scope: 'user',
          userId: String(req.userId),
          trigger: 'manual',
          jobType: 'sync_score',
          message: 'Manual ingest failed (log)',
        });
        await finishJobRun(String(job._id), { status: 'error', error: err });
      }
    } catch (_e) {}
    next(err);
  }
});

router.get('/sync', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, data: null, message: 'User not found' });

    const job = await startJobRun({
      scope: 'user',
      userId: String(req.userId),
      trigger: 'manual',
      jobType: 'sync_score',
      message: 'Manual sync (mock providers)',
      metadata: { region: user.region },
    });

    const today = new Date();
    const prev = await CarbonScore.findOne({ userId: req.userId, date: startOfDay(today) }).lean();
    const prevTotal = Number(prev?.totalCo2Kg || 0);
    const createdIds = [];

    if (user.mapsLinked) {
      const segments = await fetchMockCommuteForDate({ userId: String(user._id), region: user.region }, today);
      for (const seg of segments) {
        const a = await Activity.create({
          userId: user._id,
          type: 'commute',
          source: 'google_maps',
          valueRaw: seg.distanceKm,
          unit: seg.modeUnit,
          co2Kg: 0,
          metadata: { ...seg.metadata, emissionFactorType: `commute_${seg.modeUnit}` },
          recordedAt: today,
        });
        await computeActivityCo2(a._id, user.region);
        createdIds.push(a._id);
      }
      await upsertIntegrationSync(user._id, 'google_maps');
    }

    if (user.smartMeterLinked) {
      const energy = await fetchMockEnergyForDate({ userId: String(user._id), region: user.region }, today);
      const a = await Activity.create({
        userId: user._id,
        type: 'energy',
        source: 'smart_meter',
        valueRaw: energy.kwh,
        unit: 'kwh',
        co2Kg: 0,
        metadata: { ...energy.metadata, emissionFactorType: 'energy_kwh' },
        recordedAt: today,
      });
      await computeActivityCo2(a._id, user.region);
      createdIds.push(a._id);
      await upsertIntegrationSync(user._id, 'smart_meter');
    }

    const score = await upsertDailyCarbonScore({ userId: String(user._id), region: user.region }, today);

    let nudgesCreated = 0;
    if (Math.abs(Number(score.totalCo2Kg || 0) - prevTotal) >= 0.5) {
      const nudges = await generateAndSaveNudges({
        userId: String(user._id),
        scoreId: String(score._id),
        region: user.region,
        breakdown: breakdownFromScore(score),
      });
      nudgesCreated = nudges.length;
    }

    await finishJobRun(String(job._id), {
      status: 'success',
      recordsIngested: createdIds.length,
      nudgesCreated,
      scoreTotalCo2Kg: Number(score.totalCo2Kg || 0),
      message: 'Manual sync complete',
    });

    return res.json({
      success: true,
      data: { created: createdIds.length, createdIds, score, nudgesCreated, date: startOfDay(today) },
      message: 'Sync complete',
    });
  } catch (err) {
    try {
      if (req.userId) {
        const job = await startJobRun({
          scope: 'user',
          userId: String(req.userId),
          trigger: 'manual',
          jobType: 'sync_score',
          message: 'Manual sync failed (log)',
        });
        await finishJobRun(String(job._id), { status: 'error', error: err });
      }
    } catch (_e) {}
    next(err);
  }
});

export default router;

