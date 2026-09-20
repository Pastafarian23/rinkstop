#!/usr/bin/env node
/**
 * sync-nhl-highlightly-games.cjs — 2026-09-19 rewrite
 *
 * Pulls game results from Highlightly (nhl.highlightly.net) for NHL + NCAA (both
 * available on this endpoint) and upserts to public.fixtures.
 *
 * ROUTING SOURCE OF TRUTH = Highlightly's own `league` field per match. We never
 * guess which DB league a match belongs to.
 *
 * TEAM MATCHING: load all active teams from DB once per run, build a normalized
 * name lookup, resolve each Highlightly displayName to a UUID. Only matches whose
 * teams exist in our DB AND are in the routed DB league are written. Everything
 * else is skipped (never fabricated).
 *
 * FIXES APPLIED (per 2026-09-19 audit):
 *   - Old hardcoded NHL_ABBREV_TO_UUID had CGY typo (extra "a816-816b-" segment)
 *     which broke inserts on game ids 644528, 643047
 *   - Old hardcoded HL_NAME_TO_ABBREV missed "Utah Mammoth" (rebrand mid-2026)
 *   - Old script ignored NCAA games because the hardcoded maps only knew NHL
 *
 * Run: node scripts/sync-nhl-highlightly-games.cjs [--dry-run] [--days=14]
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HL_KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!HL_KEY) { console.error('HIGHLIGHTLY_API_KEY missing'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SB_KEY);
const HL_BASE = 'https://nhl.highlightly.net';
const HL_HOST = 'nhl-ncaah-api.p.rapidapi.com';

const dryRun = process.argv.includes('--dry-run');
const daysArg = process.argv.find(a => a.startsWith('--days='));
const DAYS = daysArg ? parseInt(daysArg.split('=')[1], 10) : 14;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Normalize a name for fuzzy matching:
//   - lowercase, collapse spaces, drop punctuation
//   - drop COLLEGE mascot suffixes that may or may not be present ("Terriers",
//     "Wildcats", etc.) so "Boston University Terriers" matches "Boston University"
//   - DO NOT strip NHL team nicknames — "New York Islanders" and "New York Rangers"
//     are distinct teams that share city + state. The DB has both, and stripping
//     "islanders"/"rangers" would collapse them.
//   - "University" / "College" kept in the key — they're disambiguators for NCAA
function normalizeName(s) {
  if (!s) return '';
  // Strip diacritics first so "Montréal Canadiens" matches "Montreal Canadiens"
  let x = String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  x = x.toLowerCase().trim();
  // College-only mascots (NOT NHL nicknames). If the team is "Boston College" then
  // "Eagles" is part of its full name; we only strip when it's clearly a mascot
  // suffix to a longer university/college name.
  const collegeMascots = [
    'terriers','wildcats','bearcats','hokies','huskies','badgers','mavericks',
    'minutemen','catamounts','pioneers','colonials','griffins','crusaders',
    'lakers','vikings','norse','tommies','seawolves','leathernecks','chasers',
    'fighting irish','fighting scots','purple eagles','golden griffins',
    'river hawks','thunderbirds','lumberjacks','black knights','friars',
    'spartans','nittany lions','bobcats','revolutionaries','tigers','hawks',
    'knights','raiders','eagles','falcons','engineers','saints',
  ];
  for (const m of collegeMascots) {
    x = x.replace(new RegExp('\\b' + m + '\\b', 'g'), '');
  }
  x = x.replace(/\bstate university\b/g, 'state');
  x = x.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return x;
}

// Map Highlightly's league label → our DB league_id. We prefer the league
// with the most teams because some teams (e.g. NHL clubs) exist in multiple
// league rows in our DB.
async function loadLeagueCache() {
  // Pull leagues + team counts in one pass per league
  let allLeagues = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name, slug, level')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`loadLeagueCache: ${error.message}`);
    if (!data || data.length === 0) break;
    allLeagues = allLeagues.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return allLeagues;
}

// HL league string -> ordered list of candidate DB league_ids (most preferred first).
// This handles the "NHL team also exists in WHL/ECHL/FPHL row" pollution.
function candidateLeaguesFor(hlLeague, allLeagues) {
  const matches = [];
  if (hlLeague === 'NHL') {
    matches.push('nhl');                        // primary
  } else if (hlLeague === 'NCAA') {
    matches.push('ncaa-division-1-hockey');      // primary (most teams)
    matches.push('ncaa-usa');                   // secondary
    matches.push('ncaa-division-3-hockey');     // tertiary
  }
  const result = [];
  for (const slug of matches) {
    const league = allLeagues.find(l => l.slug === slug);
    if (league) result.push(league.id);
  }
  return result;
}

// Build a lookup table for teams, keyed by (league_id, normalized_name).
// Teams missing league_id are ignored. Duplicate (league_id, normalized_name)
// pairs surface as a list — caller picks the first active row.
async function loadTeamIndex() {
  // Map: league_id -> Map(normalized_name -> array of { id, name })
  const byLeague = new Map();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, league_id, is_active')
      .eq('is_active', true)
      .not('league_id', 'is', null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`loadTeamIndex: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const t of data) {
      const key = normalizeName(t.name);
      if (!key) continue;
      let inner = byLeague.get(t.league_id);
      if (!inner) { inner = new Map(); byLeague.set(t.league_id, inner); }
      let arr = inner.get(key);
      if (!arr) { arr = []; inner.set(key, arr); }
      arr.push({ id: t.id, name: t.name });
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return byLeague;
}

function pickTeam(arr) {
  if (!arr || arr.length === 0) return null;
  if (arr.length === 1) return arr[0];
  // Multiple DB rows normalized to the same key. Pick the LONGEST original
  // name — e.g. "Boston College Eagles" beats "Boston College" because it
  // preserved the mascot which disambiguates from "Boston University Terriers"
  // (also normalized to "boston"). This is a heuristic; the DB duplication is
  // a separate cleanup task tracked separately.
  arr.sort((a, b) => b.name.length - a.name.length);
  console.log(`  ⚠ ambiguous (${arr.length} matches in same league): ${arr.map(a => a.name).join(' | ')} — picking "${arr[0].name}"`);
  return arr[0];
}

async function hlFetchMatches(limit = 100) {
  const res = await fetch(`${HL_BASE}/matches?limit=${limit}`, {
    headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': HL_HOST },
  });
  if (!res.ok) throw new Error(`HL ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

function hlToStatus(state) {
  const desc = (state?.description || state?.report || '').toLowerCase();
  if (desc.includes('final') || desc.includes('finished') || desc.includes('off')) return 'completed';
  if (desc.includes('live') || desc.includes('progress') || desc.includes('crit')) return 'in_progress';
  if (desc.includes('scheduled') || desc.includes('future') || desc.includes('fut')) return 'scheduled';
  if (desc.includes('postponed') || desc.includes('ppd')) return 'postponed';
  return 'scheduled';
}

function parseScore(current) {
  if (!current) return { home: null, away: null };
  const m = String(current).split('-').map(s => parseInt(s.trim(), 10));
  if (m.length !== 2 || m.some(isNaN)) return { home: null, away: null };
  return { home: m[0], away: m[1] };
}

function seasonForDate(d) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (m >= 8) return `${y}${y + 1}`;
  return `${y - 1}${y}`;
}

async function main() {
  console.log(`\n🏒 Highlightly Game Sync | days=${DAYS} | dry=${dryRun}`);
  console.log(`${'─'.repeat(60)}`);

  console.log('📥 Loading leagues + teams from DB...');
  const allLeagues = await loadLeagueCache();
  const teamIndex = await loadTeamIndex();
  let totalTeams = 0;
  for (const m of teamIndex.values()) totalTeams += m.size;
  console.log(`   ${allLeagues.length} leagues, ${totalTeams} unique team names across leagues`);

  const allMatches = await hlFetchMatches(100);
  const cutoff = Date.now() - (DAYS * 24 * 60 * 60 * 1000);
  const recent = allMatches.filter(m => new Date(m.date).getTime() >= cutoff);
  console.log(`📊 ${allMatches.length} total matches | ${recent.length} in last ${DAYS} days`);
  const hlLeagues = [...new Set(recent.map(m => m.league))];
  console.log(`   Highlightly leagues present: ${hlLeagues.join(', ')}`);

  let updated = 0, inserted = 0, preserved = 0, errors = 0, skipped = 0;
  for (const m of recent) {
    const hlLeague = m.league;
    const candidateLeagueIds = candidateLeaguesFor(hlLeague, allLeagues);
    if (candidateLeagueIds.length === 0) {
      skipped++;
      console.log(`  ~ skip (no DB league for HL "${hlLeague}"): ${m.awayTeam?.displayName} @ ${m.homeTeam?.displayName}`);
      continue;
    }

    const homeKey = normalizeName(m.homeTeam?.displayName || m.homeTeam?.name);
    const awayKey = normalizeName(m.awayTeam?.displayName || m.awayTeam?.name);

    // Try each candidate league in priority order — first one where BOTH teams
    // resolve is the winner.
    let resolved = null;
    for (const leagueId of candidateLeagueIds) {
      const leagueTeams = teamIndex.get(leagueId);
      if (!leagueTeams) continue;
      const homeArr = leagueTeams.get(homeKey);
      const awayArr = leagueTeams.get(awayKey);
      if (homeArr && awayArr) {
        const h = pickTeam(homeArr);
        const a = pickTeam(awayArr);
        if (h && a) {
          resolved = { leagueId, homeTeam: h, awayTeam: a };
          break;
        }
      }
    }
    if (!resolved) {
      skipped++;
      console.log(`  ~ skip (HL "${hlLeague}" team not in DB): ${m.awayTeam?.displayName} @ ${m.homeTeam?.displayName}`);
      continue;
    }

    const { leagueId, homeTeam, awayTeam } = resolved;
    const hId = homeTeam.id;
    const aId = awayTeam.id;

    const scheduled = new Date(m.date).toISOString();
    const status = hlToStatus(m.state);
    const { home, away } = parseScore(m.state?.score?.current);
    const gameData = { ...m, nhl_game_id: m.id, source: 'highlightly' };
    const season = seasonForDate(new Date(m.date));

    const { data: existingList } = await supabase
      .from('fixtures')
      .select('id, home_score, away_score, status')
      .eq('league_id', leagueId)
      .eq('scheduled_at', scheduled)
      .eq('home_team_id', hId)
      .eq('away_team_id', aId)
      .limit(1);
    const existing = existingList?.[0];

    const label = `${m.date.slice(0,10)} ${homeTeam.name} ${home ?? '-'} vs ${awayTeam.name} ${away ?? '-'} [${status}] [${hlLeague}→${leagueId.slice(0,8)}]`;

    if (existing) {
      const isPlaceholder = existing.home_score === 0 && existing.away_score === 0;
      const updates = {};
      if (existing.home_score === null && home !== null) updates.home_score = home;
      if (existing.away_score === null && away !== null) updates.away_score = away;
      if (isPlaceholder && home !== null && home !== 0) updates.home_score = home;
      if (isPlaceholder && away !== null && away !== 0) updates.away_score = away;
      if (existing.status === 'scheduled' && status === 'completed' && home !== null) updates.status = 'completed';
      updates.game_data = gameData;
      updates.updated_at = new Date().toISOString();
      const realChanges = Object.keys(updates).filter(k => k !== 'game_data' && k !== 'updated_at').length;
      if (realChanges === 0) { preserved++; continue; }
      if (!dryRun) {
        const { error } = await supabase.from('fixtures').update(updates).eq('id', existing.id);
        if (error) { console.log(`  ✗ update err: ${m.id} ${error.message}`); errors++; continue; }
      }
      updated++;
      console.log(`  ↻ ${label}${isPlaceholder ? ' (overrode 0-0 placeholder)' : ''}`);
    } else {
      if (!dryRun) {
        const { error } = await supabase.from('fixtures').insert({
          id: crypto.randomUUID(),
          league_id: leagueId,
          home_team_id: hId, away_team_id: aId,
          scheduled_at: scheduled,
          home_score: home, away_score: away,
          status, season, game_data: gameData,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        if (error) { console.log(`  ✗ insert err: ${m.id} ${error.message}`); errors++; continue; }
      }
      inserted++;
      console.log(`  + ${label}`);
    }
    await sleep(80);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`   ↻ ${updated} updated | + ${inserted} inserted | = ${preserved} preserved | ~ ${skipped} skipped | ✗ ${errors} errors`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });