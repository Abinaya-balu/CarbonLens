import EmissionFactor from '../models/EmissionFactor.js';

/**
 * Seed baseline emission factors (idempotent).
 * @param {string} region
 * @returns {Promise<{ inserted: number, updated: number }>}
 */
export async function seedEmissionFactors(region = 'TN') {
  const now = new Date();
  const validFrom = new Date('2020-01-01T00:00:00.000Z');
  const validTo = new Date('2100-01-01T00:00:00.000Z');

  const factors = [
    { activityType: 'commute_car_km', region, kgCo2PerUnit: 0.17, unit: 'km', dataSource: 'seed', validFrom, validTo },
    { activityType: 'commute_metro_km', region, kgCo2PerUnit: 0.04, unit: 'km', dataSource: 'seed', validFrom, validTo },
    { activityType: 'commute_bike_km', region, kgCo2PerUnit: 0.09, unit: 'km', dataSource: 'seed', validFrom, validTo },
    { activityType: 'energy_kwh', region, kgCo2PerUnit: 0.71, unit: 'kwh', dataSource: 'seed', validFrom, validTo },
    { activityType: 'food_meal_nonveg', region, kgCo2PerUnit: 3.0, unit: 'meal', dataSource: 'seed', validFrom, validTo },
    { activityType: 'food_meal_veg', region, kgCo2PerUnit: 0.5, unit: 'meal', dataSource: 'seed', validFrom, validTo },
    { activityType: 'shopping_inr_1000', region, kgCo2PerUnit: 0.8, unit: 'inr_1000', dataSource: 'seed', validFrom, validTo },
  ];

  let inserted = 0;
  let updated = 0;

  for (const f of factors) {
    const existing = await EmissionFactor.findOne({
      activityType: f.activityType,
      region: f.region,
      validFrom: f.validFrom,
      validTo: f.validTo,
    });

    if (!existing) {
      await EmissionFactor.create({ ...f, createdAt: now, updatedAt: now });
      inserted += 1;
      continue;
    }

    const changed =
      existing.kgCo2PerUnit !== f.kgCo2PerUnit ||
      existing.unit !== f.unit ||
      existing.dataSource !== f.dataSource;

    if (changed) {
      existing.kgCo2PerUnit = f.kgCo2PerUnit;
      existing.unit = f.unit;
      existing.dataSource = f.dataSource;
      await existing.save();
      updated += 1;
    }
  }

  return { inserted, updated };
}

