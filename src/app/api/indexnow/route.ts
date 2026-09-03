// /api/indexnow
//
// Called by the Vercel deploy hook (POST) after every production deploy.
// Submits all known URLs to IndexNow so Bing/Yandex pick up changes in
// hours instead of waiting for the regular 1-2 week crawl cycle.
//
// Auth: requires header `x-deploy-secret: <ADMIN_SECRET>` (env var).
// The deploy hook on Vercel is configured to include this header.
//
// To add to Vercel deploy hook:
//   URL: https://rinkstop.com/api/indexnow
//   Method: POST
//   Headers: { "x-deploy-secret": "<ADMIN_SECRET value>" }
//
// Non-blocking: errors are returned in the response body but status is 200
// (so the deploy is not marked failed). Bing will catch up via sitemap on
// the regular crawl cycle if the ping fails.

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const BATCH_SIZE = 100;
const MAX_URLS_PER_DEPLOY = 1000; // Don't spam IndexNow on a full sitemap deploy

interface PingResult {
  totalUrls: number;
  batchesSubmitted: number;
  accepted: number;
  failed: number;
  durationMs: number;
  errors?: string[];
}

function getIndexNowKey(): string | null {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY;
  // Try to read the deployed key file from the public dir
  const publicDir = join(process.cwd(), 'public');
  if (!existsSync(publicDir)) return null;
  const files = require('fs').readdirSync(publicDir);
  const keyFile = files.find((f: string) => /^[0-9a-f]{32}\.txt$/.test(f));
  if (!keyFile) return null;
  return readFileSync(join(publicDir, keyFile), 'utf8').trim();
}

async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
  const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Sitemap ${sitemapUrl} returned ${res.status}`);
  const body = await res.text();
  return [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function submitBatch(urls: string[], key: string): Promise<{ status: number; body: string }> {
  const body = JSON.stringify({
    host: new URL(SITE).host,
    key,
    keyLocation: `${SITE}/${key}.txt`,
    urlList: urls,
  });
  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
    signal: AbortSignal.timeout(10000),
  });
  return { status: res.status, body: (await res.text()).slice(0, 300) };
}

export async function POST(request: Request) {
  const start = Date.now();
  const secret = request.headers.get('x-deploy-secret');
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const key = getIndexNowKey();
  if (!key) {
    return NextResponse.json({
      ok: false,
      error: 'No IndexNow key found. Set INDEXNOW_KEY env or add <32-hex>.txt to public/.',
    }, { status: 200 });
  }

  // Optional: caller can pass { "urls": [...] } to ping a specific set,
  // or { "sitemap": "..." } to ping a specific sitemap,
  // or omit to use the default set of sub-sitemaps.
  let payload: { urls?: string[]; sitemap?: string } = {};
  try {
    payload = await request.json();
  } catch {
    // Empty body is fine
  }

  let urls: string[] = payload.urls || [];
  if (payload.sitemap) {
    try {
      urls.push(...(await fetchSitemapUrls(payload.sitemap)));
    } catch (e) {
      return NextResponse.json({
        ok: false,
        error: `Sitemap fetch failed: ${(e as Error).message}`,
      }, { status: 200 });
    }
  }

  if (urls.length === 0) {
    // Default: pull from all 7 sub-sitemaps
    const defaultSitemaps = [
      '/sitemap-static.xml',
      '/sitemap-rinks.xml',
      '/sitemap-teams.xml',
      '/sitemap-leagues.xml',
      '/sitemap-locations.xml',
      '/sitemap-news.xml',
      '/sitemap-players.xml',
    ];
    for (const sm of defaultSitemaps) {
      try {
        urls.push(...(await fetchSitemapUrls(`${SITE}${sm}`)));
      } catch {
        // Skip individual sitemap failures
      }
    }
  }

  // Dedupe + cap
  urls = [...new Set(urls.filter((u) => u.startsWith(SITE)))].slice(0, MAX_URLS_PER_DEPLOY);

  if (urls.length === 0) {
    return NextResponse.json({ ok: false, error: 'No URLs to ping' }, { status: 200 });
  }

  const result: PingResult = {
    totalUrls: urls.length,
    batchesSubmitted: 0,
    accepted: 0,
    failed: 0,
    durationMs: 0,
    errors: [],
  };

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    result.batchesSubmitted += 1;
    try {
      const r = await submitBatch(batch, key);
      if (r.status === 200 || r.status === 202) {
        result.accepted += batch.length;
      } else {
        result.failed += batch.length;
        result.errors!.push(`Batch ${i / BATCH_SIZE + 1}: HTTP ${r.status} ${r.body}`);
      }
    } catch (e) {
      result.failed += batch.length;
      result.errors!.push(`Batch ${i / BATCH_SIZE + 1}: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  result.durationMs = Date.now() - start;
  return NextResponse.json({ ok: result.failed === 0, ...result }, { status: 200 });
}

// GET returns the endpoint status (for testing without a real deploy)
export async function GET() {
  const key = getIndexNowKey();
  return NextResponse.json({
    configured: !!key,
    key: key ? `${key.slice(0, 8)}...` : null,
    site: SITE,
    endpoint: INDEXNOW_ENDPOINT,
    howToUse: {
      curl: `curl -X POST -H "x-deploy-secret: $ADMIN_SECRET" ${SITE}/api/indexnow`,
      vercelHook: {
        url: `${SITE}/api/indexnow`,
        method: 'POST',
        headers: { 'x-deploy-secret': '<ADMIN_SECRET value>' },
        triggers: ['deploy-success'],
      },
    },
  });
}
