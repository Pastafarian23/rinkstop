#!/usr/bin/env node
/**
 * sync-nhl-highlightly-games.cjs — 2026-06-15
 *
 * Pulls NHL game results from Highlightly (nhl.highlightly.net) and upserts to Supabase.
 * Replaces sync-nhl-live.js (which uses api-web.nhle.com — returns 404 for sim dates).
 *
 * Highlightly provides both 2025 and 2026 season data. We sync the most recent N days
 * of playoff + regular-season games, fill-gaps-only (never overwrite a non-null score
 * with null).
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
const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const HL_BASE = 'https://nhl.highlightly.net';
const HL_HOST = 'nhl-ncaah-api.p.rapidapi.com';

const NHL_ABBREV_TO_UUID = {
  ANA: '219a6bb2-1103-4e27-931e-5de440e59f84', BOS: 'ae6d0878-1ac2-4c13-afc8-890c6647b668',
  BUF: '5a510c0e-1058-460d-8237-09855dfa98f4', CAR: 'e4977c12-28b3-4756-a788-cf86b40fc237',
  CBJ: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344', CGY: '626458da-d2d4-4a4f-a816-816b-f3796b84cfc4',
  CHI: '553a6b7b-6416-4b74-a9b3-fa15d06d52ab', COL: 'f453fd29-12e4-4897-8f8a-ecf23d6a4122',
  DAL: '4c61f05e-8d34-40be-b0a8-adf37e14435c', DET: 'f3fa0794-ee39-4991-af45-961cb3e8f404',
  EDM: '5b487d74-5e9c-43c8-b104-35185fc93350', FLA: '7772070c-6c9b-4ca0-a442-dfe5b8beabcb',
  LAK: 'df9b5d1e-c5d9-46af-a524-99de500e95bf', MIN: 'd3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe',
  MTL: 'cff8bd78-5fee-49dc-b0ee-374722efd7b5', NJD: '486e6592-5873-48a0-8cdd-8411c8eb1105',
  NSH: '2d3d8a64-c0d7-4b8e-a327-a1201cc92f72', NYI: 'acc8b466-ef9b-4d81-8ea5-6f13fc180d9e',
  NYR: '2869d1cd-d8f4-4ffb-9726-30bdfdbc14d3', OTT: 'a1f8b7f1-f7ea-42ee-9861-0eb0addf437d',
  PHI: 'cf53124a-dbb5-4588-9cb2-2f6054918f99', PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55',
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10', SEA: 'bf324536-424b-4a3d-b486-1347aa735aae',
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c', TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa',
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d',
  UTA: '3b80d876-f931-4740-a47f-0ed15c0e410f', VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce',
  VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20', WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f',
  WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa',
};

// Team name → abbrev (from Highlightly NHL data)
const HL_NAME_TO_ABBREV = {
  'Anaheim Ducks': 'ANA', 'Boston Bruins': 'BOS', 'Buffalo Sabres': 'BUF',
  'Carolina Hurricanes': 'CAR', 'Columbus Blue Jackets': 'CBJ', 'Calgary Flames': 'CGY',
  'Chicago Blackhawks': 'CHI', 'Colorado Avalanche': 'COL', 'Dallas Stars': 'DAL',
  'Detroit Red Wings': 'DET', 'Edmonton Oilers': 'EDM', 'Florida Panthers': 'FLA',
  'Los Angeles Kings': 'LAK', 'Minnesota Wild': 'MIN', 'Montreal Canadiens': 'MTL',
  'Nashville Predators': 'NSH', 'New Jersey Devils': 'NJD', 'New York Islanders': 'NYI',
  'New York Rangers': 'NYR', 'Ottawa Senators': 'OTT', 'Philadelphia Flyers': 'PHI',
  'Pittsburgh Penguins': 'PIT', 'San Jose Sharks': 'SJS', 'Seattle Kraken': 'SEA',
  'St. Louis Blues': 'STL', 'Tampa Bay Lightning': 'TBL', 'Toronto Maple Leafs': 'TOR',
  'Utah Hockey Club': 'UTA', 'Vancouver Canucks': 'VAN', 'Vegas Golden Knights': 'VGK',
  'Washington Capitals': 'WSH', 'Winnipeg Jets': 'WPG',
};

const dryRun = process.argv.includes('--dry-run');
const daysArg = process.argv.find(a => a.startsWith('--days='));
const DAYS = daysArg ? parseInt(daysArg.split('=')[1], 10) : 14;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

async function main() {
  console.log(`\n🏒 NHL Highlightly Game Sync | days=${DAYS} | dry=${dryRun}`);
  console.log(`${'─'.repeat(60)}`);

  const allMatches = await hlFetchMatches(100);
  const cutoff = Date.now() - (DAYS * 24 * 60 * 60 * 1000);
  const recent = allMatches.filter(m => new Date(m.date).getTime() >= cutoff);
  console.log(`📊 ${allMatches.length} total matches | ${recent.length} in last ${DAYS} days`);

  let updated = 0, inserted = 0, preserved = 0, errors = 0;
  for (const m of recent) {
    const hAbbr = HL_NAME_TO_ABBREV[m.homeTeam?.displayName];
    const aAbbr = HL_NAME_TO_ABBREV[m.awayTeam?.displayName];
    const hId = NHL_ABBREV_TO_UUID[hAbbr];
    const aId = NHL_ABBREV_TO_UUID[aAbbr];
    if (!hId || !aId) { console.log(`  ✗ no team map: ${m.awayTeam?.displayName} @ ${m.homeTeam?.displayName}`); errors++; continue; }

    const scheduled = new Date(m.date).toISOString();
    const status = hlToStatus(m.state);
    const { home, away } = parseScore(m.state?.score?.current);
    const gameData = { ...m, nhl_game_id: m.id, source: 'highlightly' };

    // Find existing
    const { data: existingList } = await supabase
      .from('fixtures')
      .select('id, home_score, away_score, status')
      .eq('league_id', NHL_LEAGUE_ID)
      .eq('scheduled_at', scheduled)
      .eq('home_team_id', hId)
      .eq('away_team_id', aId)
      .limit(1);
    const existing = existingList?.[0];

    if (existing) {
      // FILL GAPS, but also override placeholder 0-0 scores when HL has real data
      // (placeholder pattern: home_score=0 AND away_score=0 — for completed games
      // that's almost certainly a stale "no data" row, since a real 0-0 OT game is rare)
      const isPlaceholder = existing.home_score === 0 && existing.away_score === 0;
      const updates = {};
      if (existing.home_score === null && home !== null) updates.home_score = home;
      if (existing.away_score === null && away !== null) updates.away_score = away;
      if (isPlaceholder && home !== null && home !== 0) updates.home_score = home;
      if (isPlaceholder && away !== null && away !== 0) updates.away_score = away;
      if (existing.status === 'scheduled' && status === 'completed' && home !== null) updates.status = 'completed';
      if (existing.status === 'completed' && status === 'completed' && isPlaceholder) updates.status = 'completed'; // no-op, just keep
      updates.game_data = gameData;
      updates.updated_at = new Date().toISOString();
      const realChanges = Object.keys(updates).filter(k => k !== 'game_data' && k !== 'updated_at').length;
      if (realChanges === 0) { preserved++; continue; }
      if (!dryRun) {
        const { error } = await supabase.from('fixtures').update(updates).eq('id', existing.id);
        if (error) { console.log(`  ✗ update err: ${m.id} ${error.message}`); errors++; continue; }
      }
      updated++;
      console.log(`  ↻ ${m.date.slice(0,10)} ${aAbbr} ${away ?? '-'} @ ${hAbbr} ${home ?? '-'} [${status}]${isPlaceholder ? ' (overrode 0-0 placeholder)' : ''}`);
    } else {
      if (!dryRun) {
        const { error } = await supabase.from('fixtures').insert({
          id: crypto.randomUUID(),
          league_id: NHL_LEAGUE_ID,
          home_team_id: hId, away_team_id: aId,
          scheduled_at: scheduled,
          home_score: home, away_score: away,
          status, season: '20252026', game_data: gameData,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        if (error) { console.log(`  ✗ insert err: ${m.id} ${error.message}`); errors++; continue; }
      }
      inserted++;
      console.log(`  + ${m.date.slice(0,10)} ${aAbbr} ${away ?? '-'} @ ${hAbbr} ${home ?? '-'} [${status}]`);
    }
    await sleep(80);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`   ↻ ${updated} updated | + ${inserted} inserted | = ${preserved} preserved | ✗ ${errors} errors`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
