// src/app/api/passport/federation/route.ts
// PATCH /api/passport/federation — owner edits their DRAFT federation registrations.
//
// Tier 2 workflow (2026-07-23). USA Hockey / Hockey Canada numbers now write
// to federation_registrations as draft rows. The owner can edit freely until
// they call /submit, which locks the row and routes it to the admin queue.
//
// primary_position_category stays on public.players (it's a player metadata
// field, not a federation registration).
//
// Backwards compat: field names in the request body are unchanged
// (usa_hockey_number, hockey_canada_number, primary_position_category).
// Federation IDs are looked up by slug (us, ca) so the client doesn't need
// to know UUIDs.
//
// WS13 PR3: also stamps certification_id on the draft row by joining
// federations.slug + certifications.category='player'. Used at approve
// time to issue the right user_credentials row.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { resolveCertificationId } from '@/lib/certifications';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

const VALID_POSITIONS = ['forward', 'defense', 'goalie'];

// Field → federation slug mapping. Slugs match the seed in
// 2026-07-23_federations_seed.sql. Adding a new federation here means
// adding it to that seed migration AND keeping it in src/lib/federations.ts.
const FIELD_TO_FEDERATION_SLUG: Record<string, string> = {
  usa_hockey_number: 'us',
  hockey_canada_number: 'ca',
};

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

  const { usa_hockey_number, hockey_canada_number, primary_position_category } = body ?? {};

  let usaNorm: string | null;
  let hcNorm: string | null;
  try {
    usaNorm = normalizeNumber(usa_hockey_number);
    hcNorm = normalizeNumber(hockey_canada_number);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  if (primary_position_category != null && primary_position_category !== '') {
    if (!VALID_POSITIONS.includes(primary_position_category)) {
      return NextResponse.json({ error: `primary_position_category must be one of: ${VALID_POSITIONS.join(', ')}` }, { status: 400 });
    }
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

  // Build the payload. Federation numbers go to federation_registrations;
  // primary_position_category stays on players.
  const playerUpdate: Record<string, any> = {};
  if (primary_position_category !== undefined) {
    playerUpdate.primary_position_category = primary_position_category === '' ? null : primary_position_category;
  }

  const fedUpdates: Array<{ slug: string; number: string | null }> = [];
  if (usa_hockey_number !== undefined) fedUpdates.push({ slug: 'us', number: usaNorm });
  if (hockey_canada_number !== undefined) fedUpdates.push({ slug: 'ca', number: hcNorm });

  // Sanity check the body actually had something we recognize.
  if (
    Object.keys(playerUpdate).length === 0 &&
    fedUpdates.length === 0
  ) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  // Apply player.metadata update if present.
  if (Object.keys(playerUpdate).length > 0) {
    const { error } = await supabaseAdmin
      .from('players')
      .update(playerUpdate)
      .eq('id', player.id);
    if (error) {
      console.error('[passport-fed] player update failed', error);
      return NextResponse.json({ error: 'Failed to save player metadata.' }, { status: 500 });
    }
  }

  // Apply federation registration drafts if present.
  // For each (player, federation) pair: upsert as draft. We refuse to touch
  // any row that is no longer in 'draft' status (locked because pending or
  // approved). Owner must call /withdraw first.
  if (fedUpdates.length > 0) {
    const slugs = fedUpdates.map((u) => u.slug);
    const { data: federations, error: fedErr } = await supabaseAdmin
      .from('federations')
      .select('id, slug')
      .in('slug', slugs);
    if (fedErr) {
      console.error('[passport-fed] federation lookup failed', fedErr);
      return NextResponse.json({ error: 'Failed to look up federation records.' }, { status: 500 });
    }
    const bySlug = new Map((federations ?? []).map((f: any) => [f.slug, f.id]));

    for (const u of fedUpdates) {
      const federationId = bySlug.get(u.slug);
      if (!federationId) {
        return NextResponse.json(
          { error: `Federation slug "${u.slug}" not found. Apply 2026-07-23_federations_seed.sql.` },
          { status: 500 }
        );
      }

      if (u.number === null) {
        // Clear: delete the draft row only if status='draft'. Pending/approved
        // rows can't be cleared from this endpoint.
        const { data: existing } = await supabaseAdmin
          .from('federation_registrations')
          .select('id, submission_status')
          .eq('player_id', player.id)
          .eq('federation_id', federationId)
          .maybeSingle();
        if (existing && existing.submission_status === 'draft') {
          const { error: delErr } = await supabaseAdmin
            .from('federation_registrations')
            .delete()
            .eq('id', existing.id);
          if (delErr) {
            console.error('[passport-fed] draft delete failed', delErr);
            return NextResponse.json({ error: 'Failed to clear draft federation registration.' }, { status: 500 });
          }
        } else if (existing) {
          return NextResponse.json(
            { error: `Cannot clear ${u.slug} registration — status is "${existing.submission_status}". Withdraw first via /api/passport/federation/withdraw.` },
            { status: 409 }
          );
        }
        continue;
      }

      // Upsert draft. If row exists in non-draft status, refuse.
      const { data: existing } = await supabaseAdmin
        .from('federation_registrations')
        .select('id, submission_status')
        .eq('player_id', player.id)
        .eq('federation_id', federationId)
        .maybeSingle();
      if (existing && existing.submission_status !== 'draft') {
        return NextResponse.json(
          { error: `Cannot edit ${u.slug} registration — status is "${existing.submission_status}". Withdraw first.` },
          { status: 409 }
        );
      }
      const payload: Record<string, any> = {
        player_id: player.id,
        federation_id: federationId,
        registration_number: u.number,
        submission_status: 'draft',
      };
      // WS13 PR3: resolve certification_id for this (federation, category=player)
      // pair so the approve route knows which cert to issue. Cached for 1h.
      const certificationId = await resolveCertificationId(u.slug, 'player');
      if (certificationId) {
        payload.certification_id = certificationId;
      }
      if (existing) {
        const { error: updErr } = await supabaseAdmin
          .from('federation_registrations')
          .update({
            registration_number: u.number,
            certification_id: certificationId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (updErr) {
          console.error('[passport-fed] draft update failed', updErr);
          return NextResponse.json({ error: 'Failed to update draft federation registration.' }, { status: 500 });
        }
      } else {
        const { error: insErr } = await supabaseAdmin
          .from('federation_registrations')
          .insert(payload);
        if (insErr) {
          // Unique constraint hit means a race; refetch and retry once.
          if (insErr.code === '23505') {
            const { error: updErr } = await supabaseAdmin
              .from('federation_registrations')
              .update({
                registration_number: u.number,
                certification_id: certificationId,
                submission_status: 'draft',
                updated_at: new Date().toISOString(),
              })
              .eq('player_id', player.id)
              .eq('federation_id', federationId);
            if (updErr) {
              console.error('[passport-fed] draft upsert after race failed', updErr);
              return NextResponse.json({ error: 'Failed to save draft federation registration.' }, { status: 500 });
            }
          } else {
            console.error('[passport-fed] draft insert failed', insErr);
            return NextResponse.json({ error: 'Failed to save draft federation registration.' }, { status: 500 });
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
