import mongoose from 'mongoose';

const { Schema } = mongoose;

const CarbonScoreSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true },
    totalCo2Kg: { type: Number, required: true, default: 0 },
    commuteCo2: { type: Number, required: true, default: 0 },
    energyCo2: { type: Number, required: true, default: 0 },
    foodCo2: { type: Number, required: true, default: 0 },
    shoppingCo2: { type: Number, required: true, default: 0 },
    trend: { type: String, required: true, enum: ['up', 'down', 'stable'], default: 'stable' },
  },
  { timestamps: true },
);

CarbonScoreSchema.index({ userId: 1, date: -1 }, { unique: true });

export default mongoose.model('CarbonScore', CarbonScoreSchema);

