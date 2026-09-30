#!/usr/bin/env node
/* eslint-disable */
/**
 * _seed-demo-passport-stamps.cjs
 *
 * Seeds public, confirmed stamps against the existing demo passport
 * (RS1-PHASE4PLAYER01) so the public /passport/[passportId] page renders a
 * realistic-looking challenges section. Used for marketing screenshots and
 * sales demos.
 *
 * Idempotent — uses natural key (subject_user_id, target_rink_id) so re-runs
 * add no duplicates. Safe to run after the live demo.
 *
 * Stamp attributes:
 *   - subject_type='player'
 *   - subject_user_id = Arnel's Clerk user_id (lookup via /api or DB)
 *   - target_type='rink'
 *   - target_rink_id = real rinks from the DB
 *   - actor_type='self_scan'
 *   - visibility='public'
 *   - status='confirmed'
 *   - stamped_at = backdated 60-540 days ago for realistic distribution
 *
 * Picks 8-12 rinks across North America + Europe to demonstrate:
 *   - Geographic challenges (multiple countries)
 *   - Career milestone (10 Rinks)
 *   - League circuit progress (partial)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_KEY in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const DEMO_PASSPORT_ID = 'RS1-PHASE4PLAYER01';

async function getHolderUserId() {
  const { data, error } = await supabase
    .from('passports')
    .select('internal_user_id')
    .eq('passport_id', DEMO_PASSPORT_ID)
    .single();
  if (error || !data) {
    console.error('Failed to find demo passport:', error?.message);
    process.exit(1);
  }
  return data.internal_user_id;
}

async function pickRinks() {
  // Pick a known set of famous + geographically diverse rinks for the demo.
  // Falls back to first-N rinks if a named rink is missing from the DB.
  const targets = [
    'Madison Square Garden',
    'TD Garden',
    'United Center',
    'Scotiabank Arena',
    'Rogers Arena',
    'Bell Centre',
    'Scotiabank Saddledome',
    'Enterprise Center',
    'PPG Paints Arena',
    'Canada Life Centre',
    'Scotiabank Arena',
    'Mullett Arena',
    'Climate Pledge Arena',
    'Crypto.com Arena',
    'UBS Arena',
  ];
  const ids = [];
  for (const name of targets) {
    const { data } = await supabase
      .from('rinks')
      .select('id, name, country')
      .ilike('name', `%${name.split(' ')[0]}%`)
      .limit(1)
      .maybeSingle();
    if (data?.id && !ids.includes(data.id)) {
      ids.push({ id: data.id, name: data.name, country: data.country });
    }
    if (ids.length >= 12) break;
  }
  if (ids.length < 8) {
    // Backfill with arbitrary active rinks to reach 8+.
    const { data } = await supabase
      .from('rinks')
      .select('id, name, country')
      .eq('is_active', true)
      .not('country', 'is', null)
      .limit(20);
    for (const r of data ?? []) {
      if (!ids.find((x) => x.id === r.id)) ids.push(r);
      if (ids.length >= 12) break;
    }
  }
  return ids;
}

async function seed() {
  const holderUserId = await getHolderUserId();
  const rinks = await pickRinks();
  console.log(`Holder ${holderUserId} → stamping ${rinks.length} rinks`);

  // Check existing to avoid duplicates
  const { data: existing } = await supabase
    .from('stamps')
    .select('target_rink_id')
    .eq('subject_user_id', holderUserId)
    .eq('target_type', 'rink');
  const have = new Set((existing ?? []).map((s) => s.target_rink_id));
  const toInsert = rinks.filter((r) => !have.has(r.id));
  console.log(`Already stamped: ${have.size}, new to insert: ${toInsert.length}`);
  if (toInsert.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const now = Date.now();
  const rows = toInsert.map((r, i) => ({
    subject_type: 'player',
    subject_user_id: holderUserId,
    actor_type: 'player',
    actor_user_id: holderUserId,
    target_type: 'rink',
    target_rink_id: r.id,
    visibility: 'public',
    status: 'confirmed',
    source: 'self_scan',
    stamped_at: new Date(now - (60 + i * 30) * 24 * 3600 * 1000).toISOString(),
    context: 'game',
  }));

  const { data, error } = await supabase.from('stamps').insert(rows).select('id');
  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }
  console.log(`Inserted ${data?.length ?? 0} stamps.`);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});