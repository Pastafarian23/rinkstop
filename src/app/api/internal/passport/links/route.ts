/**
 * POST /api/internal/passport/links
 *
 * Add a link between a Passport and an entity (player, coach, organization,
 * managed_profile). Idempotent: 200 if link already exists, 201 if new.
 * Service-role only. Flag-gated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { passportRepository, isPassportInternalApiEnabled } from '@/lib/passport';
import type { PassportEntityType } from '@/lib/passport';

export const dynamic = 'force-dynamic';

const VALID_ENTITY_TYPES: PassportEntityType[] = [
  'player',
  'coach',
  'organization',
  'managed_profile',
];

export async function POST(req: NextRequest) {
  if (!isPassportInternalApiEnabled()) {
    return NextResponse.json(
      { error: 'Passport functionality is disabled' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { passportId, entityType, entityId, internalUserId } = body;

    if (!passportId || typeof passportId !== 'string') {
      return NextResponse.json({ error: 'passportId is required' }, { status: 400 });
    }
    if (!entityType || !VALID_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json(
        { error: `entityType must be one of: ${VALID_ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
    }
    if (!internalUserId || typeof internalUserId !== 'string') {
      return NextResponse.json({ error: 'internalUserId is required' }, { status: 400 });
    }

    // Confirm Passport exists.
    const passport = await passportRepository.findByPassportId(passportId);
    if (!passport) {
      return NextResponse.json({ error: 'Passport not found' }, { status: 404 });
    }

    // Check for existing link.
    const existing = await passportRepository.getLinksForPassport(passportId);
    const duplicate = existing.find(
      (l) => l.entityType === entityType && l.entityId === entityId
    );
    if (duplicate) {
      return NextResponse.json({ link: duplicate, alreadyExisted: true }, { status: 200 });
    }

    const link = await passportRepository.addLink({
      passportId,
      entityType,
      entityId,
      linkedBy: internalUserId,
    });

    if (!link) {
      // Race condition: another request created it between our check and insert.
      return NextResponse.json(
        { error: 'Link creation failed (likely duplicate)' },
        { status: 409 }
      );
    }

    return NextResponse.json({ link, alreadyExisted: false }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}