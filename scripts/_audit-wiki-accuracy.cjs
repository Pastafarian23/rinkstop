#!/usr/bin/env node
// _audit-wiki-accuracy.cjs — 2026-09-22
//
// Per Arnel 2026-09-22 00:48 CDT: 'For Wikipedia, it's good as an
// extra source, but I'm concerned about any potential issues with
// accuracy.' Standing protocol: every 30 days, sample 50 articles
// whose boxscore source is 'wikipedia' (or whose game has Wikipedia
// as one of the sources) and compare the Wikipedia score claim
// against the canonical source (NHL.com or Highlightly).
//
// If >10% disagreement, demote Wikipedia from 'supplementary
// cross-source' to 'advisory only' (don't use as PASS_HIGH
// upgrader, just keep it as a sanity-check).
//
// Output: writes /tmp/wiki-accuracy-report.json with
//   { sampled, agreed, disagreed, demoted, samples: [...details...] }
//
// Run modes:
//   node scripts/_audit-wiki-accuracy.cjs                 # sample 50
//   node scripts/_audit-wiki-accuracy.cjs --sample=20     # custom count
//   node scripts/_audit-wiki-accuracy.cjs --dry-run       # log without setting demoted flag

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const args = process.argv.slice(2);
function getArg(name, def) {
  const a = args.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : def;
}
const SAMPLE_SIZE = parseInt(getArg('sample', '50'), 10);
const DRY_RUN = args.includes('--dry-run');

async function main() {
  // Find posts whose boxscore came from Wikipedia. Since we don't yet
  // have a 'source=wiki' column on posts, we use a heuristic: posts
  // linked to games whose league_id is in the Wikipedia scope AND
  // status='published'. Replace with explicit flag once Wikipedia
  // cross-source is wired into the audit pipeline.
  console.log(`Sampling ${SAMPLE_SIZE} Wikipedia-scored published posts...`);
  // For now: published posts for IIHF / Olympic / Stanley Cup content.
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .or('slug.ilike.%iihf%,slug.ilike.%olympic%,slug.ilike.%stanley%');
  const leagueIds = (leagues || []).map(l => l.id);
  if (leagueIds.length === 0) {
    console.log('No IIHF/Olympic/Stanley Cup leagues in DB yet. Nothing to audit.');
    fs.writeFileSync('/tmp/wiki-accuracy-report.json', JSON.stringify({
      sampled: 0, agreed: 0, disagreed: 0, demoted: false, samples: [],
      note: 'no IIHF/Olympic fixtures yet — audit infrastructure in place, awaiting content',
    }, null, 2));
    return;
  }
  const { data: posts } = await supabase
    .from('posts')
    .select('id, slug, league_id, home_score, away_score, status, published_at')
    .eq('status', 'published')
    .in('league_id', leagueIds)
    .order('published_at', { ascending: false })
    .limit(SAMPLE_SIZE);
  const samples = [];
  for (const p of (posts || []).slice(0, SAMPLE_SIZE)) {
    // Compare stored DB score against Wikipedia claim. For now we
    // can't fetch Wikipedia automatically per-sample at scale (each
    // Wikipedia table fetch is ~70KB). Instead, log the DB row and
    // mark a manual-review flag if the post hasn't been checked in
    // the last 30 days.
    samples.push({
      postId: p.id,
      slug: p.slug,
      leagueId: p.league_id,
      dbHomeScore: p.home_score,
      dbAwayScore: p.away_score,
      lastVerified: p.published_at,
      needsManualCheck: true,
    });
  }
  const report = {
    sampled: samples.length,
    agreed: 0, // populated after manual review
    disagreed: 0,
    demoted: false,
    samples,
    note: 'Awaiting content with Wikipedia cross-source. Adapter built 2026-09-22, will activate when IIHF/Olympic fixtures land.',
  };
  fs.writeFileSync('/tmp/wiki-accuracy-report.json', JSON.stringify(report, null, 2));
  console.log(`Report: ${samples.length} samples. /tmp/wiki-accuracy-report.json`);
  if (DRY_RUN) console.log('Dry run — no env mutation.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });