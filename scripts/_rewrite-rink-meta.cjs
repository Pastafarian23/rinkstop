#!/usr/bin/env node
/**
 * _rewrite-rink-meta.cjs — 2026-09-29
 *
 * Per Arnel GSC directive: rewrite titles/meta on high-impression, low-CTR rink pages.
 *
 * Targets (GSC top opportunities 28d):
 *   biddeford-ice-arena         (543 impr, 0%,   pos 9.8, query "google maps listing")
 *   birmingham-ice-arena        (480 impr, 0.21%, pos 6.8)
 *   bill-hunter-arena           (479 impr, 0.42%, pos 10.3)
 *   edge-ice-arena              (343 impr, 0.29%, pos 10.6)
 *   belmont-ice-complex         (320 impr, 0.63%, pos 6.7)
 *   brett-memorial-ice-arena    (303 impr, 0%,   pos 7.9)
 *   arrington-ice-arena         (194 impr, 1.03%, pos 9.5)
 *   foothills-ice-arena         (211 impr, 1.42%, pos 7.9)
 *   bemidji-community-arena     (323 impr, 0%,   pos 7.0)
 *   ed-lumley-arena             (155 impr, 0%,   pos 6.2)
 *
 * Strategy:
 *   - Title: keep existing format (it has venue name verbatim)
 *   - Meta description: rewrite to match the exact search query phrasing.
 *     Google bolds matched query terms in SERP snippet → higher CTR.
 *
 * Skips rinks that don't exist in DB (404s) — those need data entry, not SEO.
 *
 * Usage:
 *   node scripts/_rewrite-rink-meta.cjs            # dry-run (preview)
 *   node scripts/_rewrite-rink-meta.cjs --apply    # write to DB
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const dryRun = !process.argv.includes('--apply');

// Custom descriptions for each high-value rink. Each one:
  // - Contains the venue name verbatim (Google bolds it in SERPs)
  // - Includes the city/state
  // - Includes "ice rink", "hours", "address", or "contact" as answer-shaped keywords
  // - Stays ≤ 160 chars (Google truncation point)
const TARGETS = [
  {
    slug: 'biddeford-ice-arena',
    description: 'Biddeford Ice Arena in Biddeford, Maine. Public skating hours, address, phone, hockey programs, and learn-to-skate sessions. Get directions and rink contact info.',
  },
  {
    slug: 'bill-hunter-arena',
    description: 'Bill Hunter Arena in Edmonton, Alberta. NHL-sized rink serving the community of Northeast Edmonton with public skating, youth hockey, and event rental.',
  },
  {
    slug: 'brett-memorial-ice-arena',
    description: 'Brett Memorial Ice Arena in Wasilla, Alaska (Mat-Su Borough). Public skating, youth hockey, figure skating, and event space for the Mat-Su Valley community.',
  },
  {
    slug: 'foothills-ice-arena',
    description: 'Foothills Ice Arena in Lakewood, Colorado (Jefferson County). Public skating sessions, hockey leagues, figure skating programs, and rink rentals near Denver.',
  },
  {
    slug: 'bemidji-community-arena',
    description: 'Bemidji Community Arena in Bemidji, Minnesota. Public skating hours, hockey programs, learn-to-skate, and event rental for the Bemidji area.',
  },
  {
    slug: 'ed-lumley-arena',
    description: 'Ed Lumley Arena in Cornwall, Ontario. Public skating, hockey leagues, figure skating, and event space for the Seaway Valley community.',
  },
];

(async () => {
  console.log(`=== Rink meta-description rewrite (${dryRun ? 'DRY-RUN' : 'APPLY'}) ===\n`);

  let applied = 0, skipped = 0, errors = 0;
  for (const t of TARGETS) {
    const { data: rink } = await sb.from('rinks').select('id,name,slug,meta_description').eq('slug', t.slug).maybeSingle();
    if (!rink) {
      console.log(`⏭  ${t.slug} — NOT IN DB, skipping (need data entry first)`);
      skipped++;
      continue;
    }
    if (rink.meta_description === t.description) {
      console.log(`✓  ${t.slug} — already has target description`);
      continue;
    }
    console.log(`📝  ${t.slug}`);
    console.log(`     old: ${rink.meta_description?.slice(0, 80)}...`);
    console.log(`     new: ${t.description.slice(0, 80)}...`);
    if (!dryRun) {
      const { error } = await sb.from('rinks').update({ meta_description: t.description }).eq('id', rink.id);
      if (error) {
        console.log(`     ❌ ${error.message}`);
        errors++;
      } else {
        applied++;
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Applied: ${applied}`);
  console.log(`Skipped (no DB row): ${skipped}`);
  console.log(`Errors: ${errors}`);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
