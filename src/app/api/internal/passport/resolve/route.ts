/**
 * POST /api/internal/passport/resolve
 *
 * Resolve any identity reference to a unified view.
 *
 * Body: { kind: 'internal' | 'passport', internalUserId?: string, passportId?: string }
 *
 * Returns the unified Passport identity view.
 *
 * Service-role only. Flag-gated.
 *
 * This is the recommended entry point for all future Workstreams.
 */

import { NextRequest, NextResponse } from 'next/server';
import { identityResolver, isPassportInternalApiEnabled } from '@/lib/passport';

export const dynamic = 'force-dynamic';

interface ResolveBody {
  kind?: 'internal' | 'passport';
  internalUserId?: string;
  passportId?: string;
}

export async function POST(req: NextRequest) {
  if (!isPassportInternalApiEnabled()) {
    return NextResponse.json(
      { error: 'Passport functionality is disabled' },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json()) as ResolveBody;
    const { kind, internalUserId, passportId } = body;

    if (kind === 'internal') {
      if (!internalUserId || typeof internalUserId !== 'string') {
        return NextResponse.json(
          { error: 'internalUserId is required for kind=internal' },
          { status: 400 }
        );
      }
      const result = await identityResolver.resolve({ kind: 'internal', internalUserId });
      if (!result) {
        return NextResponse.json({ identity: null }, { status: 200 });
      }
      return NextResponse.json({ identity: result }, { status: 200 });
    }

    if (kind === 'passport') {
      if (!passportId || typeof passportId !== 'string') {
        return NextResponse.json(
          { error: 'passportId is required for kind=passport' },
          { status: 400 }
        );
      }
      const result = await identityResolver.resolve({ kind: 'passport', passportId });
      if (!result) {
        return NextResponse.json({ identity: null }, { status: 200 });
      }
      return NextResponse.json({ identity: result }, { status: 200 });
    }

    return NextResponse.json(
      { error: "kind must be either 'internal' or 'passport'" },
      { status: 400 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}