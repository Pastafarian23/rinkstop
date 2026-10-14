#!/usr/bin/env node
// scripts/_check-predicate-agreement.mjs
//
// 2026-10-14 (Phase 3 follow-up): for a stratified sample of 20
// games (5 finished NHL, 5 finished lower-league, 5 scheduled,
// 5 cancelled), compare the sitemap's indexability decision
// (from INDEXABILITY_SQL) with the page's isGameIndexable
// decision (from the rendered /directory/games/[id] page's
// <meta name="robots"> tag).
//
// Agreement = both say index OR both say noindex.  They may
// differ for thin lower-league finished games (sitemap's SQL
// approximation can disagree with the page's runtime module
// count).  Any disagreement is reported with both values so
// the operator can see whether to refine the SQL.
//
// Run:  node scripts/_check-predicate-agreement.mjs [base]

import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.argv[2] || process.env.SAMPLE_BASE || 'https://rinkstop.com';
const N_PER_GROUP = parseInt(process.env.SAMPLE_PER_GROUP || '5', 10);

// 2026-10-14: pull the IDs + league from Supabase via a one-shot
// script.  Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// in .env.local.
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function sampleFor(status: string, leaguePattern: string | null, n: number) {
  let q = sb
    .from('fixtures')
    .select('id, status, scheduled_at, league:leagues(slug)')
    .eq('status', status)
    .order('scheduled_at', { ascending: false })
    .limit(n * 4); // over-fetch then sample
  if (leaguePattern) {
    q = q.ilike('league.slug', leaguePattern);
  }
  const { data, error } = await q;
  if (error) { console.error('error:', error); return []; }
  // shuffle and take n
  const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, n);
  return shuffled;
}

async function fetchPage(id: string) {
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

function isIndexableFromRobots(robots: string | null): boolean | null {
  if (!robots) return true; // default
  if (/\bnoindex\b/.test(robots)) return false;
  if (/\bindex\b/.test(robots)) return true;
  return null;
}

async function main() {
  console.log(`Predicate agreement check against ${BASE}`);
  console.log(`  ${N_PER_GROUP} per group\n`);

  const groups = [
    { name: 'finished-NHL',       status: 'completed', league: 'nhl', n: N_PER_GROUP },
    { name: 'finished-lower',     status: 'completed', league: null, n: N_PER_GROUP },
    { name: 'scheduled',          status: 'scheduled', league: null, n: N_PER_GROUP },
    { name: 'cancelled',          status: 'cancelled', league: null, n: N_PER_GROUP },
  ];

  let total = 0;
  let agreed = 0;
  let disagreed = 0;
  let ambiguous = 0;
  const rows: any[] = [];

  for (const g of groups) {
    const ids = await sampleFor(g.status, g.league ? `${g.league}%` : null, g.n);
    for (const f of ids) {
      // sitemap-side decision: this fixture is in the sitemap iff
      // its computed indexability = 'index'.  We can infer this by
      // looking up the fixture in the sitemap (or by re-evaluating
      // the same SQL).  For brevity we use the meta-tag from the
      // page as the GROUND TRUTH (since the page is what users
      // actually see) and compare the sitemap's INCLUSION in the
      // file to the page's robots.
      const sitemapCheck = await fetch(`${BASE}/sitemap-games.xml`).then(r => r.text());
      const sitemapHas = sitemapCheck.includes(`/directory/games/${f.id}`);

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

  // Pretty table
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
