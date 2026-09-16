// Cache helper for boxscore data.
// Used by all adapters — fetches write to cache, subsequent fetches read from cache.
// Cross-source verification: same game from multiple sources = multiple rows.

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});

const sb = require('@supabase/supabase-js').createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Normalize team name for matching across sources.
// Lowercase, strip diacritics, take first word.
function norm(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .split(' ')[0];
}

// Look up cache for (date, home, away).
// Direction-agnostic: tries both (home=A, away=B) and (home=B, away=A).
async function lookup({ date, homeHint, awayHint }) {
  const a = norm(homeHint);
  const b = norm(awayHint);
  if (!a || !b) return [];

  const { data, error } = await sb
    .from('games_cache')
    .select('source, source_league_id, league_id, league_name, game_date, home_team_name, away_team_name, home_score, away_score, raw_score, finished, fetched_at')
    .eq('game_date', date)
    .or(`and(home_team_normalized.eq.${a},away_team_normalized.eq.${b}),and(home_team_normalized.eq.${b},away_team_normalized.eq.${a})`);

  if (error) { console.error('cache lookup err:', error.message); return []; }
  return data || [];
}

// Write a boxscore to cache. idempotent via dedup index.
async function write(entry) {
  const row = {
    source: entry.source,
    league_name: entry.league_name || null,
    source_league_id: entry.source_league_id || null,
    league_id: entry.league_id || null,
    game_date: entry.game_date,
    home_team_name: entry.home_team_name,
    away_team_name: entry.away_team_name,
    home_team_normalized: norm(entry.home_team_name),
    away_team_normalized: norm(entry.away_team_name),
    home_score: entry.home_score,
    away_score: entry.away_score,
    raw_score: entry.raw_score,
    finished: entry.finished !== false,
    raw: entry.raw || null,
  };
  // Upsert via on_conflict resolved by idx_games_cache_dedup if present, else by best-effort
  const { data, error } = await sb
    .from('games_cache')
    .upsert(row, { onConflict: 'source,source_league_id,game_date,home_team_normalized,away_team_normalized' })
    .select();
  if (error) console.error('cache write err:', error.message);
  return data?.[0] || null;
}

module.exports = { norm, lookup, write };

// Self-test
if (require.main === module) {
  (async () => {
    console.log('=== self-test ===');
    await write({
      source: 'self-test',
      league_name: 'TEST',
      game_date: '2026-09-16',
      home_team_name: 'Test Home',
      away_team_name: 'Test Away',
      home_score: 3,
      away_score: 2,
      raw_score: '3 - 2',
    });
    const found = await lookup({ date: '2026-09-16', homeHint: 'Test Home', awayHint: 'Test Away' });
    console.log('Lookup found:', found.length, 'rows');
    console.log(JSON.stringify(found, null, 2));
  })().catch(e => console.error('self-test err:', e.message));
}
