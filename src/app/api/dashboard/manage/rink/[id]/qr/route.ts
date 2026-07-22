/**
 * GET /api/dashboard/manage/rink/[id]/qr
 *
 * WS3 PR5 — Operator-facing rink QR asset.
 *
 * Returns the SVG QR code for a rink's qr_identifier. Only the operator
 * with an approved claim on the rink can request it (otherwise anyone
 * with the rink ID could grab the QR). Service-role reads the QR
 * identifier from public.rinks and generates the SVG via the qrcode lib.
 *
 * The QR encodes the URL https://rinkstop.com/qr/[qr_identifier] which
 * resolves through /qr/[qrIdentifier]/route.ts to /stamp/[qrIdentifier]
 * (when STAMPS_ENABLED is on) or to the passport redirect (when off).
 * Either way, scanning the QR takes the visitor to the right place.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const QR_OPTS = {
  type: 'svg' as const,
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  color: { dark: '#041E42', light: '#FFFFFF' },
  width: 512,
};

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress ?? '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  if (!session?.userId || !userId) {
    return NextResponse.json({ error: 'Sign in.' }, { status: 401 });
  }

  const { id: rinkId } = await ctx.params;
  if (!rinkId) {
    return NextResponse.json({ error: 'rink id is required.' }, { status: 400 });
  }

  // Owner check — must have an approved claim on this rink.
  const { count: claimCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'rink')
    .eq('entity_id', rinkId)
    .eq('status', 'approved');

  if (!claimCount) {
    return NextResponse.json(
      { error: 'You do not have an approved claim for this rink.' },
      { status: 403 }
    );
  }

  const { data: rink, error } = await supabaseAdmin
    .from('rinks')
    .select('id, name, qr_identifier, qr_revoked_at')
    .eq('id', rinkId)
    .maybeSingle();

  if (error || !rink) {
    return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
  }
  if (!rink.qr_identifier) {
    return NextResponse.json(
      { error: 'Rink has no QR identifier yet.' },
      { status: 404 }
    );
  }

  const targetUrl = `https://rinkstop.com/qr/${rink.qr_identifier}`;
  const svg = await QRCode.toString(targetUrl, QR_OPTS);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // Operator-owned asset; cache privately per session but not across
      // operators. The QR is stable until rotated, so 5 min is fine.
      'Cache-Control': 'private, max-age=300',
    },
  });
}
