/**
 * POST /api/internal/passport/lookup
 *
 * Look up a Passport by Internal Identity Identifier.
 * Service-role only. Flag-gated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { passportLookupService } from '@/lib/passport';
import { isPassportInternalApiEnabled } from '@/lib/passport';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isPassportInternalApiEnabled()) {
    return NextResponse.json(
      { error: 'Passport functionality is disabled' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { internalUserId } = body;

    if (!internalUserId || typeof internalUserId !== 'string') {
      return NextResponse.json(
        { error: 'internalUserId is required' },
        { status: 400 }
      );
    }

    const passport = await passportLookupService.findByInternalUserId(internalUserId);

    if (!passport) {
      return NextResponse.json({ passport: null }, { status: 200 });
    }

    return NextResponse.json({ passport }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}