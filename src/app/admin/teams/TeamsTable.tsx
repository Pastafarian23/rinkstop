'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Team {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  league_id: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
  leagues: { name: string; slug: string } | null;
}

interface League {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  initialTeams: Team[];
  leagues: League[];
  initialSearch: string;
  initialLeagueId: string;
  initialWrongLeague: boolean;
}

export default function TeamsTable({ initialTeams, leagues, initialSearch, initialLeagueId, initialWrongLeague }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [teams] = useState<Team[]>(initialTeams);
  const [search, setSearch] = useState(initialSearch);
  const [leagueId, setLeagueId] = useState(initialLeagueId);
  const [wrongLeague, setWrongLeague] = useState(initialWrongLeague);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Live search/filter — push to URL so admin can share/bookmark
  function updateUrl(next: { search?: string; leagueId?: string; wrongLeague?: boolean }) {
    const params = new URLSearchParams(sp);
    if (next.search !== undefined) {
      if (next.search) params.set('search', next.search);
      else params.delete('search');
    }
    if (next.leagueId !== undefined) {
      if (next.leagueId) params.set('leagueId', next.leagueId);
      else params.delete('leagueId');
    }
    if (next.wrongLeague !== undefined) {
      if (next.wrongLeague) params.set('wrongLeague', '1');
      else params.delete('wrongLeague');
    }
    router.push(`/admin/teams?${params.toString()}`);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== initialSearch) updateUrl({ search });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = useMemo(() => {
    return teams.filter((t) => {
      if (leagueId && t.league_id !== leagueId) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!t.name.toLowerCase().includes(s) && !(t.city || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [teams, search, leagueId]);

  return (
    <div>
      {auditError && (
        <div className="mb-4 bg-rose-400/10 border border-rose-400/20 text-rose-400 px-4 py-3 rounded-lg text-sm">
          {auditError}
        </div>
      )}

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search teams by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
        />
        <select
          value={leagueId}
          onChange={(e) => {
            setLeagueId(e.target.value);
            updateUrl({ leagueId: e.target.value });
          }}
          className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
        >
          <option value="">All leagues ({leagues.length})</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700">
          <input
            type="checkbox"
            checked={wrongLeague}
            onChange={(e) => {
              setWrongLeague(e.target.checked);
              updateUrl({ wrongLeague: e.target.checked });
            }}
            className="rounded border-slate-700"
          />
          Show wrong-league only
        </label>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Team</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">League</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Location</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Updated</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  No teams match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-white">{t.name}</div>
                    {t.slug && <div className="text-xs text-slate-500 font-mono">/{t.slug}</div>}
                  </td>
                  <td className="py-3 px-4">
                    {t.leagues ? (
                      <span className="inline-block bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">
                        {t.leagues.name}
                      </span>
                    ) : (
                      <span className="text-amber-400 text-xs">⚠ Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">
                    {[t.city, t.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs font-mono">
                    {t.updated_at ? new Date(t.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={`/admin/teams/${t.id}`}
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

      <div className="mt-4 text-xs text-slate-500 text-right">
        Showing {filtered.length} of {teams.length} teams
      </div>
    </div>
  );
}
