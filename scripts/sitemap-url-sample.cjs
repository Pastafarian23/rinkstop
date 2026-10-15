#!/usr/bin/env node
//
// scripts/sitemap-url-sample.cjs
//
// 2026-10-15 (Piece B, Arnel 10:12): sample 50 URLs from
// https://rinkstop.com/sitemap-games.xml and verify each one
// returns 200, robots=index,follow, and a self-canonical.
//
// Stratification:
//   - 20 finished (last 90 days, status=completed)
//   - 20 scheduled (next 30 days, status=scheduled or in_progress)
//   - 10 lower-league (any non-NHL game from either window)
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
  // Match <loc>...</loc> and dedupe (some sitemaps can repeat)
  const out = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    out.push(m[1]);
  }
  return Array.from(new Set(out));
}

function parseGameUrl(loc) {
  // https://rinkstop.com/directory/games/{id}
  const u = new URL(loc);
  const parts = u.pathname.split('/').filter(Boolean);
  return { id: parts[parts.length - 1], base: `${u.protocol}//${u.host}` };
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

  // Stratify: 20 finished, 20 scheduled, 10 lower-league.
  // We can tell "finished" vs "scheduled" from the URL itself only by
  // hitting each page and looking at the meta.  Cheaper: pull
  // fixtures from the DB and bucket by status, then match to sitemap
  // URLs by id.
  const env = {};
  for (const line of fs.readFileSync(__dirname + '/../.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  function sb(path) {
    return new Promise((res, rej) => {
      https.get(`${SUPABASE_URL}${path}`, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }, (r) => {
        let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b })); r.on('error', rej);
      });
    });
  }

  async function pickIds(status, league, n) {
    const sel = `id,status&limit=50${league ? `&league_id=in.(${league})` : ''}`;
    const r = await sb(`/rest/v1/fixtures?select=id,status&status=eq.${status}&order=scheduled_at.desc&limit=200`);
    if (r.status !== 200) return [];
    const rows = JSON.parse(r.body);
    return rows.slice(0, n).map((row) => row.id);
  }

  // Get league ids for stratification
  const leaguesR = await sb('/rest/v1/leagues?select=id,slug&limit=20');
  const leagues = JSON.parse(leaguesR.body);
  const leagueIdBySlug = Object.fromEntries(leagues.map((l) => [l.slug, l.id]));
  const nhlId = leagueIdBySlug['nhl'];
  const lowerIds = leagues.filter((l) => l.slug !== 'nhl').map((l) => l.id);

  // 20 finished NHL, 20 scheduled NHL, 10 lower-league
  const finishedNhl = await pickIds('completed', nhlId, 20);
  const scheduledNhl = await pickIds('scheduled', nhlId, 20);
  // Lower league = any non-NHL game from the sitemap
  const allLowerR = await sb('/rest/v1/fixtures?select=id&league_id=in.(' + lowerIds.join(',') + ')&status=in.(completed,scheduled,in_progress)&order=scheduled_at.desc&limit=200');
  const allLower = (JSON.parse(allLowerR.body) || []).map((r) => r.id).slice(0, 10);

  const sampleIds = [
    ...finishedNhl.slice(0, 20),
    ...scheduledNhl.slice(0, 20),
    ...allLower.slice(0, 10),
  ];
  console.log(`Picked ${sampleIds.length} ids to verify (20 finished NHL, 20 scheduled NHL, 10 lower-league)`);

  // Build the sitemap-URL set for the cross-check
  const sitemapLocs = new Set(allLocs.map(parseGameUrl).map((g) => g.id));

  let pass = 0;
  let fail = 0;
  const failures = [];

  for (const id of sampleIds) {
    const url = `${BASE}/directory/games/${id}`;
    const inSitemap = sitemapLocs.has(id);
    let r;
    try {
      r = await get(url);
    } catch (e) {
      fail++;
      failures.push({ id, reason: `fetch error: ${e.message}`, status: null });
      console.log(`  ${id.slice(0, 8)}  FAIL  fetch error: ${e.message}`);
      continue;
    }
    if (r.status !== 200) {
      fail++;
      failures.push({ id, reason: `status=${r.status}`, status: r.status });
      console.log(`  ${id.slice(0, 8)}  status=${r.status}  FAIL  in_sitemap=${inSitemap}`);
      continue;
    }
    // robots
    const robots = (r.body.match(/<meta\s+name="robots"\s+content="([^"]+)"/i) || [])[1] || '';
    const canonical = (r.body.match(/rel="canonical"\s+href="([^"]+)"/) || [])[1] || '';
    const selfCanonical = canonical && canonical.endsWith(`/${id}`);
    if (!inSitemap) {
      fail++;
      failures.push({ id, reason: 'in_sitemap=false (sitemap excludes this id)', status: 200 });
      console.log(`  ${id.slice(0, 8)}  status=200  in_sitemap=false  FAIL  (page is indexable but not in sitemap)`);
      continue;
    }
    if (!/index,\s*follow/.test(robots)) {
      fail++;
      failures.push({ id, reason: `robots="${robots}" expected "index, follow"`, status: 200 });
      console.log(`  ${id.slice(0, 8)}  status=200  robots="${robots}"  FAIL`);
      continue;
    }
    if (!selfCanonical) {
      fail++;
      failures.push({ id, reason: `canonical="${canonical}" not self-canonical`, status: 200 });
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
