import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/rink-contact-discovery/[id]/review
 *
 * Body: { action: 'approved' | 'rejected', rejectedReason?: string }
 *
 * Updates the status of a rink_contact_discovery row. Admin-only.
 * The reviewed_by column records the Clerk userId of the reviewer.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { userId } = await auth();
  const { id } = await params;

  let body: { action?: string; rejectedReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, rejectedReason } = body;
  if (action !== 'approved' && action !== 'rejected') {
    return NextResponse.json({ error: 'action must be "approved" or "rejected"' }, { status: 400 });
  }
  if (action === 'rejected' && !rejectedReason) {
    return NextResponse.json({ error: 'rejectedReason is required when action is "rejected"' }, { status: 400 });
  }

  const update: Record<string, any> = {
    status: action,
    reviewed_at: new Date().toISOString(),
    reviewed_by: userId || null,
  };
  if (action === 'rejected') {
    update.rejected_reason = rejectedReason;
  } else {
    update.rejected_reason = null;
  }

  const { data, error } = await supabaseAdmin
    .from('rink_contact_discovery')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, candidate: data });
}
