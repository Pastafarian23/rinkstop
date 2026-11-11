// scripts/_audit-search-hrefs.mjs
// Pre-push Gate 17: every search suggestion must point at a page that
// actually renders that entity.
//
// WHY (2026-11-11):
//   The search suggest API returned coaches with
//     href: "/directory/players/<uuid>"
//   but coaches live in `nhl_players` / `team_members`, NOT the `players`
//   table. `/directory/players/<uuid>` looked up the `players` table, found
//   nothing, and rendered a page whose <title> was "Player Not Found" —
//   with HTTP 200. A soft 404.
//
//   Arnel saw it in the search dropdown and reported "random text". The
//   link went somewhere real (200), so no status-code check would ever
//   have caught it. Only rendering the page and reading its content does.
//
//   This gate therefore asserts on the RENDERED TITLE, not on the status
//   code. A suggestion whose page says "Not Found" is a failure.
//
// What it proves:
//   1. No staff type (coach / scout / official / staff) links to
//      /directory/players/ — they live on /directory/coaches/.
//   2. Every search suggestion href returns 200 AND its rendered <title>
//      does not contain "Not Found".
//   3. The id shape matches the route: staff ids must carry the `nhl-` or
//      `team-` prefix the detail route dispatches on.
//
// Usage: node scripts/_audit-search-hrefs.mjs
// Exit: 0 = PASS, 1 = FAIL

import './load-secrets.mjs';

const BASE = process.env.SITE_URL || 'https://rinkstop.com';

// Probes chosen to cover every branch of the search suggest API:
//   a community coach, an NHL coach, a player, a team, a rink.
const PROBE_QUERIES = ['Arnel', 'Krysanov', 'Darnell', 'Boston', 'Oilers'];

const results = [];
function check(label, ok, detail = '') {
  results.push({ label, ok, detail });
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${detail ? ` — ${detail}` : ''}`);
}

/** Fetch a URL and return { status, title }. */
async function probe(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const html = await res.text();
    const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return { status: res.status, title: (m ? m[1] : '').trim(), html };
  } catch (err) {
    return { status: 0, title: '', error: err.message };
  }
}

console.log('=== SEARCH HREF AUDIT ===\n');

// ── 1. Static check: the suggest API source must not route staff to players ──
console.log('1. Source check — staff types must not link to /directory/players/');
const { readFileSync } = await import('node:fs');
const src = readFileSync('src/app/api/search/suggest/route.ts', 'utf8');

// Every `.from('nhl_players')` / `.from('team_members')` block must build a
// /directory/coaches/ href. We assert on the blocks rather than the whole
// file, because the `players` branch legitimately links to /directory/players/.
const staffBlocks = src.split(/\.from\(/).filter(
  (b) => b.includes("'nhl_players'") || b.includes("'team_members'"),
);
check('staff data branches were found in the suggest API', staffBlocks.length >= 2,
  `${staffBlocks.length} branch(es)`);

let badStaffHref = 0;
for (const block of staffBlocks) {
  // Only the first 40 lines of a block belong to that branch.
  const slice = block.split('\n').slice(0, 40).join('\n');
  if (/href:\s*`\/directory\/players\//.test(slice)) badStaffHref++;
}
check('no staff branch links to /directory/players/', badStaffHref === 0,
  badStaffHref ? `${badStaffHref} branch(es) still link to the players route` : '');

// ── 2. Static check: staff ids must be prefixed ──
console.log('\n2. Source check — staff ids must carry the nhl-/team- prefix');
const unprefixed = staffBlocks.filter((block) => {
  const slice = block.split('\n').slice(0, 40).join('\n');
  return /id:\s*String\(r\.id\)/.test(slice);
});
check('no staff branch uses a bare (unprefixed) id', unprefixed.length === 0,
  unprefixed.length ? `${unprefixed.length} branch(es) use String(r.id)` : '');

// ── 3. Live check: every suggestion resolves to a real page ──
console.log('\n3. Live check — every suggestion resolves to a real page');
const seen = new Set();
let checked = 0;

for (const q of PROBE_QUERIES) {
  let payload;
  try {
    const res = await fetch(`${BASE}/api/search/suggest?q=${encodeURIComponent(q)}`);
    payload = await res.json();
  } catch (err) {
    check(`suggest API reachable for "${q}"`, false, err.message);
    continue;
  }
  for (const item of payload.results || []) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);

    // The staff→players misroute is the specific defect this gate exists
    // for. Assert it structurally first — it is cheap and unambiguous.
    const isStaffType = ['coach', 'scout', 'official', 'staff'].includes(item.type);
    if (isStaffType && item.href.startsWith('/directory/players/')) {
      check(`staff result "${item.name}" links off the players route`, false, item.href);
      continue;
    }
    if (isStaffType && !/^\/directory\/coaches\/(nhl-|team-)/.test(item.href)) {
      check(`staff result "${item.name}" uses a valid staff id form`, false, item.href);
      continue;
    }

    const { status, title } = await probe(`${BASE}${item.href}`);
    checked++;
    const soft404 = /not found/i.test(title);
    check(
      `${item.type} "${item.name}" → ${item.href}`,
      status === 200 && !soft404,
      soft404 ? `HTTP ${status} but title says "${title}"` : `HTTP ${status} · ${title.slice(0, 60)}`,
    );
  }
}

console.log(`\n  (${checked} unique suggestion URLs rendered)`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('\nFAILED:');
  for (const f of failed) console.log(`  ✗ ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
  process.exit(1);
}
console.log('PASS');
process.exit(0);
