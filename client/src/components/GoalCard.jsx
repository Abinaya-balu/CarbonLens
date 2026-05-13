import React, { useMemo, useState } from 'react';

function startOfMonth(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysInMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return { m: 0, b: ys[0] || 0 };
  const sumX = xs.reduce((a, v) => a + v, 0);
  const sumY = ys.reduce((a, v) => a + v, 0);
  const sumXY = xs.reduce((a, v, i) => a + v * ys[i], 0);
  const sumXX = xs.reduce((a, v) => a + v * v, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { m: 0, b: sumY / n };
  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

export default function GoalCard({ historyScores, monthlyGoalKg, onSaveGoal, saving }) {
  const [draft, setDraft] = useState(monthlyGoalKg ? String(monthlyGoalKg) : '');

  const computed = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const dim = daysInMonth(now);

    const monthScores = (historyScores || []).filter((s) => {
      const d = new Date(s.date);
      return d >= monthStart && d <= now;
    });

    const observedTotal = monthScores.reduce((a, s) => a + Number(s.totalCo2Kg || 0), 0);
    const observedDays = monthScores.length || 0;

    // Use last 7 days (or less) for daily trend regression
    const last = (historyScores || []).slice(-7);
    const xs = last.map((_, i) => i);
    const ys = last.map((s) => Number(s.totalCo2Kg || 0));
    const { m, b } = linearRegression(xs, ys);

    // Project remaining days using the trend line
    const remaining = Math.max(0, dim - observedDays);
    let projectedRemaining = 0;
    for (let i = 0; i < remaining; i++) {
      const x = xs.length + i;
      projectedRemaining += Math.max(0, m * x + b);
    }

    const projectedMonthTotal = observedTotal + projectedRemaining;
    return { observedTotal, observedDays, dim, projectedMonthTotal };
  }, [historyScores]);

  const goal = Number(draft || 0);
  const hasGoal = goal > 0;
  const projected = computed.projectedMonthTotal;
  const delta = hasGoal ? projected - goal : 0;

  return (
    <div className="bg-white shadow-sm rounded-xl p-5 border">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Goals</div>
          <div className="text-lg font-semibold">Monthly CO₂ target</div>
          <div className="text-sm text-gray-500 mt-1">Projection uses a simple linear regression on recent days.</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-gray-50 p-4 border">
          <div className="text-xs text-gray-500">This month so far</div>
          <div className="text-xl font-semibold">{computed.observedTotal.toFixed(1)} kg</div>
          <div className="text-xs text-gray-500">{computed.observedDays} / {computed.dim} days logged</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-4 border">
          <div className="text-xs text-gray-500">Projected month total</div>
          <div className="text-xl font-semibold">{projected.toFixed(1)} kg</div>
          <div className="text-xs text-gray-500">Trend-based projection</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-4 border">
          <div className="text-xs text-gray-500">Your target</div>
          <div className="flex items-center gap-2 mt-2">
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="e.g. 35"
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60"
              disabled={saving}
              onClick={() => onSaveGoal?.(Number(draft || 0))}
            >
              Save
            </button>
          </div>
          {hasGoal ? (
            <div className={`mt-2 text-sm font-medium ${delta <= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {delta <= 0
                ? `On track: ${(Math.abs(delta)).toFixed(1)} kg under goal`
                : `At current rate: ${delta.toFixed(1)} kg over goal`}
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">Set a target to see on-track status.</div>
          )}
        </div>
      </div>
    </div>
  );
}

