/**
 * POST /api/internal/passport/event
 *
 * Append an event to the Passport event log.
 * Service-role only. Flag-gated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { passportEventService, passportRepository, isPassportInternalApiEnabled } from '@/lib/passport';

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
    const { passportId, eventType, payload, internalUserId } = body;

    if (!passportId || typeof passportId !== 'string') {
      return NextResponse.json({ error: 'passportId is required' }, { status: 400 });
    }
    if (!eventType || typeof eventType !== 'string') {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }
    if (!internalUserId || typeof internalUserId !== 'string') {
      return NextResponse.json({ error: 'internalUserId is required' }, { status: 400 });
    }

    // Confirm Passport exists.
    const passport = await passportRepository.findByPassportId(passportId);
    if (!passport) {
      return NextResponse.json({ error: 'Passport not found' }, { status: 404 });
    }

    const event = await passportEventService.append({
      passportId,
      eventType,
      payload: payload ?? {},
      internalUserId,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}