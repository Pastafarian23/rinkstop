/**
 * Run once to set up dashboard tables in Supabase.
 * Usage: node scripts/setup-dashboard-tables.js
 */

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SERVICE_KEY = '***REMOVED***';

async function createTable(tableName, sql) {
  console.log(`Creating ${tableName}...`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (res.ok && text !== 'null') {
    console.log(`  ✓ ${tableName}`);
  } else if (text.includes('already exists') || text.includes('PGRST102')) {
    console.log(`  ✓ ${tableName} (already exists)`);
  } else {
    console.log(`  ✗ ${tableName}: ${text}`);
  }
}

async function run() {
  await createTable('claims', `
    CREATE TABLE IF NOT EXISTS public.claims (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      claim_type TEXT NOT NULL CHECK (claim_type IN ('rink', 'team', 'player')),
      entity_name TEXT NOT NULL,
      entity_id TEXT,
      reason TEXT NOT NULL,
      proof TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await createTable('favorites', `
    CREATE TABLE IF NOT EXISTS public.favorites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      favorite_type TEXT NOT NULL CHECK (favorite_type IN ('player', 'team', 'rink')),
      favorite_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, favorite_type, favorite_id)
    );
  `);

  await createTable('profiles', `
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT UNIQUE NOT NULL,
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Row Level Security
  for (const [table, policy] of [
    ['claims', 'claims_own_policy', "CREATE POLICY claims_own ON public.claims FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id)"],
    ['favorites', 'favorites_own_policy', "CREATE POLICY favorites_own ON public.favorites FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id)"],
    ['profiles', 'profiles_own_policy', "CREATE POLICY profiles_own ON public.profiles FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id)"],
  ]) {
    await createTable(`${table}_rls`, policy);
  }

  console.log('\nDone!');
}

run().catch(console.error);