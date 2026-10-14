#!/usr/bin/env node
// scripts/_sample-sitemap-indexability.cjs
//
// 2026-10-14 (Phase 3 follow-up): stratified sample of the
// sitemap-games.xml.  Per Arnel's spec:
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
//   SAMPLE_BASE=https://rinkstop.com node scripts/_sample-sitemap-indexability.cjs
//
// Exit 0 on success, exit 1 on any failure.

const fs = require('fs');
const https = require('https');

const BASE = process.env.SAMPLE_BASE || process.argv[2] || 'https://rinkstop.com';
const N_FINISHED = parseInt(process.env.SAMPLE_FINISHED || '15', 10);
const N_SCHEDULED = parseInt(process.env.SAMPLE_SCHEDULED || '15', 10);
const N_LOWER = parseInt(process.env.SAMPLE_LOWER || '10', 10);
const CONCURRENCY = 4;

const TOP_TIER = new Set([
  'nhl','ahl','pwhl','khl','shl','liiga','del','nl',
  'extraliga','ncaa','chl','whl','ohl','qmjhl','ushl',
]);

// parse .env.local manually
const env = {};
for (const line of fs.readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function getXml(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '?_=' + Date.now(), (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
      res.on('error', reject);
    });
  });
}

function parseUrlEntries(xml) {
  return [...xml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g)].map(m => {
    const url = m[1];
    const idMatch = url.match(/\/directory\/games\/([a-f0-9-]{36})/);
    return { url, id: idMatch ? idMatch[1] : null };
  });
}

async function fetchFixtureStatuses(ids) {
  const map = new Map();
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

async function checkOne(url) {
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

  // Handle sitemap index (parent of chunked sitemaps)
  const xml0 = await getXml(BASE + '/sitemap-games.xml');
  let xml = xml0;
  if (xml.includes('<sitemapindex')) {
    const children = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    xml = '';
    for (const c of children) {
      try { xml += await getXml(c); } catch (e) { /* ignore */ }
    }
  }
  const entries = parseUrlEntries(xml);
  console.log(`  sitemap has ${entries.length} URLs total`);

  const ids = entries.map(e => e.id).filter(x => !!x);
  const meta = await fetchFixtureStatuses(ids);

  const finished = [];
  const scheduled = [];
  const lower = [];
  for (const e of entries) {
    const m = meta.get(e.id || '');
    if (!m) continue;
    if (m.status === 'completed') finished.push(e);
    else if (m.status === 'scheduled') scheduled.push(e);
    if (!TOP_TIER.has(m.leagueSlug)) lower.push(e);
  }
  const shuf = a => [...a].sort(() => Math.random() - 0.5);
  const sample = [
    ...shuf(finished).slice(0, N_FINISHED),
    ...shuf(scheduled).slice(0, N_SCHEDULED),
    ...shuf(lower).slice(0, N_LOWER),
  ];
  console.log(`  sampling ${sample.length} URLs`);

  const results = [];
  for (let i = 0; i < sample.length; i += CONCURRENCY) {
    const batch = sample.slice(i, i + CONCURRENCY);
    const r = await Promise.all(batch.map(e => checkOne(e.url)));
    for (let j = 0; j < batch.length; j++) {
      const e = batch[j];
      const m = meta.get(e.id || '');
      let bucket = 'unknown';
      if (m) {
        if (m.status === 'completed') bucket = 'finished';
        else if (m.status === 'scheduled') bucket = 'scheduled';
        if (!TOP_TIER.has(m.leagueSlug) && bucket !== 'unknown') bucket += '+lower';
      }
      results.push({ ...r[j], bucket });
    }
  }

  const pass = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);
  // Per-bucket counts
  const bucketStats = {};
  for (const r of results) {
    if (!bucketStats[r.bucket]) bucketStats[r.bucket] = { pass: 0, fail: 0 };
    r.ok ? bucketStats[r.bucket].pass++ : bucketStats[r.bucket].fail++;
  }
  console.log();
  console.log(`  PASS: ${pass.length} / ${results.length}`);
  for (const [b, s] of Object.entries(bucketStats)) {
    console.log(`    ${b.padEnd(15)}  pass=${s.pass}  fail=${s.fail}`);
  }
  if (fail.length > 0) {
    console.log(`\n  FAIL: ${fail.length}`);
    for (const f of fail.slice(0, 20)) {
      console.log(`    - ${f.url}`);
      console.log(`        bucket=${f.bucket} status=${f.status} robots=${f.robots} canonical=${f.canonical} reason=${f.reason}`);
    }
  }
  if (fail.length > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
