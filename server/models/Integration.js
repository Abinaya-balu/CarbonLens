import mongoose from 'mongoose';

const { Schema } = mongoose;

const IntegrationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, required: true, enum: ['google_maps', 'smart_meter', 'upi'], index: true },
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    tokenExpiry: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

IntegrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

export default mongoose.model('Integration', IntegrationSchema);

