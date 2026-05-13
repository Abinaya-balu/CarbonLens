import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios.js';
import ScoreCard from '../components/ScoreCard.jsx';
import TrendChart from '../components/TrendChart.jsx';
import ActivityBreakdown from '../components/ActivityBreakdown.jsx';
import NudgeFeed from '../components/NudgeFeed.jsx';
import ManualInput from '../components/ManualInput.jsx';
import GoalCard from '../components/GoalCard.jsx';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function formatToday() {
  return new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function startOfMonth(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtMonth(d) {
  const x = new Date(d);
  return x.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function cityBenchmarks(region) {
  // Static illustrative benchmarks (kg CO2/day). Adjusted slightly by region to feel contextual.
  const base = {
    Chennai: 7.4,
    Bengaluru: 8.1,
    Mumbai: 7.9,
  };
  const tweak = region === 'DL' ? 0.5 : region === 'MH' ? 0.2 : region === 'KA' ? 0.3 : 0;
  return Object.entries(base).map(([city, v]) => ({ city, kgPerDay: v + tweak }));
}

export default function Dashboard() {
  const [score, setScore] = useState(null);
  const [history, setHistory] = useState([]);
  const [nudges, setNudges] = useState([]);
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [syncing, setSyncing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');

  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeError, setNudgeError] = useState('');
  const [goalSaving, setGoalSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState({ enabled: false, subscribed: false, error: '' });

  async function loadAll() {
    setError('');
    setLoading(true);
    try {
      const [todayRes, histRes, nudgeRes, profileRes, achRes] = await Promise.all([
        api.get('/score/today'),
        api.get('/score/history?days=7'),
        api.get('/nudge'),
        api.get('/profile'),
        api.get('/achievement'),
      ]);
      if (!todayRes.data?.success) throw new Error(todayRes.data?.message || 'Failed to load score');
      if (!histRes.data?.success) throw new Error(histRes.data?.message || 'Failed to load history');
      if (!nudgeRes.data?.success) throw new Error(nudgeRes.data?.message || 'Failed to load nudges');
      if (!profileRes.data?.success) throw new Error(profileRes.data?.message || 'Failed to load profile');
      if (!achRes.data?.success) throw new Error(achRes.data?.message || 'Failed to load achievements');

      setScore(todayRes.data.data);
      setHistory(histRes.data.data.scores || []);
      setNudges(nudgeRes.data.data || []);
      setProfile(profileRes.data.data.user);
      setAchievements(achRes.data.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function doSync() {
    setSyncing(true);
    try {
      const res = await api.get('/ingest/sync');
      if (!res.data?.success) throw new Error(res.data?.message || 'Sync failed');
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function submitManual(payload) {
    setManualError('');
    setManualLoading(true);
    try {
      const res = await api.post('/ingest/manual', payload);
      if (!res.data?.success) throw new Error(res.data?.message || 'Save failed');
      setManualOpen(false);
      await loadAll();
    } catch (err) {
      setManualError(err?.response?.data?.message || err.message || 'Save failed');
    } finally {
      setManualLoading(false);
    }
  }

  async function markRead(id) {
    setNudgeError('');
    setNudgeLoading(true);
    try {
      const res = await api.patch(`/nudge/${id}/read`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed');
      setNudges((prev) => prev.map((n) => (n._id === id ? res.data.data : n)));
    } catch (err) {
      setNudgeError(err?.response?.data?.message || err.message || 'Failed to update nudge');
    } finally {
      setNudgeLoading(false);
    }
  }

  async function markActed(id) {
    setNudgeError('');
    setNudgeLoading(true);
    try {
      const res = await api.patch(`/nudge/${id}/acted`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed');
      setNudges((prev) => prev.map((n) => (n._id === id ? res.data.data : n)));
    } catch (err) {
      setNudgeError(err?.response?.data?.message || err.message || 'Failed to update nudge');
    } finally {
      setNudgeLoading(false);
    }
  }

  async function saveMonthlyGoal(nextGoalKg) {
    setGoalSaving(true);
    try {
      const res = await api.put('/profile', { monthlyGoalKg: nextGoalKg });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed');
      setProfile((p) => ({ ...(p || {}), monthlyGoalKg: res.data.data.monthlyGoalKg }));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save goal');
    } finally {
      setGoalSaving(false);
    }
  }

  async function ensurePushSubscribed() {
    setPushStatus((s) => ({ ...s, error: '' }));
    try {
      const vapidRes = await api.get('/push/vapidPublicKey');
      const enabled = Boolean(vapidRes.data?.data?.enabled);
      const vapidPublicKey = vapidRes.data?.data?.vapidPublicKey || '';
      if (!enabled || !vapidPublicKey) {
        setPushStatus({ enabled: false, subscribed: false, error: 'Push not configured on server (missing VAPID keys).' });
        return;
      }
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus({ enabled: true, subscribed: false, error: 'Push not supported in this browser.' });
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPushStatus({ enabled: true, subscribed: false, error: 'Notification permission denied.' });
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      let sub = existing;
      if (!sub) {
        const key = Uint8Array.from(atob(vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
      }

      await api.post('/push/subscribe', { ...sub.toJSON(), userAgent: navigator.userAgent });
      setPushStatus({ enabled: true, subscribed: true, error: '' });
    } catch (err) {
      setPushStatus((s) => ({ ...s, error: err?.response?.data?.message || err.message || 'Failed to subscribe to push' }));
    }
  }

  async function sendTestPush() {
    try {
      const res = await api.post('/push/test');
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed');
    } catch (err) {
      setPushStatus((s) => ({ ...s, error: err?.response?.data?.message || err.message || 'Test push failed' }));
    }
  }

  async function downloadMonthlyPdf() {
    const node = document.getElementById('carbonlens-monthly-report');
    if (!node) return;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let y = 0;
    pdf.addImage(img, 'PNG', 0, y, imgW, imgH);
    while (imgH - y > pageH) {
      y -= pageH;
      pdf.addPage();
      pdf.addImage(img, 'PNG', 0, y, imgW, imgH);
    }
    pdf.save(`CarbonLens-${new Date().toISOString().slice(0, 7)}.pdf`);
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-sm text-gray-500">Loading dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white border rounded-xl p-5">
          <div className="text-lg font-semibold">Something went wrong</div>
          <div className="mt-2 text-sm text-red-600">{error}</div>
          <button className="mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white" onClick={loadAll}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const region = profile?.region || 'TN';
  const bench = cityBenchmarks(region);
  const myAvg7 =
    history.length > 0 ? history.reduce((a, s) => a + Number(s.totalCo2Kg || 0), 0) / history.length : 0;
  const benchData = [
    { city: 'You', kgPerDay: Number(myAvg7.toFixed(2)) },
    ...bench.map((b) => ({ city: b.city, kgPerDay: Number(b.kgPerDay.toFixed(2)) })),
  ];

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthScores = history.filter((s) => new Date(s.date) >= monthStart);
  const monthTotal = monthScores.reduce((a, s) => a + Number(s.totalCo2Kg || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Overview</div>
          <div className="text-2xl font-semibold">Your footprint</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={doSync}
            disabled={syncing}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-60"
          >
            {syncing ? 'Syncing…' : 'Sync mock APIs'}
          </button>
          <button
            onClick={() => setManualOpen(true)}
            className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700"
          >
            Add manual activity
          </button>
        </div>
      </div>

      <ScoreCard
        totalCo2Kg={score?.totalCo2Kg || 0}
        trend={score?.trend}
        dateLabel={formatToday()}
        targetKg={profile?.dailyTargetKg || 5}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalCard
          historyScores={history}
          monthlyGoalKg={profile?.monthlyGoalKg || 0}
          onSaveGoal={saveMonthlyGoal}
          saving={goalSaving}
        />
        <div className="bg-white shadow-sm rounded-xl p-5 border">
          <div className="text-sm text-gray-500">Context</div>
          <div className="text-lg font-semibold">City comparison (static benchmarks)</div>
          <div className="text-sm text-gray-500 mt-1">
            Compare your last-7-day average vs illustrative city averages.
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={benchData} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="city" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} kg/day`, 'Avg']} />
                <Bar dataKey="kgPerDay" fill="#16a34a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Benchmarks are static demo numbers (no user data sharing).
          </div>
        </div>
      </div>

      <TrendChart scores={history} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm rounded-xl p-5 border">
          <div className="text-sm text-gray-500">Gamification</div>
          <div className="text-lg font-semibold">Streaks & badges</div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <div className="px-3 py-2 rounded-xl bg-gray-50 border">
              <div className="text-xs text-gray-500">Current streak</div>
              <div className="text-xl font-semibold">{profile?.streakDays || 0} days</div>
            </div>
            {(achievements || []).slice(0, 6).map((a) => (
              <div key={a._id} className="px-3 py-2 rounded-xl border bg-white">
                <div className="text-sm font-semibold">{a.name}</div>
                <div className="text-xs text-gray-500">{a.description}</div>
              </div>
            ))}
            {achievements?.length === 0 ? (
              <div className="text-sm text-gray-500">No badges yet. Stay under target and sync daily.</div>
            ) : null}
          </div>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-5 border">
          <div className="text-sm text-gray-500">Notifications</div>
          <div className="text-lg font-semibold">Web Push (PWA)</div>
          <div className="mt-2 text-sm text-gray-500">
            Get a daily score notification even when the tab is closed.
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={ensurePushSubscribed}
              className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700"
            >
              Enable push
            </button>
            <button
              onClick={sendTestPush}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800"
            >
              Send test
            </button>
          </div>
          <div className="mt-3 text-sm">
            <span className="font-medium">Status:</span>{' '}
            {pushStatus.subscribed ? (
              <span className="text-green-700 font-medium">Subscribed</span>
            ) : pushStatus.enabled ? (
              <span className="text-amber-700 font-medium">Not subscribed</span>
            ) : (
              <span className="text-gray-600 font-medium">Disabled</span>
            )}
          </div>
          {pushStatus.error ? <div className="mt-2 text-sm text-red-600">{pushStatus.error}</div> : null}
          <div className="mt-2 text-xs text-gray-500">
            Requires HTTPS in production and VAPID keys on server.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityBreakdown score={score} />
        <NudgeFeed
          nudges={nudges}
          onMarkRead={markRead}
          onMarkActed={markActed}
          loading={nudgeLoading}
          error={nudgeError}
        />
      </div>

      <ManualInput
        open={manualOpen}
        onClose={() => {
          setManualError('');
          setManualOpen(false);
        }}
        onSubmit={submitManual}
        loading={manualLoading}
        error={manualError}
      />

      <div className="bg-white shadow-sm rounded-xl p-5 border" id="carbonlens-monthly-report">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500">Monthly report</div>
            <div className="text-lg font-semibold">{fmtMonth(new Date())}</div>
            <div className="text-sm text-gray-500 mt-1">One-click PDF export (frontend-only).</div>
          </div>
          <button
            onClick={downloadMonthlyPdf}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800"
          >
            Download PDF
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-gray-50 border p-4">
            <div className="text-xs text-gray-500">Month total</div>
            <div className="text-xl font-semibold">{monthTotal.toFixed(1)} kg</div>
          </div>
          <div className="rounded-xl bg-gray-50 border p-4">
            <div className="text-xs text-gray-500">Top category</div>
            <div className="text-xl font-semibold">
              {['commute', 'energy', 'food', 'shopping']
                .map((k) => [k, Number(score?.[`${k}Co2`] || 0)])
                .sort((a, b) => b[1] - a[1])[0]?.[0] || '—'}
            </div>
          </div>
          <div className="rounded-xl bg-gray-50 border p-4">
            <div className="text-xs text-gray-500">Nudges acted on</div>
            <div className="text-xl font-semibold">{nudges.filter((n) => n.isActedOn).length}</div>
          </div>
          <div className="rounded-xl bg-gray-50 border p-4">
            <div className="text-xs text-gray-500">Monthly goal</div>
            <div className="text-xl font-semibold">
              {(profile?.monthlyGoalKg || 0) > 0 ? `${Number(profile.monthlyGoalKg).toFixed(0)} kg` : '—'}
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-700">
          Top 3 nudges acted on:
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            {nudges
              .filter((n) => n.isActedOn)
              .slice(0, 3)
              .map((n) => (
                <li key={n._id}>{n.content}</li>
              ))}
            {nudges.filter((n) => n.isActedOn).length === 0 ? <li>None yet</li> : null}
          </ol>
        </div>
      </div>
    </div>
  );
}

