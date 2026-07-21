/**
 * POST /api/internal/passport/qr/[passportId]
 *
 * Returns the QR-code SVG for a Passport. Server-side rendering; never
 * client-generated.
 *
 * Per PR2 plan §1.6:
 *   - POST method (matches existing internal endpoints)
 *   - Service-role auth gate via isPassportInternalApiEnabled() (and
 *     PA_FLAGS_ASSETS_API for defense-in-depth, future flag)
 *   - Calls passportAssetsService.qrSvg(passportId)
 *   - Returns SVG with Content-Type: image/svg+xml,
 *     Cache-Control: public, max-age=86400
 *   - Errors: 403 if flag off, 404 if no Passport, 200 always otherwise
 *     (the assets service returns a placeholder SVG on internal error rather
 *     than throwing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { passportAssetsService } from '@/lib/passport';
import { isPassportAssetsApiEnabled } from '@/lib/passport';

export const dynamic = 'force-dynamic';

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ passportId: string }> }
): Promise<NextResponse> {
  if (!isPassportAssetsApiEnabled()) {
    return NextResponse.json(
      { error: 'Passport functionality is disabled' },
      { status: 403 }
    );
  }

  const { passportId } = await ctx.params;
  if (!passportId || typeof passportId !== 'string') {
    return NextResponse.json(
      { error: 'passportId is required' },
      { status: 400 }
    );
  }

  const { svg, qrIdentifier } = await passportAssetsService.qrSvg(passportId);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'X-Qr-Identifier': qrIdentifier,
    },
  });
}

// Both POST and GET serve the same SVG. The Card UI uses GET (browser <img>);
// the internal API service still calls POST.
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
