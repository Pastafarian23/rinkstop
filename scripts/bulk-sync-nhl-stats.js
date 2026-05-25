#!/usr/bin/env node
// Bulk sync NHL player stats from nhl.highlightly.net
// Base: https://nhl.highlightly.net
// Host: nhl-ncaah-api.p.rapidapi.com

const API_KEY = '***REMOVED***';
const RAPIDAPI_HOST = 'nhl-ncaah-api.p.rapidapi.com';
const NHL_BASE = 'https://nhl.highlightly.net';

const BATCH_SIZE = 10;

// Supabase
const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_KEY = '***REMOVED***';

async function supabaseUpsert(table, records) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(records)
  });
  return res.json();
}

// Fetch players list (paginated)
async function fetchPlayers(offset = 0, limit = 50) {
  const res = await fetch(`${NHL_BASE}/players?offset=${offset}&limit=${limit}`, {
    headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
  });
  const data = await res.json();
  return data;
}

// Fetch player details
async function fetchPlayer(playerId) {
  const res = await fetch(`${NHL_BASE}/players/${playerId}`, {
    headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
  });
  return res.json();
}

// Fetch player statistics
async function fetchPlayerStats(playerId) {
  const res = await fetch(`${NHL_BASE}/players/${playerId}/statistics`, {
    headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
  });
  return res.json();
}

// Transform NHL API player to rinkstop players table
function transformPlayer(hlPlayer) {
  const profile = hlPlayer.profile || {};
  const team = profile.team || {};
  const position = profile.position || {};
  
  return {
    id: String(hlPlayer.id),
    first_name: profile.fullName?.split(' ')[0] || '',
    last_name: profile.fullName?.split(' ').slice(1).join(' ') || profile.fullName || '',
    position: position.main?.toLowerCase() || null,
    jersey_number: profile.jersey ? String(profile.jersey) : null,
    height_cm: profile.height ? parseHeight(profile.height) : null,
    weight_kg: profile.weight ? parseWeight(profile.weight) : null,
    birth_date: profile.birthDate ? parseDate(profile.birthDate) : null,
    nationality: profile.birthPlace?.split(',').pop()?.trim() || null,
    headshot_url: hlPlayer.logo || null,
    is_active: profile.isActive ?? true,
    // NHL team mapping ( rinkstop team_id from name lookup)
    team_name: team.displayName || team.name,
    team_abbr: team.abbreviation,
    league: team.league,
  };
}

// Transform stats per season to highlightly_career_stats
function transformStats(hlPlayer, hlStats) {
  const seasons = hlStats.perSeason || [];
  return seasons.map(s => {
    const sdata = {};
    for (const stat of s.stats || []) {
      sdata[stat.name] = stat.value;
    }
    return {
      id: `${hlPlayer.id}-${s.season || ' Unknown'}-${s.seasonType || 'regular'}`,
      player_id: String(hlPlayer.id),
      season: s.season || 'Unknown',
      season_type: s.seasonType || 'regular',
      games_played: sdata['Total Games Played'] ?? sdata['Games Played'] ?? 0,
      goals: sdata['Total Goals'] ?? sdata['Goals'] ?? 0,
      assists: sdata['Total Assists'] ?? sdata['Assists'] ?? 0,
      points: sdata['Total Points'] ?? sdata['Points'] ?? ((sdata['Total Goals'] ?? 0) + (sdata['Total Assists'] ?? 0)),
      penalty_minutes: sdata['Total Penalty Minutes'] ?? sdata['Penalty Minutes'] ?? 0,
      plus_minus: sdata['Plus/Minus Rating'] ?? sdata['+/-'] ?? 0,
      additional_stats: { stats: sdata, raw: s },
      last_synced: new Date().toISOString(),
    };
  });
}

function parseHeight(h) {
  // "6' 1""
  const match = h.match(/(\d+)' (\d+)/);
  if (match) {
    const cm = parseInt(match[1]) * 30.48 + parseInt(match[2]) * 2.54;
    return Math.round(cm);
  }
  return null;
}

function parseWeight(w) {
  // "194 lbs"
  const match = w.match(/(\d+)/);
  return match ? Math.round(parseInt(match[1]) * 0.453592) : null;
}

function parseDate(d) {
  // "13.01.1997" -> "1997-01-13"
  const parts = d.split('.');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  return null;
}

async function main() {
  const totalLimit = parseInt(process.argv[2] || '50');
  const skipExisting = process.argv.includes('--skip-existing');
  
  console.log(`Fetching players from nhl.highlightly.net (limit: ${totalLimit})...`);
  
  // Get players list
  const listData = await fetchPlayers(0, totalLimit);
  const players = listData.data || [];
  const totalCount = listData.pagination?.totalCount || players.length;
  
  console.log(`Total NHL players available: ${totalCount}`);
  console.log(`Syncing first ${Math.min(players.length, totalLimit)} players...`);
  
  let synced = 0, failed = 0, skipped = 0;
  
  for (let i = 0; i < players.length; i += BATCH_SIZE) {
    const batch = players.slice(i, i + BATCH_SIZE);
    console.log(`\nBatch ${Math.floor(i/BATCH_SIZE) + 1}: players ${i+1}-${Math.min(i+BATCH_SIZE, players.length)}`);
    
    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const hlId = p.id;
        
        try {
          // Fetch full player + stats in parallel
          const [playerData, statsData] = await Promise.all([
            fetchPlayer(hlId),
            fetchPlayerStats(hlId)
          ]);
          
          const hlPlayer = Array.isArray(playerData) ? playerData[0] : playerData;
          const hlStats = Array.isArray(statsData) ? statsData[0] : statsData;
          
          if (!hlPlayer || !hlPlayer.id) {
            return { playerId: hlId, status: 'no_data' };
          }
          
          // Upsert player to rinkstop players table
          const playerRec = transformPlayer(hlPlayer);
          await supabaseUpsert('players', playerRec);
          
          // Upsert career stats
          if (hlStats && hlStats.perSeason?.length > 0) {
            const statsRecords = transformStats(hlPlayer, hlStats);
            await supabaseUpsert('highlightly_career_stats', statsRecords);
          }
          
          return { playerId: hlId, name: hlPlayer.fullName, stats: hlStats?.perSeason?.length || 0 };
        } catch (err) {
          return { playerId: hlId, error: err.message };
        }
      })
    );
    
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.error) {
          console.log(`  ✗ ${r.value.playerId}: ${r.value.error}`);
          failed++;
        } else if (r.value.status === 'no_data') {
          console.log(`  → ${r.value.playerId}: no data`);
          skipped++;
        } else {
          console.log(`  ✓ ${r.value.name} (${r.value.playerId}): ${r.value.stats} seasons`);
          synced++;
        }
      } else {
        console.log(`  ✗ Error: ${r.reason}`);
        failed++;
      }
    }
    
    if (i + BATCH_SIZE < players.length) await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`\n=== Results: ${synced} synced, ${skipped} skipped, ${failed} failed ===`);
}

main().catch(err => { console.error(err); process.exit(1); });