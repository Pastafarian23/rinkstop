#!/usr/bin/env node
/**
 * scripts/seed-ahl.mjs
 * Seeds AHL game data from HockeyTech API
 * 
 * API: https://lscluster.hockeytech.com/feed/index.php
 * Params: feed=statviewfeed&view=schedule&season=90&team=-1&...
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SERVICE_KEY  = '***REMOVED***';
const AHL_LEAGUE_ID = 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// AHL team city → Supabase team name
const CITY_TO_TEAM = {
  'Abbotsford':       'Abbotsford Canucks',
  'Bakersfield':      'Bakersfield Condors',
  'Belleville':      'Belleville Senators',
  'Bridgeport':      'Bridgeport Islanders',
  'Calgary':         'Stockton Heat',           // displaced AHL team
  'Charlotte':       'Charlotte Checkers',
  'Chicago':         'Chicago Wolves',
  'Cleveland':      'Cleveland Monsters',
  'Coachella Valley':'Coachella Valley Firebirds',
  'Colorado':        'Colorado Eagles',
  'Grand Rapids':   'Grand Rapids Griffins',
  'Hartford':       'Hartford Wolf Pack',
  'Hershey':        'Hershey Bears',
  'Iowa':           'Iowa Wild',
  'Laval':          'Laval Rocket',
  'Lehigh Valley':  'Lehigh Valley Phantoms',
  'Manitoba':       'Manitoba Moose',
  'Milwaukee':      'Milwaukee Admirals',
  'Ontario':        'Ontario Reign',
  'Providence':     'Providence Bruins',
  'Rochester':      'Rochester Americans',
  'San Diego':      'Stockton Heat',           // displaced team
  'San Jose':       'San Jose Barracuda',
  'Santa Clara':    'Santa Clara Roadrunners',
  'Springfield':    'Springfield Thunderbirds',
  'Syracuse':       'Syracuse Crunch',
  'Texas':          'Texas Stars',
  'Toronto':        'Toronto Marlies',
  'Tucson':         'Tucson Roadrunners',
  'Utica':          'Utica Comets',
  'Wilkes-Barre/Scranton': 'Wilkes-Barre/Scranton Penguins',
  'Henderson':      'Ontario Reign',            // Henderson Silver Knights → Ontario Reign
  'Rockford':       'Illinois Rockets',         // Rockford IceHogs renamed in our DB
};

// Season ID for AHL 2024-25
const SEASON = '90';

async function getTeamIdMap() {
  const { data } = await supabase.from('teams').select('id, name, city').eq('league_id', AHL_LEAGUE_ID);
  const map = {};
  // Key by city
  if (data) {
    for (const t of data) {
      const c = (t.city || '').split('(')[0].trim().toLowerCase();
      map[c] = t.id;
    }
  }
  return map;
}

function parseDate(dateWithDay) {
  // e.g. "Thu, Mar 19" → assume 2025
  const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const parts = dateWithDay.match(/(\w+),\s+(\w+)\s+(\d+)/);
  if (!parts) return null;
  const mon = months[parts[2]] ?? 2; // default Mar
  const day = parseInt(parts[3]);
  // Season is 2024-2025 (Oct 2024 – Apr 2025) or 2025-2026 (Oct 2025 – Apr 2026)
  let year = mon >= 9 ? 2024 : 2025;
  if (mon >= 9 && day >= 1) year = 2024;
  else if (mon <= 4 && day <= 31) year = 2025;
  return new Date(year, mon, day, 19, 0, 0);
}

async function fetchAHLGames(month) {
  const url = `https://lscluster.hockeytech.com/feed/index.php?feed=statviewfeed&view=schedule&season=${SEASON}&team=-1&client_code=ahl&league_id=4&site_id=3&key=ccb91f29d6744675&location=homeaway&date=&month=${month}`;
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
  const text = await res.text();
  
  // Parse the JSONP-like response — extract JSON from callback
  // Format: somecallback({ ... })
  let json;
  const m = text.match(/somecallback\s*\(\s*(\{.*})\s*\)\s*;?\s*$/s);
  if (m) {
    json = JSON.parse(m[1]);
  } else {
    // Try direct parse
    json = JSON.parse(text);
  }
  
  return json;
}

function extractGamesFromResponse(data) {
  if (!data || !data sections) return [];
  
  for (const section of data.sections || []) {
    if (!section.data) continue;
    for (const row of section.data) {
      // games found here
      return section.data.map(r => ({
        gameId:    r.row?.game_id,
        dateStr:   r.row?.date_with_day,
        homeCity:  r.row?.home_team_city,
        awayCity:  r.row?.visiting_team_city,
        homeScore: r.row?.home_goal_count,
        awayScore: r.row?.visiting_goal_count,
        status:    r.row?.game_status,
        homeLink:  r.prop?.home_team_city?.teamLink,
        awayLink:  r.prop?.visiting_team_city?.teamLink,
      })).filter(g => g.gameId);
    }
  }
  return [];
}

// Alternate extraction: the response is an array of section objects
function extractGamesDirect(data) {
  if (!data) return [];
  const games = [];
  
  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    if (obj.row && obj.row.game_id && obj.row.date_with_day) {
      games.push({
        gameId:    obj.row.game_id,
        dateStr:   obj.row.date_with_day,
        homeCity:  obj.row.home_team_city,
        awayCity:  obj.row.visiting_team_city,
        homeScore: obj.row.home_goal_count,
        awayScore: obj.row.visiting_goal_count,
        status:    obj.row.game_status,
      });
    }
    Object.values(obj).forEach(walk);
  }
  
  walk(data);
  return games;
}

async function main() {
  const teamIdMap = await getTeamIdMap();
  console.log(`Loaded ${Object.keys(teamIdMap).length} AHL teams`);
  
  // Fetch months Sep 2024 through May 2025 (full season)
  const allGames = [];
  
  for (let m = 9; m <= 17; m++) {
    const month = m <= 12 ? m : m - 12;
    const year  = m <= 12 ? 2024 : 2025;
    if (month > 5) break; // May max
    
    const monthStr = `${year}-${String(month).padStart(2,'0')}`;
    console.log(`Fetching AHL data for month ${monthStr}...`);
    
    try {
      const raw = await fetchAHLGames(monthStr);
      const games = extractGamesDirect(raw);
      console.log(`  Found ${games.length} games`);
      allGames.push(...games);
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error(`  Error fetching month ${monthStr}: ${e.message}`);
    }
  }
  
  console.log(`Total games fetched: ${allGames.length}`);
  
  let inserted = 0;
  for (const g of allGames) {
    if (!g.gameId) continue;
    
    const homeCityKey = (g.homeCity || '').toLowerCase().replace(/\/$/, '');
    const awayCityKey = (g.awayCity || '').toLowerCase().replace(/\/$/, '');
    
    const homeTeamId = teamIdMap[homeCityKey] || null;
    const awayTeamId = teamIdMap[awayCityKey] || null;
    
    const scheduledAt = parseDate(g.dateStr);
    if (!scheduledAt) continue;
    
    let status = 'completed';
    if (g.status && (g.status.includes('OT') || g.status.includes('SO'))) {
      status = 'completed'; // OT/SO is still completed
    } else if (g.status && g.status !== 'Final') {
      status = 'scheduled'; // future game
    }
    
    const fixture = {
      id:           randomUUID(),
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      league_id:    AHL_LEAGUE_ID,
      venue_id:     null,
      scheduled_at: scheduledAt.toISOString(),
      home_score:   g.homeScore != null ? parseInt(g.homeScore) : null,
      away_score:   g.awayScore != null ? parseInt(g.awayScore) : null,
      status,
      season:       '2024-25',
      game_data:    JSON.stringify({
        ahl_game_id: String(g.gameId),
        status:      g.status,
        overtime:   !!(g.status && (g.status.includes('OT') || g.status.includes('SO'))),
        home_city:  g.homeCity,
        away_city:  g.awayCity,
        home_team_link: g.homeLink,
        away_team_link: g.awayLink,
      }),
    };
    
    const { error } = await supabase.from('fixtures').upsert(fixture, { onConflict: 'id' });
    if (!error) inserted++;
  }
  
  console.log(`Inserted/updated ${inserted} AHL fixtures`);
}

main().catch(console.error);