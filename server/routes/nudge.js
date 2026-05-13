import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Nudge from '../models/Nudge.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const nudges = await Nudge.find({ userId: req.userId })
      .sort({ generatedAt: -1 })
      .limit(5)
      .lean();
    return res.json({ success: true, data: nudges, message: 'OK' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const nudge = await Nudge.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { isRead: true } },
      { new: true },
    ).lean();
    if (!nudge) return res.status(404).json({ success: false, data: null, message: 'Nudge not found' });
    return res.json({ success: true, data: nudge, message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/acted', requireAuth, async (req, res, next) => {
  try {
    const nudge = await Nudge.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { isActedOn: true, isRead: true } },
      { new: true },
    ).lean();
    if (!nudge) return res.status(404).json({ success: false, data: null, message: 'Nudge not found' });
    return res.json({ success: true, data: nudge, message: 'Marked as acted on' });
  } catch (err) {
    next(err);
  }
});

export default router;

