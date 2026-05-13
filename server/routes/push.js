import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import PushSubscription from '../models/PushSubscription.js';
import { configureWebPush, sendToSubscription } from '../services/pushService.js';

const router = express.Router();

router.get('/vapidPublicKey', requireAuth, async (_req, res) => {
  return res.json({
    success: true,
    data: {
      enabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_SUBJECT),
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    },
    message: 'OK',
  });
});

router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint, keys, userAgent } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, data: null, message: 'Invalid subscription' });
    }

    await PushSubscription.findOneAndUpdate(
      { userId: req.userId, endpoint },
      {
        $set: {
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          userAgent: userAgent || '',
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );

    return res.json({ success: true, data: { subscribed: true }, message: 'Subscribed' });
  } catch (err) {
    next(err);
  }
});

router.post('/test', requireAuth, async (req, res, next) => {
  try {
    if (!configureWebPush()) {
      return res.status(400).json({ success: false, data: null, message: 'Push is not configured (VAPID keys missing)' });
    }
    const sub = await PushSubscription.findOne({ userId: req.userId, isActive: true }).lean();
    if (!sub) return res.status(404).json({ success: false, data: null, message: 'No active subscription found' });

    await sendToSubscription(sub, {
      title: 'CarbonLens — Test notification',
      body: 'Push notifications are working.',
      url: '/dashboard',
      tag: 'carbonlens-test',
    });

    return res.json({ success: true, data: { sent: true }, message: 'Sent' });
  } catch (err) {
    next(err);
  }
});

export default router;

