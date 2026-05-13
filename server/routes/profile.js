import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import Integration from '../models/Integration.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ success: false, data: null, message: 'User not found' });

    const integrations = await Integration.find({ userId: req.userId }).lean();
    const statusByProvider = integrations.reduce((acc, it) => {
      acc[it.provider] = { isActive: it.isActive, lastSyncedAt: it.lastSyncedAt };
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          region: user.region,
          gridZone: user.gridZone,
          smartMeterLinked: user.smartMeterLinked,
          mapsLinked: user.mapsLinked,
          upiLinked: user.upiLinked,
          monthlyGoalKg: user.monthlyGoalKg || 0,
          dailyTargetKg: user.dailyTargetKg || 5,
          streakDays: user.streakDays || 0,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        integrations: statusByProvider,
      },
      message: 'OK',
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, async (req, res, next) => {
  try {
    const { region, smartMeterLinked, mapsLinked, upiLinked, gridZone, name, monthlyGoalKg, dailyTargetKg } =
      req.body || {};

    const update = {};
    if (region) update.region = region;
    if (gridZone !== undefined) update.gridZone = gridZone;
    if (name) update.name = String(name).trim();
    if (smartMeterLinked !== undefined) update.smartMeterLinked = Boolean(smartMeterLinked);
    if (mapsLinked !== undefined) update.mapsLinked = Boolean(mapsLinked);
    if (upiLinked !== undefined) update.upiLinked = Boolean(upiLinked);
    if (monthlyGoalKg !== undefined) update.monthlyGoalKg = Math.max(0, Number(monthlyGoalKg || 0));
    if (dailyTargetKg !== undefined) update.dailyTargetKg = Math.max(1, Number(dailyTargetKg || 5));

    const user = await User.findOneAndUpdate({ _id: req.userId }, { $set: update }, { new: true }).lean();
    if (!user) return res.status(404).json({ success: false, data: null, message: 'User not found' });

    return res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        region: user.region,
        gridZone: user.gridZone,
        smartMeterLinked: user.smartMeterLinked,
        mapsLinked: user.mapsLinked,
        upiLinked: user.upiLinked,
        monthlyGoalKg: user.monthlyGoalKg || 0,
        dailyTargetKg: user.dailyTargetKg || 5,
        streakDays: user.streakDays || 0,
        updatedAt: user.updatedAt,
      },
      message: 'Profile updated',
    });
  } catch (err) {
    next(err);
  }
});

export default router;

