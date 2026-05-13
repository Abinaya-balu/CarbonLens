import JobRun from '../models/JobRun.js';

function serializeError(err) {
  if (!err) return null;
  if (typeof err === 'string') return { message: err };
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
  };
}

/**
 * Create a JobRun in running state.
 * @param {{
 *   scope: 'system'|'user',
 *   userId?: string|null,
 *   trigger: 'cron'|'manual'|'seed',
 *   jobType: 'sync'|'score'|'nudge'|'sync_score',
 *   provider?: 'google_maps'|'smart_meter'|'upi'|null,
 *   message?: string,
 *   metadata?: any
 * }} params
 * @returns {Promise<any>}
 */
export async function startJobRun(params) {
  const startedAt = new Date();
  const doc = await JobRun.create({
    scope: params.scope,
    userId: params.userId || null,
    trigger: params.trigger,
    jobType: params.jobType,
    provider: params.provider ?? null,
    status: 'running',
    startedAt,
    message: params.message || '',
    metadata: params.metadata || {},
  });
  return doc;
}

/**
 * Mark a JobRun as success/skipped/error.
 * @param {string} jobRunId
 * @param {{
 *   status: 'success'|'skipped'|'error',
 *   recordsIngested?: number,
 *   nudgesCreated?: number,
 *   scoreTotalCo2Kg?: number|null,
 *   message?: string,
 *   error?: any,
 *   metadata?: any
 * }} params
 * @returns {Promise<any>}
 */
export async function finishJobRun(jobRunId, params) {
  const finishedAt = new Date();
  const job = await JobRun.findById(jobRunId);
  if (!job) return null;
  job.finishedAt = finishedAt;
  job.runtimeMs = Number(finishedAt) - Number(job.startedAt);
  job.status = params.status;
  if (params.recordsIngested !== undefined) job.recordsIngested = Number(params.recordsIngested || 0);
  if (params.nudgesCreated !== undefined) job.nudgesCreated = Number(params.nudgesCreated || 0);
  if (params.scoreTotalCo2Kg !== undefined) job.scoreTotalCo2Kg = params.scoreTotalCo2Kg;
  if (params.message !== undefined) job.message = params.message || '';
  if (params.error !== undefined) job.error = serializeError(params.error);
  if (params.metadata !== undefined) job.metadata = params.metadata || {};
  await job.save();
  return job;
}

