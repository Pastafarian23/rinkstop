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
import { isPassportInternalApiEnabled } from '@/lib/passport';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { passportId: string } }
) {
  if (!isPassportInternalApiEnabled()) {
    return NextResponse.json(
      { error: 'Passport functionality is disabled' },
      { status: 403 }
    );
  }

  const { passportId } = params;
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

// Exported as default GET also so the URL works for browser-side img tags
// (browser uses <img src=> which performs a GET). POST remains the canonical
// internal call; this is just a courtesy for direct image loading.
export async function GET(
  req: NextRequest,
  { params }: { params: { passportId: string } }
) {
  return POST(req, { params });
}
