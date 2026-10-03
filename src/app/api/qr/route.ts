/**
 * GET /api/qr?url=<absolute-or-relative-url>
 *
 * 2026-10-03 (audit fix #8 supplement): generic URL-to-QR endpoint.
 *
 * The user (rink operators, profile owners, team pages) needs a way to
 * generate QR codes for "share this page" without each entity needing
 * its own qr_identifier column. This endpoint takes a URL and returns
 * the QR SVG. The URL is validated to be either:
 *
 *   - An absolute https://rinkstop.com/* path (no off-domain URLs)
 *   - A relative /path
 *
 * Off-domain URLs are rejected — prevents abuse as an open QR generator
 * for phishing URLs. Cache 24h per URL.
 *
 * Usage:
 *   <img src="/api/qr?url=/directory/rinks/rogers-arena" />
 *   <img src="/api/qr?url=https://rinkstop.com/profile/demo-player" />
 *
 * For entity-specific QR (rink check-in, passport verification) the
 * dedicated endpoints at /api/rinks/[slug]/qr and
 * /api/internal/passport/qr/[passportId] are preferred because they
 * encode the canonical qr_identifier rather than the URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

const MAX_URL_LENGTH = 2048;
const ALLOWED_HOST = 'rinkstop.com';

function isAllowedUrl(raw: string): boolean {
  if (!raw || raw.length > MAX_URL_LENGTH) return false;
  // Relative path
  if (raw.startsWith('/')) {
    // Block protocol-relative and obvious tricks
    if (raw.startsWith('//')) return false;
    return true;
  }
  // Absolute https URL on the allowed host
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    if (u.hostname !== ALLOWED_HOST && u.hostname !== `www.${ALLOWED_HOST}`) return false;
    return true;
  } catch {
    return false;
  }
}

function placeholderResponse(label: string): NextResponse {
  const safe = label.replace(/[<>&"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      default: return c;
    }
  });
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <text x="128" y="128" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, system-ui, sans-serif" font-size="14" fill="#041E42">QR unavailable: ${safe}</text>
</svg>`;
  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }
  if (!isAllowedUrl(url)) {
    return NextResponse.json(
      { error: 'url must be a rinkstop.com path or https://rinkstop.com/* URL' },
      { status: 400 }
    );
  }

  try {
    const svg = await QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#041E42', light: '#FFFFFF' },
      width: 256,
    });
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        // 1h cache. URLs may change (e.g. if a rink is renamed) so
        // shorter than the entity-specific endpoints.
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err) {
    console.error('[qr] encode error:', err);
    return placeholderResponse('UNAVAILABLE');
  }
}
