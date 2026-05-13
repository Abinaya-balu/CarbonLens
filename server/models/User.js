import mongoose from 'mongoose';

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, index: true, unique: true },
    passwordHash: { type: String, required: true },
    googleId: { type: String, default: null, index: true },
    region: { type: String, default: 'TN', enum: ['TN', 'MH', 'DL', 'KA'] },
    gridZone: { type: String, default: null },
    smartMeterLinked: { type: Boolean, default: false },
    mapsLinked: { type: Boolean, default: false },
    upiLinked: { type: Boolean, default: false },

    // Resume-worthy features
    dailyTargetKg: { type: Number, default: 5 }, // streak target
    monthlyGoalKg: { type: Number, default: 0 }, // 0 => not set
    streakDays: { type: Number, default: 0 },
    lastStreakDate: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('User', UserSchema);

