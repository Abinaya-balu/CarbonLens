# CarbonLens

**CarbonLens** is a passive carbon footprint tracker that ingests daily activity data (mock Google Maps commute + mock smart meter energy + manual input fallback), computes a daily CO₂ score, and generates nudges to help reduce emissions.

## Tech

- **Client**: React 18 + Vite + TailwindCSS + Recharts + Axios + React Router v6
- **Server**: Node.js + Express + MongoDB (Mongoose) + JWT + bcrypt + node-cron
- **Nudges**: **Zero-cost heuristic engine by default**, optional OpenAI upgrade

## Prerequisites

- Node.js 18+ (recommended: latest LTS)
- MongoDB Atlas connection string (**M0 free tier works**)
- (Optional) OpenAI API key (paid) for AI nudges

## Setup

Create environment file:

- Copy `.env.example` → `.env` in the `carbonlens/` folder
- Set `MONGODB_URI` and `JWT_SECRET`
- **Zero-cost default**: keep `NUDGE_ENGINE=heuristic` and leave `OPENAI_API_KEY` empty
- **Optional AI upgrade**: set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`)

## Install

From `carbonlens/`:

```bash
cd server
npm install

cd ../client
npm install
```

## Seed demo data (recommended)

The seed script:
- Inserts emission factors for `TN`, `MH`, `DL`, `KA`
- Creates demo user: `demo@carbonlens.in` / `demo1234`
- Pre-populates 7 days of activities and scores (so dashboard isn’t empty)

Run:

```bash
cd server
npm run seed
```

## Run (dev)

Start the backend (port **5000**):

```bash
cd server
npm run dev
```

Start the frontend (port **5173**) with Vite proxy to `/api`:

```bash
cd client
npm run dev
```

Open `http://localhost:5173`.

## API

All responses follow:

```json
{ "success": true, "data": {}, "message": "..." }
```

### Auth
- `POST /api/auth/register` → `{ name, email, password, region }`
- `POST /api/auth/login` → `{ email, password }`

### Ingest
- `POST /api/ingest/manual`
- `GET /api/ingest/sync` (mock commute + energy; protected)

### Score
- `GET /api/score/today`
- `GET /api/score/history?days=7`

### Nudge
- `GET /api/nudge`
- `PATCH /api/nudge/:id/read`
- `PATCH /api/nudge/:id/acted`

### Profile
- `GET /api/profile`
- `PUT /api/profile`

## Notes

- Mock integrations can be toggled in **Profile**; use **Dashboard → Sync mock APIs** to ingest.
- Nudges are **free by default** (heuristics). OpenAI is optional.

