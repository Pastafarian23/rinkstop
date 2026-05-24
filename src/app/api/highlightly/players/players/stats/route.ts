// POST /api/highantly/players/stats
// Syncs player career statistics from Highantly API into Supabase cache
// Body: { playerId: string, limit?: number }
// Auth: x-api-key header required

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/api-auth';

const HIGHLIGHTLY_BASE_URL = 'https://hockey.highlightly.net';
const API_KEY = process.env.HIGHLIGHTLY_API_KEY;

export async function POST(request: NextRequest) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  try {
    const { playerId, limit = 10 } = await request.json();
    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
    }

    const url = `${HIGHLIGHTLY_BASE_URL}/players/${playerId}/statistics?limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': API_KEY!,
        'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Highantly API error: ${response.status}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();
    
    // Highantly returns array of season stats: [{ season, type, general, offense, defense, penalties }]
    const statsArray = Array.isArray(data) ? data : data.data || [];

    if (statsArray.length === 0) {
      return NextResponse.json({ synced: 0, message: 'No stats found for player' });
    }

    // Dynamically import supabase admin
    const { supabaseAdmin } = await import('@/lib/supabase');
    const supabase = supabaseAdmin();

    const upserts = [];
    for (const entry of statsArray) {
      const season = entry.season || 'Unknown';
      const seasonType = entry.type || 'regular';
      const gen = entry.general || {};
      const off = entry.offense || {};
      const def = entry.defense || {};
      const pen = entry.penalties || {};

      const isGoalie = (gen.goals_against !== undefined || gen.wins !== undefined);

      const record = {
        id: `${playerId}-${season}-${seasonType}`,
        player_id: playerId,
        season,
        season_type: seasonType,
        games_played: gen.games_played ?? gen.gp ?? 0,
        goals: off.goals ?? off.g ?? 0,
        assists: off.assists ?? off.a ?? 0,
        points: (off.goals ?? 0) + (off.assists ?? 0),
        penalty_minutes: pen.penalty_minutes ?? pen.pim ?? 0,
        plus_minus: def.plus_minus ?? def['+/-'] ?? 0,
        additional_stats: {
          offense: off,
          defense: def,
          penalties: pen,
          general: gen,
        },
        last_synced: new Date().toISOString(),
      };

      // Add goalie-specific fields only if present
      if (isGoalie || gen.goals_against !== undefined) {
        record.wins = gen.wins ?? gen.w ?? null;
        record.losses = gen.losses ?? gen.l ?? null;
        record.overtime_losses = gen.overtime_losses ?? gen.ot ?? null;
        record.goals_against = gen.goals_against ?? gen.ga ?? null;
        record.saves = gen.saves ?? null;
        record.save_percentage = gen.save_percentage ?? gen.sv_pct ?? null;
        record.goals_against_average = gen.goals_against_average ?? gen.gaa ?? null;
        record.shutouts = gen.shutouts ?? gen.so ?? null;
      }

      upserts.push(record);
    }

    const { error } = await supabase
      .from('highlightly_career_stats')
      .upsert(upserts, { onConflict: 'player_id,season,season_type' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ synced: upserts.length, seasons: upserts.map(u => u.season) });
  } catch (err: any) {
    console.error('Player stats sync error:', err);
    return NextResponse.json({ error: 'Internal error', details: err.message }, { status: 500 });
  }
}