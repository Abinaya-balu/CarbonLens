import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';

function fmtDay(d) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function History() {
  const [days, setDays] = useState(14);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(nextDays) {
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/score/history?days=${nextDays}`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load history');
      setScores(res.data.data.scores || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(days);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Insights</div>
          <div className="text-2xl font-semibold">History</div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border rounded-xl px-3 py-2 bg-white"
            value={days}
            onChange={(e) => {
              const n = Number(e.target.value);
              setDays(n);
              load(n);
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-hidden border">
        <div className="px-5 py-4 border-b">
          <div className="text-lg font-semibold">Daily scores</div>
          <div className="text-sm text-gray-500">Total CO₂ and category breakdown.</div>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-gray-500">Loading…</div>
        ) : error ? (
          <div className="p-5 text-sm text-red-600">{error}</div>
        ) : scores.length === 0 ? (
          <div className="p-5 text-sm text-gray-500">No data yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Total (kg)</th>
                  <th className="text-left px-5 py-3 font-medium">Commute</th>
                  <th className="text-left px-5 py-3 font-medium">Energy</th>
                  <th className="text-left px-5 py-3 font-medium">Food</th>
                  <th className="text-left px-5 py-3 font-medium">Shopping</th>
                  <th className="text-left px-5 py-3 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s) => (
                  <tr key={s._id} className="border-t">
                    <td className="px-5 py-3">{fmtDay(s.date)}</td>
                    <td className="px-5 py-3 font-semibold">{Number(s.totalCo2Kg || 0).toFixed(2)}</td>
                    <td className="px-5 py-3">{Number(s.commuteCo2 || 0).toFixed(2)}</td>
                    <td className="px-5 py-3">{Number(s.energyCo2 || 0).toFixed(2)}</td>
                    <td className="px-5 py-3">{Number(s.foodCo2 || 0).toFixed(2)}</td>
                    <td className="px-5 py-3">{Number(s.shoppingCo2 || 0).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                          s.trend === 'down'
                            ? 'bg-green-50 text-green-700'
                            : s.trend === 'up'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {s.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

