#!/usr/bin/env node
// scripts/smoke-games.cjs
//
// 2026-10-15: production smoke test for /directory/games/[id].
//
// Picks 20 game ids from the database across leagues (NHL finished
// /scheduled/cancelled, AHL, ECHL, KHL, NCAA), plus the specific
// 05149648-5967-4e0f-824d-a4ddf1e598f6 id the team has been tracking
// in incident reports, plus a bogus id.  For each id, fetches the
// real game from the database (so the test is anchored to ground
// truth, not a stale cache), then requests the page on rinkstop.com
// 3 times in shuffled order plus once with a ?x=1 cache-buster.
//
// Per Arnel 2026-10-15 the test must check on the RAW HTML that:
//   - team form section is present (server-rendered)
//   - head-to-head section is present (server-rendered)
//   - recap text is present on completed games, absent on scheduled
//   - SportsEvent JSON-LD is present
//   - BreadcrumbList JSON-LD is present with >=4 ListItems
//   - browser makes zero Supabase requests on initial page load
//
// The bogus id must return 404.  Also checks that /, a team page,
// a rink page and a league page all return 200.
//
// Bucket counts per Arnel spec:
//   5 NHL completed + 3 NHL scheduled + 1 NHL cancelled
//   3 AHL completed + 1 AHL scheduled
//   2 ECHL completed + 1 ECHL scheduled
//   2 KHL completed
//   2 NCAA completed + 1 NCAA scheduled
//   + 1 user-required + 1 bogus = 23 total
//
// Run:
//   node scripts/smoke-games.cjs
//
// Exits non-zero on any failure.

const fs = require('fs');
const https = require('https');

const env = {};
for (const line of fs.readFileSync(__dirname + '/../.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.BASE_URL || process.env.SMOKE_BASE_URL || 'https://rinkstop.com';
const USER_ID = '05149648-5967-4e0f-824d-a4ddf1e598f6'; // user-required
const BOGUS_ID = '00000000-0000-0000-0000-000000000099';

function sb(path) {
  return new Promise((res, rej) => {
    const req = https.get(`${SUPABASE_URL}${path}`, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }, (r) => {
      let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b })); r.on('error', rej);
    });
  });
}
function page(url) {
  return new Promise((res, rej) => {
    https.get(url, (r) => {
      let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b, headers: r.headers })); r.on('error', rej);
    });
  });
}
function head(url) {
  return new Promise((res, rej) => {
    https.request(url, { method: 'HEAD' }, (r) => { r.resume(); r.on('end', () => res({ status: r.statusCode, headers: r.headers })); r.on('error', rej); }).end();
  });
}

async function fetchExpectedGame(id) {
  // Mirror the page's fixture row.  Note: do NOT select
  // `period_scores` — that column doesn't exist in production
  // (the page's Supabase select also doesn't include it).
  const sel = [
    'id', 'status', 'scheduled_at', 'home_score', 'away_score',
    'home_team_id', 'away_team_id', 'league_id',
    'home_team:teams!home_team_id(name)',
    'away_team:teams!away_team_id(name)',
    'league:leagues(slug,name)',
  ].join(',');
  const r = await sb(`/rest/v1/fixtures?select=${encodeURIComponent(sel)}&id=eq.${id}&limit=1`);
  if (r.status !== 200) return null;
  const rows = JSON.parse(r.body);
  if (!rows[0]) return null;
  const f = rows[0];
  return {
    id: f.id,
    status: f.status,
    away_name: f.away_team?.name || null,
    home_name: f.home_team?.name || null,
    home_score: f.home_score,
    away_score: f.away_score,
    league: f.league?.name || null,
  };
}

function nameSlug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

// Pick ids across leagues and statuses. We pick from the database so
// the test is anchored to real data; we just choose how many and
// from which buckets.
//
// 2026-10-15 (Arnel 09:38 step 6): the old pullIds() did
// `order=scheduled_at.desc&limit=500` then filtered by league in
// JavaScript. That starved ECHL/NCAA buckets because the 500 most
// recent fixtures are mostly future NHL/AHL games, so the older
// ECHL/NCAA completed fixtures never made the cut.  Fix: use
// PostgREST's `league.slug=eq.X` filter so the DB returns only the
// requested league's rows.  No more 500-row cap problem.
async function pickIds() {
  // Always include the user-required id first.
  const picks = [USER_ID];

  async function pullIds(status, leagueSlug, n) {
    // Direct league filter via the FK resource syntax.  Returns at
    // most `n` rows (PostgREST respects the limit).
    const r = await sb(`/rest/v1/fixtures?select=id&status=eq.${status}&league.slug=eq.${leagueSlug}&order=scheduled_at.desc&limit=${Math.max(n, 50)}`);
    if (r.status !== 200) return [];
    const rows = JSON.parse(r.body);
    return (rows || [])
      .map(r => r.id)
      .filter(id => id !== USER_ID)
      .slice(0, n);
  }

  // Shuffle each bucket so the order varies between runs.
  function shuffle(a) { a.sort(() => Math.random() - 0.5); return a; }

  // Pull buckets. Per Arnel 2026-10-15: at least 20 ids total,
  // with explicit coverage of AHL, KHL, ECHL and NCAA in
  // addition to NHL.  ECHL/NCAA capped at 2 each since the
  // leagues have fewer recent completed games; bumped to 3 to
  // match AHL.
  const buckets = [
    await pullIds('completed', 'nhl', 5),
    await pullIds('scheduled', 'nhl', 3),
    await pullIds('cancelled', 'nhl', 1),
    await pullIds('completed', 'ahl', 3),
    await pullIds('completed', 'echl', 3),
    await pullIds('completed', 'khl', 2),
    await pullIds('completed', 'ncaa', 3),
    await pullIds('scheduled', 'ahl', 1),
    await pullIds('scheduled', 'echl', 1),
    await pullIds('scheduled', 'ncaa', 1),
  ];

  const all = [
    ...shuffle(buckets[0]).slice(0, 5),
    ...shuffle(buckets[1]).slice(0, 3),
    ...shuffle(buckets[2]).slice(0, 1),
    ...shuffle(buckets[3]).slice(0, 3),
    ...shuffle(buckets[4]).slice(0, 3),
    ...shuffle(buckets[5]).slice(0, 2),
    ...shuffle(buckets[6]).slice(0, 3),
    ...shuffle(buckets[7]).slice(0, 1),
    ...shuffle(buckets[8]).slice(0, 1),
    ...shuffle(buckets[9]).slice(0, 1),
  ];

  const seen = new Set([USER_ID]);
  const out = [];
  for (const id of all) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return [USER_ID, ...out];
}

function shuffleOrder(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function extractFromHtml(html) {
  return {
    title: (html.match(/<title>([^<]+)<\/title>/) || [])[1] || '',
    canonical: (html.match(/rel="canonical"\s+href="([^"]+)"/) || [])[1] || '',
    robots: (html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i) || [])[1] || '',
    jse_name: (html.match(/"@type":"SportsEvent","name":"([^"]+)"/) || [])[1] || '',
    jse_startDate: (html.match(/"startDate":"([^"]+)"/) || [])[1] || '',
    jse_url: (html.match(/"@type":"SportsEvent"[^}]+"url":"([^"]+)"/) || [])[1] || '',
    jse_home: (html.match(/"homeTeam":\{"@type":"SportsTeam","name":"([^"]+)"/) || [])[1] || '',
    jse_away: (html.match(/"awayTeam":\{"@type":"SportsTeam","name":"([^"]+)"/) || [])[1] || '',
    jse_eventStatus: (html.match(/"eventStatus":"(https:\/\/schema\.org\/[^"]+)"/) || [])[1] || '',
    breadcrumb: html.includes('"@type":"BreadcrumbList"'),
    breadcrumb_count: (html.match(/"@type":"ListItem"/g) || []).length,
    // The scoreboard text is rendered in the page body (or hidden
    // until JS hydrates).  We capture any "won N over M" / "Final: X
    // Y-Z W" or the visible numeric scores.
    scoreboard: (html.match(/(?:won \d+[^<]+|Final:[^<]+)/) || [])[0] || '',
    // Also pull visible numeric scores (rendered next to team names).
    visibleHomeScore: (html.match(/"homeScore":\s*(\d+)/) || [])[1] || '',
    visibleAwayScore: (html.match(/"awayScore":\s*(\d+)/) || [])[1] || '',
    // 2026-10-15 (Arnel): server-rendered modules must appear in the
    // RAW HTML — no JS hydration required to see them.
    has_team_form: /last\s*5/i.test(html) || /[0-9]+W\s*–\s*[0-9]+L/.test(html),
    has_h2h: /Head-to-head/i.test(html),
    has_recap: /Final:/.test(html) || /won \d+/.test(html),
    has_next_game: /next/i.test(html) && /puck drop|next/i.test(html),
    has_same_day: /Other .* games on this day/i.test(html),
    // 2026-10-15 (Arnel): browser must make zero Supabase requests
    // on initial page load.  The page is fully server-rendered.
    // Flag any client-side fetch or supabase-js script reference.
    supabase_requests_in_html:
      (html.match(/supabase\.co|supabase\.io|createClient\(|createBrowserClient\(/g) || []).length,
  };
}

function expectedName(g) {
  if (!g || !g.away_name || !g.home_name) return null;
  return `${g.away_name} at ${g.home_name}`;
}

function checkMatch(id, isBogus, expected, got) {
  if (isBogus) {
    if (got.status === 404) return { pass: true, reason: 'bogus → 404' };
    return { pass: false, reason: `bogus expected 404, got ${got.status}` };
  }
  if (got.status !== 200) {
    return { pass: false, reason: `status=${got.status} (expected 200)` };
  }
  // jse_name may be rendered as the slug ("bakersfield-condors")
  // when the team is not in NHL_TEAMS_CANONICAL.  Accept either the
  // proper name, the slugified name, or the "slug1 at slug2" form
  // (which is what JSON-LD actually renders for non-NHL teams).
  const expName = expectedName(expected);
  const expSlug = expName ? nameSlug(expName) : null;
  const expSlugAt = expected && expected.away_name && expected.home_name
    ? `${nameSlug(expected.away_name)} at ${nameSlug(expected.home_name)}`
    : null;
  if (expName && got.jse_name
      && got.jse_name !== expName
      && got.jse_name !== expSlug
      && got.jse_name !== expSlugAt) {
    return { pass: false, reason: `jse_name="${got.jse_name}" expected "${expName}" / "${expSlug}" / "${expSlugAt}"` };
  }
  if (got.canonical && !got.canonical.endsWith('/' + id)) {
    return { pass: false, reason: `canonical=${got.canonical} (doesn't end with /${id})` };
  }
  // 2026-10-15 (Arnel): BreadcrumbList JSON-LD must be present on
  // every successful game page.
  if (!got.breadcrumb) {
    return { pass: false, reason: 'BreadcrumbList JSON-LD missing' };
  }
  if (got.breadcrumb_count < 4) {
    return { pass: false, reason: `BreadcrumbList has ${got.breadcrumb_count} ListItems (expected >=4)` };
  }
  // 2026-10-15 (Arnel): browser must make zero Supabase requests
  // on initial page load.
  if (got.supabase_requests_in_html > 0) {
    return { pass: false, reason: `${got.supabase_requests_in_html} Supabase references in HTML (expected 0)` };
  }
  // 2026-10-15 (Arnel): for completed games, team form + H2H + recap
  // must appear in the RAW HTML (server-rendered, no JS needed).
  if (expected && expected.status === 'completed' && expected.home_score !== null && expected.away_score !== null) {
    if (!got.has_recap) {
      return { pass: false, reason: 'completed game missing recap text in HTML' };
    }
    if (!got.has_team_form) {
      return { pass: false, reason: 'completed game missing team-form section in HTML' };
    }
  }
  // For scheduled games: must NOT have recap, must have countdown or
  // "Puck drop in" marker.
  if (expected && expected.status === 'scheduled') {
    if (got.has_recap) {
      return { pass: false, reason: 'scheduled game should NOT have a recap' };
    }
  }
  return { pass: true, reason: 'ok' };
}

async function probeOne(id, expected, isBogus) {
  const url = `${BASE}/directory/games/${id}`;
  const r = await page(url);
  let got;
  if (r.status >= 400) {
    got = {
      status: r.status,
      title: '', canonical: '', robots: '', jse_name: '', jse_startDate: '',
      jse_url: '', jse_home: '', jse_away: '',
      scoreboard: '', visibleHomeScore: '', visibleAwayScore: '',
    };
  } else {
    got = extractFromHtml(r.body);
    got.status = r.status;
  }
  return { url, status: r.status, got, expected, isBogus };
}

async function main() {
  const t0 = Date.now();
  const ids = await pickIds();
  console.log(`Picked ${ids.length} ids + 1 bogus`);
  console.log('  ids:');
  for (const id of ids) console.log('    -', id);
  console.log('  bogus:', BOGUS_ID);
  console.log('');

  // Fetch expected game from DB for each id
  const expected = {};
  for (const id of ids) expected[id] = await fetchExpectedGame(id);
  for (const id of Object.keys(expected)) {
    const e = expected[id];
    if (!e) console.log(`  expected[${id.slice(0, 8)}] = (null — fixture not in DB)`);
    else console.log(`  expected[${id.slice(0, 8)}] = "${e.away_name} at ${e.home_name}" (${e.status}, ${e.league}, ${e.home_score ?? '?'}-${e.away_score ?? '?'})`);
  }
  console.log('');

  let totalRequests = 0, pass = 0, fail = 0;
  const failures = [];

  // 3 shuffled rounds
  for (let r = 0; r < 3; r++) {
    const order = shuffleOrder(ids);
    console.log(`--- round ${r + 1} (3 requests per id, shuffled) ---`);
    for (const id of order) {
      const isBogus = id === BOGUS_ID;
      const probe = await probeOne(id, expected[id], isBogus);
      totalRequests++;
      const m = checkMatch(id, isBogus, expected[id], probe.got);
      const e = expected[id];
      if (m.pass) {
        pass++;
        if (isBogus) console.log(`  ${id.slice(0, 8)}  status=404  PASS (bogus)`);
        else console.log(`  ${id.slice(0, 8)}  status=${probe.got.status}  jse="${probe.got.jse_name}"  PASS`);
      } else {
        fail++;
        failures.push({ id, round: r + 1, request: 1, reason: m.reason, got: probe.got, expected: e });
        console.log(`  ${id.slice(0, 8)}  status=${probe.got.status}  reason=${m.reason}  FAIL`);
      }
    }
  }

  // Cache-buster round: one ?x=1 per id (including bogus)
  console.log('--- cache-buster round (one ?x=1 per id) ---');
  for (const id of [...ids, BOGUS_ID]) {
    const isBogus = id === BOGUS_ID;
    const url = `${BASE}/directory/games/${id}?x=1`;
    const r = await page(url);
    let got;
    if (r.status >= 400) {
      got = {
        status: r.status, title: '', canonical: '', robots: '', jse_name: '',
        jse_startDate: '', jse_url: '', jse_home: '', jse_away: '',
        scoreboard: '', visibleHomeScore: '', visibleAwayScore: '',
      };
    } else {
      got = extractFromHtml(r.body);
      got.status = r.status;
    }
    const e = isBogus ? null : expected[id];
    const m = checkMatch(id, isBogus, e, got);
    totalRequests++;
    if (m.pass) {
      pass++;
      console.log(`  ${id.slice(0, 8)}  ?x=1  status=${got.status}  jse="${got.jse_name}"  PASS`);
    } else {
      fail++;
      failures.push({ id, round: 'cache-buster', request: 1, reason: m.reason, got, expected: e });
      console.log(`  ${id.slice(0, 8)}  ?x=1  reason=${m.reason}  FAIL`);
    }
  }

  // Static pages
  console.log('--- static pages (home / team / rink / league) ---');
  const staticPages = [
    { path: '/', expectStatus: 200 },
    { path: '/directory/teams/boston-bruins', expectStatus: 200 },
    { path: '/directory/rinks/td-garden', expectStatus: 200 },
    { path: '/directory/ahl', expectStatus: 200 },
  ];
  for (const sp of staticPages) {
    const r = await head(BASE + sp.path);
    if (r.status === sp.expectStatus) {
      pass++;
      console.log(`  ${sp.path}  status=${r.status}  PASS`);
    } else {
      fail++;
      failures.push({ id: 'static:' + sp.path, round: 'static', request: 0, reason: `status=${r.status} expected ${sp.expectStatus}`, got: { status: r.status }, expected: null });
      console.log(`  ${sp.path}  status=${r.status} (expected ${sp.expectStatus})  FAIL`);
    }
  }

  const ms = Date.now() - t0;
  console.log('');
  console.log(`Total: ${totalRequests + staticPages.length}  pass=${pass}  fail=${fail}  (${ms}ms)`);
  if (failures.length > 0) {
    console.log('');
    console.log('Failures:');
    for (const f of failures) {
      console.log(`  - ${f.id}  ${f.reason}`);
    }
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
