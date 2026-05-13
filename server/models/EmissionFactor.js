import mongoose from 'mongoose';

const { Schema } = mongoose;

const EmissionFactorSchema = new Schema(
  {
    activityType: { type: String, required: true, index: true }, // e.g. commute_car_km, energy_kwh
    region: { type: String, required: true, index: true },
    kgCo2PerUnit: { type: Number, required: true },
    unit: { type: String, required: true },
    dataSource: { type: String, required: true },
    validFrom: { type: Date, default: () => new Date('2000-01-01T00:00:00.000Z') },
    validTo: { type: Date, default: () => new Date('2100-01-01T00:00:00.000Z') },
  },
  { timestamps: true },
);

EmissionFactorSchema.index({ activityType: 1, region: 1, validFrom: -1 });
EmissionFactorSchema.index(
  { activityType: 1, region: 1, validFrom: 1, validTo: 1 },
  { unique: true },
);

export default mongoose.model('EmissionFactor', EmissionFactorSchema);

