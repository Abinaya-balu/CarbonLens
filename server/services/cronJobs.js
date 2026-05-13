import cron from 'node-cron';
import User from '../models/User.js';
import Integration from '../models/Integration.js';
import CarbonScore from '../models/CarbonScore.js';

import { fetchMockCommuteForDate } from './googleMapsService.js';
import { fetchMockEnergyForDate } from './smartMeterService.js';
import { computeActivityCo2, upsertDailyCarbonScore } from './carbonCalculator.js';
import { generateAndSaveNudges } from './nudgeEngine.js';
import { startJobRun, finishJobRun } from './jobRunLogger.js';
import { markCronRun } from './systemStatus.js';
import { sendDailyScorePush } from './pushService.js';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDayKey(d) {
  const x = startOfDay(d);
  return x.toISOString().slice(0, 10);
}

async function upsertIntegrationSync(userId, provider) {
  await Integration.findOneAndUpdate(
    { userId, provider },
    { $set: { isActive: true, lastSyncedAt: new Date() } },
    { upsert: true, new: true },
  );
}

/**
 * Create an Activity and compute its CO2.
 * @param {any} doc
 * @param {string} region
 * @returns {Promise<any>}
 */
async function createActivityWithCo2(doc, region) {
  const created = await Activity.create(doc);
  await computeActivityCo2(created._id, region);
  return created;
}

/**
 * Run ingestion + scoring for a user for today.
 * @param {import('../models/User.js').default} user
 * @returns {Promise<{ score: any, changedSignificantly: boolean }>}
 */
async function runForUserToday(user) {
  const today = new Date();
  const dayKey = isoDayKey(today);
  let createdCount = 0;

  // Avoid over-inserting: only insert one "sync batch" per 6h slot by checking if we already synced recently.
  // We'll still allow multiple manual inputs throughout day.
  const recentThreshold = new Date(Date.now() - 5.5 * 60 * 60 * 1000);

  if (user.mapsLinked) {
    const integ = await Integration.findOne({ userId: user._id, provider: 'google_maps' }).lean();
    const already = integ?.lastSyncedAt && new Date(integ.lastSyncedAt) > recentThreshold;
    if (!already) {
      const segments = await fetchMockCommuteForDate({ userId: String(user._id), region: user.region }, today);
      for (const seg of segments) {
        await createActivityWithCo2(
          {
            userId: user._id,
            type: 'commute',
            source: 'google_maps',
            valueRaw: seg.distanceKm,
            unit: seg.modeUnit,
            co2Kg: 0,
            metadata: { ...seg.metadata, emissionFactorType: `commute_${seg.modeUnit}` },
            recordedAt: today,
          },
          user.region,
        );
        createdCount += 1;
      }
      await upsertIntegrationSync(user._id, 'google_maps');
    }
  }

  if (user.smartMeterLinked) {
    const integ = await Integration.findOne({ userId: user._id, provider: 'smart_meter' }).lean();
    const already = integ?.lastSyncedAt && new Date(integ.lastSyncedAt) > recentThreshold;
    if (!already) {
      const energy = await fetchMockEnergyForDate({ userId: String(user._id), region: user.region }, today);
      await createActivityWithCo2(
        {
          userId: user._id,
          type: 'energy',
          source: 'smart_meter',
          valueRaw: energy.kwh,
          unit: 'kwh',
          co2Kg: 0,
          metadata: { ...energy.metadata, emissionFactorType: 'energy_kwh' },
          recordedAt: today,
        },
        user.region,
      );
      createdCount += 1;
      await upsertIntegrationSync(user._id, 'smart_meter');
    }
  }

  // Always compute score; compare with previous score value
  const prev = await CarbonScore.findOne({ userId: user._id, date: startOfDay(today) }).lean();
  const prevTotal = Number(prev?.totalCo2Kg || 0);

  const score = await upsertDailyCarbonScore({ userId: String(user._id), region: user.region }, today);
  const nextTotal = Number(score.totalCo2Kg || 0);

  const changedSignificantly = Math.abs(nextTotal - prevTotal) >= 1.0 && dayKey === isoDayKey(new Date(score.date));
  return { score, changedSignificantly, createdCount };
}

/**
 * Start node-cron jobs (every 6 hours).
 * @returns {void}
 */
export function startCronJobs() {
  const expr = process.env.CRON_SCHEDULE || '0 */6 * * *';
  cron.schedule(expr, async () => {
    const sysJob = await startJobRun({
      scope: 'system',
      trigger: 'cron',
      jobType: 'sync_score',
      message: 'Cron cycle',
    });
    try {
      markCronRun(new Date());
      const users = await User.find({ $or: [{ mapsLinked: true }, { smartMeterLinked: true }] }).lean();
      let usersProcessed = 0;
      let usersErrored = 0;
      let recordsIngested = 0;
      let nudgesCreated = 0;
      for (const user of users) {
        const userJob = await startJobRun({
          scope: 'user',
          userId: String(user._id),
          trigger: 'cron',
          jobType: 'sync_score',
          message: 'User cron sync+score',
          metadata: { region: user.region },
        });
        try {
          const { score, changedSignificantly, createdCount } = await runForUserToday(user);
          usersProcessed += 1;
          recordsIngested += Number(createdCount || 0);

          if (!changedSignificantly) {
            await finishJobRun(String(userJob._id), {
              status: 'skipped',
              scoreTotalCo2Kg: Number(score?.totalCo2Kg || 0),
              message: 'Score change below threshold; nudges skipped',
            });
            continue;
          }

          const breakdown = {
            totalCo2Kg: score.totalCo2Kg,
            commuteCo2: score.commuteCo2,
            energyCo2: score.energyCo2,
            foodCo2: score.foodCo2,
            shoppingCo2: score.shoppingCo2,
            trend: score.trend,
          };

          const nudges = await generateAndSaveNudges({
            userId: String(user._id),
            scoreId: String(score._id),
            region: user.region,
            breakdown,
          });
          nudgesCreated += nudges.length;

          await finishJobRun(String(userJob._id), {
            status: 'success',
            nudgesCreated: nudges.length,
            scoreTotalCo2Kg: Number(score?.totalCo2Kg || 0),
            message: `Nudges generated: ${nudges.length}`,
          });
        } catch (err) {
          usersErrored += 1;
          await finishJobRun(String(userJob._id), { status: 'error', error: err, message: 'User cron failed' });
        }
      }
      await finishJobRun(String(sysJob._id), {
        status: 'success',
        recordsIngested,
        nudgesCreated,
        message: `Cron complete: users=${usersProcessed}, errors=${usersErrored}`,
        metadata: { usersProcessed, usersErrored },
      });
      // eslint-disable-next-line no-console
      console.log('[cron] sync+score complete');
    } catch (err) {
      await finishJobRun(String(sysJob._id), { status: 'error', error: err, message: 'Cron cycle failed' });
      // eslint-disable-next-line no-console
      console.error('[cron] failed', err);
    }
  });

  // eslint-disable-next-line no-console
  console.log(`[cron] scheduled: ${expr}`);

  // Daily push at 09:00 local time by default
  const dailyExpr = process.env.PUSH_DAILY_CRON || '0 9 * * *';
  cron.schedule(dailyExpr, async () => {
    const job = await startJobRun({ scope: 'system', trigger: 'cron', jobType: 'nudge', message: 'Daily push' });
    try {
      const res = await sendDailyScorePush();
      await finishJobRun(String(job._id), {
        status: 'success',
        message: `Push sent=${res.sent} failed=${res.failed}`,
        metadata: res,
      });
    } catch (err) {
      await finishJobRun(String(job._id), { status: 'error', error: err, message: 'Daily push failed' });
    }
  });

  // eslint-disable-next-line no-console
  console.log(`[cron] daily push scheduled: ${dailyExpr}`);
}

