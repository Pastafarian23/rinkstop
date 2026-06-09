import { supabaseAdmin } from '@/lib/supabase';
import TeamsTable from './TeamsTable';

export const dynamic = 'force-dynamic';

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

async function getTeamsData(search?: string, leagueId?: string, wrongLeague?: boolean) {
  let query = supabaseAdmin
    .from('teams')
    .select('id, name, city, country, league_id, slug, created_at, updated_at, leagues!teams_league_id_fkey(name, slug)', { count: 'exact' });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }
  if (leagueId) {
    query = query.eq('league_id', leagueId);
  }
  query = query.order('name', { ascending: true }).range(0, 999);

  const { data, count } = await query;

  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name, slug')
    .order('name', { ascending: true });

  return {
    teams: (data || []) as unknown as Team[],
    total: count || 0,
    leagues: (leagues || []) as League[],
  };
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; leagueId?: string; wrongLeague?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.search?.trim() || '';
  const leagueId = sp.leagueId || '';
  const wrongLeague = sp.wrongLeague === '1';

  const { teams, total, leagues } = await getTeamsData(search, leagueId, wrongLeague);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Teams</h1>
      <p className="text-slate-400 mb-8">
        Manage team metadata and league assignments. League changes are super-admin only.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Teams</div>
          <div className="text-2xl font-bold text-white">{total.toLocaleString()}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Assigned to League</div>
          <div className="text-2xl font-bold text-teal-400">
            {teams.filter((t) => t.league_id).length.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Unassigned</div>
          <div className={`text-2xl font-bold ${teams.some((t) => !t.league_id) ? 'text-amber-400' : 'text-slate-500'}`}>
            {teams.filter((t) => !t.league_id).length.toLocaleString()}
          </div>
        </div>
      </div>

      <TeamsTable
        initialTeams={teams}
        leagues={leagues}
        initialSearch={search}
        initialLeagueId={leagueId}
        initialWrongLeague={wrongLeague}
      />
    </div>
  );
}
