import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';

interface LeagueCoverage {
  league: string;
  leagueId: string;
  total: number;
  withScores: number;
  scheduled: number;
  completed: number;
  pct: number;
  orphans: number;
  phantomCount: number;
}

interface CoverageResponse {
  coverage: LeagueCoverage[];
  summary: {
    totalFixtures: number;
    totalWithScores: number;
    totalPhantoms: number;
    totalOrphans: number;
    pct: number;
  };
}

export const dynamic = 'force-dynamic';

async function getCoverage(): Promise<CoverageResponse> {
  // Get all leagues
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name, slug')
    .order('name');

  if (!leagues) {
    return { coverage: [], summary: { totalFixtures: 0, totalWithScores: 0, totalPhantoms: 0, totalOrphans: 0, pct: 0 } };
  }

  const coverage: LeagueCoverage[] = await Promise.all(
    leagues.map(async (league) => {
      let allFixtures: any[] = [];
      let page = 0;
      while (true) {
        const { data } = await supabaseAdmin
          .from('fixtures')
          .select('id, status, home_score, away_score, scheduled_at')
          .eq('league_id', league.id)
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        allFixtures = allFixtures.concat(data);
        if (data.length < 1000) break;
        page++;
      }

      const total = allFixtures.length;
      const completed = allFixtures.filter((f) => f.status === 'completed' || f.status === 'final').length;
      const scheduled = allFixtures.filter((f) => f.status === 'scheduled').length;
      const withScores = allFixtures.filter(
        (f) => f.home_score !== null && f.away_score !== null,
      ).length;

      const now = new Date();
      const phantomCount = allFixtures.filter((f) => {
        if (f.status !== 'scheduled') return false;
        if (!f.scheduled_at) return false;
        if (new Date(f.scheduled_at) > now) return false;
        return f.home_score === null || f.away_score === null;
      }).length;

      const orphans = allFixtures.filter((f) => {
        if (f.status !== 'scheduled' || !f.scheduled_at) return false;
        const days = (now.getTime() - new Date(f.scheduled_at).getTime()) / (1000 * 60 * 60 * 24);
        return days > 30 && f.home_score === 0 && f.away_score === 0;
      }).length;

      const pct = total > 0 ? Math.round((withScores / total) * 100) : 0;

      return { league: league.name, leagueId: league.id, total, withScores, scheduled, completed, pct, orphans, phantomCount };
    }),
  );

  coverage.sort((a, b) => a.league.localeCompare(b.league));

  const totalFixtures = coverage.reduce((sum, c) => sum + c.total, 0);
  const totalWithScores = coverage.reduce((sum, c) => sum + c.withScores, 0);
  const totalPhantoms = coverage.reduce((sum, c) => sum + c.phantomCount, 0);
  const totalOrphans = coverage.reduce((sum, c) => sum + c.orphans, 0);

  return {
    coverage,
    summary: {
      totalFixtures,
      totalWithScores,
      totalPhantoms,
      totalOrphans,
      pct: totalFixtures > 0 ? Math.round((totalWithScores / totalFixtures) * 100) : 0,
    },
  };
}

export default async function AdminOverview() {
  const data = await getCoverage();
  const { summary, coverage } = data;

  const stats = [
    { label: 'Total Fixtures', value: summary.totalFixtures.toLocaleString(), color: 'text-white' },
    { label: 'With Scores', value: `${summary.totalWithScores.toLocaleString()} (${summary.pct}%)`, color: 'text-teal-400' },
    { label: 'Phantoms', value: summary.totalPhantoms.toLocaleString(), color: summary.totalPhantoms > 0 ? 'text-amber-400' : 'text-slate-500' },
    { label: 'Orphans', value: summary.totalOrphans.toLocaleString(), color: summary.totalOrphans > 0 ? 'text-rose-400' : 'text-slate-500' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Admin Overview</h1>
      <p className="text-slate-400 mb-8">RinkStop system health at a glance</p>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{stat.label}</div>
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* League coverage */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">League Coverage</h2>
          <Link href="/admin/data-quality" className="text-sm text-teal-400 hover:text-teal-300">
            View details →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="text-left py-3 px-6 text-slate-500 font-medium uppercase text-xs tracking-wider">League</th>
              <th className="text-right py-3 px-6 text-slate-500 font-medium uppercase text-xs tracking-wider">Total</th>
              <th className="text-right py-3 px-6 text-slate-500 font-medium uppercase text-xs tracking-wider">With Scores</th>
              <th className="text-left py-3 px-6 text-slate-500 font-medium uppercase text-xs tracking-wider w-64">Coverage</th>
              <th className="text-right py-3 px-6 text-slate-500 font-medium uppercase text-xs tracking-wider">Scheduled</th>
              <th className="text-right py-3 px-6 text-slate-500 font-medium uppercase text-xs tracking-wider">Phantoms</th>
              <th className="text-right py-3 px-6 text-slate-500 font-medium uppercase text-xs tracking-wider">Orphans</th>
            </tr>
          </thead>
          <tbody>
            {coverage.map((c) => (
              <tr key={c.leagueId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-6 font-semibold text-white">{c.league}</td>
                <td className="py-3 px-6 text-right text-slate-300 font-mono">{c.total.toLocaleString()}</td>
                <td className="py-3 px-6 text-right text-teal-400 font-mono">{c.withScores.toLocaleString()}</td>
                <td className="py-3 px-6">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          c.pct >= 90 ? 'bg-teal-400' : c.pct >= 70 ? 'bg-amber-400' : 'bg-rose-400'
                        }`}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 font-mono w-10 text-right">{c.pct}%</span>
                  </div>
                </td>
                <td className="py-3 px-6 text-right text-slate-400 font-mono">{c.scheduled.toLocaleString()}</td>
                <td className={`py-3 px-6 text-right font-mono ${c.phantomCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                  {c.phantomCount.toLocaleString()}
                </td>
                <td className={`py-3 px-6 text-right font-mono ${c.orphans > 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                  {c.orphans.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-xs text-slate-500 text-right">
        Last updated: {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
      </div>
    </div>
  );
}
