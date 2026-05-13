import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error('JWT_SECRET is not set');
    err.statusCode = 500;
    throw err;
  }
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, region } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, data: null, message: 'name, email, password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, data: null, message: 'Password must be at least 6 chars' });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();
    if (existing) {
      return res.status(409).json({ success: false, data: null, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      region: region || 'TN',
    });

    const token = signToken(String(user._id));
    return res.json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email, region: user.region } },
      message: 'Registered',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, data: null, message: 'email and password are required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, data: null, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(String(password), String(user.passwordHash));
    if (!ok) {
      return res.status(401).json({ success: false, data: null, message: 'Invalid credentials' });
    }

    const token = signToken(String(user._id));
    return res.json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email, region: user.region } },
      message: 'Logged in',
    });
  } catch (err) {
    next(err);
  }
});

export default router;

