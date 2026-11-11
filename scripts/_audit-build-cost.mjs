// scripts/_audit-build-cost.mjs
// Report Vercel build cost for the project, and fail if the day is runaway.
//
// WHY (2026-11-11):
//   Arnel: "Build time was way too expensive on previous vercel invoice,
//   we need to put safeguards in place to get that under control and not
//   waste so many builds."
//
//   MEASURED BASELINE (2026-11-11, last 30 deployments):
//     median build duration : ~148s
//     min / max             : 117s / 187s
//     total                 : 73 build-minutes over 30 deploys
//     one deployment per    : commit (no double-build — verified)
//     static pages prerendered per build : 461
//
//   The dominant cost driver is PUSH FREQUENCY × BUILD TIME, not any
//   single fat build. Each build prerenders 461 static pages; that work
//   repeats in full on every push even when the change touched one file.
//
//   So the safeguard is not "make the build faster" — it is "stop
//   triggering full rebuilds for work that does not need them".
//
// What it reports:
//   - builds in the last 24h / 7d / 30d
//   - total and median build minutes
//   - the commits that caused them (so waste is attributable)
//   - deploy-per-commit ratio (catches double-builds)
//
// What it FAILS on (pre-push Gate 22):
//   - more than N builds in a rolling 24h window  → batch your pushes
//   - more than 1 deployment per commit SHA       → double-build
//
// Usage: node scripts/_audit-build-cost.mjs [--max-daily 6] [--max-per-commit 1]
// Exit: 0 = PASS, 1 = FAIL

import fs from 'node:fs';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;

if (!VERCEL_TOKEN || !PROJECT_ID) {
  // Not fatal — the guard should skip rather than block a push when the
  // token is absent (e.g. a local dev machine without Vercel access).
  console.log('SKIP: VERCEL_TOKEN / VERCEL_PROJECT_ID not set — build-cost gate not run.');
  process.exit(0);
}

const argOf = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : dflt;
};
const MAX_DAILY = argOf('--max-daily', 6);
const MAX_PER_COMMIT = argOf('--max-per-commit', 1);
const LOOKBACK = 40;

const api = async (path) => {
  const res = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
};

console.log('=== VERCEL BUILD COST ===\n');

let deployments = [];
try {
  const data = await api(`/v6/deployments?projectId=${PROJECT_ID}&limit=${LOOKBACK}`);
  deployments = data.deployments || [];
} catch (err) {
  console.log(`SKIP: could not read deployments (${err.message})`);
  process.exit(0);
}

// Only real builds count. A rollback or a re-deploy of an existing build
// does not burn build minutes.
const builds = [];
for (const dep of deployments) {
  const b = dep.buildingAt;
  const r = dep.ready;
  if (!b || !r) continue;
  const meta = dep.meta || {};
  builds.push({
    at: b,
    seconds: (r - b) / 1000,
    sha: (meta.githubCommitSha || '?').slice(0, 8),
    message: (meta.githubCommitMessage || '').split('\n')[0].slice(0, 60),
    uid: dep.uid,
  });
}
builds.sort((a, b) => a.at - b.at);

if (builds.length === 0) {
  console.log('SKIP: no builds with timing data in the lookback window.');
  process.exit(0);
}

const now = Date.now();
const win = (ms) => builds.filter((b) => now - b.at <= ms);
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const d24 = win(DAY);
const d7 = win(7 * DAY);
const d30 = win(30 * DAY);

const mins = (list) => list.reduce((s, b) => s + b.seconds, 0) / 60;
const median = (list) => {
  if (!list.length) return 0;
  const s = list.map((b) => b.seconds).sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

console.log(`lookback: ${builds.length} builds\n`);
console.log(`  last 24h : ${String(d24.length).padStart(3)} builds  ${mins(d24).toFixed(1).padStart(6)} min   median ${median(d24).toFixed(0)}s`);
console.log(`  last  7d : ${String(d7.length).padStart(3)} builds  ${mins(d7).toFixed(1).padStart(6)} min   median ${median(d7).toFixed(0)}s`);
console.log(`  last 30d : ${String(d30.length).padStart(3)} builds  ${mins(d30).toFixed(1).padStart(6)} min   median ${median(d30).toFixed(0)}s`);
console.log(`  median build duration: ${median(builds).toFixed(0)}s`);

// ── Double-build detection ────────────────────────────────────────────────
const bySha = new Map();
for (const b of builds) bySha.set(b.sha, (bySha.get(b.sha) || 0) + 1);
const dupes = [...bySha.entries()].filter(([, n]) => n > 1);
console.log(`\n  unique commits: ${bySha.size}  |  commits built more than once: ${dupes.length}`);
for (const [sha, n] of dupes) console.log(`    ${sha}  x${n}`);

// ── Per-day view ──────────────────────────────────────────────────────────
const byDay = new Map();
for (const b of builds) {
  const k = new Date(b.at).toISOString().slice(0, 10);
  byDay.set(k, (byDay.get(k) || 0) + 1);
}
console.log('\n  builds per day:');
for (const [day, n] of [...byDay.entries()].sort().reverse().slice(0, 8)) {
  const bar = '█'.repeat(Math.min(n, 30));
  console.log(`    ${day}  ${String(n).padStart(2)}  ${bar}`);
}

// ── Most recent builds, for attribution ───────────────────────────────────
console.log('\n  most recent builds:');
for (const b of builds.slice(-8).reverse()) {
  const ts = new Date(b.at).toISOString().replace('T', ' ').slice(0, 16);
  console.log(`    ${ts}  ${b.seconds.toFixed(0).padStart(4)}s  ${b.sha}  ${b.message}`);
}

// ── GATES ─────────────────────────────────────────────────────────────────
const results = [];
function check(label, ok, detail = '') {
  results.push({ label, ok, detail });
  console.log(`\n${ok ? '  ✓' : '  ✗'} ${label}${detail ? ` — ${detail}` : ''}`);
}

console.log('\n=== GATES ===');
check(
  `builds in the last 24h ≤ ${MAX_DAILY}`,
  d24.length <= MAX_DAILY,
  `${d24.length} builds, ${mins(d24).toFixed(1)} min`,
);
check(
  `no commit built more than ${MAX_PER_COMMIT} time(s)`,
  dupes.length === 0,
  dupes.length ? `${dupes.length} commit(s) built twice` : '',
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('\nFAILED:');
  for (const f of failed) console.log(`  ✗ ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
  console.log(
    '\n  Before pushing again, ask: does this change need its OWN production deploy,\n' +
    '  or can it ride along with the next one? Every push = a full ~150s build\n' +
    '  that re-prerenders 461 static pages.',
  );
  process.exit(1);
}
console.log('PASS');
process.exit(0);
