/**
 * src/app/api/profile/[slug]/route.ts
 *
 * The JSON surface for a unified person profile.
 *
 * WHY THIS EXISTS (2026-11-12, Arnel-approved):
 *   The unified profile is rendered by `/profile/[slug]`. That page reads
 *   the person through `resolveProfileSlug()` in `src/lib/unified-profile.ts`.
 *   A JSON API for the same entity would otherwise need its own copy of the
 *   resolution logic — and the rule that fixed the coach-page bug says two
 *   copies of the same query drift, and the copy that drifts is the one
 *   that breaks. So this route calls the SAME resolver.
 *
 * ACCOUNT PROTECTION (requirement 2):
 *   The account check inside `resolveProfileSlug()` runs BEFORE the alias
 *   lookup, so an account username always resolves to the account and never
 *   to a person alias. This route returns 409 for an account slug rather
 *   than inventing a person-shaped payload for an account.
 *
 * MERGED IDENTITIES (requirement 1):
 *   A merged-away person's path resolves to the SURVIVOR's profile. The
 *   response carries `canonicalPath` so a client can redirect; the page
 *   does a 301 to the same path.
 *
 * NO CONTACT DATA:
 *   The payload is the same public field set the page renders. No email,
 *   no phone, no contact fields.
 */

import { NextResponse } from 'next/server';
import { resolveProfileSlug, type UnifiedPerson } from '@/lib/unified-profile';

export const dynamic = 'force-dynamic';

/** The public JSON shape. Identical to what the page renders. */
function toPublicPayload(person: UnifiedPerson) {
  return {
    id: person.id,
    slug: person.slug,
    publicId: person.publicId,
    displayName: person.displayName,
    firstName: person.firstName,
    lastName: person.lastName,
    birthDate: person.birthDate,
    nationality: person.nationality,
    identityState: person.identityState,
    photoUrl: person.photoUrl,
    canonicalPath: person.canonicalPath,
    hasAccount: person.hasAccount,
    accountUsername: person.accountUsername,
    sources: person.sources.map((s) => ({
      source: s.source,
      sourceId: s.sourceId,
      slug: s.slug,
      name: s.name,
      href: s.href,
      mergedAt: s.mergedAt,
      facts: s.facts,
    })),
    roles: person.roles.map((r) => ({
      id: r.id,
      roleType: r.roleType,
      roleDetail: r.roleDetail,
      teamId: r.teamId,
      leagueId: r.leagueId,
      season: r.season,
      jerseyNumber: r.jerseyNumber,
      position: r.position,
      source: r.source,
      sourceId: r.sourceId,
      href: r.href,
      name: r.name,
      teamName: r.teamName,
      leagueName: r.leagueName,
    })),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const resolution = await resolveProfileSlug(slug);

  if (!resolution) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (resolution.kind === 'account') {
    // The account profile has its own page shape and its own privacy
    // rules. This API deliberately does not expose it — a person API that
    // leaked account rows would break requirement 2's protection.
    return NextResponse.json(
      { error: 'account_profile', canonicalPath: `/profile/${resolution.account.username}` },
      { status: 409 },
    );
  }

  return NextResponse.json(toPublicPayload(resolution.person), {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
  });
}
