import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';
import CarbonScore from '../models/CarbonScore.js';

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

function configured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_SUBJECT);
}

/**
 * Configure web-push VAPID keys (idempotent).
 * @returns {boolean}
 */
export function configureWebPush() {
  if (!configured()) return false;
  webpush.setVapidDetails(process.env.PUSH_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  return true;
}

/**
 * Send a push notification to a subscription.
 * @param {any} subDoc
 * @param {any} payload
 * @returns {Promise<void>}
 */
export async function sendToSubscription(subDoc, payload) {
  configureWebPush();
  await webpush.sendNotification(
    {
      endpoint: subDoc.endpoint,
      keys: subDoc.keys,
    },
    JSON.stringify(payload),
  );
}

/**
 * Send daily score push to all active subscriptions.
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export async function sendDailyScorePush() {
  if (!configureWebPush()) return { sent: 0, failed: 0 };

  const subs = await PushSubscription.find({ isActive: true }).lean();
  let sent = 0;
  let failed = 0;

  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const s of subs) {
    try {
      const user = await User.findById(s.userId).lean();
      if (!user) continue;
      const scoreToday = await CarbonScore.findOne({ userId: s.userId, date: today }).lean();
      const scoreY = await CarbonScore.findOne({ userId: s.userId, date: yesterday }).lean();
      const t = Number(scoreToday?.totalCo2Kg || 0);
      const y = Number(scoreY?.totalCo2Kg || 0);
      const diff = t - y;
      const trend = Math.abs(diff) < 0.25 ? 'stable' : diff < 0 ? 'improving' : 'higher';

      const payload = {
        title: 'CarbonLens — Daily score',
        body: `Today: ${t.toFixed(1)} kg • Yesterday: ${y.toFixed(1)} kg • ${trend}`,
        url: '/dashboard',
        tag: 'carbonlens-daily',
      };

      await sendToSubscription(s, payload);
      sent += 1;
      await PushSubscription.updateOne({ _id: s._id }, { $set: { lastNotifiedAt: new Date() } });
    } catch (err) {
      failed += 1;
      // Deactivate on gone/invalid endpoints
      const code = err?.statusCode || err?.statusCode;
      if (code === 404 || code === 410) {
        await PushSubscription.updateOne({ _id: s._id }, { $set: { isActive: false } });
      }
    }
  }

  return { sent, failed };
}

/**
 * Throttle check for "daily" notifications (avoid multiple sends per day).
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasNotifiedToday(userId) {
  const start = startOfDay(new Date());
  const end = endOfDay(new Date());
  const count = await PushSubscription.countDocuments({
    userId,
    isActive: true,
    lastNotifiedAt: { $gte: start, $lte: end },
  });
  return count > 0;
}

