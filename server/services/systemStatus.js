let lastCronRunAt = null;

/**
 * Record last cron run timestamp (in-memory).
 * @param {Date} at
 * @returns {void}
 */
export function markCronRun(at = new Date()) {
  lastCronRunAt = at;
}

/**
 * Get current system status (in-memory snapshot).
 * @returns {{ serverTime: Date, lastCronRunAt: Date|null }}
 */
export function getSystemStatusSnapshot() {
  return { serverTime: new Date(), lastCronRunAt };
}

