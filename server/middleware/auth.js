import jwt from 'jsonwebtoken';

/**
 * Express middleware to verify JWT and attach userId.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, data: null, message: 'Missing Authorization token' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, data: null, message: 'JWT_SECRET is not set' });
    }

    const payload = jwt.verify(token, secret);
    req.userId = payload.userId;
    next();
  } catch (_err) {
    return res.status(401).json({ success: false, data: null, message: 'Invalid or expired token' });
  }
}

