import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// Re-implement the single-player lookup logic from the base route.
// Next.js App Router file-system routing means /api/players/<id> must be
// handled here — we cannot forward to /api/players without an HTTP round-trip.
export const dynamic = 'force-dynamic';

const POSITION_MAP: Record<string, string> = {
  C: 'center', LW: 'left_wing', RW: 'right_wing', D: 'defenseman', G: 'goalie',
  center: 'center', left_wing: 'left_wing', right_wing: 'right_wing',
  defenseman: 'defenseman', defense: 'defenseman', goalie: 'goalie', goaltender: 'goalie',
  forward: 'forward', winger: 'right_wing',
};

function formatNhlPlayer(p: any): Record<string, any> {
  const name = p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  const [first, ...rest] = name.split(' ');
  const last = rest.join(' ');
  const posAbbr = p.position_abbreviation ?? p.position;
  const mappedPos = posAbbr ? (POSITION_MAP[posAbbr] ?? posAbbr.toLowerCase()) : null;
  return {
    id: `nhl-${p.id}`,
    source: 'nhl',
    first_name: first || null,
    last_name: last || null,
    full_name: name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    position: mappedPos,
    position_abbreviation: posAbbr ?? null,
    jersey_number: p.jersey_number ?? null,
    nationality: p.nationality ?? p.birth_country ?? null,
    birth_date: p.birth_date ?? null,
    birth_place: p.birth_place ?? null,
    height_cm: p.height ?? null,
    weight_kg: p.weight ?? null,
    shoots: p.shoots ?? null,
    headshot_url: p.logo ?? null,
    is_active: true,
    team_id: p.current_team_id ? `nhl-team-${p.current_team_id}` : null,
    current_team_abbreviation: p.current_team_abbreviation ?? null,
    current_team_name: p.current_team_name ?? null,
    current_team_logo: p.current_team_logo ?? null,
    teams: null,
    draft: {
      year: p.draft_year ?? null,
      team: p.draft_team ?? null,
      round: p.draft_round ?? null,
      pick: p.draft_pick ?? null,
    },
    role: p.role ?? 'player',
    was_player: p.was_player ?? false,
    highlightly_id: p.id,
    _partial: !(p.birth_date && mappedPos && p.height),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const isNhlPrefixed = id.startsWith('nhl-');
  const isNhlNumeric = /^nhl-\d+$/.test(id);

  // 1) RinkStop UUID lookup
  if (isUuid) {
    const { data, error } = await supabase
      .from('players')
      .select('*, teams(name, slug, logo_url, league_id, leagues(name, slug))')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (data) return NextResponse.json({ data: [{ ...data, source: 'rinkstop' }], count: 1, page: 1, totalPages: 1 });
  }

  // 2) NHL numeric id (with or without nhl- prefix)
  if (isNhlNumeric || (/^\d+$/.test(id))) {
    const numericId = isNhlNumeric ? id.replace('nhl-', '') : id;
    const { data, error } = await supabase
      .from('nhl_players')
      .select('*')
      .eq('id', Number(numericId))
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (data) {
      const formatted = formatNhlPlayer(data);
      let team: any = null;
      if (data.current_team_id) {
        const r = await supabase.from('nhl_teams').select('id, name, short_name, logo')
          .eq('id', String(data.current_team_id)).maybeSingle();
        team = r.data;
      }
      if (!team && data.current_team_abbreviation) {
        const r = await supabase.from('nhl_teams').select('id, name, short_name, logo')
          .eq('short_name', data.current_team_abbreviation).maybeSingle();
        team = r.data;
      }
      if (team) {
        formatted.teams = {
          name: team.name,
          slug: (team.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          logo_url: team.logo,
          league_id: 'NHL',
          leagues: { name: 'NHL', slug: 'nhl' },
        };
      }
      return NextResponse.json({ data: [formatted], count: 1, page: 1, totalPages: 1 });
    }
  }

  // 3) Slug lookup — try RinkStop first, then NHL by full_name
  const cleanSlug = id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const { data: rsData, error: rsErr } = await supabase
    .from('players')
    .select('*, teams(name, slug, logo_url, league_id, leagues(name, slug))')
    .or(`slug.ilike.${cleanSlug}-%,slug.eq.${cleanSlug}`)
    .limit(1)
    .maybeSingle();
  if (rsErr) return NextResponse.json({ error: rsErr.message }, { status: 500 });

  const { data: nhlData, error: nhlErr } = await supabase
    .from('nhl_players')
    .select('*')
    .ilike('full_name', id.replace(/-/g, ' '))
    .limit(1)
    .maybeSingle();
  if (nhlErr) return NextResponse.json({ error: nhlErr.message }, { status: 500 });

  if (rsData && nhlData) {
    const nhlFormatted = formatNhlPlayer(nhlData);
    if (nhlData.current_team_abbreviation) {
      const { data: team } = await supabase.from('nhl_teams').select('id, name, short_name, logo')
        .eq('short_name', nhlData.current_team_abbreviation).maybeSingle();
      if (team) {
        nhlFormatted.teams = {
          name: team.name,
          slug: (team.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          logo_url: team.logo,
          league_id: 'NHL',
          leagues: { name: 'NHL', slug: 'nhl' },
        };
      }
    }
    const merged: any = { ...rsData, source: 'rinkstop' };
    for (const f of ['birth_place', 'current_team_name', 'current_team_abbreviation',
      'current_team_logo', 'position', 'position_abbreviation',
      'nationality', 'shoots', 'height_cm', 'weight_kg']) {
      if ((merged[f] == null || merged[f] === '') && nhlFormatted[f] != null && nhlFormatted[f] !== '') {
        merged[f] = nhlFormatted[f];
      }
    }
    if (!merged.teams && nhlFormatted.teams) merged.teams = nhlFormatted.teams;
    if (!merged.highlightly_id) merged.highightly_id = nhlData.id;
    return NextResponse.json({ data: [merged], count: 1, page: 1, totalPages: 1 });
  }
  if (rsData) return NextResponse.json({ data: [{ ...rsData, source: 'rinkstop' }], count: 1, page: 1, totalPages: 1 });
  if (nhlData) {
    const formatted = formatNhlPlayer(nhlData);
    if (nhlData.current_team_abbreviation) {
      const { data: team } = await supabase.from('nhl_teams').select('id, name, short_name, logo')
        .eq('short_name', nhlData.current_team_abbreviation).maybeSingle();
      if (team) {
        formatted.teams = {
          name: team.name,
          slug: (team.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          logo_url: team.logo,
          league_id: 'NHL',
          leagues: { name: 'NHL', slug: 'nhl' },
        };
      }
    }
    return NextResponse.json({ data: [formatted], count: 1, page: 1, totalPages: 1 });
  }

  return NextResponse.json({ data: [], count: 0, page: 1, totalPages: 0 });
}
