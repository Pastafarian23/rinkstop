// Create games_cache table — one row per (source, league, date, home, away) tuple
// Cross-source verification means finding matching rows from different sources.

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});

const sb = require('@supabase/supabase-js').createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Create table via RPC or via SQL editor — Supabase auto-rest supports raw SQL via
  // postgrest but creating tables requires DDL. Use Service Role to invoke a custom
  // migration RPC if it exists; otherwise we'll need to run via psql/migration tool.

  // Try the standard approach: insert a row to test if table exists
  const { error: probeErr } = await sb.from('games_cache').select('id').limit(1);
  if (probeErr && probeErr.message && probeErr.message.includes('does not exist')) {
    console.log('Table games_cache does NOT exist. Need to create via SQL editor.');
    console.log('Use this SQL:');
    console.log(`
CREATE TABLE IF NOT EXISTS games_cache (
  id bigserial PRIMARY KEY,
  source text NOT NULL,             -- 'nhl_com', 'hockeytech', 'iihf_fixture', 'highlightly_nhl', 'highlightly_hockey'
  league_id uuid,                   -- our DB FK when known
  league_name text,                 -- friendly name (e.g. "DEL")
  source_league_id text,            -- Highlightly numeric ID or HockeyTech client_code
  game_date date NOT NULL,
  home_team_name text NOT NULL,
  away_team_name text NOT NULL,
  home_team_normalized text NOT NULL,  -- lowercase, no diacritics, first word only
  away_team_normalized text NOT NULL,  -- ditto
  home_score integer,
  away_score integer,
  raw_score text,                   -- original "5 - 1" string
  finished boolean DEFAULT false,
  fetched_at timestamptz DEFAULT now(),
  raw jsonb                          -- full original source payload for debugging
);

CREATE INDEX IF NOT EXISTS idx_games_cache_lookup
  ON games_cache (game_date, home_team_normalized, away_team_normalized);
CREATE INDEX IF NOT EXISTS idx_games_cache_source
  ON games_cache (source, league_name, game_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_cache_dedup
  ON games_cache (source, source_league_id, game_date, home_team_normalized, away_team_normalized);
    `);
    process.exit(1);
  }

  if (probeErr) {
    console.error('Probe error:', probeErr);
    return;
  }
  console.log('Table games_cache EXISTS. Row count:', (await sb.from('games_cache').select('*', { count: 'exact', head: true })).count);

  // Test insert
  const { error: insErr } = await sb.from('games_cache').insert({
    source: 'test',
    league_name: 'test',
    game_date: '2026-09-16',
    home_team_name: 'TEST_HOME',
    away_team_name: 'TEST_AWAY',
    home_team_normalized: 'testhome',
    away_team_normalized: 'testaway',
  });
  if (insErr) console.log('Insert test failed:', insErr.message);
  else console.log('Insert test OK');
})();
