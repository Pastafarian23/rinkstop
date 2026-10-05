/**
 * GET /api/internal/passport/qr/[passportId]
 *
 * Returns the QR-code SVG for a Passport. Always returns image/svg+xml.
 * NEVER returns HTML — if anything fails, returns a placeholder SVG so the
 * <img> tag never breaks.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FALLBACK_SVG = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><rect width="100%" height="100%" fill="#FFFFFF"/><text x="128" y="128" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="14" fill="#041E42">QR temporarily unavailable</text></svg>';

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ passportId: string }> }
): Promise<NextResponse> {
  // Always return the fallback first to prove the route works
  try {
    const params = await ctx.params;
    const passportId = params?.passportId;
    if (!passportId) {
      return new NextResponse(FALLBACK_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Lazy-load to handle potential module load failures
    const passportModule = await import('@/lib/passport').catch(() => null);
    if (!passportModule) {
      return new NextResponse(FALLBACK_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    const flagCheck = passportModule.isPassportAssetsApiEnabled?.();
    if (!flagCheck) {
      return new NextResponse(FALLBACK_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    const result = await passportModule.passportAssetsService.qrSvg(passportId).catch(() => null);
    const svg = result?.svg || FALLBACK_SVG;
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }
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