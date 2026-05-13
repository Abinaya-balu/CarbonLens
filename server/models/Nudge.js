import mongoose from 'mongoose';

const { Schema } = mongoose;

const NudgeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scoreId: { type: Schema.Types.ObjectId, ref: 'CarbonScore', required: true, index: true },
    content: { type: String, required: true, maxlength: 2000 },
    category: { type: String, required: true, enum: ['commute', 'energy', 'food', 'shopping'], index: true },
    potentialSavingKg: { type: Number, required: true, default: 0 },
    isRead: { type: Boolean, default: false },
    isActedOn: { type: Boolean, default: false },
    generatedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true },
);

NudgeSchema.index({ userId: 1, generatedAt: -1 });

export default mongoose.model('Nudge', NudgeSchema);

