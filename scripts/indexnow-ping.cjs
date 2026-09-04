#!/usr/bin/env node
// indexnow-ping.cjs — submit URLs to IndexNow for fast Bing/Yandex/ChatGPT Search indexing.
//
// Usage:
//   node scripts/indexnow-ping.cjs                       # ping all URLs from sitemaps
//   node scripts/indexnow-ping.cjs --url URL [URL ...]   # ping specific URLs
//   node scripts/indexnow-ping.cjs --sitemap URL         # ping all URLs from a specific sitemap
//   node scripts/indexnow-ping.cjs --dry-run             # show what would be sent, don't submit
//
// Env: INDEXNOW_KEY (defaults to reading the deployed key file)
//
// Notes:
//   - IndexNow key file MUST exist at https://<host>/<key>.txt before pings work.
//   - Bing validates the key asynchronously on first ping; 202 = accepted, 200 = ready.
//   - 100 URLs per batch is the safe max. >250 returns 403 per IndexNow spec edge cases.
//   - This script is safe to call from a Vercel deploy hook; failures are non-blocking.

const fs = require('fs');
const path = require('path');
const https = require('https');

const HOST = (process.env.SITE_URL || 'https://rinkstop.com').replace(/\/$/, '');
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const INDEXNOW_KEY_FILE = 'f7c9d2e8a4b1f6c3d8e9a7b5c2f1d4e6.txt';
const BATCH_SIZE = 100;
const REQUEST_TIMEOUT_MS = 10000;

function loadKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY;
  // The live key file above is the one that returns 200/202 from IndexNow.
  // Several legacy key files exist in public; do not select them by directory order.
  const publicDir = path.join(__dirname, '..', 'public');
  const keyPath = path.join(publicDir, INDEXNOW_KEY_FILE);
  if (fs.existsSync(keyPath)) return fs.readFileSync(keyPath, 'utf8').trim();
  throw new Error(`No IndexNow key found at ${keyPath}. Set INDEXNOW_KEY or restore the verified key file.`);
}

function parseArgs(argv) {
  const args = { urls: [], sitemap: null, dryRun: false, verbose: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') args.urls.push(argv[++i]);
    else if (a === '--sitemap') args.sitemap = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/indexnow-ping.cjs [--url URL ...] [--sitemap URL] [--dry-run]');
      process.exit(0);
    } else if (a.startsWith('http')) args.urls.push(a);
  }
  return args;
}

async function fetchSitemapUrls(sitemapUrl) {
  return new Promise((resolve, reject) => {
    const req = https.get(sitemapUrl, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
      // Follow redirects
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        return fetchSitemapUrls(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Sitemap ${sitemapUrl} returned ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
        resolve(urls);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`Timeout fetching ${sitemapUrl}`));
    });
  });
}

async function submitBatch(urls, key) {
  const body = JSON.stringify({
    host: new URL(HOST).host,
    key,
    keyLocation: `${HOST}/${key}.txt`,
    urlList: urls,
  });
  return new Promise((resolve, reject) => {
    const u = new URL(INDEXNOW_ENDPOINT);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        let respBody = '';
        res.on('data', (chunk) => (respBody += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: respBody });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('IndexNow API timeout')));
    req.write(body);
    req.end();
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const key = loadKey();

  // Collect URLs
  let urls = args.urls.slice();
  if (args.sitemap) {
    const sitemapUrls = await fetchSitemapUrls(args.sitemap);
    urls.push(...sitemapUrls);
  }
  if (urls.length === 0) {
    // Default: ping all current sub-sitemaps.
    const defaultSitemaps = [
      `${HOST}/sitemap-static.xml`,
      `${HOST}/sitemap-rinks.xml`,
      `${HOST}/sitemap-teams.xml`,
      `${HOST}/sitemap-players.xml`,
      `${HOST}/sitemap-leagues.xml`,
      `${HOST}/sitemap-locations.xml`,
      `${HOST}/sitemap-news.xml`,
      `${HOST}/sitemap-images.xml`,
    ];
    for (const sm of defaultSitemaps) {
      try {
        const u = await fetchSitemapUrls(sm);
        urls.push(...u);
      } catch (e) {
        console.error(`Failed to fetch ${sm}: ${e.message}`);
      }
    }
  }

  // Dedupe
  urls = [...new Set(urls)].filter((u) => u.startsWith(HOST));
  if (urls.length === 0) {
    console.error('No URLs to ping. Exiting.');
    process.exit(1);
  }

  console.log(`IndexNow key: ${key.slice(0, 8)}...`);
  console.log(`Host: ${HOST}`);
  console.log(`URLs to ping: ${urls.length}`);

  if (args.dryRun) {
    console.log('\n--- DRY RUN (first 10) ---');
    for (const u of urls.slice(0, 10)) console.log('  ' + u);
    if (urls.length > 10) console.log(`  ... and ${urls.length - 10} more`);
    return;
  }

  let totalAccepted = 0;
  let totalFailed = 0;
  const failedBatches = [];

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    try {
      const r = await submitBatch(batch, key);
      if (r.status === 200 || r.status === 202) {
        totalAccepted += batch.length;
        if (args.verbose) console.log(`  Batch ${i / BATCH_SIZE + 1} (${batch.length} URLs): HTTP ${r.status} ✓`);
      } else {
        totalFailed += batch.length;
        failedBatches.push({ start: i, status: r.status, body: r.body.slice(0, 200) });
        if (args.verbose) console.log(`  Batch ${i / BATCH_SIZE + 1} (${batch.length} URLs): HTTP ${r.status} ✗ ${r.body.slice(0, 100)}`);
      }
    } catch (e) {
      totalFailed += batch.length;
      failedBatches.push({ start: i, error: e.message });
      if (args.verbose) console.log(`  Batch ${i / BATCH_SIZE + 1}: ERROR ${e.message}`);
    }
    // Small delay to avoid rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nDone. Accepted: ${totalAccepted} URLs, Failed: ${totalFailed} URLs`);
  if (failedBatches.length > 0) {
    console.log('Failed batches:');
    for (const f of failedBatches.slice(0, 5)) {
      console.log(`  ${JSON.stringify(f)}`);
    }
  }

  // Exit code: 0 if all accepted, 1 if some failed
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(2);
});
