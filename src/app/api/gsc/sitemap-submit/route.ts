// /api/gsc/sitemap-submit
//
// WS27 PR5a — re-register RinkStop sub-sitemaps with Google Search Console
// after each deploy. The earlier manual-only flow led to 6 sub-sitemaps
// (sitemap-ice-marketplace, sitemap-images, sitemap-events, sitemap-tools,
// sitemap-guides, sitemap-learn) never being registered with GSC, leaving
// ~3,200 URLs unindexed.
//
// Flow:
//   1. GitHub Action fires after push to main.
//   2. POSTs to /api/gsc/sitemap-submit with x-deploy-secret.
//   3. We sign a JWT with the GSC service account (webmasters scope) — using
//      Node's built-in crypto so we don't pull in a JWT library.
//   4. Exchange JWT for OAuth2 access token.
//   5. PUT each sitemap URL against the Search Console API.
//   6. Returns per-sitemap status.
//
// Manual/curl usage:
//
//   curl -X POST -H "x-deploy-secret: $ADMIN_SECRET" \
//     https://rinkstop.com/api/gsc/sitemap-submit
//
//   # Or, hit a single sitemap:
//   curl -X POST -H "x-deploy-secret: $ADMIN_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"sitemap": "https://rinkstop.com/sitemap-rinks.xml"}' \
//     https://rinkstop.com/api/gsc/sitemap-submit

import { NextResponse } from 'next/server';
import { createSign } from 'node:crypto';
import { baseUrl } from '@/lib/sitemap-shared';

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const GSC_SA_B64 = process.env.GSC_SERVICE_ACCOUNT_B64;
const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3/sites';

interface SitemapSubmitResult {
  sitemap: string;
  status: number;
  ok: boolean;
  error?: string;
}

interface SitemapSubmitResponse {
  ok: boolean;
  totalAttempted: number;
  submitted: number;
  failed: number;
  results: SitemapSubmitResult[];
  durationMs: number;
  errors?: string[];
}

function getSitemapList(): string[] {
  return [
    `${baseUrl}/sitemap-static.xml`,
    `${baseUrl}/sitemap-rinks.xml`,
    `${baseUrl}/sitemap-teams.xml`,
    `${baseUrl}/sitemap-players.xml`,
    `${baseUrl}/sitemap-leagues.xml`,
    `${baseUrl}/sitemap-locations.xml`,
    `${baseUrl}/sitemap-news.xml`,
    `${baseUrl}/sitemap-ice-marketplace.xml`,
    `${baseUrl}/sitemap-images.xml`,
    `${baseUrl}/sitemap-events.xml`,
    `${baseUrl}/sitemap-tools.xml`,
    `${baseUrl}/sitemap-guides.xml`,
    `${baseUrl}/sitemap-learn.xml`,
  ];
}

// Sign a JWT with RS256 using the service account's private key. Pure Node —
// no external library. JWT spec: header.payload.signature, each base64url-
// encoded and joined with dots.
function signJwtRS256(payload: object, privateKeyPem: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const enc = (o: object) =>
    Buffer.from(JSON.stringify(o))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer
    .sign(privateKeyPem)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${signingInput}.${signature}`;
}

function getServiceAccount(): { client_email: string; private_key: string } | null {
  if (!GSC_SA_B64) return null;
  try {
    const sa = JSON.parse(Buffer.from(GSC_SA_B64, 'base64').toString('utf-8'));
    if (!sa.client_email || !sa.private_key) return null;
    return { client_email: sa.client_email, private_key: sa.private_key };
  } catch {
    return null;
  }
}

async function exchangeForOAuthToken(jwtToken: string): Promise<string | null> {
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwtToken,
  });
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function submitOne(sitemapUrl: string, accessToken: string): Promise<SitemapSubmitResult> {
  const url = `${GSC_API_BASE}/sc-domain:rinkstop.com/sitemaps/${encodeURIComponent(sitemapUrl)}`;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    return {
      sitemap: sitemapUrl,
      status: res.status,
      ok: res.status === 200 || res.status === 204,
      error: res.ok ? undefined : (await res.text()).slice(0, 200),
    };
  } catch (e) {
    return {
      sitemap: sitemapUrl,
      status: 0,
      ok: false,
      error: (e as Error).message,
    };
  }
}

export async function POST(request: Request) {
  const start = Date.now();
  const secret = request.headers.get('x-deploy-secret');
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!GSC_SA_B64) {
    return NextResponse.json({
      ok: false,
      error: 'GSC_SERVICE_ACCOUNT_B64 env var is not set',
    }, { status: 200 });
  }

  // Optional: caller can pass { "sitemap": "https://..." } to submit a single
  // sitemap, or omit to submit all known sub-sitemaps.
  let payload: { sitemap?: string } = {};
  try {
    payload = await request.json();
  } catch {
    // Empty body is fine — defaults to all sitemaps.
  }

  const sitemaps = payload.sitemap ? [payload.sitemap] : getSitemapList();

  const sa = getServiceAccount();
  if (!sa) {
    return NextResponse.json({
      ok: false,
      error: 'Failed to parse GSC service account',
    }, { status: 200 });
  }

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const jwt = signJwtRS256(claims, sa.private_key);
  const accessToken = await exchangeForOAuthToken(jwt);
  if (!accessToken) {
    return NextResponse.json({
      ok: false,
      error: 'Failed to exchange JWT for OAuth2 access token',
    }, { status: 200 });
  }

  const results: SitemapSubmitResult[] = [];
  for (const sitemap of sitemaps) {
    const r = await submitOne(sitemap, accessToken);
    results.push(r);
    // Small delay to be polite to the API.
    await new Promise((res) => setTimeout(res, 150));
  }

  const submitted = results.filter((r) => r.ok).length;
  const failed = results.length - submitted;
  const response: SitemapSubmitResponse = {
    ok: failed === 0,
    totalAttempted: results.length,
    submitted,
    failed,
    results,
    durationMs: Date.now() - start,
    ...(failed > 0 ? { errors: results.filter((r) => !r.ok).map((r) => `${r.sitemap}: ${r.status} ${r.error}`) } : {}),
  };
  return NextResponse.json(response, { status: 200 });
}

// GET returns the endpoint status (for testing without a real deploy).
export async function GET() {
  const all = getSitemapList();
  return NextResponse.json({
    configured: !!ADMIN_SECRET && !!GSC_SA_B64,
    sitemapsInConfig: all.length,
    sitemaps: all,
    howToUse: {
      curlAll: `curl -X POST -H "x-deploy-secret: $ADMIN_SECRET" ${baseUrl}/api/gsc/sitemap-submit`,
      curlOne: `curl -X POST -H "x-deploy-secret: $ADMIN_SECRET" -H "Content-Type: application/json" -d '{"sitemap":"${baseUrl}/sitemap-rinks.xml"}' ${baseUrl}/api/gsc/sitemap-submit`,
    },
  });
}
