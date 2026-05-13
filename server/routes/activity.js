import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Activity from '../models/Activity.js';

const router = express.Router();

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

function safeInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { from, to, type, source, q } = req.query || {};
    const page = Math.max(1, safeInt(req.query.page, 1));
    const limit = Math.max(5, Math.min(50, safeInt(req.query.limit, 20)));
    const skip = (page - 1) * limit;

    const filter = { userId: req.userId };

    if (type) filter.type = type;
    if (source) filter.source = source;

    if (from || to) {
      const fromDt = from ? new Date(String(from)) : null;
      const toDt = to ? new Date(String(to)) : null;
      if (fromDt && Number.isNaN(fromDt.getTime())) {
        return res.status(400).json({ success: false, data: null, message: 'from is invalid' });
      }
      if (toDt && Number.isNaN(toDt.getTime())) {
        return res.status(400).json({ success: false, data: null, message: 'to is invalid' });
      }
      const range = {};
      if (fromDt) range.$gte = startOfDay(fromDt);
      if (toDt) range.$lte = endOfDay(toDt);
      filter.recordedAt = range;
    }

    if (q && String(q).trim().length > 0) {
      // lightweight search in unit + some metadata fields if present
      const term = String(q).trim();
      filter.$or = [
        { unit: { $regex: term, $options: 'i' } },
        { source: { $regex: term, $options: 'i' } },
        { type: { $regex: term, $options: 'i' } },
        { 'metadata.purpose': { $regex: term, $options: 'i' } },
      ];
    }

    const [total, items, totalsAgg] = await Promise.all([
      Activity.countDocuments(filter),
      Activity.find(filter).sort({ recordedAt: -1 }).skip(skip).limit(limit).lean(),
      Activity.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$type',
            co2Kg: { $sum: '$co2Kg' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalsByType = totalsAgg.reduce((acc, r) => {
      acc[r._id] = { co2Kg: Number(r.co2Kg || 0), count: Number(r.count || 0) };
      return acc;
    }, {});

    const pages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      success: true,
      data: {
        items,
        page,
        limit,
        total,
        pages,
        totalsByType,
      },
      message: 'OK',
    });
  } catch (err) {
    next(err);
  }
});

export default router;

