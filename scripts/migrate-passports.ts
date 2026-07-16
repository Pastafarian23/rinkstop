/**
 * scripts/migrate-passports.ts
 *
 * Phase 4: Migration script for moving existing RinkStop users to Passport.
 *
 * Usage:
 *   npx tsx scripts/migrate-passports.ts                   # full migration
 *   npx tsx scripts/migrate-passports.ts --dry-run         # dry run, no changes
 *   npx tsx scripts/migrate-passports.ts --limit 100       # migrate first 100 users
 *   npx tsx scripts/migrate-passports.ts --dry-run --limit 100
 *
 * Pre-requisites:
 *   - Migration 2026-07-16_passports_core.sql deployed.
 *   - PASSPORT_ENABLED=true in env.
 *   - PASSPORT_MIGRATION=true in env.
 *   - Phase 3 service layer code deployed.
 *
 * Per Rule 5 (Feature Flags Mandatory): if flags are off, the script
 * reports "skipped" for every user and exits without making changes.
 *
 * Per Rule 6 (Zero Data Mutation): this script only WRITES to the new
 * Passport tables. Existing tables are read but never modified.
 *
 * Per Rule 7 (Adapters over Modifications): uses PassportMigrationService.
 */

import { createClient } from '@supabase/supabase-js';
import {
  passportMigrationService,
  isPassportMigrationEnabled,
  isPassportEnabled,
} from '../src/lib/passport';


interface CliArgs {
  dryRun: boolean;
  limit: number | null;
  verbose: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = { dryRun: false, limit: null, verbose: false };
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--verbose') args.verbose = true;
    else if (arg === '--limit' && i + 1 < process.argv.length) {
      const n = parseInt(process.argv[i + 1], 10);
      if (Number.isFinite(n) && n > 0) args.limit = n;
      i++;
    } else if (arg.startsWith('--limit=')) {
      const n = parseInt(arg.split('=')[1], 10);
      if (Number.isFinite(n) && n > 0) args.limit = n;
    }
  }
  return args;
}

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

async function fetchUserIds(limit: number | null): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('profiles')
    .select('user_id')
    .order('created_at', { ascending: true });

  if (limit !== null) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch user_ids: ${error.message}`);
  }
  return (data ?? []).map((row) => row.user_id);
}

async function main() {
  const args = parseArgs();
  const mode = args.dryRun ? 'DRY RUN' : 'MIGRATE';

  console.log(`[${mode}] Connecting to Supabase...`);

  // Feature flag check (defensive — service layer also checks, but we want
  // a clear script-level message before doing work).
  if (!args.dryRun) {
    if (!isPassportEnabled()) {
      console.error(`[${mode}] FATAL: PASSPORT_ENABLED is not set to true.`);
      console.error(`[${mode}] Set PASSPORT_ENABLED=true in env, or pass --dry-run.`);
      process.exit(1);
    }
    if (!isPassportMigrationEnabled()) {
      console.error(`[${mode}] FATAL: PASSPORT_MIGRATION is not set to true.`);
      console.error(`[${mode}] Set PASSPORT_MIGRATION=true in env, or pass --dry-run.`);
      process.exit(1);
    }
  }

  console.log(`[${mode}] Fetching user IDs from public.profiles...`);
  const userIds = await fetchUserIds(args.limit);
  console.log(`[${mode}] ${userIds.length} user(s) to process.`);

  if (userIds.length === 0) {
    console.log(`[${mode}] No users to process. Exiting.`);
    return;
  }

  let migrated = 0;
  let alreadyMigrated = 0;
  let skipped = 0;
  let errors = 0;
  let errorMessages: string[] = [];
  const startTime = Date.now();

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const result = args.dryRun
      ? await passportMigrationService.dryRunMigration(userId)
      : await passportMigrationService.migrateUser(userId);

    const prefix = args.dryRun ? 'would' : '';
    const symbol = (() => {
      switch (result.status) {
        case 'migrated': return '✓';
        case 'already_migrated': return '⊙';
        case 'skipped': return '⊘';
        case 'error': return '✗';
      }
    })();

    const detail = result.passportId
      ? ` (${prefix} ${result.status}: ${result.passportId})`
      : result.error
        ? ` (error: ${result.error})`
        : ` (${result.status}${result.reason ? `: ${result.reason}` : ''})`;

    console.log(`  - ${userId}: ${symbol}${detail}`);

    switch (result.status) {
      case 'migrated': migrated++; break;
      case 'already_migrated': alreadyMigrated++; break;
      case 'skipped': skipped++; break;
      case 'error':
        errors++;
        if (errorMessages.length < 10) errorMessages.push(`${userId}: ${result.error}`);
        break;
    }

    if (args.verbose && (i + 1) % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${mode}] Progress: ${i + 1}/${userIds.length} (${elapsed}s)`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log(`[${mode}] Summary:`);
  console.log(`  Migrated:        ${migrated}`);
  console.log(`  Already migrated: ${alreadyMigrated}`);
  console.log(`  Skipped:         ${skipped}`);
  console.log(`  Errors:          ${errors}`);
  console.log(`  Total:           ${userIds.length}`);
  console.log(`  Time:            ${elapsed}s`);

  if (errorMessages.length > 0) {
    console.log('');
    console.log(`[${mode}] First ${errorMessages.length} error(s):`);
    for (const msg of errorMessages) console.log(`  - ${msg}`);
  }

  if (args.dryRun) {
    console.log('');
    console.log(`[${mode}] No changes made. Set --dry-run=false (or omit) to execute.`);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});