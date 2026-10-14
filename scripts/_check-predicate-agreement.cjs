#!/usr/bin/env node
// scripts/_check-predicate-agreement.mjs
//
// 2026-10-14 (Phase 3 follow-up, after pagination landed): for a
// stratified sample of 20 games (5 finished NHL, 5 finished
// lower-league, 5 scheduled, 5 cancelled), compare the sitemap's
// INCLUSION of the URL with the page-side robots meta.
//
//   - sitemapHas = YES  && pageIndexable = noindex  → DISAGREE
//   - sitemapHas = no   && pageIndexable = index   → DISAGREE
//   - both agree (both index OR both noindex)      → AGREE
//
// The page is the ground truth.  Any disagreement indicates the
// sitemap is including a page that's noindex, or excluding a page
// that's index.  Either is a sign the WHERE clause diverges from
// the page's predicate.
//
// Run:  SAMPLE_BASE=... node scripts/_check-predicate-agreement.mjs

const fs = require('fs');
const BASE = process.env.SAMPLE_BASE || 'https://rinkstop.com';
const N_PER_GROUP = parseInt(process.env.SAMPLE_PER_GROUP || '5', 10);

// parse .env.local manually
const env = {};
for (const line of fs.readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function sampleFor(status, leaguePattern, n) {
  let q = sb
    .from('fixtures')
    .select('id, status, scheduled_at, league:leagues(slug)')
    .eq('status', status)
    .order('scheduled_at', { ascending: false })
    .limit(n * 4);
  if (leaguePattern) q = q.ilike('league.slug', leaguePattern);
  const { data, error } = await q;
  if (error) { console.error('error:', error); return []; }
  return (data || []).sort(() => Math.random() - 0.5).slice(0, n);
}

async function fetchPage(id) {
  const r = await fetch(`${BASE}/directory/games/${id}`, {
    headers: { 'User-Agent': 'rinkstop-predicate-checker/1.0' },
  });
  if (r.status >= 400) return { status: r.status, robots: null, canonical: null };
  const html = await r.text();
  const m = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  const c = html.match(/rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  return {
    status: r.status,
    robots: m ? m[1].toLowerCase() : null,
    canonical: c ? c[1] : null,
  };
}

function isIndexableFromRobots(robots) {
  if (!robots) return true;
  if (/\bnoindex\b/.test(robots)) return false;
  if (/\bindex\b/.test(robots)) return true;
  return null;
}

async function main() {
  console.log(`Predicate agreement check against ${BASE}`);
  console.log(`  ${N_PER_GROUP} per group\n`);

  const groups = [
    { name: 'finished-NHL',   status: 'completed', league: 'nhl',       n: N_PER_GROUP },
    { name: 'finished-lower', status: 'completed', league: null,        n: N_PER_GROUP },
    { name: 'scheduled',      status: 'scheduled', league: null,        n: N_PER_GROUP },
    { name: 'cancelled',      status: 'cancelled', league: null,        n: N_PER_GROUP },
  ];

  let total = 0, agreed = 0, disagreed = 0, ambiguous = 0;
  const rows = [];

  // Fetch the sitemap once
  const sitemapXml = await fetch(`${BASE}/sitemap-games.xml`).then(r => r.text());

  for (const g of groups) {
    const ids = await sampleFor(g.status, g.league ? `${g.league}%` : null, g.n);
    for (const f of ids) {
      const sitemapHas = sitemapXml.includes(`/directory/games/${f.id}`);
      const page = await fetchPage(f.id);
      const pageIndexable = isIndexableFromRobots(page.robots);

      let verdict;
      if (pageIndexable === null) {
        verdict = 'AMBIGUOUS';
        ambiguous++;
      } else if (sitemapHas === pageIndexable) {
        verdict = 'AGREE';
        agreed++;
      } else {
        verdict = 'DISAGREE';
        disagreed++;
      }
      total++;
      rows.push({
        group: g.name,
        id: f.id,
        status: f.status,
        league: f.league?.slug || '?',
        sitemapHas: sitemapHas ? 'YES' : 'no',
        pageRobots: page.robots || '(none)',
        pageIndexable: pageIndexable === null ? '?' : pageIndexable ? 'index' : 'noindex',
        verdict,
      });
      await sleep(50);
    }
  }

  console.log('group             | id                                   | sitemap | page-indexable | verdict');
  console.log('-------------------+--------------------------------------+---------+-----------------+----------');
  for (const r of rows) {
    console.log(
      `${r.group.padEnd(18)} | ${r.id.slice(0, 36)} | ${r.sitemapHas.padEnd(7)} | ${r.pageIndexable.padEnd(15)} | ${r.verdict}`,
    );
  }
  console.log();
  console.log(`Total: ${total}, Agree: ${agreed}, Disagree: ${disagreed}, Ambiguous: ${ambiguous}`);
  if (disagreed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
