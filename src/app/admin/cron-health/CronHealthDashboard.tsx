'use client';

import { useState, useCallback, useEffect } from 'react';

interface CronSnapshot {
  id: string;
  name: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  failedLast24h: number;
}

interface Snapshot {
  id: string;
  captured_at: string;
  crons: CronSnapshot[];
  total_crons: number;
  healthy_count: number;
  failed_last_24h: number;
  source: string;
}

interface Props {
  initial: { data?: { latest: Snapshot | null; history: Snapshot[]; message?: string }; error?: string };
}

const STATUS_COLORS: Record<string, string> = {
  ok: 'text-teal-400',
  success: 'text-teal-400',
  completed: 'text-teal-400',
  failed: 'text-rose-400',
  error: 'text-rose-400',
  unknown: 'text-slate-500',
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const sec = Math.floor(Date.now() / 1000 - new Date(iso).getTime() / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function CronHealthDashboard({ initial }: Props) {
  const [latest, setLatest] = useState<Snapshot | null>(initial.data?.latest || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initial.error || null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/cron-health');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setLatest(j.latest);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  if (error && !latest) {
    return (
      <div className="bg-rose-400/10 border border-rose-400/20 text-rose-400 px-4 py-3 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
        <p className="text-slate-300 mb-2">No snapshots yet</p>
        <p className="text-slate-500 text-sm">
          The <code className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">scripts/collect-cron-health.js</code> collector
          needs to run at least once. Add it to the gateway scheduler (every 5 min recommended).
        </p>
      </div>
    );
  }

  const unhealthy = latest.crons.filter((c) => c.lastRunStatus !== 'ok' && c.lastRunStatus !== 'success' && c.lastRunStatus !== null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs text-slate-500 font-mono">
          Last snapshot: {timeAgo(latest.captured_at)} ({new Date(latest.captured_at).toLocaleString('en-US')})
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-white text-xs rounded transition-colors"
        >
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Stat label="Total Crons" value={latest.total_crons.toString()} sub="active jobs" />
        <Stat label="Healthy" value={latest.healthy_count.toString()} color="text-teal-400" sub="last run OK" />
        <Stat
          label="Unhealthy"
          value={unhealthy.length.toString()}
          color={unhealthy.length > 0 ? 'text-rose-400' : 'text-slate-500'}
          sub="last run not OK"
        />
        <Stat
          label="Failures (24h)"
          value={latest.failed_last_24h.toString()}
          color={latest.failed_last_24h > 0 ? 'text-rose-400' : 'text-teal-400'}
          sub="all crons combined"
        />
      </div>

      {unhealthy.length > 0 && (
        <div className="bg-rose-400/10 border border-rose-400/20 text-rose-400 px-4 py-3 rounded-lg mb-6 text-sm">
          ⚠ {unhealthy.length} cron{unhealthy.length === 1 ? '' : 's'} not healthy: {unhealthy.map((c) => c.name).join(', ')}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Cron</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Last Run</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Status</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Failed (24h)</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">ID</th>
            </tr>
          </thead>
          <tbody>
            {latest.crons.map((c) => (
              <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 text-white">{c.name}</td>
                <td className="py-3 px-4 text-slate-400 text-xs font-mono">{timeAgo(c.lastRunAt)}</td>
                <td className={`py-3 px-4 text-xs uppercase ${STATUS_COLORS[c.lastRunStatus || 'unknown'] || 'text-slate-500'}`}>
                  {c.lastRunStatus || 'never'}
                </td>
                <td className={`py-3 px-4 text-right text-sm font-mono ${c.failedLast24h > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {c.failedLast24h}
                </td>
                <td className="py-3 px-4 text-right text-slate-500 text-xs font-mono">{c.id.slice(0, 8)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, color = 'text-white', sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
