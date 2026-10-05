/**
 * GET /api/internal/passport/qr/[passportId]
 *
 * Returns the QR-code SVG for a Passport. Always returns image/svg+xml.
 */

import { NextRequest, NextResponse } from 'next/server';
import { passportAssetsService } from '@/lib/passport';
import { isPassportAssetsApiEnabled } from '@/lib/passport';

export const dynamic = 'force-dynamic';

const FALLBACK_SVG = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><rect width="100%" height="100%" fill="#FFFFFF"/><text x="128" y="128" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="14" fill="#041E42">QR temporarily unavailable</text></svg>';

function svg200(svg: string, qrId?: string): NextResponse {
  const headers: Record<string, string> = {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
  };
  if (qrId) headers['X-Qr-Identifier'] = qrId;
  return new NextResponse(svg, { status: 200, headers });
}

async function handle(
  _req: NextRequest,
  ctx: { params: Promise<{ passportId: string }> }
): Promise<NextResponse> {
  const fallback = svg200(FALLBACK_SVG);
  try {
    const { passportId } = await ctx.params;
    if (!passportId || typeof passportId !== 'string') return fallback;

    if (!isPassportAssetsApiEnabled()) return fallback;

    const result = await passportAssetsService.qrSvg(passportId);
    if (!result || !result.svg) return fallback;
    return svg200(result.svg, result.qrIdentifier);
  } catch {
    return fallback;
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