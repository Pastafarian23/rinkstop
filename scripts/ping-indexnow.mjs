#!/usr/bin/env node
/**
 * IndexNow pinger for RinkStop.
 *
 * Submits a list of URLs to api.indexnow.org which fans them out to
 * Bing, Microsoft Bing, Yandex, Naver, and Seznam. Indexing is usually
 * minutes vs. Google's days/weeks.
 *
 * Usage:
 *   node scripts/ping-indexnow.mjs                 # ping sitemap.xml
 *   node scripts/ping-indexnow.mjs <url> [<url>...] # ping specific URLs
 *   node scripts/ping-indexnow.mjs --sitemap       # explicit sitemap mode
 *
 * IndexNow quota: 10,000 URLs per day, batch up to 10,000 per call.
 * Reference: https://www.indexnow.org/documentation
 */

import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://rinkstop.com';
const HOST = 'rinkstop.com';
const INDEXNOW_KEY_FILE = 'f7c9d2e8a4b1f6c3d8e9a7b5c2f1d4e6.txt';

// Prefer INDEXNOW_KEY when explicitly supplied. Otherwise use the deployed
// key file that IndexNow accepts, rather than an old local-only key.
function loadKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY;
  const repoKeyPath = new URL(`../public/${INDEXNOW_KEY_FILE}`, import.meta.url);
  if (fs.existsSync(repoKeyPath)) return fs.readFileSync(repoKeyPath, 'utf8').trim();
  throw new Error(`No IndexNow key found. Set INDEXNOW_KEY or restore ${INDEXNOW_KEY_FILE} in public/.`);
}
const KEY = loadKey();

// Discover the key filename from the key value.
const keyFileUrl = `${SITE}/${KEY}.txt`;

async function getSitemapUrls() {
  const sitemaps = [
    `${SITE}/sitemap-static.xml`,
    `${SITE}/sitemap-rinks.xml`,
    `${SITE}/sitemap-teams.xml`,
    `${SITE}/sitemap-players.xml`,
    `${SITE}/sitemap-leagues.xml`,
    `${SITE}/sitemap-locations.xml`,
    `${SITE}/sitemap-news.xml`,
    `${SITE}/sitemap-images.xml`,
  ];
  const urls = [];
  for (const sitemap of sitemaps) {
    const r = await fetch(sitemap);
    if (!r.ok) throw new Error(`${sitemap} fetch failed: ${r.status}`);
    const xml = await r.text();
    const re = /<loc>([^<]+)<\/loc>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      urls.push(m[1]);
    }
  }
  return [...new Set(urls)];
}

async function ping(urls) {
  if (urls.length === 0) {
    console.log('No URLs to ping.');
    return;
  }
  if (urls.length > 10000) {
    console.log(`IndexNow limit is 10,000 URLs/call. Splitting ${urls.length} into chunks.`);
  }

  for (let i = 0; i < urls.length; i += 10000) {
    const chunk = urls.slice(i, i + 10000);
    const body = {
      host: HOST,
      key: KEY,
      keyLocation: keyFileUrl,
      urlList: chunk,
    };
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    const txt = await r.text();
    const status = r.status;
    let detail = '';
    try {
      const j = JSON.parse(txt);
      detail = j.message || j.status || '';
    } catch {
      detail = txt.slice(0, 200);
    }
    console.log(`  ${i + chunk.length}/${urls.length}: HTTP ${status} ${detail}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let urls = [];
  if (args.length === 0 || args.includes('--sitemap')) {
    console.log(`Fetching sitemap from ${SITE}/sitemap.xml...`);
    urls = await getSitemapUrls();
    console.log(`Found ${urls.length} URLs in sitemap.`);
  } else {
    urls = args;
    console.log(`Pinging ${urls.length} specified URLs.`);
  }

  // Verify the key file is reachable before we start
  const verify = await fetch(keyFileUrl);
  if (!verify.ok) {
    console.error(`❌ Key file ${keyFileUrl} is not reachable (HTTP ${verify.status})`);
    console.error('   Make sure the IndexNow key file has been deployed.');
    process.exit(1);
  }
  console.log(`✅ Key file verified at ${keyFileUrl}`);

  console.log(`Pinging IndexNow with ${urls.length} URLs...`);
  await ping(urls);
  console.log('Done.');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
