import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';

function fmt(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function Badge({ status }) {
  const cls =
    status === 'success'
      ? 'bg-green-50 text-green-700'
      : status === 'error'
        ? 'bg-red-50 text-red-700'
        : status === 'running'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-gray-100 text-gray-700';
  return <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${cls}`}>{status}</span>;
}

export default function SystemStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function load() {
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/system/status?limit=25');
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load system status');
      setData(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load system status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => load(), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const recentRuns = data?.recentRuns || [];
  const recentErrors = data?.recentErrors || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Observability</div>
          <div className="text-2xl font-semibold">System Status</div>
          <div className="text-sm text-gray-500 mt-1">Recent sync/score/nudge job runs and failures.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-60"
            disabled={loading}
          >
            Refresh
          </button>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 bg-white border rounded-xl px-3 py-2">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500">Server time</div>
          <div className="text-lg font-semibold">{fmt(data?.serverTime)}</div>
          <div className="mt-3 text-sm text-gray-500">Last cron run</div>
          <div className="text-lg font-semibold">{fmt(data?.lastCronRunAt)}</div>
          <div className="mt-3 text-xs text-gray-500">
            Cron timestamp is in-memory (resets on restart). Job runs persist in MongoDB.
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b">
            <div className="text-lg font-semibold">Recent errors</div>
            <div className="text-sm text-gray-500">Latest 5 job failures (if any).</div>
          </div>
          {loading ? (
            <div className="p-5 text-sm text-gray-500">Loading…</div>
          ) : error ? (
            <div className="p-5 text-sm text-red-600">{error}</div>
          ) : recentErrors.length === 0 ? (
            <div className="p-5 text-sm text-gray-500">No errors recently.</div>
          ) : (
            <div className="divide-y">
              {recentErrors.map((r) => (
                <div key={r._id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {r.scope}/{r.trigger}/{r.jobType}
                    </div>
                    <Badge status={r.status} />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{fmt(r.startedAt)}</div>
                  <div className="mt-2 text-sm text-red-700">
                    {r.message || r.error?.message || 'Error'}
                  </div>
                  {r.error?.message ? (
                    <div className="mt-1 text-xs text-gray-500">{r.error.message}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <div className="text-lg font-semibold">Recent job runs</div>
          <div className="text-sm text-gray-500">Includes system cron cycles and your user sync runs.</div>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-gray-500">Loading…</div>
        ) : error ? (
          <div className="p-5 text-sm text-red-600">{error}</div>
        ) : recentRuns.length === 0 ? (
          <div className="p-5 text-sm text-gray-500">No job runs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Started</th>
                  <th className="text-left px-5 py-3 font-medium">Scope</th>
                  <th className="text-left px-5 py-3 font-medium">Trigger</th>
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Runtime</th>
                  <th className="text-left px-5 py-3 font-medium">Ingested</th>
                  <th className="text-left px-5 py-3 font-medium">Nudges</th>
                  <th className="text-left px-5 py-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="px-5 py-3 whitespace-nowrap">{fmt(r.startedAt)}</td>
                    <td className="px-5 py-3">{r.scope}</td>
                    <td className="px-5 py-3">{r.trigger}</td>
                    <td className="px-5 py-3">{r.jobType}</td>
                    <td className="px-5 py-3">
                      <Badge status={r.status} />
                    </td>
                    <td className="px-5 py-3">{r.runtimeMs != null ? `${r.runtimeMs} ms` : '—'}</td>
                    <td className="px-5 py-3">{Number(r.recordsIngested || 0)}</td>
                    <td className="px-5 py-3">{Number(r.nudgesCreated || 0)}</td>
                    <td className="px-5 py-3">{r.scoreTotalCo2Kg != null ? Number(r.scoreTotalCo2Kg).toFixed(1) : '—'}</td>
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

