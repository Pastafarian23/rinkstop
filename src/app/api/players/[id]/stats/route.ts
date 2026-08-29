// src/app/api/players/[id]/stats/route.ts
// GET /api/players/[id]/stats
//
// Returns unified career stats for a player, combining:
// 1. Self-reported / Passport stats from hockey_player_stats_season (paid tier)
// 2. External official stats from highlightly_career_stats (NHL/CHL players with highlightly_id)
//
// highlightly stats are authoritative (official league data) and appear first.
// Passport stats are supplemental (self/league/coach-verified) and are merged below.
// Both are de-duplicated by season — if a season exists in highlightly, Passport entry
// for that season is skipped to avoid double-counting.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function supabaseQuery(table: string, params: string) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  return response.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Player id is required.' }, { status: 400 });
  }

  try {
    // ---- Step 1: Look up player ----
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const { data: playerData } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, highlightly_id, badge_tier, subscription_status')
      .eq(isUuid ? 'id' : 'slug', id)
      .maybeSingle();

    if (!playerData) {
      return NextResponse.json({ error: 'Player not found.' }, { status: 404 });
    }

    const p = playerData as any;

    // ---- Step 2: Fetch Passport stats (hockey_player_stats_season) ----
    const { data: passportStats, error: passportErr } = await supabaseAdmin
      .from('hockey_player_stats_season')
      .select(
        `
        id,
        season_id,
        level,
        games_played,
        goals,
        assists,
        plus_minus,
        penalty_minutes,
        goalie_games_played,
        wins,
        losses,
        goals_against,
        saves,
        shutouts,
        save_percentage,
        gaa,
        verification_source,
        verified_by,
        verified_at,
        created_at,
        updated_at,
        hockey_seasons!inner(label, start_date, end_date),
        hockey_player_team_history!left(id, team_name, team_logo_url),
        leagues!left(id, name, slug, country)
      `,
      )
      .eq('player_id', p.id)
      .order('hockey_seasons(start_date)', { ascending: false });

    if (passportErr) {
      console.error('[player-stats] passport stats lookup failed', passportErr);
    }

    // ---- Step 3: Fetch highlightly external stats (if highlightly_id exists) ----
    let highlightlyStats: any[] = [];
    if (p.highlightly_id) {
      try {
        highlightlyStats =
          (await supabaseQuery(
            `highlightly_career_stats`,
            `player_id=eq.${p.highlightly_id}&order=season.desc`,
          )) || [];
      } catch (err) {
        console.error('[player-stats] highlightly lookup failed', err);
      }
    }

    // ---- Step 4: Normalize highlightly seasons into a Set for dedup ----
    const highlightlySeasons = new Set(
      highlightlyStats.map((s: any) => s.season),
    );

    // ---- Step 5: Build unified stats array ----
    const unifiedStats: any[] = [];

    // Add highlightly stats (official) first
    for (const s of highlightlyStats) {
      unifiedStats.push({
        id: s.id,
        source: 'official',
        season: s.season,
        league_name: s.league_name || null,
        league_id: s.league_id || null,
        level: null,
        team_name: null,
        games_played: s.games_played ?? 0,
        goals: s.goals ?? 0,
        assists: s.assists ?? 0,
        points: s.points ?? (s.goals ?? 0) + (s.assists ?? 0),
        plus_minus: s.plus_minus ?? 0,
        penalty_minutes: s.penalty_minutes ?? 0,
        goalie_games_played: s.goalie_games_played ?? null,
        wins: s.wins ?? null,
        losses: s.losses ?? null,
        goals_against: s.goals_against ?? null,
        saves: s.saves ?? null,
        shutouts: s.shutouts ?? null,
        save_percentage: s.save_percentage ?? null,
        gaa: s.goals_against_avg ?? null,
        verification_source: 'official',
      });
    }

    // Add Passport stats for seasons not already covered by highlightly
    if (passportStats && passportStats.length > 0) {
      for (const ps of passportStats as any[]) {
        const seasonLabel = ps.hockey_seasons?.label;
        if (seasonLabel && highlightlySeasons.has(seasonLabel)) {
          continue;
        }
        unifiedStats.push({
          id: ps.id,
          source: ps.verification_source || 'self_reported',
          season: seasonLabel || null,
          league_name: ps.leagues?.name || null,
          league_id: ps.leagues?.id || null,
          level: ps.level || null,
          team_name: ps.hockey_player_team_history?.team_name || null,
          games_played: ps.games_played ?? 0,
          goals: ps.goals ?? 0,
          assists: ps.assists ?? 0,
          points: (ps.goals ?? 0) + (ps.assists ?? 0),
          plus_minus: ps.plus_minus ?? 0,
          penalty_minutes: ps.penalty_minutes ?? 0,
          goalie_games_played: ps.goalie_games_played ?? null,
          wins: ps.wins ?? null,
          losses: ps.losses ?? null,
          goals_against: ps.goals_against ?? null,
          saves: ps.saves ?? null,
          shutouts: ps.shutouts ?? null,
          save_percentage: ps.save_percentage ?? null,
          gaa: ps.gaa ?? null,
          verification_source: ps.verification_source,
          verified_by: ps.verified_by || null,
          verified_at: ps.verified_at || null,
          created_at: ps.created_at,
          updated_at: ps.updated_at,
        });
      }
    }

    // Sort by season descending
    unifiedStats.sort((a, b) => {
      if (!a.season) return 1;
      if (!b.season) return -1;
      return b.season.localeCompare(a.season);
    });

    return NextResponse.json({
      player_id: p.id,
      player_name: `${p.first_name} ${p.last_name}`,
      badge_tier: p.badge_tier,
      highlightly_id: p.highlightly_id,
      stats: unifiedStats,
      breakdown: {
        official: highlightlyStats.length,
        passport: passportStats?.length ?? 0,
      },
    });
  } catch (err: any) {
    console.error('[player-stats] unexpected error', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 },
    );
  }
}
