import Activity from '../models/Activity.js';
import CarbonScore from '../models/CarbonScore.js';
import EmissionFactor from '../models/EmissionFactor.js';
import { updateStreakAndBadges } from './gamification.js';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Resolve emission factor for activityType+region at a point in time.
 * @param {string} activityType
 * @param {string} region
 * @param {Date} at
 * @returns {Promise<{ kgCo2PerUnit: number, unit: string }>}
 */
export async function getEmissionFactor(activityType, region, at) {
  const factor = await EmissionFactor.findOne({
    activityType,
    region,
    validFrom: { $lte: at },
    validTo: { $gte: at },
  })
    .sort({ validFrom: -1 })
    .lean();

  if (!factor) {
    const err = new Error(`No emission factor for ${activityType}/${region}`);
    err.statusCode = 400;
    throw err;
  }

  return { kgCo2PerUnit: factor.kgCo2PerUnit, unit: factor.unit };
}

/**
 * Compute and persist CO2 for a single Activity (updates Activity.co2Kg).
 * @param {import('mongoose').Types.ObjectId|string} activityId
 * @param {string} region
 * @returns {Promise<import('../models/Activity.js').default>}
 */
export async function computeActivityCo2(activityId, region) {
  const act = await Activity.findById(activityId);
  if (!act) {
    const err = new Error('Activity not found');
    err.statusCode = 404;
    throw err;
  }

  const at = act.recordedAt || new Date();
  const efType = act.metadata?.emissionFactorType || (act.unit ? `${act.type}_${act.unit}` : act.type);

  const { kgCo2PerUnit } = await getEmissionFactor(efType, region, at);
  const co2Kg = round2(Number(act.valueRaw) * Number(kgCo2PerUnit));

  act.co2Kg = co2Kg;
  await act.save();
  return act;
}

/**
 * Aggregate activities into a daily CarbonScore and upsert it.
 * trend compares today vs yesterday totals.
 * @param {{ userId: string, region: string }} params
 * @param {Date} date
 * @returns {Promise<import('../models/CarbonScore.js').default>}
 */
export async function upsertDailyCarbonScore(params, date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const acts = await Activity.find({
    userId: params.userId,
    recordedAt: { $gte: dayStart, $lte: dayEnd },
  }).lean();

  const totals = { commute: 0, energy: 0, food: 0, shopping: 0 };
  for (const a of acts) {
    totals[a.type] += Number(a.co2Kg || 0);
  }

  const totalCo2Kg = round2(totals.commute + totals.energy + totals.food + totals.shopping);

  const yesterday = new Date(dayStart);
  yesterday.setDate(yesterday.getDate() - 1);

  const yScore = await CarbonScore.findOne({ userId: params.userId, date: yesterday }).lean();
  const yTotal = Number(yScore?.totalCo2Kg || 0);
  const diff = totalCo2Kg - yTotal;
  const trend = Math.abs(diff) < 0.25 ? 'stable' : diff > 0 ? 'up' : 'down';

  const score = await CarbonScore.findOneAndUpdate(
    { userId: params.userId, date: dayStart },
    {
      $set: {
        totalCo2Kg,
        commuteCo2: round2(totals.commute),
        energyCo2: round2(totals.energy),
        foodCo2: round2(totals.food),
        shoppingCo2: round2(totals.shopping),
        trend,
      },
    },
    { new: true, upsert: true },
  );

  // Best-effort gamification update (streaks/badges). Do not fail scoring if this errors.
  try {
    await updateStreakAndBadges({ userId: String(params.userId), date: dayStart });
  } catch (_e) {}

  return score;
}

