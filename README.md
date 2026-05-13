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
# CarbonLens — MongoDB Collection Design

## 1. Users Collection (`users`)

| Field Name      | BSON Type | Required | Index Suggestion    | Description             | Example Value            |
| ----------------| ----------| -------- | ------------------- | ----------------------- | ------------------------ |
| `_id`           | ObjectId  | Yes      | PK                  | Unique user identifier  | `ObjectId("665fa12ab9")` |
| `name`          | String    | Yes      | —                   | Full name of user       | `"Abinaya"`              |
| `email`         | String    | Yes      | Unique Index        | Login email             | `"demo@carbonlens.in"`   |
| `passwordHash`  | String    | Yes      | —                   | Encrypted password hash | `"$2b$10$abc..."`        |
| `region`        | String    | No       | Index (optional)    | User region/location    | `"IN-TN"`                |
| `dailyTargetKg` | Number    | No       | —                   | Daily CO₂ goal          | `5.5`                    |
| `monthlyGoalKg` | Number    | No       | —                   | Monthly emission goal   | `120`                    |
| `createdAt`     | ISODate   | Yes      | Index (`createdAt`) | Creation timestamp      | `ISODate("2026-05-13")`  |
| `updatedAt`     | ISODate   | Yes      | —                   | Last update timestamp   | `ISODate("2026-05-13")`  |

### Suggested Indexes

```js
db.users.createIndex({ email: 1 }, { unique: true });

db.users.createIndex({ createdAt: -1 });
```

---

## 2. Activities Collection (`activities`)

| Field Name         | BSON Type | Required | Index Suggestion | Description               | Example Value                      |
| ------------------ | ----------| -------- | ---------------- | ------------------------- | ---------------------------------- |
| `_id`              | ObjectId  | Yes      | PK               | Activity identifier       | `ObjectId("a12")`                  |
| `userId`           | ObjectId  | Yes      | Compound Index   | FK → users                | `ObjectId("u12")`                  |
| `source`           | String    | Yes      | Compound Index   | Data source               | `"manual"`                         |
| `startTime`        | ISODate   | Yes      | Compound Index   | Activity start            | `ISODate("2026-05-13T08:00")`      |
| `endTime`          | ISODate   | No       | —                | Activity end              | `ISODate("2026-05-13T09:00")`      |
| `type`             | String    | Yes      | —                | Activity category         | `"transport"`                      |
| `details`          | Object    | Yes      | —                | Dynamic activity metadata | `{ distanceKm: 12, mode: "bike" }` |
| `emissionFactorId` | ObjectId  | No       | Index            | FK → emissionfactors      | `ObjectId("ef1")`                  |
| `createdAt`        | ISODate   | Yes      | Index            | Record timestamp          | `ISODate("2026-05-13")`            |

### Suggested Compound Indexes

```js
db.activities.createIndex({ userId: 1, startTime: -1 });

db.activities.createIndex({ userId: 1, source: 1 });
```

---

## 3. CarbonScores Collection (`carbonscores`)

| Field Name   | BSON Type | Required | Index Suggestion      | Description         | Example Value                   |
| -------------| ----------| -------- | --------------------- | ------------------- | ------------------------------- |
| `_id`        | ObjectId  | Yes      | PK                    | Score record ID     | `ObjectId("cs1")`               |
| `userId`     | ObjectId  | Yes      | Unique Compound Index | FK → users          | `ObjectId("u12")`               |
| `date`       | Date      | Yes      | Unique Compound Index | Daily score date    | `"2026-05-13"`                  |
| `totalKgCO2` | Number    | Yes      | —                     | Total carbon output | `4.3`                           |
| `breakdown`  | Object    | Yes      | —                     | Emission split      | `{ transport:2.1, energy:1.5 }` |
| `createdAt`  | ISODate   | Yes      | —                     | Created timestamp   | `ISODate("2026-05-13")`         |

### Suggested Index

```js
db.carbonscores.createIndex(
  { userId: 1, date: 1 },
  { unique: true }
);
```

---

## 4. EmissionFactors Collection (`emissionfactors`)

| Field Name   | BSON Type | Required | Index Suggestion | Description       | Example Value     |
| -------------| ----------| -------- | ---------------- | ----------------- | ----------------- |
| `_id`        | ObjectId  | Yes      | PK               | Factor identifier | `ObjectId("ef1")` |
| `region`     | String    | Yes      | Compound Index   | Region code       | `"IN"`            |
| `sourceType` | String    | Yes      | Compound Index   | Factor category   | `"electricity"`   |
| `unit`       | String    | Yes      | —                | Measurement unit  | `"kWh"`           |
| `factor`     | Number    | Yes      | —                | CO₂ factor value  | `0.82`            |

### Suggested Index

```js
db.emissionfactors.createIndex({
  region: 1,
  sourceType: 1
});
```

---

## 5. Nudges Collection (`nudges`)

| Field Name          | BSON Type | Required | Index Suggestion | Description        | Example Value                     |
| ------------------- | ----------| -------- | ---------------- | ------------------ | --------------------------------- |
| `_id`               | ObjectId  | Yes      | PK               | Nudge identifier   | `ObjectId("n1")`                  |
| `userId`            | ObjectId  | Yes      | Compound Index   | FK → users         | `ObjectId("u12")`                 |
| `relatedActivityId` | ObjectId  | No       | Index            | Related activity   | `ObjectId("a1")`                  |
| `message`           | String    | Yes      | —                | Nudge content      | `"Try public transport tomorrow"` |
| `type`              | String    | Yes      | —                | Nudge category     | `"transport"`                     |
| `read`              | Boolean   | Yes      | Compound Index   | Read state         | `false`                           |
| `acted`             | Boolean   | Yes      | —                | Whether user acted | `true`                            |
| `createdAt`         | ISODate   | Yes      | Compound Index   | Timestamp          | `ISODate("2026-05-13")`           |

### Suggested Index

```js
db.nudges.createIndex({
  userId: 1,
  read: 1,
  createdAt: -1
});
```

---

## 6. PushSubscriptions Collection (`pushsubscriptions`)

| Field Name  | BSON Type | Required | Index Suggestion | Description       | Example Value                      |
| ------------| ----------| -------- | ---------------- | ----------------- | ---------------------------------- |
| `_id`       | ObjectId  | Yes      | PK               | Subscription ID   | `ObjectId("ps1")`                  |
| `userId`    | ObjectId  | Yes      | Index            | FK → users        | `ObjectId("u12")`                  |
| `endpoint`  | String    | Yes      | Unique Index     | Push endpoint     | `"https://fcm.googleapis.com/..."` |
| `keys`      | Object    | Yes      | —                | Auth keys         | `{ p256dh:"abc", auth:"xyz" }`     |
| `createdAt` | ISODate   | Yes      | —                | Created timestamp | `ISODate("2026-05-13")`            |

### Suggested Index

```js
db.pushsubscriptions.createIndex(
  { endpoint: 1 },
  { unique: true }
);

db.pushsubscriptions.createIndex({
  userId: 1
});
```

---

## 7. Integrations Collection (`integrations`)

| Field Name  | BSON Type | Required | Index Suggestion | Description        | Example Value           |
| ------------| ----------| -------- | ---------------- | ------------------ | ----------------------- |
| `_id`       | ObjectId  | Yes      | PK               | Integration ID     | `ObjectId("i1")`        |
| `userId`    | ObjectId  | Yes      | Compound Index   | FK → users         | `ObjectId("u12")`       |
| `provider`  | String    | Yes      | Compound Index   | Provider name      | `"google-maps"`         |
| `enabled`   | Boolean   | Yes      | —                | Enabled state      | `true`                  |
| `config`    | Object    | No       | —                | Integration config | `{ syncEveryHours:6 }`  |
| `createdAt` | ISODate   | Yes      | —                | Timestamp          | `ISODate("2026-05-13")` |

### Suggested Index

```js
db.integrations.createIndex({
  userId: 1,
  provider: 1
});
```

---

## 8. JobRuns Collection (`jobruns`)

| Field Name         | BSON Type | Required | Index Suggestion | Description      | Example Value                 |
| ------------------ | ----------| -------- | ---------------- | ---------------- | ----------------------------- |
| `_id`              | ObjectId  | Yes      | PK               | Job execution ID | `ObjectId("j1")`              |
| `jobType`          | String    | Yes      | Compound Index   | Batch job name   | `"score-computation"`         |
| `startedAt`        | ISODate   | Yes      | Compound Index   | Start timestamp  | `ISODate("2026-05-13T06:00")` |
| `finishedAt`       | ISODate   | No       | —                | Finish timestamp | `ISODate("2026-05-13T06:02")` |
| `status`           | String    | Yes      | —                | Job state        | `"success"`                   |
| `recordsProcessed` | Number    | No       | —                | Count processed  | `1450`                        |
| `error`            | String    | No       | —                | Error message    | `"timeout"`                   |

### Suggested Index

```js
db.jobruns.createIndex({
  jobType: 1,
  startedAt: -1
});
```

---

## 9. Achievements Collection (`achievements`)

| Field Name    | BSON Type | Required | Index Suggestion | Description         | Example Value           |
| --------------| ----------| -------- | ---------------- | ------------------- | ----------------------- |
| `_id`         | ObjectId  | Yes      | PK               | Achievement ID      | `ObjectId("ach1")`      |
| `userId`      | ObjectId  | Yes      | Index            | FK → users          | `ObjectId("u12")`       |
| `name`        | String    | Yes      | —                | Achievement title   | `"Eco Warrior"`         |
| `description` | String    | Yes      | —                | Achievement details | `"Reduced 30kg CO₂"`    |
| `achievedAt`  | ISODate   | Yes      | Index            | Earned timestamp    | `ISODate("2026-05-13")` |

### Suggested Index

```js
db.achievements.createIndex({
  userId: 1
});

db.achievements.createIndex({
  achievedAt: -1
});
```
<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/6f58ec70-fa47-4455-a544-3ffb7f8e80e2" />
<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/ebadfb2d-3770-4385-be64-32308da93027" />
<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/f3c2c7e4-ce35-4256-a4ce-f631d1a80e81" />






