/**
 * GET /api/rinks/[slug]/qr
 *
 * Returns the QR-code SVG for a Rink's check-in QR.
 *
 * 2026-10-03 (audit fix #8): mirrors the passport QR endpoint at
 * /api/internal/passport/qr/[passportId] but for rinks. Each rink has
 * a `rinks.qr_identifier` (UUID) already; this endpoint encodes that
 * UUID into a QR SVG. The /qr/[qrIdentifier] resolver at the public
 * route already handles the redirect (stamps flow first, then passport
 * lookup), so scanning this QR at the rink's front desk will resolve
 * to the appropriate stamp confirmation page when STAMPS_ENABLED is on.
 *
 * Authentication: public, no auth required. The QR is meant to be
 * scannable by anyone (rink staff, visitors, etc.).
 *
 * Caching: SVG, 24h. The underlying `qr_identifier` is rotated rarely
 * (only on security incidents via the stamp service), so a long TTL
 * is safe.
 */

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function handle(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await ctx.params;
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const sb = getAdmin();
  if (!sb) {
    return placeholderResponse('UNAVAILABLE');
  }

  // Look up by slug (preferred — public-facing) or by UUID as fallback
  // (in case a stale link uses the id).
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const { data: rink, error } = await sb
    .from('rinks')
    .select('id, name, slug, qr_identifier, qr_revoked_at, is_active')
    .eq(isUuid ? 'id' : 'slug', slug)
    .maybeSingle();

  if (error || !rink) {
    return placeholderResponse('NOT-FOUND');
  }

  // A revoked QR must not resolve. The /qr/[uuid] resolver handles the
  // 410 response; the image endpoint should mirror that by rendering a
  // "revoked" placeholder.
  if (rink.qr_revoked_at) {
    return placeholderResponse('REVOKED');
  }

  if (!rink.qr_identifier) {
    // The schema column is nullable; a small number of legacy rinks may
    // not have one yet. Render a placeholder rather than 404.
    return placeholderResponse('NO-QR');
  }

  try {
    const svg = await QRCode.toString(rink.qr_identifier, {
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
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'X-Qr-Identifier': rink.qr_identifier,
        'X-Rink-Id': rink.id,
      },
    });
  } catch (err) {
    console.error('[rink-qr] encode error:', err);
    return placeholderResponse('UNAVAILABLE');
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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  return handle(req, ctx);
}
