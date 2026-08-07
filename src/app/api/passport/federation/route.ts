// src/app/api/passport/federation/route.ts
// PATCH /api/passport/federation — owner edits their DRAFT federation registrations.
//
// Tier 2 workflow (2026-07-23). Federation numbers now write to
// federation_registrations as draft rows. The owner can edit freely until
// they call /submit, which locks the row and routes it to the admin queue.
//
// primary_position_category stays on public.players (it's a player metadata
// field, not a federation registration).
//
// WS13 PR3: also stamps certification_id on the draft row by joining
// federations.slug + certifications.category='player'. Used at approve
// time to issue the right user_credentials row.
//
// WS13 PR4a: the body shape is now a `certs: [{certification_id, registration_number}]`
// array instead of hardcoded usa_hockey_number + hockey_canada_number fields.
// The new dynamic form (FederationFormClient) drives the list. The cert_id
// is the source of truth; federation_id is derived from the cert's issuer
// at write time. Old body shape is no longer accepted.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

const VALID_POSITIONS = ['forward', 'defense', 'goalie'];

function normalizeNumber(raw: any): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (trimmed.length > 32) return null;
  if (/[\s\r\n\t]/.test(trimmed)) return null;
  return trimmed;
}

export async function PATCH(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`passport-fed:${ip}`, RATE_LIMIT);
  maybeCleanup();

  if (!result.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests. Please slow down.' }), { status: 429 });
    applyRateLimitHeaders(res, result);
    return res;
  }

  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { certs, primary_position_category } = body ?? {};

  if (primary_position_category != null && primary_position_category !== '') {
    if (!VALID_POSITIONS.includes(primary_position_category)) {
      return NextResponse.json({ error: `primary_position_category must be one of: ${VALID_POSITIONS.join(', ')}` }, { status: 400 });
    }
  }

  // Validate certs array
  if (!Array.isArray(certs)) {
    return NextResponse.json({ error: 'certs must be an array of {certification_id, registration_number}.' }, { status: 400 });
  }
  const certUpdates: Array<{ certification_id: string; number: string }> = [];
  for (const item of certs) {
    if (!item || typeof item !== 'object') continue;
    const { certification_id, registration_number } = item;
    if (!certification_id || typeof certification_id !== 'string') continue;
    const num = normalizeNumber(registration_number);
    if (num === null) continue; // skip empty / invalid
    certUpdates.push({ certification_id, number: num });
  }

  // Resolve player
  const { data: player, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (playerErr) {
    console.error('[passport-fed] player lookup failed', playerErr);
    return NextResponse.json({ error: 'Failed to look up player record.' }, { status: 500 });
  }
  if (!player) {
    return NextResponse.json(
      { error: 'You need to claim a player profile before setting federation numbers. Claim your profile at /claim-your-listing.' },
      { status: 403 }
    );
  }

  // Apply player.primary_position_category if present
  if (primary_position_category !== undefined) {
    const { error } = await supabaseAdmin
      .from('players')
      .update({ primary_position_category: primary_position_category === '' ? null : primary_position_category })
      .eq('id', player.id);
    if (error) {
      console.error('[passport-fed] player update failed', error);
      return NextResponse.json({ error: 'Failed to save player metadata.' }, { status: 500 });
    }
  }

  // Apply cert → federation_registrations upserts. The certification is
  // the source of truth: cert.issuer_id → federation_id. Refuse to write
  // to non-draft rows (locked because pending or approved) — owner must
  // withdraw first.
  if (certUpdates.length > 0) {
    const certIds = certUpdates.map((u) => u.certification_id);
    const { data: certs, error: certErr } = await supabaseAdmin
      .from('certifications')
      .select('id, issuer_id, federations!inner(slug, name)')
      .in('id', certIds)
      .eq('is_active', true);
    if (certErr) {
      console.error('[passport-fed] cert lookup failed', certErr);
      return NextResponse.json({ error: 'Failed to look up certifications.' }, { status: 500 });
    }
    const byCertId = new Map((certs ?? []).map((c: any) => [c.id, c]));

    for (const u of certUpdates) {
      const cert = byCertId.get(u.certification_id);
      if (!cert) {
        return NextResponse.json(
          { error: `Certification "${u.certification_id}" not found or inactive.` },
          { status: 400 }
        );
      }
      const federationId = (cert as any).issuer_id as string;

      // Upsert draft keyed by (player_id, certification_id). The unique
      // identity of a registration is the cert, not the federation.
      const { data: existing } = await supabaseAdmin
        .from('federation_registrations')
        .select('id, submission_status')
        .eq('player_id', player.id)
        .eq('certification_id', u.certification_id)
        .maybeSingle();

      if (existing && existing.submission_status !== 'draft') {
        return NextResponse.json(
          { error: `Cannot edit registration — status is "${existing.submission_status}". Withdraw first.` },
          { status: 409 }
        );
      }

      if (existing) {
        const { error: updErr } = await supabaseAdmin
          .from('federation_registrations')
          .update({
            registration_number: u.number,
            federation_id: federationId, // keep in sync in case issuer changed
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (updErr) {
          console.error('[passport-fed] draft update failed', updErr);
          return NextResponse.json({ error: 'Failed to update draft registration.' }, { status: 500 });
        }
      } else {
        const { error: insErr } = await supabaseAdmin
          .from('federation_registrations')
          .insert({
            player_id: player.id,
            federation_id: federationId,
            certification_id: u.certification_id,
            registration_number: u.number,
            submission_status: 'draft',
          });
        if (insErr) {
          // Unique constraint hit means a race; refetch and retry once.
          if (insErr.code === '23505') {
            const { error: updErr } = await supabaseAdmin
              .from('federation_registrations')
              .update({
                registration_number: u.number,
                federation_id: federationId,
                submission_status: 'draft',
                updated_at: new Date().toISOString(),
              })
              .eq('player_id', player.id)
              .eq('certification_id', u.certification_id);
            if (updErr) {
              console.error('[passport-fed] draft upsert after race failed', updErr);
              return NextResponse.json({ error: 'Failed to save draft registration.' }, { status: 500 });
            }
          } else {
            console.error('[passport-fed] draft insert failed', insErr);
            return NextResponse.json({ error: 'Failed to save draft registration.' }, { status: 500 });
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
