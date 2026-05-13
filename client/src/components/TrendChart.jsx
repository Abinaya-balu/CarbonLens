import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function formatDay(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TrendChart({ scores }) {
  const data = (scores || []).map((s) => ({
    date: s.date,
    total: Number(s.totalCo2Kg || 0),
  }));

  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Last 7 days</div>
          <div className="text-lg font-semibold">CO₂ Trend</div>
        </div>
      </div>

      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(2)} kg`, 'Total']}
              labelFormatter={(label) => formatDay(label)}
            />
            <Area type="monotone" dataKey="total" stroke="#16a34a" fill="url(#greenFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

