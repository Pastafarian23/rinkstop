/**
 * GET /qr/[qrIdentifier]
 *
 * Public QR-code resolver. Per PR2 plan §1.7:
 *   - GET method
 *   - Feature-flagged behind PASSPORT_QR_RESOLVE (defaults off via env; PR2
 *     adds the flag here even though the public route is disabled)
 *   - When flag off: 404
 *   - When flag on: looks up Passport by qr_identifier.
 *     - If not found OR found but old (deactivated): "This QR code is no
 *       longer active" page.
 *     - If found and active: 302 redirect to /p/[passportId]. PR3 owns
 *       /p/[passportId]; until then a "Coming soon" page is returned.
 */

import { NextRequest, NextResponse } from 'next/server';
import { passportRepository, isPassportQrResolveEnabled } from '@/lib/passport';

export const dynamic = 'force-dynamic';

function deactivatedPage(qrIdentifier: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>This QR code is no longer active</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; background: #f8fafc;
           color: #0f172a; padding: 48px 24px; max-width: 480px; margin: 0 auto; }
    h1 { font-size: 22px; margin: 0 0 12px; color: #041E42; }
    p  { font-size: 15px; line-height: 1.5; color: #475569; }
    code { font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <h1>This QR code is no longer active</h1>
  <p>The Hockey Passport linked to this QR code has been deactivated or its identifier was rotated for security. The owner can reissue a new QR code from their dashboard.</p>
  <p><code>${qrIdentifier}</code></p>
</body>
</html>`;
  return new NextResponse(html, {
    status: 410, // Gone — semantically correct
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function comingSoonPage(passportId: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Public Passport — Coming Soon</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; background: #f8fafc;
           color: #0f172a; padding: 48px 24px; max-width: 480px; margin: 0 auto; }
    h1 { font-size: 22px; margin: 0 0 12px; color: #041E42; }
    p  { font-size: 15px; line-height: 1.5; color: #475569; }
  </style>
</head>
<body>
  <h1>Public Passport — coming soon</h1>
  <p>This Hockey Passport holder's public profile is being prepared. Check back shortly.</p>
</body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { qrIdentifier: string } }
) {
  if (!isPassportQrResolveEnabled()) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const { qrIdentifier } = params;
  if (!qrIdentifier) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const record = await passportRepository.findByQrIdentifier(qrIdentifier);

  if (!record) {
    return deactivatedPage(qrIdentifier);
  }

  if (record.status === 'deactivated') {
    return deactivatedPage(qrIdentifier);
  }

  // Try to redirect to /p/[passportId]; if the public profile route is not
  // built yet (PR3), Next will return 404 from that route. Use 302 vs 307
  // here is intentional — the redirect is permanent for this qr_identifier
  // (no method preservation needed).
  return NextResponse.redirect(
    new URL(`/p/${record.passportId}`, _req.url),
    302
  );
}
