import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to default behavior if needed

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { seedEmissionFactors } from '../utils/seedEmissionFactors.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import Integration from '../models/Integration.js';
import { computeActivityCo2, upsertDailyCarbonScore } from '../services/carbonCalculator.js';
import { generateAndSaveNudges } from '../services/nudgeEngine.js';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

async function createActivity(user, doc) {
  const created = await Activity.create({ userId: user._id, co2Kg: 0, ...doc });
  await computeActivityCo2(created._id, user.region);
  return created;
}

async function ensureDemoUser() {
  const email = 'demo@carbonlens.in';
  const existing = await User.findOne({ email }).lean();
  if (existing) return existing;

  const passwordHash = await bcrypt.hash('demo1234', 10);

  const user = await User.create({
    name: 'Demo User',
    email,
    passwordHash,
    region: 'TN',
    mapsLinked: true,
    smartMeterLinked: true,
    upiLinked: false,
    gridZone: 'TN-South',
  });

  await Integration.updateOne(
    { userId: user._id, provider: 'google_maps' },
    { $set: { isActive: true, lastSyncedAt: new Date() } },
    { upsert: true },
  );
  await Integration.updateOne(
    { userId: user._id, provider: 'smart_meter' },
    { $set: { isActive: true, lastSyncedAt: new Date() } },
    { upsert: true },
  );

  return user.toObject();
}

async function seedDemoWeek(user) {
  const today = startOfDay(new Date());
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  for (const d of days) {
    // Commute: mix modes
    const commuteMode = Math.random() < 0.6 ? 'car_km' : Math.random() < 0.7 ? 'metro_km' : 'bike_km';
    const commuteKm = Math.round(rand(6, 22) * 10) / 10;
    await createActivity(user, {
      type: 'commute',
      source: 'manual',
      valueRaw: commuteKm,
      unit: commuteMode,
      metadata: { emissionFactorType: `commute_${commuteMode}`, seeded: true },
      recordedAt: new Date(d),
    });

    // Energy: kWh
    const kwh = Math.round(rand(4.5, 12.5) * 10) / 10;
    await createActivity(user, {
      type: 'energy',
      source: 'manual',
      valueRaw: kwh,
      unit: 'kwh',
      metadata: { emissionFactorType: 'energy_kwh', seeded: true },
      recordedAt: new Date(d),
    });

    // Food: meals
    const vegMeals = Math.round(rand(1, 3));
    const nonVegMeals = Math.random() < 0.45 ? 1 : 0;
    if (vegMeals > 0) {
      await createActivity(user, {
        type: 'food',
        source: 'manual',
        valueRaw: vegMeals,
        unit: 'meal_veg',
        metadata: { emissionFactorType: 'food_meal_veg', seeded: true },
        recordedAt: new Date(d),
      });
    }
    if (nonVegMeals > 0) {
      await createActivity(user, {
        type: 'food',
        source: 'manual',
        valueRaw: nonVegMeals,
        unit: 'meal_nonveg',
        metadata: { emissionFactorType: 'food_meal_nonveg', seeded: true },
        recordedAt: new Date(d),
      });
    }

    // Shopping: INR buckets (valueRaw is number of 1000 INR blocks)
    const shoppingBlocks = Math.random() < 0.55 ? 0 : Math.round(rand(1, 4));
    if (shoppingBlocks > 0) {
      await createActivity(user, {
        type: 'shopping',
        source: 'manual',
        valueRaw: shoppingBlocks,
        unit: 'inr_1000',
        metadata: { emissionFactorType: 'shopping_inr_1000', seeded: true },
        recordedAt: new Date(d),
      });
    }

    const score = await upsertDailyCarbonScore({ userId: String(user._id), region: user.region }, d);
    if (Math.random() < 0.6) {
      const breakdown = {
        totalCo2Kg: score.totalCo2Kg,
        commuteCo2: score.commuteCo2,
        energyCo2: score.energyCo2,
        foodCo2: score.foodCo2,
        shoppingCo2: score.shoppingCo2,
        trend: score.trend,
      };
      try {
        await generateAndSaveNudges({
          userId: String(user._id),
          scoreId: String(score._id),
          region: user.region,
          breakdown,
        });
      } catch (_e) {
        // OpenAI key may not be present during seed; ignore.
      }
    }
  }
}

async function main() {
  await connectDB();

  // Seed factors for all supported regions
  for (const region of ['TN', 'MH', 'DL', 'KA']) {
    // eslint-disable-next-line no-console
    console.log('Seeding factors for', region, await seedEmissionFactors(region));
  }

  const demo = await ensureDemoUser();
  const existingActs = await Activity.countDocuments({ userId: demo._id });
  if (existingActs < 20) {
    await seedDemoWeek(demo);
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete');
  await mongoose.disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

