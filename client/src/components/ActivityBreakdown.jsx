import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = {
  commute: '#16a34a',
  energy: '#f59e0b',
  food: '#ef4444',
  shopping: '#6366f1',
};

export default function ActivityBreakdown({ score }) {
  const data = [
    { name: 'Commute', key: 'commute', value: Number(score?.commuteCo2 || 0) },
    { name: 'Energy', key: 'energy', value: Number(score?.energyCo2 || 0) },
    { name: 'Food', key: 'food', value: Number(score?.foodCo2 || 0) },
    { name: 'Shopping', key: 'shopping', value: Number(score?.shoppingCo2 || 0) },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <div className="text-sm text-gray-500">Today</div>
      <div className="text-lg font-semibold">Breakdown</div>
      <div className="mt-4 h-64">
        {data.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-gray-500">No activity yet. Add one below.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {data.map((d) => (
                  <Cell key={d.key} fill={COLORS[d.key]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} kg`, 'CO₂']} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        {['commute', 'energy', 'food', 'shopping'].map((k) => (
          <div key={k} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS[k] }} />
              <span className="capitalize text-gray-700">{k}</span>
            </div>
            <span className="font-medium">{Number(score?.[`${k}Co2`] || 0).toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

