import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getChip } from '@/lib/score-chips';

// Returns teams for a given chip's leagues, e.g. ?league=nhl
// Used to populate the Team dropdown on league chips.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') || 'nhl';
  const chip = getChip(league);

  if (chip.type !== 'league' || chip.leagueSlugs.length === 0) {
    return NextResponse.json({ data: [], chip: chip.slug });
  }

  // Resolve league slugs → league ids
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, slug')
    .in('slug', chip.leagueSlugs);

  const leagueIds = (leagues || []).map(l => l.id);
  if (leagueIds.length === 0) {
    return NextResponse.json({ data: [], chip: chip.slug });
  }

  const { data, error } = await supabase
    .from('team_workspaces')
    .select('id, name, slug, logo_url, city, league_id')
    .in('league_id', leagueIds)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const response = NextResponse.json({
    data: data || [],
    chip: chip.slug,
  });
  response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800');
  return response;
}
