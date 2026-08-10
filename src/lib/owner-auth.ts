// src/lib/owner-auth.ts
//
// WS17 PR3a - Owner API auth helper.
//
// Server-side guard for /api/owner/* endpoints. Gates access by RLS:
// the signed-in user must be the approved claimant of the rink
// (rinks.claimed_by_user_id = auth.uid()).
//
// Use this in every owner API route, exactly once at the top:
//
//   const owner = await requireRinkOwner(request, params.id);
//   if ('response' in owner) return owner.response;
//   // owner.userId + owner.rinkId available here

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface RinkOwnerContext {
  userId: string;
  rinkId: string;
}

/**
 * Resolve the signed-in user + verify they own the rink (via RLS).
 *
 * Flow:
 *  1. Require Clerk session - returns 401 if not signed in
 *  2. Read rinks.claimed_by_user_id for the rink
 *  3. Compare to session.userId - returns 403 if mismatch
 *  4. Return {userId, rinkId} on success
 *
 * The RLS check is on the supabaseAdmin query (no RLS bypass) so this
 * also works as a defense-in-depth check even if RLS policies drift.
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

  const { data: rink, error } = await supabaseAdmin
    .from('rinks')
    .select('id, claimed_by_user_id, is_active')
    .eq('id', rinkId)
    .single();

  if (error || !rink) {
    return {
      response: NextResponse.json(
        { error: 'Rink not found.' },
        { status: 404 },
      ),
    };
  }

  if (!rink.claimed_by_user_id) {
    return {
      response: NextResponse.json(
        { error: 'This rink has no approved owner yet.' },
        { status: 403 },
      ),
    };
  }

  if (rink.claimed_by_user_id !== session.userId) {
    return {
      response: NextResponse.json(
        { error: 'You do not own this rink.' },
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
