#!/usr/bin/env node
/**
 * Daily scores ingestion — keeps `fixtures` current with NHL.com + Highlightly.
 *
 * Strategy:
 *   1. NHL.com `/v1/schedule/{date}` for the NHL league (source of truth)
 *   2. Highlightly `/matches?date=...` for SHL/DEL/KHL/MHL/VHL/SPHL/Liiga/IIHF/etc
 *   3. Upsert into `fixtures` keyed by deterministic UUID derived from game_id (NHL + HL)
 *   4. Update status (`scheduled`/`in_progress`/`completed`/`cancelled`) and scores as they change
 *
 * Run modes:
 *   node scripts/_daily-scores-ingest.cjs                # yesterday + today
 *   node scripts/_daily-scores-ingest.cjs --days=7       # last 7 days (catch-up)
 *   node scripts/_daily-scores-ingest.cjs --days=14      # last 14 days
 *   node scripts/_daily-scores-ingest.cjs --dry-run      # log without writing
 *
 * The cron runs this nightly at 03:30 UTC (covers evening Euro games + same-day NHL).
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HIGHLIGHTLY_KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!HIGHLIGHTLY_KEY) {
  console.error('Missing HIGHLIGHTLY_API_KEY');
  process.exit(1);
}

// --- CLI args ---
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const DAYS = parseInt(String(args.days ?? '2'), 10); // yesterday + today
const DRY_RUN = !!args['dry-run'];

// --- League IDs (verified against /leagues table) ---
const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const AHL_LEAGUE_ID = 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611';

// Highlightly hockey league IDs (verified via existing adapter)
const HIGHLIGHTLY_HOCKEY_LEAGUES = {
  '69d4de0c-b072-4f52-8950-eb728acdc7f9': { hlId: '40781', name: 'SHL' },            // SHL
  '03e919d1-2180-443b-aba4-6719d25d2eff': { hlId: '16953', name: 'DEL' },            // DEL
  'a08f6dac-eb1f-48b6-a11b-56fbb5642752': { hlId: '30569', name: 'KHL' },            // KHL
  'e052d66a-6f63-42da-94fc-25a809203c2f': { hlId: '32271', name: 'MHL' },           // MHL (real UUID verified 2026-09-17)
  '30fef7f6-0054-4605-83b7-ec619b72f328': { hlId: '31420', name: 'VHL' },           // VHL
  'dead3e40-9f79-4488-a50b-755eb9a8cee0': { hlId: '51844', name: 'SPHL' },          // SPHL
  'dc212fdb-98bd-4fd5-842c-598ba34565b5': { hlId: '14400', name: 'Liiga' },         // Liiga (Finland)
  // IIHF: no single HL id; we use date-based search and detect by team names
};

// Map NHL.com gameState → our fixtures.status
const NHL_STATE_TO_STATUS = {
  FUT: 'scheduled',
  PRE: 'scheduled',   // pregame
  LIVE: 'in_progress',
  CRIT: 'in_progress', // critical (shootout/OT in progress)
  OFF: 'completed',
  FINAL: 'completed',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  SUSPENDED: 'postponed',
};

// --- Helpers ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchNhlSchedule(dateIso) {
  // /v1/schedule/{date} returns gameWeek (7-day window starting date)
  const url = `https://api-web.nhle.com/v1/schedule/${dateIso}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`[NHL] ${dateIso}: HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  const target = (data.gameWeek || []).find(d => d.date === dateIso);
  return target ? (target.games || []) : [];
}

async function fetchHighlightlyMatches(dateIso, hlId) {
  const url = `https://hockey.highlightly.net/matches?leagueId=${hlId}&date=${dateIso}&limit=50`;
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': HIGHLIGHTLY_KEY,
      'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com',
    },
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return Array.isArray(data.data) ? data.data : [];
}

async function upsertNhlGame(g) {
  const ht = g.homeTeam || {};
  const at = g.awayTeam || {};
  const homeScore = ht.score ?? null;
  const awayScore = at.score ?? null;
  const status = NHL_STATE_TO_STATUS[g.gameState] || 'scheduled';

  // Skip games without team assignments
  if (!ht.id || !at.id) return null;

  // Generate deterministic UUID from NHL game id (e.g. "2026010024")
  // Format: 8-4-4-4-12 using NHL_LEAGUE_ID prefix + 10-digit id
  const id = `${NHL_LEAGUE_ID.slice(0, 8)}-0000-0000-0000-${String(g.id).padStart(12, '0')}`.slice(0, 36);

  const record = {
    id,
    league_id: NHL_LEAGUE_ID,
    // nhl_game_id is NOT a top-level fixtures column (verified live 2026-09-21).
    // It lives inside game_data JSONB (line below) and is queried via
    // game_data->>'nhl_game_id' by all consumers (see also
    // rinkstop-platform/scripts/stats/highlightly-adapter.mjs:47 and the
    // indexes in scripts/nhl-ingest/migrations/001-002). Top-level column
    // was dead schema — every nightly run of this script threw 42703 at
    // upsert time. Fix 2026-09-21: removed the line, JSONB path is canonical.
    scheduled_at: g.startTimeUTC,
    home_team_id: null,  // resolved below via teams lookup by tri
    away_team_id: null,
    home_score: homeScore,
    away_score: awayScore,
    status,
    season: mapNhlSeason(g.season, g.gameType),
    // game_data: full NHL.com payload for downstream consumers
    game_data: { ...g, nhl_game_id: g.id },  // keep id inside JSON too
    updated_at: new Date().toISOString(),
  };

  return record;
}

// Also write to nhl_matches (the NHL schedule page reads from this table).
// Uses its own schema (id, date, status, home_team_name, away_team_name, etc.)
async function upsertNhlMatchRecord(g) {
  const ht = g.homeTeam || {};
  const at = g.awayTeam || {};
  const homeScore = ht.score ?? null;
  const awayScore = at.score ?? null;
  const status = NHL_STATE_TO_STATUS[g.gameState] || 'scheduled';

  if (!ht.id || !at.id) return null;

  return {
    id: g.id,  // nhl_game_id like "2026010024"
    date: g.startTimeUTC,
    status,
    home_team_id: null,  // resolved by tri → teams.id
    away_team_id: null,
    home_team_name: ht.placeName?.default ? (ht.placeName.default + ' ' + (ht.commonName?.default || '')).trim() : ht.name?.default || '',
    away_team_name: at.placeName?.default ? (at.placeName.default + ' ' + (at.commonName?.default || '')).trim() : at.name?.default || '',
    home_team_logo: ht.logo || null,
    away_team_logo: at.logo || null,
    home_score: homeScore,
    away_score: awayScore,
    period: g.periodDescriptor?.number || null,
    clock: g.periodDescriptor?.timeRemaining || null,
    league_name: 'NHL',
    venue: g.venue?.default || null,
    last_synced: new Date().toISOString(),
  };
}

function mapNhlSeason(nhlSeason, gameType) {
  // NHL.com uses YYYY season format like 20252026. gameType: 1=preseason, 2=regular, 3=playoff
  // Our DB convention: '2025-26' for regular, '2025-26-pre' for preseason, '2025-26-post' for playoffs
  if (!nhlSeason) return null;
  const base = `${String(nhlSeason).slice(0, 4)}-${String(nhlSeason).slice(4, 8).slice(2)}`;
  if (gameType === 1) return `${base}-pre`;
  if (gameType === 3) return `${base}-post`;
  return base;
}

async function upsertHighlightlyGame(g, hlLeagueId, hlLeagueName) {
  const ht = g.homeTeam || {};
  const at = g.awayTeam || {};
  const scoreStr = g.state?.score?.current || '0 - 0';
  // Highlightly returns score as `current: "<home> - <away>"` (verified live
  // 2026-09-21: HL Kolner vs Frankfurt Löwen returns "4 - 3" where Kolner
  // is the home team and scored 4). Earlier code wrote m[0] to awayScore,
  // inverting every completed game (DEL/KHL all had wrong winners).
  // Fix 2026-09-21: assign m[0] to homeScore, m[1] to awayScore.
  // Note: period scores (firstPeriod/secondPeriod/thirdPeriod) follow the
  // SAME home-away order, so any consumer parsing those needs the same fix.
  const [homeScore, awayScore] = scoreStr.split('-').map(s => parseInt(s.trim(), 10));
  const description = g.state?.description || 'Scheduled';
  // Highlightly returns these description strings: 'Finished' | 'Final' | 'Final/OT' | 'Final/SO'
  // | 'Live' | 'Scheduled' | 'Cancelled' | 'Postponed' | 'Suspended' | 'Awarded'
  const desc = String(description).toLowerCase();
  const status = (desc === 'finished' || desc === 'final' || desc.startsWith('final/') || desc === 'awarded') ? 'completed'
                : desc === 'live' ? 'in_progress'
                : desc === 'cancelled' ? 'cancelled'
                : (desc === 'postponed' || desc === 'suspended') ? 'postponed'
                : 'scheduled';

  // HL doesn't give FK to our team_workspaces; we resolve by displayName later.
  return {
    league_id: hlLeagueId,
    scheduled_at: g.date, // ISO string
    home_team_id: null,
    away_team_id: null,
    home_score: isNaN(homeScore) ? null : homeScore,
    away_score: isNaN(awayScore) ? null : awayScore,
    status,
    season: g.season ? `${g.season - 1}-${String(g.season).slice(2)}` : null,
    // HL-specific data goes into game_data JSONB to avoid schema drift
    game_data: { hl_match_id: g.id, hl_league_name: hlLeagueName, home_team_name: ht.displayName || ht.name, away_team_name: at.displayName || at.name, home_team_abbrev: ht.abbreviation, away_team_abbrev: at.abbreviation },
    updated_at: new Date().toISOString(),
  };
}

async function upsertFixture(record) {
  if (DRY_RUN) {
    console.log(`  [DRY] would upsert: ${record.id?.slice(0, 8)} → status=${record.status} score=${record.home_score}-${record.away_score}`);
    return null;
  }
  const { data, error } = await supabase
    .from('fixtures')
    .upsert(record, { onConflict: 'id', ignoreDuplicates: false })
    .select('id');
  if (error) {
    console.log(`  ✗ upsert ${record.id?.slice(0, 8)}: ${error.message}`);
    return null;
  }
  return data?.[0]?.id ?? record.id;  // upsert returns array; fall back to record.id when single() returns null
}

async function resolveTeamIds(record) {
  // Resolve teams.id (legacy table per WS12, FK target of fixtures.home_team_id)
  // For NHL: by tri_code in teams table
  // For other leagues: by displayName in teams table
  if (!record.home_team_id && record.home_team_abbrev) {
    const { data } = await supabase.from('teams')
      .select('id')
      .eq('tri_code', record.home_team_abbrev)
      .maybeSingle();
    if (data) record.home_team_id = data.id;
  }
  if (!record.away_team_id && record.away_team_abbrev) {
    const { data } = await supabase.from('teams')
      .select('id')
      .eq('tri_code', record.away_team_abbrev)
      .maybeSingle();
    if (data) record.away_team_id = data.id;
  }
  // For HL games without tri_code, try by name
  if (!record.home_team_id && record.game_data?.home_team_name) {
    const { data } = await supabase.from('teams')
      .select('id')
      .ilike('name', record.game_data.home_team_name)
      .maybeSingle();
    if (data) record.home_team_id = data.id;
  }
  if (!record.away_team_id && record.game_data?.away_team_name) {
    const { data } = await supabase.from('teams')
      .select('id')
      .ilike('name', record.game_data.away_team_name)
      .maybeSingle();
    if (data) record.away_team_id = data.id;
  }
  return record;
}

async function main() {
  console.log('=== Daily scores ingestion ===');
  console.log(`Days: ${DAYS} | Dry run: ${DRY_RUN}`);
  console.log('Started:', new Date().toISOString());

  let totalNhl = 0, totalHl = 0;
  const today = new Date();

  // Cover [today-DAYS_BACK, today+DAYS_FWD]. NHL preseason starts mid-Sep,
  // so we need to look 3 days forward to catch games that just got scheduled.
  const DAYS_BACK = Math.max(1, Math.floor(DAYS / 2));
  const DAYS_FWD = DAYS - DAYS_BACK;
  for (let dOffset = -DAYS_FWD; dOffset <= DAYS_BACK; dOffset++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + dOffset);
    const dateIso = d.toISOString().slice(0, 10);
    console.log(`\n--- ${dateIso} ---`);

    // NHL.com
    const nhlGames = await fetchNhlSchedule(dateIso);
    console.log(`[NHL] ${dateIso}: ${nhlGames.length} games`);
    for (const g of nhlGames) {
      const record = await upsertNhlGame(g);
      if (!record) continue;
      await resolveTeamIds(record);
      const id = await upsertFixture(record);
      if (id) totalNhl++;

      // Also write to nhl_matches for the NHL schedule page
      const nmRecord = await upsertNhlMatchRecord(g);
      if (nmRecord) {
        await resolveTeamIds(nmRecord);
        if (!DRY_RUN) {
          await supabase.from('nhl_matches').upsert(nmRecord, { onConflict: 'id' });
        }
      }
    }

    // Highlightly hockey leagues
    for (const [leagueId, cfg] of Object.entries(HIGHLIGHTLY_HOCKEY_LEAGUES)) {
      const hlGames = await fetchHighlightlyMatches(dateIso, cfg.hlId);
      if (hlGames.length === 0) continue;
      console.log(`[HL ${cfg.name}] ${dateIso}: ${hlGames.length} games`);
      for (const g of hlGames) {
        const record = await upsertHighlightlyGame(g, leagueId, cfg.name);
        if (!record) continue;
        // Resolve team FKs BEFORE the existing-row lookup so we can match precisely
        await resolveTeamIds(record);

        // Verify the resolved teams actually belong to this league. The FK
        // constraint will reject otherwise. Skip if mismatch — log for backfill.
        let teamLeagueOk = true;
        if (record.home_team_id || record.away_team_id) {
          const { data: leagues } = await supabase.from('teams')
            .select('id, league_id')
            .in('id', [record.home_team_id, record.away_team_id].filter(Boolean));
          for (const tl of leagues || []) {
            if (tl.league_id !== leagueId) {
              teamLeagueOk = false;
              break;
            }
          }
        }

        // Skip games where we can't resolve both teams — FK constraint requires real teams.
        // Log so we know which leagues need team backfills.
        if (!record.home_team_id || !record.away_team_id || !teamLeagueOk) {
          const ht = record.game_data?.home_team_abbrev || record.game_data?.home_team_name || '?';
          const at = record.game_data?.away_team_abbrev || record.game_data?.away_team_name || '?';
          const reason = !record.home_team_id || !record.away_team_id
            ? 'team not in DB'
            : 'team in wrong league';
          console.log(`  [skip ${cfg.name}] ${ht} vs ${at} — ${reason}`);
          continue;
        }

        // Match existing by (league_id, scheduled_at) only — the unique
        // natural key for HL games without nhl_game_id
        const { data: existing } = await supabase.from('fixtures')
          .select('id')
          .eq('league_id', leagueId)
          .eq('scheduled_at', record.scheduled_at)
          .maybeSingle();
        if (existing) {
          if (!DRY_RUN) {
            await supabase.from('fixtures').update({
              home_team_id: record.home_team_id,
              away_team_id: record.away_team_id,
              home_score: record.home_score,
              away_score: record.away_score,
              status: record.status,
              game_data: record.game_data,
              updated_at: record.updated_at,
            }).eq('id', existing.id);
          }
          totalHl++;
        } else {
          // Generate a deterministic UUID for this game (HL doesn't give nhl_game_id)
          // Format: 8-4-4-4-12 using league_id prefix + match_id padding
          const id = `${leagueId.slice(0, 8)}-0000-0000-0000-${String(g.id).padStart(12, '0')}`.slice(0, 36);
          record.id = id;
          await upsertFixture(record);
          totalHl++;
        }
      }
      await sleep(50); // light rate-limit
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`NHL upserts: ${totalNhl}`);
  console.log(`Highlightly upserts: ${totalHl}`);
  console.log('Completed at:', new Date().toISOString());
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });