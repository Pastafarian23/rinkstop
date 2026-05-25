// Minimal bulk sync - one player at a time, no fancy stuff
const https = require('https');
const API_KEY = '***REMOVED***';
const NHL_BASE = 'nhl.highlightly.net';
const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_KEY = '***REMOVED***';

function fetchPlayerStats(id) {
  return new Promise((resolve) => {
    https.get({ hostname: NHL_BASE, path: '/players/' + id + '/statistics', headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { const p = JSON.parse(data); resolve(p.length > 0 ? p : []); }
        catch { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

async function upsertRecords(records) {
  if (!records.length) return 200;
  const res = await fetch(SUPABASE_URL + '/rest/v1/highlightly_career_stats', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify(records)
  });
  return res.status;
}

async function main() {
  // Get players with highlightly_id
  const playersRes = await fetch(SUPABASE_URL + '/rest/v1/players?highlightly_id=not.is.null&select=id,highlightly_id,first_name,last_name', {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  const players = await playersRes.json();
  
  // Get existing stats
  const statsRes = await fetch(SUPABASE_URL + '/rest/v1/highlightly_career_stats?select=player_id', {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  const statsData = await statsRes.json();
  const existingStats = new Set(statsData.map(r => r.player_id));
  
  // FIX: use highlightly_id (with 'y'), not highantly_id (without 'y')
  const needSync = players.filter(p => p.highlightly_id && !existingStats.has(p.highlightly_id));
  console.log('Total players:', players.length, '| Already synced:', existingStats.size, '| Need to sync:', needSync.length);
  
  let synced = 0, noStats = 0, errors = 0;
  const start = Date.now();
  
  for (let i = 0; i < needSync.length; i++) {
    const p = needSync[i];
    
    // FIX: use highlightly_id here
    const data = await fetchPlayerStats(p.highlightly_id);
    
    if (data.length > 0 && data[0].perSeason?.length > 0) {
      const records = data[0].perSeason.map(ps => {
        const stats = ps.stats || [];
        const getStat = (name) => { const s = stats.find(x => x.name === name); return s ? parseInt(s.value) || 0 : 0; };
        return {
          // FIX: use highlightly_id here
          id: p.highlightly_id + '-' + ps.season + '-' + (ps.seasonType || 'regular'),
          player_id: p.highlightly_id,
          player_name: data[0].fullName || p.first_name + ' ' + p.last_name,
          season: String(ps.season),
          season_type: ps.seasonType || 'regular',
          games_played: getStat('Total Games Played'),
          goals: getStat('Total Goals'),
          assists: getStat('Total Assists'),
          points: getStat('Total Points'),
          penalty_minutes: getStat('Total Penalty Minutes') || 0,
          plus_minus: getStat('Plus/Minus Rating') || 0,
          wins: 0, losses: 0, save_percentage: null, goals_against_average: null, shutouts: 0,
        };
      });
      const status = await upsertRecords(records);
      if (status < 400) { synced++; } else { errors++; }
    } else {
      noStats++;
    }
    
    if ((i + 1) % 20 === 0) {
      const elapsed = Math.round((Date.now() - start) / 1000);
      console.log('[' + elapsed + 's] ' + (i + 1) + '/' + needSync.length + ' | Synced: ' + synced + ' | No stats: ' + noStats + ' | Errors: ' + errors);
    }
    
    await new Promise(r => setTimeout(r, 400));
  }
  
  console.log('\nDONE! Time:', Math.round((Date.now() - start) / 1000) + 's | Synced:', synced, '| No stats:', noStats, '| Errors:', errors);
}

main().catch(console.error);