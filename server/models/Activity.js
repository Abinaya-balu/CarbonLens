import mongoose from 'mongoose';

const { Schema } = mongoose;

const ActivitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, enum: ['commute', 'energy', 'food', 'shopping'], index: true },
    source: { type: String, required: true, enum: ['google_maps', 'smart_meter', 'upi', 'manual'], index: true },
    valueRaw: { type: Number, required: true },
    unit: { type: String, required: true },
    co2Kg: { type: Number, required: true, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    recordedAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

ActivitySchema.index({ userId: 1, recordedAt: -1 });

export default mongoose.model('Activity', ActivitySchema);

