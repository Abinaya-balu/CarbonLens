import React from 'react';

function colorForScore(v) {
  if (v < 5) return { ring: 'stroke-green-600', text: 'text-green-600', bg: 'bg-green-50' };
  if (v < 10) return { ring: 'stroke-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
  return { ring: 'stroke-red-500', text: 'text-red-600', bg: 'bg-red-50' };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function equivalents(totalKg) {
  // Simple, explainable heuristics (frontend only):
  // - car driving ~0.17 kg/km (matches seeded commute_car_km TN)
  // - a mature tree absorbs ~21 kg CO2/year ≈ 0.0575 kg/day
  const kmDrivenEq = totalKg / 0.17;
  const treesPerDay = totalKg / 0.0575;
  return {
    kmDrivenEq,
    treesPerDay,
  };
}

function TreeIcon({ progress = 0.7 }) {
  const p = clamp(progress, 0.05, 1);
  return (
    <svg viewBox="0 0 64 64" className="h-10 w-10">
      <defs>
        <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16a34a" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M32 6c10 6 18 16 18 26 0 12-9 20-18 20s-18-8-18-20C14 22 22 12 32 6z"
          fill="url(#leaf)"
          opacity="0.95"
          style={{ transformOrigin: '32px 32px', transform: `scale(${0.85 + 0.15 * p})`, transition: 'transform 700ms ease' }}
        />
        <rect x="29" y="38" width="6" height="20" rx="3" fill="#7c4a2d" />
      </g>
    </svg>
  );
}

function CarIcon({ progress = 0.5 }) {
  const p = clamp(progress, 0, 1);
  return (
    <svg viewBox="0 0 64 64" className="h-10 w-10">
      <path
        d="M16 36l5-14c1-3 3-4 6-4h10c3 0 5 1 6 4l5 14"
        fill="#111827"
        opacity="0.9"
        style={{ transformOrigin: '32px 32px', transform: `translateX(${(-2 + 4 * p).toFixed(1)}px)`, transition: 'transform 700ms ease' }}
      />
      <path d="M12 36h40c2 0 4 2 4 4v8H8v-8c0-2 2-4 4-4z" fill="#1f2937" />
      <circle cx="20" cy="48" r="5" fill="#0b1220" />
      <circle cx="44" cy="48" r="5" fill="#0b1220" />
      <circle cx="20" cy="48" r="2" fill="#9ca3af" />
      <circle cx="44" cy="48" r="2" fill="#9ca3af" />
    </svg>
  );
}

export default function ScoreCard({ totalCo2Kg, trend, dateLabel, targetKg = 5 }) {
  const v = Number(totalCo2Kg || 0);
  const pct = Math.max(0, Math.min(100, (v / 15) * 100)); // 0-15kg range
  const c = colorForScore(v);
  const r = 52;
  const cLen = 2 * Math.PI * r;
  const dash = (pct / 100) * cLen;
  const eq = equivalents(v);
  const treeP = clamp(eq.treesPerDay / 10, 0.1, 1); // 10 trees/day visually "full"
  const carP = clamp(eq.kmDrivenEq / 60, 0.05, 1); // 60km visually "full"

  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm text-gray-500">{dateLabel || 'Today'}</div>
        <div className="text-xl font-semibold">Daily Carbon Score</div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${c.bg} ${c.text}`}>
            {trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'Stable'}
          </span>
          <span className="text-xs text-gray-500">Target: under {Number(targetKg || 5).toFixed(0)} kg/day</span>
        </div>
      </div>

      <div className="relative h-28 w-28">
        <svg viewBox="0 0 120 120" className="h-full w-full">
          <circle cx="60" cy="60" r={r} className="stroke-gray-200" strokeWidth="10" fill="none" />
          <circle
            cx="60"
            cy="60"
            r={r}
            className={c.ring}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${cLen - dash}`}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div className={`text-2xl font-bold ${c.text}`}>{v.toFixed(1)}</div>
          <div className="text-xs text-gray-500">kg CO₂</div>
        </div>
      </div>
    </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border bg-gray-50 p-4 flex items-center gap-3">
          <CarIcon progress={carP} />
          <div className="min-w-0">
            <div className="text-xs text-gray-500">Human-friendly equivalent</div>
            <div className="text-sm font-semibold text-gray-900">
              ≈ driving {eq.kmDrivenEq.toFixed(0)} km in a car
            </div>
            <div className="text-xs text-gray-500">Based on 0.17 kg CO₂ / km</div>
          </div>
        </div>
        <div className="rounded-xl border bg-gray-50 p-4 flex items-center gap-3">
          <TreeIcon progress={treeP} />
          <div className="min-w-0">
            <div className="text-xs text-gray-500">Tree absorber equivalent</div>
            <div className="text-sm font-semibold text-gray-900">
              ≈ {eq.treesPerDay.toFixed(1)} trees needed for 1 day
            </div>
            <div className="text-xs text-gray-500">Assuming ~21 kg CO₂ absorbed per tree/year</div>
          </div>
        </div>
      </div>
    </div>
  );
}

