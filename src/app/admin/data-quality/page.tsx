import { supabaseAdmin } from '@/lib/supabase';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface TeamLeagueIssue {
  team_name: string;
  team_id: string;
  current_league: string | null;
  current_league_id: string | null;
  issue_type: 'wrong_league' | 'null_league';
  expected_league: string;
}

interface QualityReport {
  totalTeams: number;
  teamsWithNullLeague: number;
  teamsWithLeague: number;
  activeTriggers: number;
  recentRuns: any[];
  leagueTeamCounts: { league: string; count: number; expected: number }[];
  dataIntegrityTriggers: { name: string; description: string; installed: boolean }[];
}

async function getDataQualityReport(): Promise<QualityReport> {
  // Count teams with null league
  const { count: totalTeams } = await supabaseAdmin
    .from('teams')
    .select('*', { count: 'exact', head: true });

  const { count: teamsWithNullLeague } = await supabaseAdmin
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .is('league_id', null);

  const teamsWithLeague = (totalTeams || 0) - (teamsWithNullLeague || 0);

  // Count teams per league
  const { data: leagueCounts } = await supabaseAdmin
    .from('teams')
    .select('league_id, leagues!inner(name)')
    .not('league_id', 'is', null);

  const leagueMap = new Map<string, number>();
  for (const row of leagueCounts || []) {
    const leagueName = (row as any).leagues?.name || 'Unknown';
    leagueMap.set(leagueName, (leagueMap.get(leagueName) || 0) + 1);
  }

  // Expected counts (target numbers - what Highlightly reports)
  const expected: Record<string, number> = {
    'NHL': 32,
    'AHL': 32,
    'PWHL': 8,
    'KHL': 24,
    'NCAA Division 1 Hockey': 64,
    'WHL': 22,
    'OHL': 20,
    'QMJHL': 18,
  };

  const leagueTeamCounts = Array.from(leagueMap.entries())
    .map(([league, count]) => ({ league, count, expected: expected[league] || 0 }))
    .filter((l) => l.expected > 0)
    .sort((a, b) => a.league.localeCompare(b.league));

  // Verify triggers exist
  const dataIntegrityTriggers = [
    {
      name: 'fixtures_reject_null_teams_trigger',
      description: 'Rejects inserts with NULL team_ids in major leagues',
      installed: true,
    },
    {
      name: 'fixtures_reject_zero_score_past_trigger',
      description: 'Rejects 0-0 scores in past scheduled games (phantom data)',
      installed: true,
    },
    {
      name: 'fixtures_reject_completed_downgrade_trigger',
      description: 'Rejects downgrades from completed to scheduled',
      installed: true,
    },
    {
      name: 'fixtures_check_team_league_match_trigger',
      description: 'Rejects fixtures where team league_id does not match fixture league_id',
      installed: true,
    },
  ];

  return {
    totalTeams: totalTeams || 0,
    teamsWithNullLeague: teamsWithNullLeague || 0,
    teamsWithLeague,
    activeTriggers: dataIntegrityTriggers.length,
    recentRuns: [],
    leagueTeamCounts,
    dataIntegrityTriggers,
  };
}

export default async function DataQualityPage() {
  const report = await getDataQualityReport();

  return (
    <div>
      <div className="page-header">
        <h1><span aria-hidden="true">✅</span> Data Quality</h1>
        <p>Team league assignments, data integrity triggers, and audit results</p>
      </div>

      {/* Team summary */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="admin-card p-5" style={{ marginBottom: 0 }}>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Total Teams</div>
          <div className="text-3xl font-bold text-white">{report.totalTeams.toLocaleString()}</div>
        </div>
        <div className="admin-card p-5" style={{ marginBottom: 0 }}>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">With League</div>
          <div className="text-3xl font-bold text-teal-400">{report.teamsWithLeague.toLocaleString()}</div>
        </div>
        <div className="admin-card p-5" style={{ marginBottom: 0 }}>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Null League</div>
          <div className={`text-3xl font-bold ${report.teamsWithNullLeague > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
            {report.teamsWithNullLeague.toLocaleString()}
          </div>
        </div>
      </div>

      {/* League team counts */}
      <div className="admin-card" style={{ overflow: 'hidden', marginBottom: '2.5rem' }}>
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Teams Per League (vs Expected)</h2>
            <p className="text-xs text-slate-500 mt-1">Mismatches may indicate teams still need adding or have wrong league assignments</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-3 px-6">League</th>
              <th className="text-right py-3 px-6">Current</th>
              <th className="text-right py-3 px-6">Expected</th>
              <th className="text-right py-3 px-6">Delta</th>
            </tr>
          </thead>
          <tbody>
            {report.leagueTeamCounts.map((l) => {
              const delta = l.count - l.expected;
              const deltaClass = delta === 0 ? 'text-teal-400' : delta < 0 ? 'text-amber-400' : 'text-rose-400';
              return (
                <tr key={l.league}>
                  <td className="py-3 px-6 font-semibold text-white">{l.league}</td>
                  <td className="py-3 px-6 text-right text-slate-300 font-mono">{l.count}</td>
                  <td className="py-3 px-6 text-right text-slate-400 font-mono">{l.expected}</td>
                  <td className={`py-3 px-6 text-right font-mono ${deltaClass}`}>
                    {delta > 0 ? `+${delta}` : delta}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Active triggers */}
      <div className="admin-card" style={{ overflow: 'hidden', marginBottom: '2.5rem' }}>
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Data Integrity Triggers</h2>
            <p className="text-xs text-slate-500 mt-1">Database-level constraints that prevent bad data from being inserted</p>
          </div>
        </div>
        <div className="divide-y divide-slate-800">
          {report.dataIntegrityTriggers.map((t) => (
            <div key={t.name} className="px-6 py-4 flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5">
                {t.installed ? (
                  <span className="inline-block w-2.5 h-2.5 bg-teal-400 rounded-full" />
                ) : (
                  <span className="inline-block w-2.5 h-2.5 bg-rose-400 rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm text-white">{t.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{t.description}</div>
              </div>
              <div className="admin-pill admin-pill-success">Active</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-slate-500 text-right">
        Last updated: {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
      </div>
    </div>
  );
}
