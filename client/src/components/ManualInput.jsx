import React, { useMemo, useState } from 'react';

const TYPE_OPTIONS = [
  { value: 'commute', label: 'Commute' },
  { value: 'energy', label: 'Energy' },
  { value: 'food', label: 'Food' },
  { value: 'shopping', label: 'Shopping' },
];

function unitOptionsFor(type) {
  if (type === 'commute') {
    return [
      { value: 'car_km', label: 'Car (km)' },
      { value: 'metro_km', label: 'Metro (km)' },
      { value: 'bike_km', label: 'Bike (km)' },
    ];
  }
  if (type === 'energy') return [{ value: 'kwh', label: 'kWh' }];
  if (type === 'food') {
    return [
      { value: 'meal_veg', label: 'Veg meal (count)' },
      { value: 'meal_nonveg', label: 'Non-veg meal (count)' },
    ];
  }
  if (type === 'shopping') return [{ value: 'inr_1000', label: '₹1000 blocks (count)' }];
  return [];
}

export default function ManualInput({ open, onClose, onSubmit, loading, error }) {
  const [type, setType] = useState('commute');
  const units = useMemo(() => unitOptionsFor(type), [type]);
  const [unit, setUnit] = useState(units[0]?.value || 'car_km');
  const [valueRaw, setValueRaw] = useState('');
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 10));

  React.useEffect(() => {
    setUnit(unitOptionsFor(type)[0]?.value || '');
  }, [type]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-20 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Manual fallback</div>
            <div className="text-lg font-semibold">Log activity</div>
          </div>
          <button className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={onClose}>
            Close
          </button>
        </div>

        <form
          className="p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(valueRaw);
            if (!type || !unit || Number.isNaN(n) || n <= 0) return;
            onSubmit?.({
              type,
              unit,
              valueRaw: n,
              recordedAt: new Date(recordedAt).toISOString(),
              metadata: {},
            });
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select
                className="mt-1 w-full border rounded-xl px-3 py-2 bg-white"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Sub-type / unit</label>
              <select
                className="mt-1 w-full border rounded-xl px-3 py-2 bg-white"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {units.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Value</label>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                placeholder={type === 'shopping' ? 'e.g. 2 (₹2000)' : 'e.g. 12.5'}
                value={valueRaw}
                onChange={(e) => setValueRaw(e.target.value)}
                inputMode="decimal"
              />
              <div className="mt-1 text-xs text-gray-500">
                {type === 'commute'
                  ? 'Distance in km'
                  : type === 'energy'
                    ? 'Energy usage in kWh'
                    : type === 'food'
                      ? 'Number of meals'
                      : 'Number of ₹1000 blocks'}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Date</label>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                type="date"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
              />
            </div>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

