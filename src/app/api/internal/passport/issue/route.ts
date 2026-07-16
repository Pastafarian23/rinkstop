/**
 * POST /api/internal/passport/issue
 *
 * Issue a Passport for a user. Idempotent: returns existing if already issued.
 * Service-role only. Flag-gated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { passportService, PassportDisabledError } from '@/lib/passport';
import { isPassportInternalApiEnabled } from '@/lib/passport';

export const dynamic = 'force-dynamic';

const VALID_SOURCES = ['migration', 'signup', 'admin', 'system'] as const;

export async function POST(req: NextRequest) {
  if (!isPassportInternalApiEnabled()) {
    return NextResponse.json(
      { error: 'Passport functionality is disabled' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { internalUserId, source } = body;

    if (!internalUserId || typeof internalUserId !== 'string') {
      return NextResponse.json(
        { error: 'internalUserId is required' },
        { status: 400 }
      );
    }
    if (!source || !VALID_SOURCES.includes(source)) {
      return NextResponse.json(
        { error: `source must be one of: ${VALID_SOURCES.join(', ')}` },
        { status: 400 }
      );
    }

    const existing = await passportService.hasPassport(internalUserId);
    if (existing) {
      const found = await passportService.ensurePassport(internalUserId, source);
      return NextResponse.json(
        { passport: found, alreadyExisted: true },
        { status: 200 }
      );
    }

    const passport = await passportService.ensurePassport(internalUserId, source);
    return NextResponse.json(
      { passport, alreadyExisted: false },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof PassportDisabledError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}