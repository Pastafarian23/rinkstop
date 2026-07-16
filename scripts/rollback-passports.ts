/**
 * scripts/rollback-passports.ts
 *
 * Phase 4: Per-user Passport rollback script.
 *
 * Usage:
 *   npx tsx scripts/rollback-passports.ts --user-id user_abc123
 *   npx tsx scripts/rollback-passports.ts --all     # delete all Passports
 *
 * For full table drop, use the SQL in workstream-1-migration-runbook.md.
 * This script handles per-user rollback only.
 *
 * Per Rule 6 (Zero Data Mutation): this script only DELETES from the new
 * Passport tables. It does not touch existing tables.
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

function parseArgs(): { userId: string | null; all: boolean; confirm: boolean } {
  const args = { userId: null as string | null, all: false, confirm: false };
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--user-id' && i + 1 < process.argv.length) {
      args.userId = process.argv[i + 1];
      i++;
    } else if (arg.startsWith('--user-id=')) {
      args.userId = arg.split('=')[1];
    } else if (arg === '--all') args.all = true;
    else if (arg === '--confirm') args.confirm = true;
  }
  return args;
}

async function rollbackUser(supabase: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data: passport, error: lookupErr } = await supabase
    .from('passports')
    .select('passport_id')
    .eq('internal_user_id', userId)
    .maybeSingle();

  if (lookupErr) {
    console.error(`✗ Failed to lookup Passport for ${userId}: ${lookupErr.message}`);
    return false;
  }

  if (!passport) {
    console.log(`  ${userId}: no Passport to delete (already rolled back)`);
    return true;
  }

  // ON DELETE CASCADE on the FKs handles passport_events and passport_links.
  const { error: deleteErr } = await supabase
    .from('passports')
    .delete()
    .eq('internal_user_id', userId);

  if (deleteErr) {
    console.error(`✗ Failed to delete Passport ${passport.passport_id} for ${userId}: ${deleteErr.message}`);
    return false;
  }

  console.log(`  ✓ Deleted Passport ${passport.passport_id} for ${userId}`);
  return true;
}

async function main() {
  const args = parseArgs();

  if (!args.userId && !args.all) {
    console.error('Usage:');
    console.error('  npx tsx scripts/rollback-passports.ts --user-id user_abc123');
    console.error('  npx tsx scripts/rollback-passports.ts --all --confirm');
    process.exit(1);
  }

  if (args.all && !args.confirm) {
    console.error('Refusing to run --all without --confirm.');
    console.error('Re-run with --confirm to proceed.');
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();

  if (args.userId) {
    console.log(`Rolling back Passport for ${args.userId}...`);
    const ok = await rollbackUser(supabase, args.userId);
    process.exit(ok ? 0 : 1);
  }

  if (args.all) {
    console.log('Rolling back ALL Passports...');
    const { data: all, error } = await supabase
      .from('passports')
      .select('internal_user_id');
    if (error) {
      console.error(`✗ Failed to list Passports: ${error.message}`);
      process.exit(1);
    }
    const userIds = (all ?? []).map((r) => r.internal_user_id);
    console.log(`Found ${userIds.length} Passport(s) to delete.`);

    let success = 0;
    let failed = 0;
    for (const userId of userIds) {
      const ok = await rollbackUser(supabase, userId);
      if (ok) success++;
      else failed++;
    }

    console.log('');
    console.log(`Rollback complete: ${success} succeeded, ${failed} failed.`);
    process.exit(failed === 0 ? 0 : 1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});