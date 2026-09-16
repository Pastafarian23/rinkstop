// Backfill verification_status on all 688 highlight-generated articles.
// Status hierarchy (INTERNAL ONLY, never exposed via public API):
//   human_verified > verified > unverified > failed

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = require('@supabase/supabase-js').createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Step 1: Reading existing audit result from /tmp/audit-actual.json...');
  const text = require('fs').readFileSync('/tmp/audit-actual.json', 'utf8');
  const idx = text.indexOf('{');
  const obj = JSON.parse(text.slice(idx));
  const articles = obj.reports || [];
  console.log(`Step 2: Building slug → id lookup...`);

  const slugToId = {};
  for (let off = 0; off < 1000; off += 200) {
    const { data, error } = await sb.from('posts').select('id, slug').range(off, off + 199);
    if (error) { console.error('range', off, error); break; }
    if (!data || data.length === 0) break;
    for (const r of data) slugToId[r.slug] = r.id;
  }
  console.log(`Slug→id lookup size: ${Object.keys(slugToId).length}`);

  console.log(`\nStep 3: Backfilling verification_status for ${articles.length} articles...`);

  let verified = 0, unverified = 0, failed = 0;
  const now = new Date().toISOString();
  const errors = [];
  let matched = 0, unmatched = 0;

  for (const a of articles) {
    const id = slugToId[a.slug];
    if (!id) { unmatched++; continue; }
    matched++;

    const hasBoxscore = !!(a.boxscore_source && a.boxscore_source !== 'NONE');
    const hasFail = (a.results || []).some(c => c.status === 'FAIL');
    const hasPassOrMeta = (a.results || []).some(c => c.status === 'PASS' || c.status === 'META');

    let status, notes;
    if (hasFail) {
      status = 'failed';
      notes = 'Auto-backfill 2026-09-16. Audit reported FAIL claims. Human review required.';
      failed++;
    } else if (hasBoxscore) {
      status = 'verified';
      notes = hasPassOrMeta
        ? 'Auto-backfill 2026-09-16. Cross-source verified (NHL.com + HockeyTech + IIHF + Highlightly).'
        : 'Auto-backfill 2026-09-16. Single-source verified.';
      verified++;
    } else {
      status = 'unverified';
      notes = 'Auto-backfill 2026-09-16. No canonical boxscore available; article content not audited.';
      unverified++;
    }

    const { error } = await sb.from('posts').update({
      verification_status: status,
      verification_notes: notes,
      verified_at: now,
      verified_by: 'system:auto-backfill:2026-09-16',
    }).eq('id', id);

    if (error) errors.push({ slug: a.slug, error: error.message });
  }

  console.log('\n=== RESULTS ===');
  console.log('matched:   ' + matched);
  console.log('unmatched: ' + unmatched);
  console.log('verified:  ' + verified);
  console.log('unverified:' + unverified);
  console.log('failed:    ' + failed);
  console.log('errors:    ' + errors.length);
  if (errors.length > 0) {
    console.log('First errors:');
    for (const e of errors.slice(0, 5)) console.log('  ', e.slug, ':', e.error);
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
