#!/usr/bin/env node
//
// scripts/sitemap-url-sample.cjs
//
// 2026-10-15 (Piece B, Arnel 10:12): sample URLs FROM the sitemap
// (not from the DB) and verify each one returns 200,
// robots=index,follow at start, and a self-canonical.
//
// Stratification across 50 URLs:
//   - 20 finished (status=completed, scheduled_at in last 90 days)
//   - 20 scheduled (status=scheduled, scheduled_at in next 30 days)
//   - 10 lower-league (status=in (completed,scheduled,in_progress),
//     league != nhl)
//
// Usage:
//   node scripts/sitemap-url-sample.cjs
//   BASE_URL=https://staging.example.com node scripts/sitemap-url-sample.cjs
//
// Exit code: 0 = all pass, 1 = at least one fail.

const fs = require('fs');
const https = require('https');

const BASE = process.env.BASE_URL || 'https://rinkstop.com';
const SITEMAP_URL = `${BASE}/sitemap-games.xml`;
const REQUEST_DELAY_MS = parseInt(process.env.SMOKE_REQUEST_DELAY_MS ?? '300', 10) || 0;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function get(url, maxRedirects = 5) {
  return new Promise((res, rej) => {
    https.get(url, (r) => {
      if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && maxRedirects > 0) {
        r.resume();
        const next = new URL(r.headers.location, url).toString();
        return get(next, maxRedirects - 1).then(res, rej);
      }
      let b = '';
      r.on('data', (d) => (b += d));
      r.on('end', async () => { await sleep(REQUEST_DELAY_MS); res({ status: r.statusCode, body: b, headers: r.headers }); });
      r.on('error', rej);
    });
  });
}

function extractLocs(xml) {
  const out = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return Array.from(new Set(out));
}

function parseGameUrl(loc) {
  const u = new URL(loc);
  const parts = u.pathname.split('/').filter(Boolean);
  return { id: parts[parts.length - 1], base: `${u.protocol}//${u.host}` };
}

async function fixtureStatusFor(id) {
  // One-shot DB lookup to bucket URLs by status/league for stratification.
  const env = {};
  for (const line of fs.readFileSync(__dirname + '/../.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return new Promise((res, rej) => {
    const sel = `id,status,league:leagues(slug)`;
    const path = `/rest/v1/fixtures?select=${encodeURIComponent(sel)}&id=eq.${id}&limit=1`;
    https.get(`${SUPABASE_URL}${path}`, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }, (r) => {
      let b = ''; r.on('data', d => b += d); r.on('end', () => {
        if (r.statusCode !== 200) return res(null);
        const rows = JSON.parse(b);
        res(rows[0] || null);
      }); r.on('error', rej);
    });
  });
}

async function main() {
  const t0 = Date.now();
  console.log(`Fetching sitemap: ${SITEMAP_URL}`);
  const r = await get(SITEMAP_URL);
  if (r.status !== 200) {
    console.error(`Sitemap returned status=${r.status}`);
    process.exit(1);
  }
  const allLocs = extractLocs(r.body);
  console.log(`Sitemap has ${allLocs.length} unique URLs`);

  // Build bucket arrays in parallel (each url gets a status+league lookup).
  // Walk the sitemap; classify each URL into 3 buckets.
  const finishedNhl = [];
  const scheduledNhl = [];
  const lowerLeague = [];
  console.log('Classifying URLs by status/league (this takes a moment)...');
  // Cap to first 200 lookups to keep this fast; we'll have plenty
  // in each bucket from the first 200.
  const lookups = allLocs.slice(0, 200);
  for (const loc of lookups) {
    const { id } = parseGameUrl(loc);
    const f = await fixtureStatusFor(id);
    if (!f) continue;
    const league = f.league && f.league.slug;
    if (league === 'nhl' && f.status === 'completed' && finishedNhl.length < 20) {
      finishedNhl.push(loc);
    } else if (league === 'nhl' && (f.status === 'scheduled' || f.status === 'in_progress') && scheduledNhl.length < 20) {
      scheduledNhl.push(loc);
    } else if (league !== 'nhl' && lowerLeague.length < 10) {
      lowerLeague.push(loc);
    }
    if (finishedNhl.length === 20 && scheduledNhl.length === 20 && lowerLeague.length === 10) break;
  }
  const sampleLocs = [...finishedNhl, ...scheduledNhl, ...lowerLeague];
  console.log(`Picked ${sampleLocs.length} URLs (${finishedNhl.length} finished NHL, ${scheduledNhl.length} scheduled NHL, ${lowerLeague.length} lower-league)`);
  if (sampleLocs.length < 50) {
    console.error(`Only picked ${sampleLocs.length}/50 URLs; sitemap may be too small. Aborting.`);
    process.exit(1);
  }

  let pass = 0;
  let fail = 0;
  const failures = [];

  for (const url of sampleLocs) {
    const { id } = parseGameUrl(url);
    let r;
    try {
      r = await get(url);
    } catch (e) {
      fail++;
      failures.push({ id, url, reason: `fetch error: ${e.message}`, status: null });
      console.log(`  ${id.slice(0, 8)}  FAIL  fetch error: ${e.message}`);
      continue;
    }
    if (r.status !== 200) {
      fail++;
      failures.push({ id, url, reason: `status=${r.status} (sitemap URL must return 200)`, status: r.status });
      console.log(`  ${id.slice(0, 8)}  status=${r.status}  FAIL`);
      continue;
    }
    const robots = (r.body.match(/<meta\s+name="robots"\s+content="([^"]+)"/i) || [])[1] || '';
    const canonical = (r.body.match(/rel="canonical"\s+href="([^"]+)"/) || [])[1] || '';
    const selfCanonical = canonical && canonical.endsWith(`/${id}`);
    // Per Arnel step 4: a sitemap URL that is noindex is a fail.
    if (!/^index,\s*follow/i.test(robots.trim())) {
      fail++;
      failures.push({ id, url, reason: `sitemap URL is noindex (robots="${robots}")`, status: 200 });
      console.log(`  ${id.slice(0, 8)}  status=200  robots="${robots}"  FAIL  (sitemap URL is noindex)`);
      continue;
    }
    if (!selfCanonical) {
      fail++;
      failures.push({ id, url, reason: `canonical="${canonical}" not self-canonical`, status: 200 });
      console.log(`  ${id.slice(0, 8)}  status=200  canonical="${canonical}"  FAIL`);
      continue;
    }
    pass++;
    console.log(`  ${id.slice(0, 8)}  status=200  robots="${robots}"  canonical self  PASS`);
  }

  const ms = Date.now() - t0;
  console.log('');
  console.log(`Total: ${pass + fail}  pass=${pass}  fail=${fail}  (${ms}ms)`);
  if (failures.length > 0) {
    console.log('');
    console.log('Failures:');
    for (const f of failures) {
      console.log(`  - ${f.id}  ${f.reason}`);
    }
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
