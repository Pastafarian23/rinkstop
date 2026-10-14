#!/usr/bin/env node
// scripts/_sample-sitemap-indexability.mjs
//
// 2026-10-14 (Phase 3 follow-up, after pagination landed): stratified
// sample.  Per Arnel's spec:
//   - at least 15 finished
//   - at least 15 scheduled
//   - at least 10 lower-league
// For each URL we check:
//   - HTTP 200
//   - robots meta is "index, follow" (or absent, defaults to index)
//   - canonical is the self URL (no cross-URL canonical pointing
//     somewhere else)
//
// Run:
//   node scripts/_sample-sitemap-indexability.mjs [base]
//   # or
//   SAMPLE_BASE=https://rinkstop.com node scripts/_sample-sitemap-indexability.mjs
//
// Exit 0 on success (all samples pass), exit 1 on any failure.

const BASE = process.argv[2] || process.env.SAMPLE_BASE || 'https://rinkstop.com';
const N_FINISHED = parseInt(process.env.SAMPLE_FINISHED || '15', 10);
const N_SCHEDULED = parseInt(process.env.SAMPLE_SCHEDULED || '15', 10);
const N_LOWER = parseInt(process.env.SAMPLE_LOWER || '10', 10);
const CONCURRENCY = 4;

const TOP_TIER_LEAGUES = new Set([
  'nhl', 'ahl', 'pwhl', 'khl', 'shl', 'liiga', 'del', 'nl',
  'extraliga', 'ncaa', 'chl', 'whl', 'ohl', 'qmjhl', 'ushl',
]);

async function fetchSitemapIndex() {
  // Sitemap may be a single file or a sitemap-index pointing at
  // numbered chunks (sitemap-games.xml?sitemap=N).  Handle both.
  const res = await fetch(`${BASE}/sitemap-games.xml`, {
    headers: { 'User-Agent': 'rinkstop-sitemap-sampler/2.0' },
  });
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`);
  const xml = await res.text();
  // Detect sitemapindex (parent of chunked sitemaps)
  if (xml.includes('<sitemapindex')) {
    const children = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    // fetch each chunk and concatenate URLs
    let allXml = '';
    for (const c of children) {
      const r = await fetch(c, { headers: { 'User-Agent': 'rinkstop-sitemap-sampler/2.0' } });
      if (r.ok) allXml += await r.text();
    }
    return allXml;
  }
  return xml;
}

function parseUrlEntries(xml: string) {
  // <url><loc>...</loc>...
  return [...xml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g)].map(m => {
    const url = m[1];
    const idMatch = url.match(/\/directory\/games\/([a-f0-9-]{36})/);
    return { url, id: idMatch ? idMatch[1] : null };
  });
}

async function fetchFixtureStatuses(ids: string[]): Promise<Map<string, { status: string; leagueSlug: string }>> {
  // We need status + league per ID to bucket.  Pull from Supabase
  // by chunked IN.  Requires env in .env.local.
  const { createClient } = await import('@supabase/supabase-js');
  const { config } = await import('dotenv');
  config({ path: '.env.local' });
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const map = new Map<string, { status: string; leagueSlug: string }>();
  // chunk IN list (PostgREST limit ~ a few hundred per query)
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await sb
      .from('fixtures')
      .select('id, status, league:leagues(slug)')
      .in('id', chunk);
    if (error) { console.error('supabase:', error.message); continue; }
    for (const f of data || []) {
      map.set(f.id, { status: f.status, leagueSlug: (f.league?.slug || '').toLowerCase() });
    }
  }
  return map;
}

async function checkOne(url: string) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'rinkstop-sitemap-sampler/2.0' },
    redirect: 'follow',
  });
  if (r.status >= 400) {
    return { url, status: r.status, robots: null, canonical: null, ok: false, reason: 'http error' };
  }
  const html = await r.text();
  const m = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  const c = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const robots = m ? m[1].toLowerCase() : null;
  const canonical = c ? c[1] : null;
  const hasNoindex = robots ? /\bnoindex\b/.test(robots) : false;
  const canonicalOk = canonical ? canonical.replace(/\/+$/, '') === url.replace(/\/+$/, '') : false;
  const ok = !hasNoindex && canonicalOk;
  const reason = !ok
    ? (hasNoindex ? 'noindex in robots meta' : 'canonical mismatch')
    : 'ok';
  return { url, status: r.status, robots: robots || '(default index,follow)', canonical: canonical || '(none)', ok, reason };
}

async function main() {
  console.log(`Stratified sample of sitemap-games.xml from ${BASE}`);
  console.log(`  buckets: finished=${N_FINISHED}, scheduled=${N_SCHEDULED}, lower-league=${N_LOWER}\n`);

  const xml = await fetchSitemapIndex();
  const entries = parseUrlEntries(xml);
  console.log(`  sitemap has ${entries.length} URLs total`);

  const ids = entries.map(e => e.id).filter((x): x is string => !!x);
  const meta = await fetchFixtureStatuses(ids);

  // Bucket the entries
  const finished: typeof entries = [];
  const scheduled: typeof entries = [];
  const lower: typeof entries = [];
  for (const e of entries) {
    const m = meta.get(e.id || '');
    if (!m) continue;
    if (m.status === 'completed') finished.push(e);
    else if (m.status === 'scheduled') scheduled.push(e);
    if (!TOP_TIER_LEAGUES.has(m.leagueSlug)) lower.push(e);
  }
  // shuffle
  const shuf = <T>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
  const sample = [
    ...shuf(finished).slice(0, N_FINISHED),
    ...shuf(scheduled).slice(0, N_SCHEDULED),
    ...shuf(lower).slice(0, N_LOWER),
  ];
  console.log(`  sampling ${sample.length} URLs`);

  const results: any[] = [];
  for (let i = 0; i < sample.length; i += CONCURRENCY) {
    const batch = sample.slice(i, i + CONCURRENCY);
    const r = await Promise.all(batch.map(e => checkOne(e.url)));
    for (let j = 0; j < batch.length; j++) {
      const e = batch[j];
      const m = meta.get(e.id || '');
      results.push({ ...r[j], bucket: r[j].ok ? (m?.status === 'completed' ? 'finished' : m?.status === 'scheduled' ? 'scheduled' : 'lower') : 'unknown' });
    }
  }

  // Summary
  const pass = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);
  console.log();
  console.log(`  PASS: ${pass.length} / ${results.length}`);
  if (fail.length > 0) {
    console.log(`  FAIL: ${fail.length}`);
    for (const f of fail.slice(0, 20)) {
      console.log(`    - ${f.url}`);
      console.log(`        status=${f.status} robots=${f.robots} canonical=${f.canonical} reason=${f.reason}`);
    }
  }
  if (fail.length > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
