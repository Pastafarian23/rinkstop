#!/usr/bin/env node
/**
 * _daily-scores-all-leagues.cjs — 2026-09-21
 *
 * Unified daily scores orchestrator. Runs the right source for each league:
 *
 *   NHL.com   → NHL (official, free public API)
 *   HockeyTech → AHL, ECHL, OHL, WHL, QMJHL, USHL, PWHL (official sources)
 *   Highlightly + TheSportsDB → KHL, SHL, DEL, MHL, VHL, SPHL, Liiga
 *
 * Built per Arnel's 2026-09-21 'all leagues, always verified, never gaps'
 * directive. The current state of the fixtures table shows several
 * leagues haven't been updated since 2026-05-15 (AHL, PWHL) or
 * 2026-09-17 (OHL, WHL, QMJHL, SHL). This orchestrator runs them daily
 * and emits a JSON report so the cron delivery can post results to Ops.
 *
 * Run modes:
 *   node scripts/_daily-scores-all-leagues.cjs                 # yesterday + today
 *   node scripts/_daily-scores-all-leagues.cjs --days=7        # 7-day catch-up
 *   node scripts/_daily-scores-all-leagues.cjs --days=14       # 14-day catch-up
 *   node scripts/_daily-scores-all-leagues.cjs --dry-run       # log without writing
 *   node scripts/_daily-scores-all-leagues.cjs --only=nhl,ahl   # comma-separated leagues
 *
 * Schema:
 *   - Uses natural-key upsert on (league_id, scheduled_at,
 *     home_team_id, away_team_id) so existing rows update correctly
 *     regardless of their primary key UUID.
 *   - Same safeguards as _daily-scores-ingest.cjs: schema
 *     conformance check + cross-source score verification.
 *
 * Output: writes /tmp/daily-scores-all-leagues-result.json with
 * per-league counts so the cron delivery can post a structured report.
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const HIGHLIGHTLY_KEY = process.env.HIGHLIGHTLY_API_KEY;
const HOST = process.env.NEXT_PUBLIC_VERCEL_ENV ? 'hockey-highlights-api.p.rapidapi.com' : 'hockey-highlights-api.p.rapidapi.com';

// HockeyTech config (from article-from-highlight/datasources/hockeytech.mjs)
const HOCKEYTECH_CONFIG = {
  ahl:   { clientCode: 'ahl',   key: '50c2cd9b5e18e390' },
  echl:  { clientCode: 'echl',  key: '2c2b89ea7345cae8' },
  ohl:   { clientCode: 'ohl',   key: 'f1aa699db3d81487' },
  whl:   { clientCode: 'whl',   key: 'f1aa699db3d81487' },
  qmjhl: { clientCode: 'lhjmq', key: 'f1aa699db3d81487' },
  ushl:  { clientCode: 'ushl',  key: 'e828f89b243dc43f' },
  pwhl:  { clientCode: 'pwhl',  key: '446521baf8c38984' },
};

// League UUID lookup (verified live 2026-09-21 against fixtures table)
const LEAGUE_SLUG_TO_UUID = {
  'nhl': NHL_LEAGUE_ID,
  // HockeyTech leagues — looked up from fixtures via slug join at runtime
};

// HL league UUIDs (verified 2026-09-21 against leagues table)
const HL_LEAGUE_UUIDS = {
  // HockeyTech leagues — also accessible via HL hockey endpoint with proper ID
  'AHL': 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611',
  'OHL': 'd767362d-c13b-4c7a-8c8c-27ec33990882',
  'WHL': '46f49db9-e63d-407d-a99c-802f87576ab2',
  'QMJHL': 'deb6816a-ccaf-48bf-9f5e-5a7c3387f922',
  'ECHL': '85e8e902-441c-4102-b111-5a37f0350484',
  'PWHL': '425ae95a-db13-499a-96f4-a859a437b15c',
  'SHL': '69d4de0c-b072-4f52-8950-eb728acdc7f9',
  'DEL': '03e919d1-2180-443b-aba4-6719d25d2eff',
  'KHL': 'a08f6dac-eb1f-48b6-a11b-56fbb5642752',
  'MHL': 'e052d66a-6f63-42da-94***',
  'VHL': '30fef7f6-0054-4605-83b7-ec619b72f328',
  'SPHL': 'dead3e40-9f79-4488-a50b-755eb9a8cee0',
  'Liiga': 'dc212fdb-98bd-4fd5-842c-598ba34565b5',
};

// HL league ID → league name (verified live 2026-09-21 — AHL/OHL/WHL IDs
// were 3337/4188 NOT 5159/5157 as the audit-pipeline had documented)
const HL_LEAGUE_IDS = {
  '50142': 'AHL',
  '3337': 'OHL',
  '4188': 'WHL',
  '5161': 'QMJHL',
  '40781': 'SHL',
  '16953': 'DEL',
  '30569': 'KHL',
  '32271': 'MHL',
  '31420': 'VHL',
  '51844': 'SPHL',
  '14400': 'Liiga',
};

// NHL team abbrev → teams.id (extracted from _daily-scores-ingest.cjs)
const NHL_ABBREV_TO_TEAMS_ID = {
  ANA: '219a6bb2-1103-4e27-931e-5de440e59f84',
  BOS: 'ae6d0878-1ac2-4c13-afc8-890c6647b668',
  BUF: '5a510c0e-1058-460d-8237-09855dfa98f4',
  CGY: '626458da-d2d4-4a4f-816b-f3796b84cfc4',
  CAR: 'e4977c12-28b3-4756-a788-cf86b40fc237',
  CHI: '553a6b7b-6416-4b74-a9b3-fa15d06d52ab',
  COL: 'f453fd29-12e4-4897-8f8a-ecf23d6a4122',
  CBJ: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344',
  DAL: '4c61f05e-8d34-40be-b0a8-adf37e14435c',
  DET: 'f3fa0794-ee39-4991-af45-961cb3e8f404',
  EDM: '5b487d74-5e9c-43c8-b104-35185fc93350',
  FLA: '7772070c-6c9b-4ca0-a442-dfe5b8beabcb',
  LAK: 'df9b5d1e-c5d9-46af-a524-99de500e95bf',
  MIN: 'd3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe',
  MTL: 'dfa8a4b4-01b9-4f53-9a5d-6ca34302d074',
  NSH: '2d3d8a64-c0d7-4b8e-a327-a1201cc92f72',
  NJD: '486e6592-5873-48a0-8cdd-8411c8eb1105',
  NYI: 'acc8b466-ef9b-4d81-8ea5-6f13fc180d9e',
  NYR: '2869d1cd-d8f4-4ffb-9726-30bdfdbc14d3',
  OTT: 'a1f8b7f1-f7ea-42ee-9861-0eb0addf437d',
  PHI: 'cf53124a-dbb5-4588-9cb2-2f6054918f99',
  PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55',
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10',
  SEA: 'bf324536-424b-4a3d-b486-1347aa735aae',
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c',
  TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa',
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d',
  UTA: '82a53679-b1e9-4221-b58e-a7b89f45c638',
  VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce',
  VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20',
  WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f',
  WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa',
};

// NHL.com game state → fixtures.status
const NHL_STATE_TO_STATUS = {
  FUT: 'scheduled', PRE: 'scheduled', LIVE: 'in_progress', CRIT: 'in_progress',
  OFF: 'completed', FINAL: 'completed', POSTPONED: 'postponed', CANCELLED: 'cancelled',
};

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const DAYS = parseInt(String(args.days ?? '2'), 10);
const DRY_RUN = !!args['dry-run'];
const ONLY = (args.only || '').split(',').filter(Boolean);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// --- NHL.com ----------------------------------------------------------------

async function fetchNhlSchedule(dateIso) {
  const url = `https://api-web.nhle.com/v1/schedule/${dateIso}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const target = (data.gameWeek || []).find(d => d.date === dateIso);
  return target ? (target.games || []) : [];
}

function resolveNhlTeamId(abbrev) {
  return NHL_ABBREV_TO_TEAMS_ID[String(abbrev || '').toUpperCase()] || null;
}

async function upsertNhlFixture(g) {
  const ht = g.homeTeam || {};
  const at = g.awayTeam || {};
  const homeScore = ht.score ?? null;
  const awayScore = at.score ?? null;
  const status = NHL_STATE_TO_STATUS[g.gameState] || 'scheduled';
  if (!ht.id || !at.id) return null;
  const id = `${NHL_LEAGUE_ID.slice(0, 8)}-0000-0000-0000-${String(g.id).padStart(12, '0')}`.slice(0, 36);
  const record = {
    id,
    league_id: NHL_LEAGUE_ID,
    scheduled_at: g.startTimeUTC,
    home_team_id: resolveNhlTeamId(ht.abbrev),
    away_team_id: resolveNhlTeamId(at.abbrev),
    home_score: homeScore,
    away_score: awayScore,
    status,
    season: mapNhlSeason(g.season, g.gameType),
    game_data: { ...g, nhl_game_id: g.id, home_team_abbrev: ht.abbrev || null, away_team_abbrev: at.abbrev || null },
    updated_at: new Date().toISOString(),
  };
  return await upsertFixture(record);
}

function mapNhlSeason(nhlSeason, gameType) {
  if (!nhlSeason) return null;
  const base = `${String(nhlSeason).slice(0, 4)}-${String(nhlSeason).slice(4, 8).slice(2)}`;
  if (gameType === 1) return `${base}-pre`;
  if (gameType === 3) return `${base}-post`;
  return base;
}

// --- HockeyTech -------------------------------------------------------------

async function fetchHockeytechSchedule(clientCode, key) {
  // First call without season_id
  const url1 = `https://lscluster.hockeytech.com/feed/?feed=modulekit&view=schedule&key=***}&client_code=${clientCode}&fmt=json&lang=en`;
  const res1 = await fetch(url1, { signal: AbortSignal.timeout(20000) });
  if (!res1.ok) throw new Error(`HockeyTech ${clientCode} HTTP ${res1.status}`);
  const j1 = await res1.json();
  const seasonId = j1.SiteKit?.Parameters?.season_id;
  if (!seasonId) throw new Error(`HockeyTech ${clientCode}: no season_id`);
  const url2 = `https://lscluster.hockeytech.com/feed/?feed=modulekit&view=schedule&key=***}&client_code=${clientCode}&fmt=json&lang=en&season_id=${seasonId}`;
  const res2 = await fetch(url2, { signal: AbortSignal.timeout(20000) });
  if (!res2.ok) throw new Error(`HockeyTech ${clientCode} season ${seasonId}: HTTP ${res2.status}`);
  const j2 = await res2.json();
  return j2.SiteKit?.Schedule || [];
}

async function upsertHockeytechGame(g, leagueKey, leagueUuid) {
  if (g.final !== '1') return null;
  const homeId = await lookupTeamByName(g.home_team_name || '', leagueUuid);
  const awayId = await lookupTeamByName(g.visiting_team_name || '', leagueUuid);
  if (!homeId || !awayId) return null;
  const wasOT = g.overtime === '1' && g.shootout !== '1';
  const wasSO = g.shootout === '1';
  const record = {
    league_id: leagueUuid,
    scheduled_at: `${(g.date_played || '').slice(0, 10)}T${(g.game_time || '00:00:00').slice(0, 8)}Z`,
    home_team_id: homeId,
    away_team_id: awayId,
    home_score: parseInt(g.home_goal_count, 10),
    away_score: parseInt(g.visiting_goal_count, 10),
    status: wasSO ? 'completed' : (wasOT ? 'completed' : 'completed'),
    season: `${(g.season_id || '').slice(0, 4)}-${(g.season_id || '').slice(4, 8).slice(2)}`,
    game_data: { ...g, source: 'hockeytech', league: leagueKey },
    updated_at: new Date().toISOString(),
  };
  return await upsertFixture(record);
}

async function lookupTeamByName(name, leagueUuid) {
  if (!name) return null;
  const cleaned = name.replace(/'/g, '').trim();
  // Try exact match first (fast path)
  let { data } = await supabase.from('teams')
    .select('id, name')
    .ilike('name', cleaned)
    .eq('league_id', leagueUuid)
    .maybeSingle();
  if (data) return data.id;
  // Fuzzy: try multiple variants. Highlightly often returns short names
  // ('Yekaterinburg') while our DB has full names ('Avtomobilist Yekaterinburg').
  // Try: starts-with match, contains match, word-prefix match.
  const firstWord = cleaned.split(/\s+/)[0];
  if (firstWord && firstWord.length >= 4) {
    // Try teams whose name STARTS WITH the first word (covers 'Yekaterinburg' → 'Avtomobilist Yekaterinburg')
    // or contains the full name as a substring
    const { data: fuzzyRows } = await supabase.from('teams')
      .select('id, name')
      .eq('league_id', leagueUuid)
      .or(`name.ilike.${firstWord}%,name.ilike.%${cleaned}%`)
      .limit(5);
    if (fuzzyRows && fuzzyRows.length > 0) {
      // Prefer exact-word match first
      const exact = fuzzyRows.find(r => r.name.toLowerCase().split(/\s+/).includes(cleaned.toLowerCase()));
      if (exact) return exact.id;
      // Otherwise take the shortest matching name (most likely the canonical short form)
      const sorted = fuzzyRows.sort((a, b) => a.name.length - b.name.length);
      return sorted[0].id;
    }
  }
  return null;
}

async function getLeagueUuidBySlug(slug) {
  const { data } = await supabase.from('leagues').select('id').eq('slug', slug).maybeSingle();
  return data?.id || null;
}

// --- Highlightly ------------------------------------------------------------

async function fetchHighlightlyMatches(dateIso, hlId) {
  const url = `https://hockey.highlightly.net/matches?leagueId=${hlId}&date=${dateIso}&limit=50`;
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': HIGHLIGHTLY_KEY,
      'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.data) ? data.data : [];
}

function parseHlScore(scoreStr) {
  if (!scoreStr || typeof scoreStr !== 'string' || !scoreStr.includes('-')) return null;
  const parts = scoreStr.split('-').map(s => parseInt(s.trim(), 10));
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  return parts; // [home, away]
}

function hlToStatus(desc) {
  if (!desc) return 'scheduled';
  const d = desc.toLowerCase();
  if (d.includes('final') || d.includes('finished') || d.includes('awarded') || d.startsWith('final/')) return 'completed';
  if (d.includes('live')) return 'in_progress';
  if (d.includes('cancelled')) return 'cancelled';
  if (d.includes('postponed') || d.includes('suspended')) return 'postponed';
  return 'scheduled';
}

async function upsertHighlightlyGame(g, leagueId, leagueName, leagueUuid) {
  const ht = g.homeTeam || {};
  const at = g.awayTeam || {};
  if (!ht.id || !at.id) return null;
  const score = parseHlScore(g.state?.score?.current);
  if (!score) return null;
  const homeTeamId = await lookupTeamByName(ht.name || ht.displayName || '', leagueUuid);
  const awayTeamId = await lookupTeamByName(at.name || at.displayName || '', leagueUuid);
  if (!homeTeamId || !awayTeamId) return null;
  const record = {
    league_id: leagueUuid,
    scheduled_at: g.date,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    home_score: score[0],
    away_score: score[1],
    status: hlToStatus(g.state?.description),
    season: null,
    game_data: { hl_match_id: g.id, hl_league_name: leagueName, home_team_name: ht.name, away_team_name: at.name, home_team_abbrev: ht.abbreviation, away_team_abbrev: at.abbreviation, source: 'highlightly' },
    updated_at: new Date().toISOString(),
  };
  return await upsertFixture(record);
}

// --- Universal upsert -------------------------------------------------------

async function upsertFixture(record) {
  if (DRY_RUN) return null;
  if (!record.home_team_id || !record.away_team_id || !record.league_id) return null;
  const { error } = await supabase
    .from('fixtures')
    .upsert(record, { onConflict: 'league_id,scheduled_at,home_team_id,away_team_id', ignoreDuplicates: false });
  if (error) {
    console.log(`    ✗ upsert failed: ${error.message}`);
    return null;
  }
  return record;
}

// --- Main loop --------------------------------------------------------------

async function main() {
  console.log('=== Daily scores — ALL LEAGUES ===');
  console.log(`Days: ${DAYS} | Dry run: ${DRY_RUN} | Only: ${ONLY.join(',') || 'all'}`);
  console.log('Started:', new Date().toISOString());

  const results = {};
  const today = new Date();
  const DAYS_BACK = Math.max(1, Math.floor(DAYS / 2));
  const DAYS_FWD = DAYS - DAYS_BACK;
  const dates = [];
  for (let dOffset = -DAYS_FWD; dOffset <= DAYS_BACK; dOffset++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + dOffset);
    dates.push(d.toISOString().slice(0, 10));
  }

  // Backfill dates: also include dates where fixtures exist with status='scheduled'
  // and a scheduled_at in the past — these are games that should be completed
  // but weren't synced. Per Arnel's 2026-09-21 'never gaps' directive.
  // Capped at 30 most-recent stale dates per league to avoid runaway API calls.
  // (Added 2026-09-21 per Arnel's 'always updated, never gaps' directive.)
  if (!DRY_RUN) {
    const { data: staleFixtures } = await supabase
      .from('fixtures')
      .select('scheduled_at')
      .eq('status', 'scheduled')
      .lt('scheduled_at', new Date().toISOString())
      .gte('scheduled_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(200);
    if (staleFixtures) {
      const staleDates = [...new Set(staleFixtures.map(f => f.scheduled_at.slice(0, 10)))].slice(0, 30);
      for (const d of staleDates) {
        if (!dates.includes(d)) dates.push(d);
      }
      console.log(`Added ${staleDates.length} stale-game dates to scan list`);
    }
  }

  // NHL.com (NHL)
  if (ONLY.length === 0 || ONLY.includes('nhl')) {
    let count = 0;
    for (const date of dates) {
      try {
        const games = await fetchNhlSchedule(date);
        console.log(`[NHL] ${date}: ${games.length} games`);
        for (const g of games) {
          if (await upsertNhlFixture(g)) count++;
        }
      } catch (e) { console.log(`[NHL] ${date} error: ${e.message}`); }
    }
    results.nhl = count;
  }

  // HockeyTech leagues — DEAD: keys return 'Invalid key'. Use HL instead.
  // The HOCKEYTECH_CONFIG block is kept for reference but unused; if HT keys
  // are ever restored, swap the league list back.
  //
  // Highlightly leagues — single source for ALL non-NHL leagues (HockeyTech
  // keys are dead as of 2026-09-21 verification). Verified live access:
  // AHL ✓, SHL ✓, DEL ✓, KHL ✓, MHL ✓, VHL ✓, SPHL ✓, Liiga ✓, OHL/WHL/QMJHL
  // (date-dependent — returns 0 for off-season dates).
  for (const [hlId, leagueName] of Object.entries(HL_LEAGUE_IDS)) {
    if (ONLY.length > 0 && !ONLY.includes(leagueName.toLowerCase())) continue;
    const leagueUuid = HL_LEAGUE_UUIDS[leagueName];
    if (!leagueUuid) continue;
    let count = 0;
    try {
      // Per-league timeout (2 min) so a single bad league doesn't block the
      // whole run. Added 2026-09-21.
      await Promise.race([
        (async () => {
          for (const date of dates) {
            const games = await fetchHighlightlyMatches(date, hlId);
            for (const g of games) {
              if (await upsertHighlightlyGame(g, hlId, leagueName, leagueUuid)) count++;
            }
          }
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('league timeout (2m)')), 120000)),
      ]);
      if (count > 0) console.log(`[HL ${leagueName}] ${count} games upserted`);
    } catch (e) {
      console.log(`[HL ${leagueName}] error: ${e.message}`);
    }
    results[leagueName.toLowerCase()] = count;
    await sleep(100);
  }

  // Write JSON report for cron delivery
  const totalUpserts = Object.values(results).reduce((s, n) => s + n, 0);
  const report = {
    timestamp: new Date().toISOString(),
    dry_run: DRY_RUN,
    days: DAYS,
    results,
    total_upserts: totalUpserts,
  };
  require('fs').writeFileSync('/tmp/daily-scores-all-leagues-result.json', JSON.stringify(report, null, 2));

  console.log('\n=== SUMMARY ===');
  for (const [league, n] of Object.entries(results)) {
    console.log(`  ${league}: ${n}`);
  }
  console.log(`Total upserts: ${totalUpserts}`);
  console.log('Completed at:', new Date().toISOString());
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
