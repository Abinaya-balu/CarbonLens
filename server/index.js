import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback to default behavior if needed

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import ingestRoutes from './routes/ingest.js';
import scoreRoutes from './routes/score.js';
import nudgeRoutes from './routes/nudge.js';
import profileRoutes from './routes/profile.js';
import activityRoutes from './routes/activity.js';
import systemRoutes from './routes/system.js';
import pushRoutes from './routes/push.js';
import achievementRoutes from './routes/achievement.js';

import { startCronJobs } from './services/cronJobs.js';

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) || '*',
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', async (_req, res) => {
  res.json({ success: true, data: { ok: true }, message: 'healthy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/nudge', nudgeRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/achievement', achievementRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT || 5000);

async function bootstrap() {
  await connectDB();
  if (process.env.ENABLE_CRON !== 'false') startCronJobs();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`CarbonLens API listening on port ${port}`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

