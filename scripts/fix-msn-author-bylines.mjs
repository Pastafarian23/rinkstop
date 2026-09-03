// scripts/fix-msn-author-bylines.mjs
//
// Fix the byline issue found in 2026-09-02 MSN audit:
// 689 of 720 articles have author_name = 'RinkStop' (or NULL)
// MSN requires a human byline.
//
// This script updates the posts table to set author_name = 'Arnel Larracas'
// and author_role = 'Founder & Editor-in-Chief' where the value is:
//   - 'RinkStop' (the default fallback)
//   - NULL
//   - empty string
//   - matches the brand-name pattern
//
// Idempotent: safe to re-run.
//
// Prerequisites:
//   - supabase.json must have the service role key
//   - run with: node scripts/fix-msn-author-bylines.mjs --dry-run
//   - then:    node scripts/fix-msn-author-bylines.mjs --apply

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const creds = JSON.parse(readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8'));
const supabase = createClient(creds.url, creds.serviceRoleKey);

const NEW_NAME = 'Arnel Larracas';
const NEW_ROLE = 'Founder & Editor-in-Chief';
const BRAND_NAMES = ['RinkStop', 'rinkstop', 'RINKSTOP', 'RinkStop News', 'Rinkstop', ''];

const APPLY = process.argv.includes('--apply');
const DRY = process.argv.includes('--dry-run') || !APPLY;

console.log(DRY ? '=== DRY RUN (no writes) ===' : '=== APPLYING ===');
console.log(`Strategy: Set author_name='${NEW_NAME}' and author_role='${NEW_ROLE}'`);
console.log(`For posts where author_name IS NULL OR matches a brand-name pattern`);
console.log('');

async function run() {
  // Count current state
  const { data: total } = await supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published');
  console.log(`Total published posts: ${total || 0}`);

  const { data: withBrand } = await supabase
    .from('posts')
    .select('id, slug, author_name, author_role')
    .eq('status', 'published')
    .or('author_name.is.null,author_name.in.(' + BRAND_NAMES.map(n => `"${n}"`).join(',') + ')');
  
  console.log(`Posts needing byline fix: ${withBrand?.length || 0}`);

  // Also count articles where author_name is missing entirely
  const { data: noAuthor } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .is('author_name', null);
  console.log(`Posts with NULL author_name: ${noAuthor || 0}`);

  if (!APPLY) {
    console.log('\nNo changes made. Run with --apply to update.');
    return;
  }

  // Apply in batches of 100
  const ids = (withBrand || []).map(p => p.id);
  const BATCH = 100;
  let updated = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const { error } = await supabase
      .from('posts')
      .update({ author_name: NEW_NAME, author_role: NEW_ROLE, updated_at: new Date().toISOString() })
      .in('id', batch);
    if (error) {
      console.error(`  Batch ${i / BATCH + 1} failed: ${error.message}`);
    } else {
      updated += batch.length;
      console.log(`  Batch ${i / BATCH + 1}: ${batch.length} rows updated (total: ${updated})`);
    }
  }
  console.log(`\nDone. ${updated} articles updated.`);
}

run().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
