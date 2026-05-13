import mongoose from 'mongoose';

const { Schema } = mongoose;

const AchievementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    key: { type: String, required: true, index: true }, // e.g. green_week, metro_warrior
    name: { type: String, required: true },
    description: { type: String, required: true },
    earnedAt: { type: Date, default: () => new Date(), index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

AchievementSchema.index({ userId: 1, key: 1 }, { unique: true });

export default mongoose.model('Achievement', AchievementSchema);

