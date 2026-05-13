import User from '../models/User.js';
import CarbonScore from '../models/CarbonScore.js';
import Activity from '../models/Activity.js';
import Achievement from '../models/Achievement.js';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d) {
  return startOfDay(d).toISOString().slice(0, 10);
}

async function awardOnce(userId, key, name, description, metadata = {}) {
  try {
    await Achievement.create({ userId, key, name, description, earnedAt: new Date(), metadata });
    return true;
  } catch (_e) {
    return false; // unique index prevents duplicates
  }
}

/**
 * Update streak + award achievements from today's score/activities.
 * @param {{ userId: string, date: Date }} params
 * @returns {Promise<{ streakDays: number, earned: string[] }>}
 */
export async function updateStreakAndBadges(params) {
  const user = await User.findById(params.userId);
  if (!user) return { streakDays: 0, earned: [] };

  const date = startOfDay(params.date || new Date());
  const score = await CarbonScore.findOne({ userId: user._id, date }).lean();
  if (!score) return { streakDays: user.streakDays || 0, earned: [] };

  const target = Number(user.dailyTargetKg || 5);
  const isUnder = Number(score.totalCo2Kg || 0) <= target;

  const earned = [];
  const lastKey = user.lastStreakDate ? dayKey(user.lastStreakDate) : null;
  const todayKey = dayKey(date);

  if (isUnder) {
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = dayKey(yesterday);
    const nextStreak = lastKey === yKey ? Number(user.streakDays || 0) + 1 : lastKey === todayKey ? Number(user.streakDays || 0) : 1;
    user.streakDays = nextStreak;
    user.lastStreakDate = date;
  } else if (lastKey !== todayKey) {
    // break streak on first over-target day (idempotent for same day)
    user.streakDays = 0;
    user.lastStreakDate = date;
  }

  await user.save();

  // Badges
  if (user.streakDays >= 3) {
    if (await awardOnce(user._id, 'streak_3', 'Green Starter', '3 consecutive days under your daily target.')) {
      earned.push('streak_3');
    }
  }
  if (user.streakDays >= 7) {
    if (await awardOnce(user._id, 'green_week', 'Green Week', '7 consecutive days under your daily target.')) {
      earned.push('green_week');
    }
  }

  // Metro Warrior: 7 days with no car commute activities
  const last7Start = new Date(date);
  last7Start.setDate(last7Start.getDate() - 6);
  const carCommutes = await Activity.countDocuments({
    userId: user._id,
    type: 'commute',
    unit: 'car_km',
    recordedAt: { $gte: startOfDay(last7Start), $lte: new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1) },
  });
  if (carCommutes === 0) {
    if (await awardOnce(user._id, 'metro_warrior', 'Metro Warrior', '7 days with no car commute logged.')) {
      earned.push('metro_warrior');
    }
  }

  // Night Saver: low energy for 5 days in last 7 (proxy via energyCo2)
  const scores7 = await CarbonScore.find({
    userId: user._id,
    date: { $gte: startOfDay(last7Start), $lte: date },
  }).lean();
  const energyLowDays = scores7.filter((s) => Number(s.energyCo2 || 0) <= 3.5).length;
  if (energyLowDays >= 5) {
    if (await awardOnce(user._id, 'night_saver', 'Night Saver', '5 days with lower home energy emissions in the last week.')) {
      earned.push('night_saver');
    }
  }

  return { streakDays: user.streakDays || 0, earned };
}

