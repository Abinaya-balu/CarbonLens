import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import JobRun from '../models/JobRun.js';
import { getSystemStatusSnapshot } from '../services/systemStatus.js';

const router = express.Router();

function safeInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const snap = getSystemStatusSnapshot();
    const limit = Math.max(5, Math.min(50, safeInt(req.query.limit, 20)));

    const runs = await JobRun.find({})
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();

    const lastErrors = runs.filter((r) => r.status === 'error').slice(0, 5);

    return res.json({
      success: true,
      data: {
        serverTime: snap.serverTime,
        lastCronRunAt: snap.lastCronRunAt,
        recentRuns: runs,
        recentErrors: lastErrors,
      },
      message: 'OK',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/jobruns', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, safeInt(req.query.page, 1));
    const limit = Math.max(5, Math.min(50, safeInt(req.query.limit, 20)));
    const skip = (page - 1) * limit;

    const { status, trigger, scope, jobType } = req.query || {};
    const filter = {};
    if (status) filter.status = status;
    if (trigger) filter.trigger = trigger;
    if (scope) filter.scope = scope;
    if (jobType) filter.jobType = jobType;

    // Regular users only see their runs + system runs
    filter.$or = [{ scope: 'system' }, { scope: 'user', userId: req.userId }];

    const [total, items] = await Promise.all([
      JobRun.countDocuments(filter),
      JobRun.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      message: 'OK',
    });
  } catch (err) {
    next(err);
  }
});

export default router;

