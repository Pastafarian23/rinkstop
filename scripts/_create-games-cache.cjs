// Create games_cache table via exec_sql RPC with the right param name
require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});

const SQL = `
CREATE TABLE IF NOT EXISTS public.games_cache (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  league_name text,
  source_league_id text,
  league_id uuid,
  game_date date NOT NULL,
  home_team_name text NOT NULL,
  away_team_name text NOT NULL,
  home_team_normalized text NOT NULL,
  away_team_normalized text NOT NULL,
  home_score integer,
  away_score integer,
  raw_score text,
  finished boolean DEFAULT false,
  fetched_at timestamptz DEFAULT now(),
  raw jsonb
);

CREATE INDEX IF NOT EXISTS idx_games_cache_lookup
  ON public.games_cache (game_date, home_team_normalized, away_team_normalized);
CREATE INDEX IF NOT EXISTS idx_games_cache_source
  ON public.games_cache (source, league_name, game_date);
`;

(async () => {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL }),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text.slice(0, 500));

  // Verify table exists
  const sb = require('@supabase/supabase-js').createClient(SUPABASE_URL, SERVICE_KEY);
  const { error: probeErr } = await sb.from('games_cache').select('id').limit(1);
  console.log('\nProbe games_cache:', probeErr ? `ERR: ${probeErr.message}` : 'OK exists');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
