import React from 'react';

const CAT = {
  commute: { label: 'Commute', color: 'bg-green-50 text-green-700 border-green-200' },
  energy: { label: 'Energy', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  food: { label: 'Food', color: 'bg-red-50 text-red-700 border-red-200' },
  shopping: { label: 'Shopping', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export default function NudgeFeed({ nudges, onMarkRead, onMarkActed, loading, error }) {
  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">AI Coach</div>
          <div className="text-lg font-semibold">Nudges</div>
        </div>
        <div className="text-xs text-gray-500">Latest 5</div>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="text-sm text-gray-500">Loading nudges…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : nudges?.length ? (
          nudges.map((n) => {
            const c = CAT[n.category] || CAT.energy;
            return (
              <div key={n._id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded-lg ${c.color}`}>
                        {c.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        Save ~{Number(n.potentialSavingKg || 0).toFixed(1)} kg
                      </span>
                      {!n.isRead ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-900 text-white">
                          New
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm text-gray-900">{n.content}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200"
                    onClick={() => onMarkRead?.(n._id)}
                    disabled={n.isRead}
                  >
                    {n.isRead ? 'Read' : 'Mark read'}
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700"
                    onClick={() => onMarkActed?.(n._id)}
                    disabled={n.isActedOn}
                  >
                    {n.isActedOn ? 'Done' : "I'll do it"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-gray-500">No nudges yet. Sync or add activities to generate insights.</div>
        )}
      </div>
    </div>
  );
}

