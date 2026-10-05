/**
 * POST|GET /api/internal/passport/qr/[passportId]
 *
 * Returns the QR-code SVG for a Passport. Server-side rendering; never
 * client-generated.
 *
 * Robustness:
 *   - Lazy-loads passport modules inside the handler so a module-evaluation
 *     error (circular import / supabase not configured) returns a placeholder
 *     SVG instead of Next.js' default HTML 500 page (which breaks the <img>
 *     tag and shows a broken-image icon).
 *   - All error paths return image/svg+xml; the Passport Card UI never sees
 *     a non-SVG response.
 *
 * Per PR2 plan §1.6:
 *   - POST + GET methods
 *   - Service-role auth gate via isPassportAssetsApiEnabled()
 *   - Calls passportAssetsService.qrSvg(passportId)
 *   - Returns SVG with Content-Type: image/svg+xml,
 *     Cache-Control: public, max-age=86400
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FALLBACK_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <text x="128" y="128" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, system-ui, sans-serif" font-size="14" fill="#041E42">QR temporarily unavailable</text>
</svg>`;

function svgResponse(svg: string, qrIdentifier: string | null, status: 200 | 500 = 200): NextResponse {
  return new NextResponse(svg, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=86400, s-maxage=86400' : 'no-store',
      ...(qrIdentifier ? { 'X-Qr-Identifier': qrIdentifier } : {}),
    },
  });
}

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ passportId: string }> }
): Promise<NextResponse> {
  let passportId: string | undefined;
  try {
    const params = await ctx.params;
    passportId = params?.passportId;
  } catch {
    return svgResponse(FALLBACK_SVG, null, 500);
  }

  if (!passportId || typeof passportId !== 'string') {
    return svgResponse(FALLBACK_SVG, null, 500);
  }

  // Lazy imports: if the module-evaluation fails (e.g. circular dep, missing
  // env var, supabase not configured), we still return a placeholder SVG
  // instead of crashing the route with Next.js' HTML 500 page.
  let assetsService: typeof import('@/lib/passport').passportAssetsService | null = null;
  let flagCheck: typeof import('@/lib/passport').isPassportAssetsApiEnabled | null = null;
  try {
    const passportModule = await import('@/lib/passport');
    assetsService = passportModule.passportAssetsService;
    flagCheck = passportModule.isPassportAssetsApiEnabled;
  } catch (importErr) {
    console.error('[/api/internal/passport/qr] module load failed:', importErr);
    return svgResponse(FALLBACK_SVG, null, 500);
  }

  if (!assetsService || !flagCheck) {
    return svgResponse(FALLBACK_SVG, null, 500);
  }

  if (!flagCheck()) {
    return svgResponse(FALLBACK_SVG, null, 500);
  }

  let svg: string | null = null;
  let qrIdentifier: string | null = null;
  try {
    const result = await assetsService.qrSvg(passportId);
    svg = result.svg;
    qrIdentifier = result.qrIdentifier || null;
  } catch (err) {
    console.error('[/api/internal/passport/qr] error:', err);
    return svgResponse(FALLBACK_SVG, null, 500);
  }

  if (!svg) {
    return svgResponse(FALLBACK_SVG, null, 500);
  }

  return svgResponse(svg, qrIdentifier, 200);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ passportId: string }> }
): Promise<NextResponse> {
  return handle(req, ctx);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ passportId: string }> }
): Promise<NextResponse> {
  return handle(req, ctx);
}