// /api/bing/submit-urls
//
// WS27 PR8 — Bing Webmaster URL submission via the new JSON Content API
// (Microsoft retired POX/SOAP on 2026-08-31; the JSON /webmaster/api.svc/json
// endpoints are the only working path). Uses BING_API_KEY env var.
//
// What it does:
//   - POST a list of URLs to /webmaster/api.svc/json/SubmitUrlbatch
//   - Max 500 URLs per call (Microsoft limit), 10K/day total
//   - Returns per-URL status from Bing's response
//
// Manual/curl usage:
//
//   curl -X POST -H "x-deploy-secret: $ADMIN_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"urls":["https://rinkstop.com/","https://rinkstop.com/gear-brands/bauer"]}' \
//     https://rinkstop.com/api/bing/submit-urls
//
// Used by /api/indexnow as a fallback for non-IndexNow-capable URLs, and by
// the GitHub Action ping-search-engines.yml after every push.

import { NextRequest, NextResponse } from 'next/server';
import { trackEvent } from '@/lib/analytics';

const BING_API_KEY = process.env.BING_API_KEY;
const BING_SITE_URL = process.env.BING_SITE_URL || 'https://rinkstop.com';
const BING_API_BASE = 'https://www.bing.com/webmaster/api.svc/json';
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const MAX_BATCH_SIZE = 500;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface BingResponse {
  d: null | unknown;
}

async function submitBatch(urls: string[]): Promise<{ submitted: number; error?: string }> {
  if (!BING_API_KEY) {
    return { submitted: 0, error: 'BING_API_KEY env var is not set' };
  }
  try {
    const url = `${BING_API_BASE}/SubmitUrlbatch?apikey=${encodeURIComponent(BING_API_KEY)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteUrl: BING_SITE_URL, urlList: urls }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { submitted: 0, error: `Bing HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as BingResponse;
    // Bing returns {d: null} on success — anything else is an error
    if (data.d !== null) {
      return { submitted: 0, error: `Unexpected Bing response: ${JSON.stringify(data).slice(0, 200)}` };
    }
    return { submitted: urls.length };
  } catch (err) {
    return { submitted: 0, error: `Fetch failed: ${(err as Error).message}` };
  }
}

export async function POST(request: NextRequest) {
  // Auth
  const secret = request.headers.get('x-deploy-secret');
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let urls: string[];
  try {
    const body = await request.json();
    urls = Array.isArray(body.urls) ? body.urls : [];
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (urls.length === 0) {
    return NextResponse.json({ error: 'urls array is required and must be non-empty' }, { status: 400 });
  }

  // Dedup + filter
  const uniqueUrls = [...new Set(urls.filter((u) => typeof u === 'string' && u.startsWith('http')))];
  if (uniqueUrls.length === 0) {
    return NextResponse.json({ error: 'no valid http(s) URLs in urls array' }, { status: 400 });
  }

  // Split into batches of MAX_BATCH_SIZE
  const batches: string[][] = [];
  for (let i = 0; i < uniqueUrls.length; i += MAX_BATCH_SIZE) {
    batches.push(uniqueUrls.slice(i, i + MAX_BATCH_SIZE));
  }

  const results = [];
  let totalSubmitted = 0;
  for (const batch of batches) {
    const result = await submitBatch(batch);
    totalSubmitted += result.submitted;
    results.push({ batchSize: batch.length, ...result });
  }

  // WS29 — track Bing submission results server-side for analytics.
  // Best-effort; never throws.
  try {
    await trackEvent({
      name: 'bing_submission_completed',
      pathname: '/api/bing/submit-urls',
      props: {
        total_urls: uniqueUrls.length,
        total_submitted: totalSubmitted,
        batches_submitted: batches.length,
        batch_results: JSON.stringify(results),
        content_type: 'seo_automation',
      },
    });
  } catch {
    /* swallow — analytics is best-effort */
  }

  return NextResponse.json({
    ok: true,
    totalUrls: uniqueUrls.length,
    totalSubmitted,
    batchesSubmitted: batches.length,
    results,
  });
}

// GET: returns quota info
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-deploy-secret');
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!BING_API_KEY) {
    return NextResponse.json({ configured: false, error: 'BING_API_KEY not set' });
  }
  try {
    const url = `${BING_API_BASE}/GetUrlSubmissionQuota?apikey=${encodeURIComponent(BING_API_KEY)}&siteUrl=${encodeURIComponent(BING_SITE_URL)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      return NextResponse.json({ configured: true, error: `Bing HTTP ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ configured: true, site: BING_SITE_URL, quota: data });
  } catch (err) {
    return NextResponse.json({ configured: true, error: (err as Error).message }, { status: 500 });
  }
}
