'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BulkActionBar from '@/components/admin/BulkActionBar';

interface Rink {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  slug: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  initialRinks: Rink[];
  states: string[];
  initialSearch: string;
  initialState: string;
}

export default function RinksTable({ initialRinks, states, initialSearch, initialState }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [rinks] = useState<Rink[]>(initialRinks);
  const [search, setSearch] = useState(initialSearch);
  const [state, setState] = useState(initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function updateUrl(next: { search?: string; state?: string }) {
    const params = new URLSearchParams(sp);
    if (next.search !== undefined) {
      if (next.search) params.set('search', next.search);
      else params.delete('search');
    }
    if (next.state !== undefined) {
      if (next.state) params.set('state', next.state);
      else params.delete('state');
    }
    router.push(`/admin/rinks?${params.toString()}`);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== initialSearch) updateUrl({ search });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = useMemo(() => {
    return rinks.filter((r) => {
      if (state && r.state !== state) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!r.name.toLowerCase().includes(s) && !(r.city || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [rinks, search, state]);

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search rinks by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
        />
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            updateUrl({ state: e.target.value });
          }}
          className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
        >
          <option value="">All states ({states.length})</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="text-left py-3 px-4 w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((r) => selected.has(r.id))}
                  onChange={() => {
                    const allSelected = filtered.every((r) => selected.has(r.id));
                    const next = new Set(selected);
                    if (allSelected) {
                      filtered.forEach((r) => next.delete(r.id));
                    } else {
                      filtered.forEach((r) => next.add(r.id));
                    }
                    setSelected(next);
                  }}
                  className="rounded border-slate-700"
                  title="Select all visible"
                />
              </th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Rink</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Location</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Geocoded</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Updated</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No rinks match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  style={selected.has(r.id) ? { background: 'rgba(45,212,191,0.06)' } : undefined}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => {
                        const next = new Set(selected);
                        if (next.has(r.id)) next.delete(r.id);
                        else next.add(r.id);
                        setSelected(next);
                      }}
                      className="rounded border-slate-700"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-white">{r.name}</div>
                    {r.slug && <div className="text-xs text-slate-500 font-mono">/{r.slug}</div>}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">
                    {[r.city, r.state, r.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {r.latitude !== null && r.longitude !== null ? (
                      <span className="text-teal-400 font-mono">
                        {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-amber-400">⚠ Not geocoded</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs font-mono">
                    {r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={`/admin/rinks/${r.id}`}
                      className="text-teal-400 hover:text-teal-300 text-xs font-medium"
                    >
                      Edit →
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BulkActionBar
        entity="rinks"
        selected={selected}
        onClear={() => setSelected(new Set())}
        onComplete={() => window.location.reload()}
      />

      <div className="mt-4 text-xs text-slate-500 text-right">
        Showing {filtered.length} of {rinks.length} rinks
      </div>
    </div>
  );
}
