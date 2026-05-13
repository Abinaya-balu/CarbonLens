/**
 * 404 handler for unknown API routes.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, data: null, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

/**
 * Central error handler.
 * @param {any} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 * @returns {void}
 */
export function errorHandler(err, _req, res, _next) {
  const status = Number(err?.statusCode || err?.status || 500);
  const message =
    typeof err?.message === 'string' && err.message.trim().length > 0 ? err.message : 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({ success: false, data: null, message });
}

