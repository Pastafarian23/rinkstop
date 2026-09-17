#!/usr/bin/env node
/**
 * Deprecate (is_active=false) the 5 safe duplicate leagues.
 * No references exist on the deprecated side, so deprecation is safe.
 * Idempotent — running again is a no-op.
 *
 * Usage: node scripts/_deprecate_safe.cjs [--dry-run]
 */
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

const SAFE_TO_DEPRECATE = [
  'shl-sweden',
  'del-germany',
  'sm-liiga',
  'asia-league',
  'echl-usa',
];

(async () => {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Deprecating ${SAFE_TO_DEPRECATE.length} duplicate leagues\n`);
  for (const slug of SAFE_TO_DEPRECATE) {
    const { data: league } = await sb.from('leagues').select('id, name, slug, is_active').eq('slug', slug).maybeSingle();
    if (!league) {
      console.log(`  ✗ ${slug}: not found`);
      continue;
    }
    if (!league.is_active) {
      console.log(`  ✓ ${slug}: already inactive (id=${league.id.slice(0,8)})`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`  → ${slug}: would set is_active=false (id=${league.id.slice(0,8)}, name="${league.name}")`);
      continue;
    }
    const { error } = await sb.from('leagues').update({
      is_active: false,
      updated_at: new Date().toISOString(),
    }).eq('id', league.id);
    if (error) {
      console.log(`  ✗ ${slug}: ${error.message}`);
    } else {
      console.log(`  ✓ ${slug}: deprecated (id=${league.id.slice(0,8)}, name="${league.name}")`);
    }
  }
  console.log(DRY_RUN ? '\nDRY RUN — no changes made. Re-run without --dry-run to apply.' : '\nDone.');
})().catch(e => { console.error(e); process.exit(1); });
