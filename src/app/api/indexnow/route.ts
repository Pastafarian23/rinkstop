// /api/indexnow
//
// Called by the Vercel signed-webhook forwarder at
//   POST /api/vercel/indexnow
// which is invoked on every production `deployment.ready`.
//
// Auth: requires header `x-deploy-secret: <ADMIN_SECRET>` (env var).
// This route is intentionally not directly addressable from the public
// internet; only the in-project forwarder can include the secret header,
// because Vercel Deploy Hooks (Settings -> Git -> Deploy Hooks) cannot
// attach custom headers. Manual/curl usage:
//
//   curl -X POST -H "x-deploy-secret: $ADMIN_SECRET" \
//     https://rinkstop.com/api/indexnow
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
const INDEXNOW_KEY_FILE = 'f7c9d2e8a4b1f6c3d8e9a7b5c2f1d4e6.txt';
const BATCH_SIZE = 100;
const MAX_URLS_PER_DEPLOY = 10000; // IndexNow accepts up to 10,000 URLs per request

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
  // Use the key that is deployed and verified with IndexNow. There are
  // several legacy/draft key files in public; picking the first matching
  // file makes the API silently submit with an unregistered key.
  const publicDir = join(process.cwd(), 'public');
  const keyPath = join(publicDir, INDEXNOW_KEY_FILE);
  if (!existsSync(keyPath)) return null;
  return readFileSync(keyPath, 'utf8').trim();
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
      error: `No IndexNow key found. Set INDEXNOW_KEY or restore ${INDEXNOW_KEY_FILE} in public/.`,
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
    // Default: pull from all current sub-sitemaps.
    const defaultSitemaps = [
      '/sitemap-static.xml',
      '/sitemap-rinks.xml',
      '/sitemap-teams.xml',
      '/sitemap-players.xml',
      '/sitemap-leagues.xml',
      '/sitemap-locations.xml',
      '/sitemap-news.xml',
      '/sitemap-images.xml',
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
