// /api/owner/rinks/[id]/booking-inquiries/[inquiryId]
//
// PATCH endpoint for the rink owner to update a public_booking_inquiry
// status. Used by the dashboard to Accept/Decline/Spam/Mark-Viewed.
//
// Auth: caller must be an approved claimant of this rink (same as
// the dashboard page uses).

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_STATUSES = new Set(['viewed_by_rink', 'accepted', 'declined', 'spam', 'duplicate']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inquiryId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id: rinkId, inquiryId } = await params;

  // Verify the caller is an approved claimant of this rink
  const { data: claim } = await supabaseAdmin
    .from('claims')
    .select('id')
    .eq('entity_id', rinkId)
    .eq('claim_type', 'rink')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  if (!claim) {
    return NextResponse.json(
      { error: 'You must be an approved rink claimant to update this inquiry.' },
      { status: 403 }
    );
  }

  // Verify the inquiry belongs to this rink
  const { data: inquiry, error: lookupErr } = await supabaseAdmin
    .from('public_booking_inquiries')
    .select('id, rink_id, status')
    .eq('id', inquiryId)
    .eq('rink_id', rinkId)
    .maybeSingle();

  if (lookupErr || !inquiry) {
    return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON.' }, { status: 400 });
  }

  const newStatus = String(body.status || '');
  if (!VALID_STATUSES.has(newStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}` },
      { status: 400 }
    );
  }

  const { error: updateErr } = await supabaseAdmin
    .from('public_booking_inquiries')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', inquiryId);

  if (updateErr) {
    console.error('[booking-inquiry PATCH] update failed', { updateErr, inquiryId, newStatus });
    return NextResponse.json({ error: 'Failed to update inquiry.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
