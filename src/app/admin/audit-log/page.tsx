'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

type Source = 'all' | 'admin' | 'review';

type AuditEvent = {
  id: string;
  source: 'admin' | 'review';
  occurred_at: string;
  actor_user_id?: string;
  actor_email?: string;
  actor_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  params?: Record<string, any>;
  diff?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
};

const SOURCE_LABELS: Record<Source, string> = {
  all: 'All',
  admin: 'Admin',
  review: 'Review',
};

export default function AdminAuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actor, setActor] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (source !== 'all') params.set('source', source);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (actor) params.set('actor', actor);
      if (entity) params.set('entity', entity);
      if (action) params.set('action', action);
      const r = await fetch(`/api/admin/audit-log?${params.toString()}`);
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setEvents(j.events || []);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const haystack = [
        e.id,
        e.source,
        e.action,
        e.entity_type,
        e.entity_id,
        e.entity_name,
        e.actor_user_id,
        e.actor_email,
        e.actor_role,
        JSON.stringify(e.params || {}),
        JSON.stringify(e.diff || {}),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [events, search]);

  const summary = useMemo(() => {
    const counts = {
      admin: 0,
      review: 0,
      system: 0,
      delete: 0,
      update: 0,
      role: 0,
    };
    for (const e of events) {
      counts[e.source] = (counts[e.source] || 0) + 1;
      if (e.action.toLowerCase().includes('delete')) counts.delete += 1;
      if (e.action.toLowerCase().includes('update') || e.action.toLowerCase().includes('set')) counts.update += 1;
      if (e.action.toLowerCase().includes('role')) counts.role += 1;
    }
    return counts;
  }, [events]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('format', 'csv');
    if (source !== 'all') params.set('source', source);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (actor) params.set('actor', actor);
    if (entity) params.set('entity', entity);
    if (action) params.set('action', action);
    return `/api/admin/audit-log?${params.toString()}`;
  }, [source, from, to, actor, entity, action]);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1><span aria-hidden="true">🧾</span> Audit Log</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
            Unified timeline of admin writes and review edits. Admin actions are coarse-grained; review edits show field-level diffs.
          </p>
        </div>
        <a href={exportHref} className="admin-btn admin-btn-secondary">⬇️ Export CSV</a>
      </div>

      {error && (
        <div className="mb-4 bg-rose-400/10 border border-rose-400/20 text-rose-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Admin Events" value={summary.admin} color="text-teal-400" />
        <SummaryCard label="Review Edits" value={summary.review} color="text-blue-400" />
        <SummaryCard label="Deletes" value={summary.delete} color="text-rose-400" />
        <SummaryCard label="Role Changes" value={summary.role} color="text-amber-400" />
      </div>

      <div className="admin-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search actor, action, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as Source)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
          >
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
          />
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <input
            type="text"
            placeholder="Actor email/id"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
          <input
            type="text"
            placeholder="Entity type (posts, teams...)"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
          <input
            type="text"
            placeholder="Action (delete, set_league...)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
          <div className="flex gap-2">
            <button onClick={() => load()} className="admin-btn admin-btn-primary flex-1">Apply</button>
            <button onClick={() => { setSearch(''); setSource('all'); setFrom(''); setTo(''); setActor(''); setEntity(''); setAction(''); }} className="admin-btn admin-btn-secondary flex-1">Reset</button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading audit events...</p>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">When</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Source</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Actor</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Action</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Entity</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No audit events match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-xs font-mono whitespace-nowrap">
                      {new Date(e.occurred_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        e.source === 'admin' ? 'bg-teal-400/10 text-teal-400' :
                        e.source === 'review' ? 'bg-blue-400/10 text-blue-400' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {e.source}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white text-xs">{e.actor_email || e.actor_user_id || 'system'}</div>
                      {e.actor_role && <div className="text-slate-500 text-xs">{e.actor_role}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-teal-400 font-medium">{e.action}</span>
                      {e.ip_address && <div className="text-slate-500 text-xs">{e.ip_address}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white text-xs">{e.entity_type}</div>
                      {e.entity_name && <div className="text-slate-500 text-xs">{e.entity_name}</div>}
                      {e.entity_id && <div className="text-slate-500 text-xs font-mono">{e.entity_id}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      <Details params={e.params} diff={e.diff} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-500">
        Showing {filtered.length} of {events.length} events ·{' '}
        <Link href="/admin/blog" className="text-teal-400 hover:text-teal-300">Blog</Link> ·{' '}
        <Link href="/admin/intake" className="text-teal-400 hover:text-teal-300">Intake</Link> ·{' '}
        <Link href="/admin/users" className="text-teal-400 hover:text-teal-300">Users</Link>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="admin-card p-4" style={{ marginBottom: 0 }}>
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function Details({ params, diff }: { params?: Record<string, any>; diff?: Record<string, any> | null }) {
  if (!params && !diff) return <span className="text-slate-500">—</span>;
  return (
    <pre className="whitespace-pre-wrap break-words max-w-md text-slate-400">
      {JSON.stringify({ ...(params || {}), ...(diff || {}) }, null, 2)}
    </pre>
  );
}
