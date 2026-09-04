// src/lib/rental/owner-auth.ts
//
// Equipment/rental API auth helpers.
// Gate: signed-in user must have an approved rink claim for the rink.
//
// IMPORTANT: rinks.claimed_by_user_id does NOT exist on production.
// The canonical rink ownership record lives in public.claims
// (claim_type='rink', status='approved', entity_id=rink_id).
// This mirrors the auth check used elsewhere in src/lib/owner-auth.ts
// (which has the same bug — uses rinks.claimed_by_user_id that doesn't exist).

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface RentalOwnerContext {
  userId: string;
  rinkId: string;
}

/**
 * Resolve the signed-in user + verify they have an approved rink claim.
 * Uses the `claims` table (canonical rink claim system).
 */
export async function requireRinkOwnerForRental(
  request: NextRequest,
  rinkId: string,
): Promise<RentalOwnerContext> {
  const session = await auth();
  if (!session.userId) {
    throw new Error('UNAUTHENTICATED');
  }

  // Verify the rink exists
  const { data: rink, error: rinkError } = await supabaseAdmin
    .from('rinks')
    .select('id, is_active')
    .eq('id', rinkId)
    .maybeSingle();

  if (rinkError || !rink) {
    throw new Error('RINK_NOT_FOUND');
  }

  // Check approved claim
  const { data: claim, error: claimError } = await supabaseAdmin
    .from('claims')
    .select('id, status, verification_status')
    .eq('user_id', session.userId)
    .eq('claim_type', 'rink')
    .eq('entity_id', rinkId)
    .eq('status', 'approved')
    .maybeSingle();

  if (claimError || !claim) {
    throw new Error('FORBIDDEN');
  }

  return { userId: session.userId, rinkId };
}

/**
 * Resolve the signed-in parent user from Clerk session.
 * Returns null if not signed in.
 */
export async function getParentUserId(): Promise<string | null> {
  const session = await auth();
  return session.userId || null;
}
