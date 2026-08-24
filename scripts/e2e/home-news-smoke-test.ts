/**
 * Home page news section — smoke test
 *
 * Validates the locked design spec:
 *   https://github.com/Pastafarian23/rinkstop/blob/main/docs/home-page-news-section-design.md
 *
 * Run with:  npx tsx scripts/e2e/home-news-smoke-test.ts
 * Or from repo root: pnpm exec tsx scripts/e2e/home-news-smoke-test.ts
 *
 * Tests:
 *  1. GET /api/blog/posts?not_category=Highlights&limit=5 → 200, array, 5 items
 *  2. None of the returned posts have category "Highlights" (case-insensitive)
 *  3. HomeNewsSection.tsx uses not_category in fetch (not pagination loop)
 *  4. HomeNewsSection.tsx renders a loading skeleton
 *  5. api/blog/posts/route.ts uses ilike for not_category (case-insensitive)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
const REPO_ROOT = path.join(__dirname, '../..');

// ── helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, data: body };
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
}

// ── Test 1: API returns 200 + up to 5 items ────────────────────────────────

async function test1() {
  process.stdout.write('Test 1 — GET /api/blog/posts?not_category=Highlights&limit=5 ... ');
  const { status, data } = await apiFetch('/api/blog/posts?not_category=Highlights&limit=5');

  if (status !== 200) {
    console.error(`FAIL  expected 200, got ${status}`);
    return false;
  }
  if (!Array.isArray(data?.data)) {
    console.error('FAIL  expected { data: [...] }, got', data);
    return false;
  }
  if (data.data.length === 0) {
    console.error('FAIL  returned 0 items — section will be hidden');
    return false;
  }
  if (data.data.length < 5) {
    console.warn(`WARN  returned ${data.data.length} < 5 items`);
  }
  console.log(`PASS  (${data.data.length} items)`);
  return true;
}

// ── Test 2: No Highlights in response (case-insensitive) ──────────────────────

async function test2() {
  process.stdout.write('Test 2 — not_category=Highlights excludes all casings ... ');
  const { data } = await apiFetch('/api/blog/posts?not_category=Highlights&limit=20');

  const highlights = (data?.data ?? []).filter(
    (p: any) => (p.category || '').toLowerCase() === 'highlights'
  );

  if (highlights.length > 0) {
    console.error(`FAIL  ${highlights.length} 'highlights' posts slipped through:`);
    highlights.forEach((p: any) => console.error(`       - "${p.title}" [${p.category}]`));
    return false;
  }
  console.log('PASS');
  return true;
}

// ── Test 3: Component uses not_category, not pagination loop ───────────────────

async function test3() {
  process.stdout.write('Test 3 — HomeNewsSection uses not_category (not pagination loop) ... ');
  const src = readFile('src/app/components/HomeNewsSection.tsx');

  if (src.includes('not_category')) {
    console.log('PASS');
    return true;
  }

  if (src.includes('for (let page = 1') || src.includes('/api/blog/posts?page=')) {
    console.error('FAIL  HomeNewsSection still uses pagination loop — should be single not_category request');
    return false;
  }

  console.error('FAIL  HomeNewsSection does not contain "not_category"');
  return false;
}

// ── Test 4: Component renders loading skeleton ────────────────────────────────

async function test4() {
  process.stdout.write('Test 4 — HomeNewsSection renders skeleton while loading ... ');
  const src = readFile('src/app/components/HomeNewsSection.tsx');

  if (src.includes('skeleton') || src.includes('loading')) {
    console.log('PASS');
    return true;
  }
  console.error('FAIL  no skeleton/loading state found');
  return false;
}

// ── Test 5: API uses case-insensitive filter (ilike) ─────────────────────────

async function test5() {
  process.stdout.write('Test 5 — api/blog/posts/route.ts uses ilike for not_category ... ');
  const src = readFile('src/app/api/blog/posts/route.ts');

  if (src.includes("not('category', 'ilike'")) {
    console.log('PASS');
    return true;
  }
  if (src.includes('.neq') && !src.includes("'ilike'")) {
    console.error('FAIL  still using .neq() (case-sensitive) instead of .not(..., ilike)');
    return false;
  }
  console.error('FAIL  not_category filter not found or not using ilike');
  return false;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Home page news section — smoke test ===\n');

  const results = await Promise.all([test1(), test2(), test3(), test4(), test5()]);
  const passed = results.filter(Boolean).length;
  console.log(`\nResults: ${passed}/${results.length} passed\n`);

  if (passed < results.length) {
    console.error('Some tests failed. See above.');
    process.exit(1);
  }

  console.log('All tests passed. Design spec enforced.');
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
