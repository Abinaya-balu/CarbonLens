import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import CarbonScore from '../models/CarbonScore.js';
import User from '../models/User.js';
import { upsertDailyCarbonScore } from '../services/carbonCalculator.js';

const router = express.Router();

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

router.get('/today', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ success: false, data: null, message: 'User not found' });

    const today = startOfDay(new Date());
    let score = await CarbonScore.findOne({ userId: req.userId, date: today }).lean();
    if (!score) {
      score = await upsertDailyCarbonScore({ userId: String(req.userId), region: user.region }, today);
      score = score.toObject();
    }

    return res.json({ success: true, data: score, message: 'OK' });
  } catch (err) {
    next(err);
  }
});

router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const days = Math.max(1, Math.min(30, Number(req.query.days || 7)));
    const end = startOfDay(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const scores = await CarbonScore.find({
      userId: req.userId,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .lean();

    return res.json({ success: true, data: { days, scores }, message: 'OK' });
  } catch (err) {
    next(err);
  }
});

export default router;

