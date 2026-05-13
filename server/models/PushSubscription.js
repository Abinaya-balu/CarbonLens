import mongoose from 'mongoose';

const { Schema } = mongoose;

const PushSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    lastNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

export default mongoose.model('PushSubscription', PushSubscriptionSchema);

