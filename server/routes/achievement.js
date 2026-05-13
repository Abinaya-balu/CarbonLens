import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Achievement from '../models/Achievement.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const items = await Achievement.find({ userId: req.userId }).sort({ earnedAt: -1 }).limit(50).lean();
    return res.json({ success: true, data: items, message: 'OK' });
  } catch (err) {
    next(err);
  }
});

export default router;

