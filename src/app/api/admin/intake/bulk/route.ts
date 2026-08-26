// POST /api/admin/intake/bulk
// Bulk actions on intake sources. Used by /admin/intake.
//
// Body: { source: 'leads' | 'email_captures', action: 'mark_read' | 'delete', ids: string[] }
//
// Note: listing_submissions goes through a separate per-id endpoint
// (PATCH /api/admin/intake/listing-submission/[id]) because the action
// surface is different (approve/reject with notes), not a generic bulk.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Source = 'leads' | 'email_captures' | 'listing_inquiries';
type Action = 'mark_read' | 'delete';

export async function POST(request: NextRequest) {
  const auth = await getAdminFromRequest(request, 'admin_intake_bulk');
  if ('response' in auth) return auth.response;

  let body: { source?: Source; action?: Action; ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { source, action, ids } = body;
  if (!source || !action || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'source, action, and non-empty ids[] required' }, { status: 400 });
  }
  if (ids.length > 1000) {
    return NextResponse.json({ error: 'Bulk limit is 1000 ids per request' }, { status: 400 });
  }
  if (!['leads', 'email_captures', 'listing_inquiries'].includes(source)) {
    return NextResponse.json({ error: 'source must be leads | email_captures | listing_inquiries' }, { status: 400 });
  }
  if (!['mark_read', 'delete'].includes(action)) {
    return NextResponse.json({ error: 'action must be mark_read | delete' }, { status: 400 });
  }

  // listing_inquiries is a view into the leads table (filter by listing_id IS NOT NULL)
  const table = source === 'email_captures' ? 'email_captures' : 'leads';

  if (action === 'delete') {
    let q = supabaseAdmin.from(table).delete().in('id', ids);
    if (source === 'listing_inquiries') {
      q = q.not('listing_id', 'is', null);
    }
    const { error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, source, action, count: ids.length });
  }

  // mark_read
  if (table === 'leads') {
    let q = supabaseAdmin.from(table).update({ read_at: new Date().toISOString() }).in('id', ids);
    if (source === 'listing_inquiries') {
      q = q.not('listing_id', 'is', null);
    }
    const { error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // email_captures has no read_at column; "read" maps to email_verified
    // (per the inline form semantics: a captured email is unverified, becomes
    //  verified once they click the confirmation link in the followup email).
    // Don't auto-flip verified from admin — instead log nothing for now.
    return NextResponse.json(
      { error: 'email_captures has no read_at; use the leads table for read tracking' },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, source, action, count: ids.length });
}
