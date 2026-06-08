import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

/**
 * GET /api/admin/coverage
 * Returns coverage stats for all leagues (NHL, AHL, PWHL, KHL, NCAAH, WHL, OHL, QMJHL)
 */
export async function GET(_req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  // Get all leagues
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name, slug')
    .order('name');

  if (!leagues) {
    return NextResponse.json({ coverage: [], error: 'No leagues found' });
  }

  // For each league, count fixtures and orphans
  const coverage: LeagueCoverage[] = await Promise.all(
    leagues.map(async (league) => {
      // Get all fixtures for this league (paginated)
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

      // Phantoms: scheduled + past + null scores (or 0-0)
      const now = new Date();
      const phantomCount = allFixtures.filter((f) => {
        if (f.status !== 'scheduled') return false;
        if (!f.scheduled_at) return false;
        if (new Date(f.scheduled_at) > now) return false;
        return f.home_score === null || f.away_score === null;
      }).length;

      // Orphans: fixtures where the team_id is for a team in a different league
      // This is a simplified check - in production we'd join to teams
      // For now, orphans = fixtures where status is 'scheduled' but scheduled_at is far in the past with 0-0 score
      const orphans = allFixtures.filter((f) => {
        if (f.status !== 'scheduled' || !f.scheduled_at) return false;
        const days = (now.getTime() - new Date(f.scheduled_at).getTime()) / (1000 * 60 * 60 * 24);
        return days > 30 && f.home_score === 0 && f.away_score === 0;
      }).length;

      const pct = total > 0 ? Math.round((withScores / total) * 100) : 0;

      return {
        league: league.name,
        leagueId: league.id,
        total,
        withScores,
        scheduled,
        completed,
        pct,
        orphans,
        phantomCount,
      };
    }),
  );

  // Sort by league name
  coverage.sort((a, b) => a.league.localeCompare(b.league));

  // Total fixtures across all leagues
  const totalFixtures = coverage.reduce((sum, c) => sum + c.total, 0);
  const totalWithScores = coverage.reduce((sum, c) => sum + c.withScores, 0);
  const totalPhantoms = coverage.reduce((sum, c) => sum + c.phantomCount, 0);
  const totalOrphans = coverage.reduce((sum, c) => sum + c.orphans, 0);

  return NextResponse.json({
    coverage,
    summary: {
      totalFixtures,
      totalWithScores,
      totalPhantoms,
      totalOrphans,
      pct: totalFixtures > 0 ? Math.round((totalWithScores / totalFixtures) * 100) : 0,
    },
  });
}
