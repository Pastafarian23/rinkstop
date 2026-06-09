import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import TeamEditForm from './TeamEditForm';

export const dynamic = 'force-dynamic';

interface League {
  id: string;
  name: string;
  slug: string;
}

async function getTeam(id: string) {
  const { data: team } = await supabaseAdmin
    .from('teams')
    .select('*, leagues!teams_league_id_fkey(id, name, slug)')
    .eq('id', id)
    .maybeSingle();

  if (!team) return null;

  const { count: claimsCount } = await supabaseAdmin
    .from('team_claims')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', id)
    .eq('status', 'approved');

  const { data: fixtures } = await supabaseAdmin
    .from('fixtures')
    .select('id, game_date, status, home_team_id, away_team_id, home_score, away_score')
    .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
    .order('game_date', { ascending: false })
    .limit(10);

  return { team, claimsCount: claimsCount || 0, fixtures: fixtures || [] };
}

export default async function TeamEditPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const data = await getTeam(id);
  if (!data) notFound();

  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name, slug')
    .order('name', { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/teams" className="text-slate-400 hover:text-white text-sm">← Back to Teams</a>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">{data.team.name}</h1>
      <p className="text-slate-400 mb-8 text-sm font-mono">{data.team.id}</p>

      <TeamEditForm
        team={data.team}
        leagues={(leagues || []) as League[]}
        isSuperAdmin={admin.isSuperAdmin}
      />

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Claims</h3>
          <div className="text-3xl font-bold text-white">{data.claimsCount}</div>
          <p className="text-xs text-slate-500 mt-1">approved claims on this team</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Recent Fixtures</h3>
          {data.fixtures.length === 0 ? (
            <p className="text-slate-500 text-sm">No fixtures yet</p>
          ) : (
            <ul className="text-xs space-y-1.5 max-h-40 overflow-y-auto">
              {data.fixtures.slice(0, 5).map((f: any) => (
                <li key={f.id} className="text-slate-400 font-mono">
                  {new Date(f.game_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  {' '}
                  <span className={f.status === 'completed' ? 'text-teal-400' : 'text-amber-400'}>
                    {f.status}
                  </span>
                  {' '}
                  {f.home_score !== null && f.away_score !== null ? `${f.home_score}-${f.away_score}` : '—'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
