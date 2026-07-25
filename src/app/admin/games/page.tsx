import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Game {
  id: string;
  league_id: string;
  league_name: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  scheduled_at: string;
  home_team_id: string;
  away_team_id: string;
}

async function getRecentGames(limit = 50): Promise<Game[]> {
  const { data } = await supabaseAdmin
    .from('fixtures')
    .select(`
      id,
      league_id,
      status,
      home_score,
      away_score,
      scheduled_at,
      home_team_id,
      away_team_id,
      leagues:league_id (name)
    `)
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (!data) return [];

  // Get team names
  const teamIds = new Set<string>();
  for (const g of data) {
    if (g.home_team_id) teamIds.add(g.home_team_id);
    if (g.away_team_id) teamIds.add(g.away_team_id);
  }

  const { data: teams } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, name')
    .in('id', Array.from(teamIds));

  const teamMap = new Map(teams?.map((t) => [t.id, t.name]) || []);

  return data.map((g: any) => ({
    id: g.id,
    league_id: g.league_id,
    league_name: g.leagues?.name || 'Unknown',
    home_team_name: teamMap.get(g.home_team_id) || '(no team)',
    away_team_name: teamMap.get(g.away_team_id) || '(no team)',
    home_score: g.home_score,
    away_score: g.away_score,
    status: g.status,
    scheduled_at: g.scheduled_at,
    home_team_id: g.home_team_id,
    away_team_id: g.away_team_id,
  }));
}

function isPhantom(g: Game): boolean {
  if (g.status !== 'scheduled') return false;
  if (new Date(g.scheduled_at) > new Date()) return false;
  return g.home_score === null || g.away_score === null;
}

function isOrphan(g: Game): boolean {
  if (g.status !== 'scheduled') return false;
  const days = (Date.now() - new Date(g.scheduled_at).getTime()) / (1000 * 60 * 60 * 24);
  return days > 30 && g.home_score === 0 && g.away_score === 0;
}

export default async function GamesPage() {
  const games = await getRecentGames(100);

  const phantoms = games.filter(isPhantom);
  const orphans = games.filter(isOrphan);
  const completed = games.filter((g) => g.status === 'completed' || g.status === 'final');

  return (
    <div>
      <div className="page-header">
        <h1><span aria-hidden="true">🎮</span> Games</h1>
        <p>Most recent 100 fixtures across all leagues</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="admin-card p-4" style={{ marginBottom: 0 }}>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total</div>
          <div className="text-2xl font-bold text-white">{games.length}</div>
        </div>
        <div className="admin-card p-4" style={{ marginBottom: 0 }}>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Completed</div>
          <div className="text-2xl font-bold text-teal-400">{completed.length}</div>
        </div>
        <div className="admin-card p-4" style={{ marginBottom: 0 }}>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Phantoms</div>
          <div className={`text-2xl font-bold ${phantoms.length > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{phantoms.length}</div>
        </div>
        <div className="admin-card p-4" style={{ marginBottom: 0 }}>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Orphans</div>
          <div className={`text-2xl font-bold ${orphans.length > 0 ? 'text-rose-400' : 'text-slate-500'}`}>{orphans.length}</div>
        </div>
      </div>

      {/* Games table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-3 px-4">League</th>
              <th className="text-left py-3 px-4">Matchup</th>
              <th className="text-right py-3 px-4">Score</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Scheduled</th>
              <th className="text-left py-3 px-4">Flags</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => {
              const phantom = isPhantom(g);
              const orphan = isOrphan(g);
              return (
                <tr key={g.id}>
                  <td className="py-2 px-4 text-slate-400 text-xs">{g.league_name}</td>
                  <td className="py-2 px-4 text-white">
                    <div className="font-medium">{g.away_team_name}</div>
                    <div className="text-xs text-slate-500">@ {g.home_team_name}</div>
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-white">
                    {g.home_score !== null && g.away_score !== null
                      ? `${g.away_score}-${g.home_score}`
                      : '—'}
                  </td>
                  <td className="py-2 px-4">
                    <span className={`admin-pill ${
                      g.status === 'completed' || g.status === 'final'
                        ? 'admin-pill-success'
                        : 'admin-pill-neutral'
                    }`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-slate-400 text-xs font-mono">
                    {new Date(g.scheduled_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex gap-1">
                      {phantom && (
                        <span className="admin-pill admin-pill-warning">Phantom</span>
                      )}
                      {orphan && (
                        <span className="admin-pill admin-pill-error">Orphan</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-xs text-slate-500 flex items-center justify-between">
        <div>
          Showing {games.length} games ·{' '}
          <Link href="/admin/data-quality" className="text-teal-400 hover:text-teal-300">
            View data quality report →
          </Link>
        </div>
        <div>Last updated: {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>
      </div>
    </div>
  );
}
