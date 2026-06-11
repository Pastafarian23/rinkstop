require('./load-secrets.cjs');
#!/usr/bin/env node
// Map RinkStop players to highlightly NHL player IDs
// Then sync stats for matched players

const API_KEY = process.env.HIGHLIGHTLY_API_KEY;
const RAPIDAPI_HOST = 'nhl-ncaah-api.p.rapidapi.com';
const NHL_BASE = 'https://nhl.highlightly.net';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseFetch(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  return res.json();
}

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

async function supabaseUpdate(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function fetchHighlightlyPlayers(offset = 0) {
  const res = await fetch(`${NHL_BASE}/players?offset=${offset}&limit=100`, {
    headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': RAPIDAPI_HOST, 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const data = await res.json();
  return data;
}

function normalize(name) {
  return (name || '').toLowerCase().replace(/[^a-z]/g, '').trim();
}

async function main() {
  console.log('Fetching RinkStop NHL teams...');
  
  const rinkstopTeams = await supabaseFetch('teams?select=id,name&is_active=eq.true&limit=500');
  console.log(`Total teams: ${rinkstopTeams.length}`);
  
  // Get all players
  console.log('Fetching RinkStop players...');
  const allPlayers = await supabaseFetch('players?select=id,first_name,last_name,slug,team_id&is_active=eq.true&limit=2000');
  console.log(`Total active players: ${allPlayers.length}`);
  
  // Fetch all highlightly NHL players
  console.log('\nFetching highlightly NHL players...');
  const hlPlayers = [];
  const hlLookup = {};
  
  let offset = 0;
  while (true) {
    const data = await fetchHighlightlyPlayers(offset);
    const players = data.data || [];
    if (players.length === 0) break;
    for (const p of players) {
      hlPlayers.push(p);
      hlLookup[normalize(p.fullName)] = p;
    }
    offset += players.length;
    console.log(`Fetched ${offset}/${data.pagination?.totalCount || '?'}...`);
    if (offset >= data.pagination?.totalCount) break;
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`Total highlightly players indexed: ${hlPlayers.length}`);
  
  // Match and map
  let matched = 0, unmatched = 0;
  const mapped = [];
  
  for (const rp of allPlayers) {
    const fullName = `${rp.first_name} ${rp.last_name}`.trim();
    const hlPlayer = hlLookup[normalize(fullName)] || hlLookup[normalize(rp.slug)];
    
    if (hlPlayer) {
      await supabaseUpdate('players', rp.id, { highlightly_id: String(hlPlayer.id) });
      mapped.push({ rinkstopId: rp.id, hlId: hlPlayer.id, name: fullName });
      matched++;
      console.log(`  ✓ ${fullName} → ${hlPlayer.id}`);
    } else {
      unmatched++;
    }
  }
  
  console.log(`\n=== Mapping: ${matched} matched, ${unmatched} unmatched ===`);
  
  // Sync stats for mapped players
  if (mapped.length > 0) {
    console.log('\nSyncing stats for matched players...');
    
    for (const m of mapped.slice(0, 100)) {
      try {
        const res = await fetch(`${NHL_BASE}/players/${m.hlId}/statistics`, {
          headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': RAPIDAPI_HOST, 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        
        if (!res.ok) { console.log(`  ✗ ${m.name}: ${res.status}`); continue; }
        
        const data = await res.json();
        const hlStats = Array.isArray(data) ? data[0] : data;
        
        if (!hlStats?.perSeason?.length) { console.log(`  → ${m.name}: no stats`); continue; }
        
        const statsRecords = hlStats.perSeason.map(s => {
          const sdata = {};
          for (const stat of s.stats || []) sdata[stat.name] = stat.value;
          return {
            id: `${m.hlId}-${s.season}-${s.seasonType || 'regular'}`,
            player_id: String(m.hlId),
            player_name: m.name,
            season: String(s.season),
            season_type: s.seasonType || 'regular',
            games_played: sdata['Total Games Played'] ?? 0,
            goals: sdata['Total Goals'] ?? 0,
            assists: sdata['Total Assists'] ?? 0,
            points: sdata['Total Points'] ?? ((sdata['Total Goals'] ?? 0) + (sdata['Total Assists'] ?? 0)),
            penalty_minutes: sdata['Total Penalty Minutes'] ?? 0,
            plus_minus: sdata['Plus/Minus Rating'] ?? 0,
            last_synced: new Date().toISOString(),
          };
        });
        
        await supabaseUpsert('highlightly_career_stats', statsRecords);
        console.log(`  ✓ ${m.name}: ${statsRecords.length} seasons synced`);
        await new Promise(r => setTimeout(r, 150));
      } catch (err) {
        console.log(`  ✗ ${m.name}: ${err.message}`);
      }
    }
  }
  
  console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });