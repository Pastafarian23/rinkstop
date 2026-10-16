import { NextRequest, NextResponse } from 'next/server';
import { computeStandings } from '@/lib/compute-standings';
import { supabaseAdmin } from '@/lib/supabase';
import { getSeasonCompleteness, type SeasonCompleteness } from '@/lib/season-completeness';

const REVALIDATE = 300; // 5 minutes

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ league: string; season: string }> },
) {
  try {
    const { league: leagueSlug, season } = await params;

    // Resolve league slug → league_id
    const { supabaseAdmin: sb } = await import('@/lib/supabase');
    const { data: league } = await sb
      .from('leagues')
      .select('id, slug, name')
      .eq('slug', leagueSlug)
      .maybeSingle();

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Compute standings + season completeness in parallel.
    // `getSeasonCompleteness` may query the same fixtures table; running
    // them concurrently keeps total request time lower than serial calls.
    const [result, completeness] = await Promise.all([
      computeStandings(league.id, season),
      getSeasonCompleteness(league.slug, season).catch((err) => ({
        isComplete: false,
        isCurrent: false,
        expectedGp: 0,
        observed: null,
        reason: `season-completeness lookup failed: ${err?.message ?? err}` as SeasonCompleteness['reason'],
      })),
    ]);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, s-maxage=${REVALIDATE}, stale-while-revalidate=60`,
        // X-Season-Complete: 'true' iff season is closed AND every team reached
        // expected regular-season GP (per src/lib/season-completeness.ts).
        // 'current' for in-progress seasons. Useful for monitoring/headless checks.
        'X-Season-Complete': completeness.isComplete ? 'true' : (completeness.isCurrent ? 'current' : 'false'),
        'X-Season-Expected-Gp': String(completeness.expectedGp),
        'X-Season-Max-Gp': String(completeness.observed?.maxGp ?? 0),
        'X-Season-Reason': completeness.reason,
      },
    });
  } catch (err) {
    console.error('[/api/standings]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
