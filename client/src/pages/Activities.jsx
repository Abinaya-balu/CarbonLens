import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios.js';
import { MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';

function fmt(dt) {
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function fmtDay(dt) {
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function downloadCsv(filename, rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    if (/[,"\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };
  const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Activities() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return fmtDay(d);
  });
  const [to, setTo] = useState(() => fmtDay(today));
  const [type, setType] = useState('');
  const [source, setSource] = useState('');
  const [q, setQ] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1, totalsByType: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCommute, setSelectedCommute] = useState(null);

  async function load(nextPage = page) {
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (type) params.set('type', type);
      if (source) params.set('source', source);
      if (q) params.set('q', q);
      params.set('page', String(nextPage));
      params.set('limit', String(limit));

      const res = await api.get(`/activity?${params.toString()}`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load activities');
      setItems(res.data.data.items || []);
      setMeta({
        total: res.data.data.total,
        pages: res.data.data.pages,
        totalsByType: res.data.data.totalsByType || {},
      });
      setPage(res.data.data.page);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, type, source, limit]);

  useEffect(() => {
    const first = items.find((x) => x.type === 'commute' && x.metadata?.route?.actualRoute?.length);
    setSelectedCommute(first || null);
  }, [items]);

  const totalsCards = [
    { key: 'commute', label: 'Commute', color: 'bg-green-50 text-green-700' },
    { key: 'energy', label: 'Energy', color: 'bg-amber-50 text-amber-700' },
    { key: 'food', label: 'Food', color: 'bg-red-50 text-red-700' },
    { key: 'shopping', label: 'Shopping', color: 'bg-indigo-50 text-indigo-700' },
  ];

  const route = selectedCommute?.metadata?.route;
  const actual = route?.actualRoute;
  const transit = route?.transitRoute;
  const center = route?.start || (actual?.[0] ?? [13.0827, 80.2707]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Data</div>
          <div className="text-2xl font-semibold">Activities</div>
          <div className="text-sm text-gray-500 mt-1">
            Filter, paginate, and export your raw activity ledger.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const rows = [
                ['recordedAt', 'type', 'source', 'valueRaw', 'unit', 'co2Kg', 'metadata'],
                ...items.map((a) => [
                  new Date(a.recordedAt).toISOString(),
                  a.type,
                  a.source,
                  a.valueRaw,
                  a.unit,
                  Number(a.co2Kg || 0).toFixed(3),
                  JSON.stringify(a.metadata || {}),
                ]),
              ];
              downloadCsv(`carbonlens-activities-page${page}.csv`, rows);
            }}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-60"
            disabled={loading || items.length === 0}
          >
            Export CSV (page)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {totalsCards.map((c) => {
          const x = meta.totalsByType?.[c.key] || { co2Kg: 0, count: 0 };
          return (
            <div key={c.key} className="bg-white rounded-xl shadow-sm border p-4">
              <div className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${c.color}`}>{c.label}</div>
              <div className="mt-2 text-xl font-semibold">{Number(x.co2Kg || 0).toFixed(2)} kg</div>
              <div className="text-xs text-gray-500">{Number(x.count || 0)} records</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Commute story</div>
            <div className="text-lg font-semibold">CO₂ comparison map</div>
            <div className="text-sm text-gray-500 mt-1">
              Actual route vs nearest {route?.transitMode || 'transit'} alternative (mocked).
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Selected commute</div>
            <div className="text-sm font-medium">{selectedCommute ? fmt(selectedCommute.recordedAt) : '—'}</div>
          </div>
        </div>

        {!selectedCommute || !actual?.length || !transit?.length ? (
          <div className="p-5 text-sm text-gray-500">
            No commute routes with geometry found in this filter. Try syncing mock APIs or filter type=commute.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            <div className="lg:col-span-2 h-[360px]">
              <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polyline positions={actual} pathOptions={{ color: '#ef4444', weight: 5, opacity: 0.85 }}>
                  <Tooltip sticky>
                    Actual: {Number(selectedCommute.valueRaw || 0).toFixed(1)} km • {Number(selectedCommute.co2Kg || 0).toFixed(2)} kg CO₂
                  </Tooltip>
                </Polyline>
                <Polyline positions={transit} pathOptions={{ color: '#16a34a', weight: 5, opacity: 0.85, dashArray: '8 8' }}>
                  <Tooltip sticky>
                    {route.transitMode}: {Number(route.transitDistanceKm || 0).toFixed(1)} km • lower CO₂ (typ.)
                  </Tooltip>
                </Polyline>
              </MapContainer>
            </div>
            <div className="p-5 border-t lg:border-t-0 lg:border-l">
              <div className="text-sm font-medium">CO₂ labels</div>
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-gray-500">Actual (recorded)</div>
                  <div className="mt-1 text-lg font-semibold text-red-600">
                    {Number(selectedCommute.co2Kg || 0).toFixed(2)} kg
                  </div>
                  <div className="text-sm text-gray-600">
                    {Number(selectedCommute.valueRaw || 0).toFixed(1)} km • {selectedCommute.unit}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-gray-500">{route.transitMode || 'Transit'} alternative (estimate)</div>
                  <div className="mt-1 text-lg font-semibold text-green-700">
                    {selectedCommute.unit === 'car_km'
                      ? (Number(route.transitDistanceKm || 0) * 0.04).toFixed(2)
                      : (Number(route.transitDistanceKm || 0) * 0.04).toFixed(2)}{' '}
                    kg
                  </div>
                  <div className="text-sm text-gray-600">
                    {Number(route.transitDistanceKm || 0).toFixed(1)} km • metro/bus benchmark
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Savings shown use the TN metro/bus factor (0.04 kg/km) as a storytelling baseline.
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-500">
                Tip: click a commute row below to change the map.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <div className="text-sm font-medium text-gray-700">From</div>
            <input className="mt-1 w-full border rounded-xl px-3 py-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">To</div>
            <input className="mt-1 w-full border rounded-xl px-3 py-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Type</div>
            <select className="mt-1 w-full border rounded-xl px-3 py-2 bg-white" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All</option>
              <option value="commute">commute</option>
              <option value="energy">energy</option>
              <option value="food">food</option>
              <option value="shopping">shopping</option>
            </select>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Source</div>
            <select className="mt-1 w-full border rounded-xl px-3 py-2 bg-white" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">All</option>
              <option value="google_maps">google_maps</option>
              <option value="smart_meter">smart_meter</option>
              <option value="upi">upi</option>
              <option value="manual">manual</option>
            </select>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Search</div>
            <input
              className="mt-1 w-full border rounded-xl px-3 py-2"
              placeholder="unit / type / source / purpose…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') load(1);
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-gray-500">
            {loading ? 'Loading…' : `${meta.total} records`}
            {error ? <span className="ml-2 text-red-600">{error}</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <select className="border rounded-xl px-3 py-2 bg-white" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
              disabled={loading || page <= 1}
              onClick={() => load(page - 1)}
            >
              Prev
            </button>
            <div className="text-sm font-medium">
              Page {page} / {meta.pages}
            </div>
            <button
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
              disabled={loading || page >= meta.pages}
              onClick={() => load(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <div className="text-lg font-semibold">Ledger</div>
          <div className="text-sm text-gray-500">Most recent first.</div>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-gray-500">Loading activities…</div>
        ) : items.length === 0 ? (
          <div className="p-5 text-sm text-gray-500">No activities for this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Recorded</th>
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  <th className="text-left px-5 py-3 font-medium">Source</th>
                  <th className="text-left px-5 py-3 font-medium">Value</th>
                  <th className="text-left px-5 py-3 font-medium">Unit</th>
                  <th className="text-left px-5 py-3 font-medium">CO₂ (kg)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr
                    key={a._id}
                    className={`border-t cursor-pointer ${selectedCommute?._id === a._id ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}
                    onClick={() => {
                      if (a.type === 'commute' && a.metadata?.route?.actualRoute?.length) setSelectedCommute(a);
                    }}
                    title={a.type === 'commute' ? 'Click to view on map (if available)' : ''}
                  >
                    <td className="px-5 py-3 whitespace-nowrap">{fmt(a.recordedAt)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                        {a.type}
                      </span>
                    </td>
                    <td className="px-5 py-3">{a.source}</td>
                    <td className="px-5 py-3">{Number(a.valueRaw || 0).toFixed(2)}</td>
                    <td className="px-5 py-3">{a.unit}</td>
                    <td className="px-5 py-3 font-semibold">{Number(a.co2Kg || 0).toFixed(3)}</td>
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

