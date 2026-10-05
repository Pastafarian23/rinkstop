/**
 * POST|GET /api/internal/passport/qr/[passportId]
 *
 * Returns the QR-code SVG for a Passport. Server-side rendering; never
 * client-generated.
 *
 * Per PR2 plan §1.6:
 *   - POST + GET methods
 *   - Service-role auth gate via isPassportAssetsApiEnabled()
 *   - Calls passportAssetsService.qrSvg(passportId)
 *   - Returns SVG with Content-Type: image/svg+xml,
 *     Cache-Control: public, max-age=86400
 *   - Errors: 403 if flag off, 500 on unexpected error (with JSON body)
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

  let passportId: string;
  try {
    const params = await ctx.params;
    passportId = params.passportId;
  } catch (e) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  if (!passportId || typeof passportId !== 'string') {
    return NextResponse.json({ error: 'passportId is required' }, { status: 400 });
  }

  let svg: string;
  let qrIdentifier: string;
  try {
    const result = await passportAssetsService.qrSvg(passportId);
    svg = result.svg;
    qrIdentifier = result.qrIdentifier;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/internal/passport/qr] error:', message);
    return NextResponse.json(
      { error: 'QR generation failed', detail: message },
      { status: 500 }
    );
  }

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'X-Qr-Identifier': qrIdentifier,
    },
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ passportId: string }> }
): Promise<NextResponse> {
  try {
    return await handle(req, ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/internal/passport/qr] unhandled POST error:', message);
    return NextResponse.json({ error: 'Internal error', detail: message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ passportId: string }> }
): Promise<NextResponse> {
  try {
    return await handle(req, ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/internal/passport/qr] unhandled GET error:', message);
    return NextResponse.json({ error: 'Internal error', detail: message }, { status: 500 });
  }
}
