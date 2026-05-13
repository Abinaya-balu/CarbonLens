import mongoose from 'mongoose';

const { Schema } = mongoose;

const JobRunSchema = new Schema(
  {
    scope: { type: String, required: true, enum: ['system', 'user'], index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    trigger: { type: String, required: true, enum: ['cron', 'manual', 'seed'], index: true },
    jobType: { type: String, required: true, enum: ['sync', 'score', 'nudge', 'sync_score'], index: true },
    provider: { type: String, default: null, enum: [null, 'google_maps', 'smart_meter', 'upi'] },
    status: { type: String, required: true, enum: ['running', 'success', 'error', 'skipped'], index: true },
    startedAt: { type: Date, required: true, index: true },
    finishedAt: { type: Date, default: null, index: true },
    runtimeMs: { type: Number, default: null },
    recordsIngested: { type: Number, default: 0 },
    nudgesCreated: { type: Number, default: 0 },
    scoreTotalCo2Kg: { type: Number, default: null },
    message: { type: String, default: '' },
    error: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

JobRunSchema.index({ scope: 1, startedAt: -1 });
JobRunSchema.index({ userId: 1, startedAt: -1 });
JobRunSchema.index({ status: 1, startedAt: -1 });

export default mongoose.model('JobRun', JobRunSchema);

