/**
 * Fix fixtures table:
 * 1. Deduplicate by nhl_game_id (keep most recent entry per game)
 * 2. Re-sync recent completed games with team data from NHL API
 */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SB_KEY = '***REMOVED***';
const supabase = createClient(SUPABASE_URL, SB_KEY);
const NHL_API = 'https://api-web.nhle.com/v1';

function sleep(ms) { return new Promise(r => setTimeout(() => {}, ms)); }

async function nhlFetch(path) {
  const res = await fetch(`${NHL_API}${path}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

function mapStatus(state) {
  if (state === 'OFF' || state === 'FINAL' || state === 'FINAL OT' || state === 'FINAL SO') return 'completed';
  if (state === 'FUT' || state === 'PRE' || state === 'Scheduled') return 'scheduled';
  if (state === 'POST' || state === 'ING' || state === 'LIVE') return 'in_progress';
  if (state === 'PPD' || state === 'POSTPONED') return 'postponed';
  return 'scheduled';
}

// Get all fixtures grouped by nhl_game_id to find duplicates
async function findDuplicateNHLGameIds() {
  const { data } = await supabase
    .from('fixtures')
    .select('id, game_data, scheduled_at, status, home_score, away_score, created_at')
    .order('created_at', { ascending: false });

  // Group by nhl_game_id
  const byNhlId = {};
  for (const row of (data || [])) {
    const nid = row.game_data?.nhl_game_id;
    if (!nid) continue;
    if (!byNhlId[nid]) byNhlId[nid] = [];
    byNhlId[nid].push(row);
  }

  // Find duplicates
  const duplicates = [];
  for (const [nhlId, rows] of Object.entries(byNhlId)) {
    if (rows.length > 1) {
      duplicates.push({ nhlId, rows });
    }
  }

  return duplicates;
}

async function deleteDuplicateFixtures(duplicates) {
  console.log(`\n🗑️  Deleting ${duplicates.length} duplicate NHL game entries...`);
  
  let totalDeleted = 0;
  for (const { nhlId, rows } of duplicates) {
    // Keep the first (most recent) entry, delete the rest
    const keepId = rows[0].id;
    const deleteIds = rows.slice(1).map(r => r.id);
    
    // Delete in batches
    const BATCH = 100;
    for (let i = 0; i < deleteIds.length; i += BATCH) {
      const batch = deleteIds.slice(i, i + BATCH);
      const { error } = await supabase
        .from('fixtures')
        .delete()
        .in('id', batch);
      
      if (error) {
        console.log(`  Failed to delete batch for ${nhlId}: ${error.message}`);
      } else {
        totalDeleted += batch.length;
      }
    }
    
    if (deleteIds.length > 0) {
      console.log(`  ${nhlId}: kept ${keepId}, deleted ${deleteIds.length} duplicates`);
    }
  }
  
  return totalDeleted;
}

async function resyncCompletedGames(dates) {
  console.log(`\n📥 Re-syncing ${dates.length} dates of completed games...`);
  
  let synced = 0;
  for (const date of dates) {
    const data = await nhlFetch(`/score/${date}`);
    if (!data) {
      console.log(`  ${date}: no data`);
      continue;
    }
    
    const games = (data.games || []).filter(g => 
      g.gameState === 'OFF' || g.gameState === 'FINAL' || 
      g.gameState === 'FINAL OT' || g.gameState === 'FINAL SO'
    );
    
    if (games.length === 0) {
      console.log(`  ${date}: 0 completed games`);
      continue;
    }
    
    console.log(`  ${date}: ${games.length} completed games`);
    
    for (const game of games) {
      const nhlGameId = String(game.id || '');
      if (!nhlGameId) continue;

      const away = game.awayTeam || {};
      const home = game.homeTeam || {};
      const status = mapStatus(game.gameState);
      const scheduled = game.startTimeUTC ? new Date(game.startTimeUTC).toISOString() : null;

      const game_data = {
        nhl_game_id: nhlGameId,
        source: 'nhl_api',
        game_state: game.gameState,
        away_team: {
          id: away.id,
          abbrev: away.abbrev,
          placeName: away.placeName,
          commonName: away.commonName,
          logo: away.logo || `https://assets.nhle.com/logos/nhl/svg/${away.abbrev}_light.svg`,
        },
        home_team: {
          id: home.id,
          abbrev: home.abbrev,
          placeName: home.placeName,
          commonName: home.commonName,
          logo: home.logo || `https://assets.nhle.com/logos/nhl/svg/${home.abbrev}_light.svg`,
        },
        venue: game.venue?.default || null,
      };

      // Update existing fixture by nhl_game_id
      const { data: existing } = await supabase
        .from('fixtures')
        .select('id')
        .eq('game_data->>nhl_game_id', nhlGameId)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from('fixtures')
          .update({
            status,
            home_score: home.score ?? null,
            away_score: away.score ?? null,
            scheduled_at: scheduled,
            game_data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id);
        synced++;
        process.stdout.write(`    ✓ ${away.abbrev} ${away.score} @ ${home.abbrev} ${home.score}\n`);
      } else {
        // Insert new
        await supabase.from('fixtures').insert({
          id: crypto.randomUUID(),
          league_id: '2b5f2b9d-84b9-4edb-8373-a732b72f4e40',
          status,
          home_score: home.score ?? null,
          away_score: away.score ?? null,
          scheduled_at: scheduled,
          game_data,
        });
        synced++;
      }
      
      await sleep(50);
    }
  }
  
  return synced;
}

async function main() {
  console.log('🏒 NHL Fixtures Fix Script');
  console.log('==========================\n');

  // Step 1: Find and fix duplicates
  console.log('📊 Finding duplicate NHL game IDs...');
  const duplicates = await findDuplicateNHLGameIds();
  console.log(`Found ${duplicates.length} duplicate NHL game IDs`);
  
  if (duplicates.length > 0) {
    const deleted = await deleteDuplicateFixtures(duplicates);
    console.log(`\n✅ Deleted ${deleted} duplicate records`);
  } else {
    console.log('No duplicates found');
  }

  // Step 2: Re-sync completed games for last 14 days
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  
  const synced = await resyncCompletedGames(dates);
  console.log(`\n✅ Re-synced ${synced} completed games with team data`);

  // Final count
  const { count } = await supabase
    .from('fixtures')
    .select('id', { count: 'exact', head: true });
  console.log(`\n📊 Total fixtures after cleanup: ${count}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });