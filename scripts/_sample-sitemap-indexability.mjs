#!/usr/bin/env node
// scripts/_sample-sitemap-indexability.mjs
//
// 2026-10-14 (Phase 3): per Arnel's spec — sample 50 random URLs
// from /sitemap-games.xml and confirm each page returns an
// index,follow robots signal (either an explicit
// `<meta name="robots" content="index, follow">` or no robots
// meta at all, which Next.js defaults to index,follow).
//
// Run:  node scripts/_sample-sitemap-indexability.mjs
//
// Exit 0 on success.  Exit 1 if any sample URL fails (noindex or 4xx/5xx).

import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.SAMPLE_BASE || 'https://rinkstop.com';
const SAMPLE_SIZE = parseInt(process.env.SAMPLE_SIZE || '50', 10);
const CONCURRENCY = 4;

async function fetchSitemapUrls() {
  const res = await fetch(`${BASE}/sitemap-games.xml`, {
    headers: { 'User-Agent': 'rinkstop-sitemap-sampler/1.0' },
  });
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`);
  const xml = await res.text();
  // Extract <loc>...</loc> entries
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  return urls;
}

async function checkOne(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'rinkstop-sitemap-sampler/1.0' },
    redirect: 'follow',
  });
  if (res.status >= 400) {
    return { url, status: res.status, robots: null, ok: false, reason: 'http error' };
  }
  const html = await res.text();
  // Match <meta name="robots" content="...">
  const m = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  const robots = m ? m[1].toLowerCase() : null;
  // Decision: indexable iff no meta OR meta contains "index"
  const hasNoindexMeta = robots ? /\bnoindex\b/.test(robots) : false;
  const ok = !hasNoindexMeta;
  return { url, status: res.status, robots: robots || '(none → default index,follow)', ok, reason: ok ? 'ok' : 'noindex' };
}

async function main() {
  console.log(`Sampling ${SAMPLE_SIZE} random URLs from ${BASE}/sitemap-games.xml ...`);
  const all = await fetchSitemapUrls();
  console.log(`  sitemap has ${all.length} URLs`);

  // Random sample
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, Math.min(SAMPLE_SIZE, all.length));

  // Concurrent fetcher
  const results = [];
  for (let i = 0; i < sample.length; i += CONCURRENCY) {
    const batch = sample.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(checkOne));
    results.push(...batchResults);
  }

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  console.log(`  ${passed}/${results.length} indexable`);
  if (failed.length > 0) {
    console.log(`  FAILED (${failed.length}):`);
    for (const f of failed.slice(0, 20)) {
      console.log(`    - ${f.url}  status=${f.status}  robots=${f.robots}  reason=${f.reason}`);
    }
  }

  if (passed !== results.length) {
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
