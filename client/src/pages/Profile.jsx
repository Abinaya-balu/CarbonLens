import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? 'bg-green-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function fmt(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function Profile() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/profile');
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load profile');
      setProfile(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(update) {
    setMessage('');
    setError('');
    setSaving(true);
    try {
      const res = await api.put('/profile', update);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to save profile');
      setMessage(res.data.message || 'Saved');
      await load();
      login({ token: localStorage.getItem('carbonlens_token'), user: { ...user, ...res.data.data } });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-sm text-gray-500">Loading profile…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white border rounded-xl p-5">
          <div className="text-lg font-semibold">Profile</div>
          <div className="mt-2 text-sm text-red-600">{error}</div>
          <button className="mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const u = profile?.user;
  const integ = profile?.integrations || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <div className="text-sm text-gray-500">Settings</div>
        <div className="text-2xl font-semibold">Profile & Integrations</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white shadow-sm rounded-xl p-5">
          <div className="text-lg font-semibold">Integrations</div>
          <div className="mt-1 text-sm text-gray-500">Toggle mock integrations on/off.</div>

          <div className="mt-4 space-y-3">
            {[
              { key: 'mapsLinked', provider: 'google_maps', title: 'Google Maps', subtitle: 'Commute data' },
              { key: 'smartMeterLinked', provider: 'smart_meter', title: 'Smart Meter', subtitle: 'Energy usage' },
              { key: 'upiLinked', provider: 'upi', title: 'UPI / Bank', subtitle: 'Food & shopping (mocked)' },
            ].map((c) => (
              <div key={c.key} className="border rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium">{c.title}</div>
                  <div className="text-sm text-gray-500">{c.subtitle}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Last synced: <span className="font-medium">{fmt(integ?.[c.provider]?.lastSyncedAt)}</span>
                  </div>
                </div>
                <Toggle
                  checked={Boolean(u?.[c.key])}
                  onChange={(next) => save({ [c.key]: next })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-xl p-5">
          <div className="text-lg font-semibold">Account</div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-700">Name</div>
              <div className="mt-1 text-sm text-gray-900">{u?.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Email</div>
              <div className="mt-1 text-sm text-gray-900">{u?.email}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Region</div>
              <select
                className="mt-1 w-full border rounded-xl px-3 py-2 bg-white"
                value={u?.region || 'TN'}
                onChange={(e) => save({ region: e.target.value })}
                disabled={saving}
              >
                <option value="TN">TN</option>
                <option value="MH">MH</option>
                <option value="DL">DL</option>
                <option value="KA">KA</option>
              </select>
              <div className="mt-1 text-xs text-gray-500">
                Emission factors are region-aware.
              </div>
            </div>

            {message ? <div className="text-sm text-green-700">{message}</div> : null}
            {saving ? <div className="text-sm text-gray-500">Saving…</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

