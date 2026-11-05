// src/lib/owner-auth.ts
//
// WS17 PR3a - Owner API auth helper.
//
// Server-side guard for /api/owner/* endpoints. The signed-in user must have
// an APPROVED rink claim for the rink.
//
// Use this in every owner API route, exactly once at the top:
//
//   const owner = await requireRinkOwner(request, params.id);
//   if ('response' in owner) return owner.response;
//   // owner.userId + owner.rinkId available here
//
// 2026-11-05 (Arnel: 'look into inviting existing rinks to list ice'):
// This helper queried `rinks.claimed_by_user_id`. THAT COLUMN DOES NOT
// EXIST on production — the full `rinks` schema has no such column. Every
// call therefore failed inside Supabase with PostgREST 42703
// ("column rinks.claimed_by_user_id does not exist"), and the route returned
// a misleading 404 "Rink not found." for a rink that exists.
//
// Blast radius: 16 files import this helper, including every rink-owner
// surface that matters for the ice marketplace:
//   ice-listings (create/edit/delete a slot), programming (publish ice
//   schedule), staff, threads, contracts, connections, events.
//
// The canonical rink-ownership record is `public.claims`
// (claim_type='rink', status='approved', entity_id=rink_id). This mirrors
// src/lib/rental/owner-auth.ts, which was already fixed for exactly this
// reason (see its header comment). This file had simply not been fixed.

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface RinkOwnerContext {
  userId: string;
  rinkId: string;
}

/**
 * Resolve the signed-in user + verify they own the rink.
 *
 * Flow:
 *  1. Require Clerk session - returns 401 if not signed in
 *  2. Confirm the rink exists and is active - returns 404 if not
 *  3. Look up the user's APPROVED rink claim (public.claims) - returns 403
 *     if there is none, or if it belongs to someone else
 *  4. Return {userId, rinkId} on success
 *
 * Ownership source of truth: public.claims with
 * claim_type='rink' AND status='approved' AND entity_id=rink_id.
 */
export async function requireRinkOwner(
  _request: NextRequest,
  rinkId: string,
): Promise<{ owner: RinkOwnerContext } | { response: NextResponse }> {
  const session = await auth();
  if (!session.userId) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      ),
    };
  }

  // 1. The rink must exist. Select only real columns — `claimed_by_user_id`
  //    does not exist on this table.
  const { data: rink, error } = await supabaseAdmin
    .from('rinks')
    .select('id, name, is_active')
    .eq('id', rinkId)
    .maybeSingle();

  if (error) {
    console.error('[owner-auth] rink lookup failed:', error);
    return {
      response: NextResponse.json(
        { error: 'Could not verify rink ownership.' },
        { status: 500 },
      ),
    };
  }

  if (!rink) {
    return {
      response: NextResponse.json(
        { error: 'Rink not found.' },
        { status: 404 },
      ),
    };
  }

  if (rink.is_active === false) {
    return {
      response: NextResponse.json(
        { error: 'This rink is not active.' },
        { status: 403 },
      ),
    };
  }

  // 2. The canonical ownership record: an APPROVED rink claim.
  const { data: claim, error: claimError } = await supabaseAdmin
    .from('claims')
    .select('id, user_id, status, verification_status')
    .eq('user_id', session.userId)
    .eq('claim_type', 'rink')
    .eq('entity_id', rinkId)
    .eq('status', 'approved')
    .maybeSingle();

  if (claimError) {
    console.error('[owner-auth] claim lookup failed:', claimError);
    return {
      response: NextResponse.json(
        { error: 'Could not verify rink ownership.' },
        { status: 500 },
      ),
    };
  }

  if (!claim) {
    // Distinguish "nobody owns it" from "someone else does" so the UI can
    // tell a rink owner "claim this rink" rather than a dead end.
    const { data: otherClaim } = await supabaseAdmin
      .from('claims')
      .select('user_id')
      .eq('claim_type', 'rink')
      .eq('entity_id', rinkId)
      .eq('status', 'approved')
      .maybeSingle();

    return {
      response: NextResponse.json(
        otherClaim
          ? { error: 'You do not own this rink.' }
          : { error: 'This rink has no approved owner yet.' },
        { status: 403 },
      ),
    };
  }

  return {
    owner: {
      userId: session.userId,
      rinkId: rink.id,
    },
  };
}
