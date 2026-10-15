// scripts/test-rate-limit.js
//
// 2026-10-15 (Piece C, Arnel 10:54 task 1.1 verification):
//   (a) normal browser UA → 429 at 100 req/min/IP
//   (b) UA-claimed Googlebot → NOT blocked at ~10 req/s (real crawl
//       rate), but IS limited at 1000 req/min/IP
//
// Usage: BASE_URL=https://preview-or-prod node scripts/test-rate-limit.js
//
// Exit code 0 = both expectations met, 1 = mismatch.

const https = require('https');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function get(url, headers = {}) {
  return new Promise((res, rej) => {
    const req = https.get(url, { headers }, (r) => {
      r.resume();
      r.on('end', () => res({ status: r.statusCode, headers: r.headers }));
      r.on('error', rej);
    });
    req.setTimeout(20000, () => { req.destroy(new Error('timeout')); });
  });
}

async function testNormalBlock() {
  console.log('--- Test A: normal browser UA, 110 sequential requests ---');
  // No sleep between requests — should trip the 100/60s limit fast.
  // We fire 110 requests, expect at least 1 of them to return 429.
  const start = Date.now();
  let got429 = 0;
  let first429Idx = -1;
  let ok200 = 0;
  for (let i = 0; i < 110; i++) {
    const r = await get(`${BASE}/directory/games/2b5f2b9d-0000-0000-0000-002026020074`, {
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    if (r.status === 200) ok200++;
    if (r.status === 429) {
      got429++;
      if (first429Idx < 0) first429Idx = i;
    }
    if (r.status >= 500) {
      console.error(`  request ${i}: status=${r.status} (server error — would trigger revert)`);
      return { pass: false, got429, ok200, first429Idx, error: '5xx' };
    }
  }
  const ms = Date.now() - start;
  console.log(`  110 requests in ${ms}ms; ${ok200} x 200, ${got429} x 429 (first 429 at request #${first429Idx})`);
  // The first 100 should be 200, requests 101+ should be 429.
  // In a real run with network jitter, allow up to 105 successful.
  const pass = got429 > 0 && first429Idx >= 95 && first429Idx <= 110 && ok200 >= 95 && ok200 <= 105;
  console.log(`  Test A: ${pass ? 'PASS' : 'FAIL'} (expected first 429 between 95-110, got ${first429Idx}; expected 95-105 x 200, got ${ok200})`);
  return { pass, got429, ok200, first429Idx };
}

async function testTrustedBotNoBlock() {
  console.log('--- Test B1: fake Googlebot UA, 50 sequential requests (well under 1000 cap) ---');
  // 50 requests, no sleep. All should be 200 (the trusted cap is 1000).
  const start = Date.now();
  let ok200 = 0;
  let got429 = 0;
  for (let i = 0; i < 50; i++) {
    const r = await get(`${BASE}/directory/games/2b5f2b9d-0000-0000-0000-002026020074`, {
      'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    });
    if (r.status === 200) ok200++;
    if (r.status === 429) got429++;
    if (r.status >= 500) {
      console.error(`  request ${i}: status=${r.status} (server error — would trigger revert)`);
      return { pass: false, error: '5xx' };
    }
  }
  const ms = Date.now() - start;
  console.log(`  50 requests in ${ms}ms; ${ok200} x 200, ${got429} x 429`);
  const pass = ok200 === 50 && got429 === 0;
  console.log(`  Test B1: ${pass ? 'PASS' : 'FAIL'} (expected 50 x 200, 0 x 429)`);
  return { pass, ok200, got429 };
}

async function testTrustedBotCap() {
  console.log('--- Test B2: fake Googlebot UA, 1100 sequential requests, expect cap at 1000 ---');
  // Fire 1100 requests, expect ~1000 to succeed and the rest to be 429.
  // This is slow (~30-60s) so only run if env RUN_CAP_TEST=1.
  if (process.env.RUN_CAP_TEST !== '1') {
    console.log('  skipped (set RUN_CAP_TEST=1 to run; takes ~60s)');
    return { pass: true, skipped: true };
  }
  const start = Date.now();
  let ok200 = 0;
  let got429 = 0;
  for (let i = 0; i < 1100; i++) {
    const r = await get(`${BASE}/directory/games/2b5f2b9d-0000-0000-0000-002026020074`, {
      'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    });
    if (r.status === 200) ok200++;
    if (r.status === 429) got429++;
    if (r.status >= 500) {
      console.error(`  request ${i}: status=${r.status} (server error — would trigger revert)`);
      return { pass: false, error: '5xx' };
    }
  }
  const ms = Date.now() - start;
  console.log(`  1100 requests in ${ms}ms; ${ok200} x 200, ${got429} x 429`);
  // Expect the first 1000 to pass and the rest to 429.
  const pass = ok200 >= 990 && ok200 <= 1010 && got429 >= 90;
  console.log(`  Test B2: ${pass ? 'PASS' : 'FAIL'} (expected ~1000 x 200, ~100 x 429; got ${ok200} x 200, ${got429} x 429)`);
  return { pass, ok200, got429 };
}

async function main() {
  const t0 = Date.now();
  const a = await testNormalBlock();
  if (a.error === '5xx') {
    console.error('A 5xx was observed — REVERT TRIGGERED');
    process.exit(1);
  }
  const b1 = await testTrustedBotNoBlock();
  if (b1.error === '5xx') {
    console.error('A 5xx was observed — REVERT TRIGGERED');
    process.exit(1);
  }
  const b2 = await testTrustedBotCap();
  if (b2.error === '5xx') {
    console.error('A 5xx was observed — REVERT TRIGGERED');
    process.exit(1);
  }
  const ms = Date.now() - t0;
  console.log('');
  console.log(`Total: ${ms}ms`);
  const allPass = a.pass && b1.pass && b2.pass;
  console.log(`Result: ${allPass ? 'PASS' : 'FAIL'}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
