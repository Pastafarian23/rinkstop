import { NextRequest, NextResponse } from 'next/server';
import { computeStandings } from '@/lib/compute-standings';
import { supabaseAdmin } from '@/lib/supabase';

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

    const result = await computeStandings(league.id, season);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, s-maxage=${REVALIDATE}, stale-while-revalidate=60`,
      },
    });
  } catch (err) {
    console.error('[/api/standings]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
