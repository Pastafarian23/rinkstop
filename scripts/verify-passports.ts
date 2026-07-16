/**
 * scripts/verify-passports.ts
 *
 * Phase 4: Verification queries for the Passport migration.
 *
 * Usage:
 *   npx tsx scripts/verify-passports.ts
 *   npx tsx scripts/verify-passports.ts --limit 100  # sample only first 100 users
 *
 * Runs the 5 verification queries from workstream-1-migration-runbook.md.
 * Reports any anomalies with non-zero exit code.
 */

import { createClient } from '@supabase/supabase-js';


function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseLimit(): number | null {
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--limit' && i + 1 < process.argv.length) {
      const n = parseInt(process.argv[i + 1], 10);
      if (Number.isFinite(n) && n > 0) return n;
    } else if (arg.startsWith('--limit=')) {
      const n = parseInt(arg.split('=')[1], 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

async function main() {
  const supabase = getSupabaseAdmin();
  const limit = parseLimit();
  const results: CheckResult[] = [];

  console.log('=== Passport Migration Verification ===');
  if (limit !== null) {
    console.log(`(Sampling first ${limit} users where applicable)`);
  }
  console.log('');

  // 1. Passport count check (sampled if --limit)
  {
    let passportCount: number;
    let profileCount: number;
    if (limit !== null) {
      const { count: pc } = await supabase
        .from('passports')
        .select('*', { count: 'exact', head: true })
        .order('created_at', { ascending: true })
        .limit(limit);
      const { count: prc } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .order('created_at', { ascending: true })
        .limit(limit);
      passportCount = pc ?? 0;
      profileCount = prc ?? 0;
    } else {
      const { count: pc } = await supabase
        .from('passports')
        .select('*', { count: 'exact', head: true });
      const { count: prc } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      passportCount = pc ?? 0;
      profileCount = prc ?? 0;
    }
    const diff = passportCount - profileCount;
    const passed = diff === 0;
    results.push({
      name: '1. Passport count matches profile count',
      passed,
      detail: `passports=${passportCount}, profiles=${profileCount}, diff=${diff}`,
    });
  }

  // 2. No duplicate Passports per user
  {
    // Use raw SQL via the .rpc or a workaround. Simpler: fetch all internal_user_ids
    // and check for duplicates in JS. For 10k users this is fine.
    const { data, error } = await supabase
      .from('passports')
      .select('internal_user_id');
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const k = row.internal_user_id;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const dups = [...counts.entries()].filter(([, n]) => n > 1);
    results.push({
      name: '2. No duplicate Passports per user',
      passed: dups.length === 0,
      detail: dups.length === 0
        ? '0 duplicates'
        : `${dups.length} duplicate internal_user_id(s): ${dups.slice(0, 5).map(([k, n]) => `${k} (${n})`).join(', ')}`,
    });
  }

  // 3. Passport ID format
  {
    const { data, error } = await supabase
      .from('passports')
      .select('passport_id')
      .limit(1000);
    if (error) throw error;
    const formatRegex = /^RS1-[A-Z2-9]{16}$/;
    const bad = (data ?? []).filter((row) => !formatRegex.test(row.passport_id));
    results.push({
      name: '3. All Passport IDs match RS1 format',
      passed: bad.length === 0,
      detail: bad.length === 0
        ? `checked ${data?.length ?? 0} IDs, all valid`
        : `${bad.length} invalid: ${bad.slice(0, 5).map((r) => r.passport_id).join(', ')}`,
    });
  }

  // 4. Event log audit trail
  {
    const { data, error } = await supabase
      .from('passport_events')
      .select('event_type');
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(row.event_type, (counts.get(row.event_type) ?? 0) + 1);
    }
    const issuedCount = counts.get('PASSPORT_ISSUED') ?? 0;
    results.push({
      name: '4. Event log has PASSPORT_ISSUED audit trail',
      passed: issuedCount > 0,
      detail: `events by type: ${[...counts.entries()].map(([k, v]) => `${k}=${v}`).join(', ')}`,
    });
  }

  // 5. Existing tables unchanged (sanity: just report counts)
  {
    const [
      { count: profiles },
      { count: managed },
      { count: coaches },
      { count: hockey },
      { count: didit },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('managed_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('coach_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('hockey_player_team_history').select('*', { count: 'exact', head: true }),
      supabase.from('didit_sessions').select('*', { count: 'exact', head: true }),
    ]);
    results.push({
      name: '5. Existing tables intact (counts reported)',
      passed: true, // counts are informational
      detail: `profiles=${profiles ?? 0}, managed=${managed ?? 0}, coaches=${coaches ?? 0}, hockey=${hockey ?? 0}, didit=${didit ?? 0}`,
    });
  }

  // Print results
  for (const r of results) {
    const symbol = r.passed ? '✓' : '✗';
    console.log(`${symbol} ${r.name}`);
    console.log(`    ${r.detail}`);
  }

  console.log('');
  const failed = results.filter((r) => !r.passed).length;
  if (failed === 0) {
    console.log('=== All checks passed ===');
    process.exit(0);
  } else {
    console.log(`=== ${failed} check(s) FAILED ===`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});