// PATCH /api/admin/intake/listing-submission/[id]/contact
// Record that we actually REPLIED to a lead.
//
// WHY this exists (2026-10-29, Arnel's revenue audit):
//   The 2026-10-29 migration added contacted_at / contacted_by /
//   reply_channel / outcome / outcome_notes to listing_submissions so the
//   lead pipeline could be measured. But the columns were WRITE-ONLY BY
//   DIRECT DB EDIT — neither the PATCH endpoint nor the /admin/intake UI
//   could set them. So the whole lead-response measurement (the "Oldest
//   unanswered lead: 27 days" line on /admin/revenue and in the daily
//   Telegram report) depended on someone remembering to hand-edit a table.
//
//   This endpoint closes that: logging a reply is a single call, and it
//   records WHO replied and HOW, so the SLA metric is trustworthy.
//
// Body: {
//   contacted: true | false,          // true = we just replied
//   reply_channel?: 'email'|'telegram'|'phone'|'whatsapp'|'other',
//   outcome?: 'listed'|'claimed'|'paid'|'declined'|'no_response',
//   outcome_notes?: string
// }
//
// Notes:
//   - `contacted_at` is set ONCE (first reply) so the SLA metric measures
//     time-to-first-reply, not the last touch.
//   - `contacted: false` clears contacted_at (useful if a reply was logged
//     by mistake).
//   - Every change is written to admin_audit_log with before/after.
//   - No email is sent from here. This RECORDS a reply that already
//     happened; it does not create one. The not-pushy rule is that we
//     deliver before we ask, and automating outbound contact to leads who
//     asked us for a listing would be the wrong instinct.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminEvent } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const REPLY_CHANNELS = ['email', 'telegram', 'phone', 'whatsapp', 'other'];
const OUTCOMES = ['listed', 'claimed', 'paid', 'declined', 'no_response'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAdminFromRequest(request, 'admin_intake_listing_contact');
  if ('response' in auth) return auth.response;

  const { id } = await params;
  let body: {
    contacted?: boolean;
    reply_channel?: string;
    outcome?: string;
    outcome_notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.reply_channel && !REPLY_CHANNELS.includes(body.reply_channel)) {
    return NextResponse.json(
      { error: `reply_channel must be one of: ${REPLY_CHANNELS.join(', ')}` },
      { status: 400 }
    );
  }
  if (body.outcome && !OUTCOMES.includes(body.outcome)) {
    return NextResponse.json(
      { error: `outcome must be one of: ${OUTCOMES.join(', ')}` },
      { status: 400 }
    );
  }
  if (body.contacted === undefined && !body.outcome && !body.outcome_notes) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { currentUser } = await import('@clerk/nextjs/server');
  const user = await currentUser();
  const contactedBy = user?.emailAddresses[0]?.emailAddress || user?.id || 'unknown';

  // Read the current row so we can set contacted_at only on the FIRST reply
  // and so the audit log can record before/after.
  const { data: before, error: readErr } = await supabaseAdmin
    .from('listing_submissions')
    .select('*')
    .eq('id', id)
    .single();
  if (readErr || !before) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.contacted === true) {
    // Set ONLY if not already set — the SLA measures time to FIRST reply.
    if (!(before as any).contacted_at) {
      patch.contacted_at = new Date().toISOString();
      patch.contacted_by = contactedBy;
    }
    if (body.reply_channel) patch.reply_channel = body.reply_channel;
  } else if (body.contacted === false) {
    patch.contacted_at = null;
    patch.contacted_by = null;
  } else if (body.reply_channel) {
    // Channel recorded without marking "contacted" (e.g. a message left).
    patch.reply_channel = body.reply_channel;
  }

  if (body.outcome) patch.outcome = body.outcome;
  if (body.outcome_notes !== undefined) patch.outcome_notes = body.outcome_notes || null;

  const { data, error } = await supabaseAdmin
    .from('listing_submissions')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminEvent({
    admin: auth.admin,
    request,
    action: body.contacted === false ? 'listing_submission_contact_cleared' : 'listing_submission_contact_logged',
    entityType: 'listing_submission',
    entityId: id,
    entityName: (data as any)?.name || null,
    params: {
      before: {
        contacted_at: (before as any).contacted_at,
        reply_channel: (before as any).reply_channel,
        outcome: (before as any).outcome,
      },
      after: {
        contacted_at: (data as any).contacted_at,
        reply_channel: (data as any).reply_channel,
        outcome: (data as any).outcome,
      },
      contacted_by: contactedBy,
      first_response_hours: (data as any).first_response_hours,
    },
  });

  return NextResponse.json({ ok: true, submission: data });
}
