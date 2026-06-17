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

// Load key from the file we serve at the root (it has the same content as
// the local /root/.openclaw/workspace/rinkstop-indexnow-key.txt).
const localKeyPath = '/root/.openclaw/workspace/rinkstop-indexnow-key.txt';
const KEY = fs.readFileSync(localKeyPath, 'utf8').trim();

// Discover the key filename (public/ + KEY + .txt). We uploaded it as
// public/{key}.txt in the previous commit.
const keyFileUrl = `${SITE}/${KEY}.txt`;

async function getSitemapUrls() {
  const r = await fetch(`${SITE}/sitemap.xml`);
  if (!r.ok) throw new Error(`sitemap.xml fetch failed: ${r.status}`);
  const xml = await r.text();
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    urls.push(m[1]);
  }
  return urls;
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
