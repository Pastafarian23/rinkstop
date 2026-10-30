// src/app/api/manage/team/[id]/route.ts
//
// Owner API for team-level settings. Currently exposes:
//   PATCH /api/manage/team/[id]
//     - Updates the team's default currency. The body's `currency` field
//       is whitelisted; everything else is rejected.
//
// Auth: caller must have an approved team claim on this workspace OR be a
// super_admin. The workspace id in [id] is team_workspaces.id (uuid).
//
// Per the 2026-10-12 currency directive:
//   - Main site pricing is always USD.
//   - Local transactions (team programs, registration fees) default to the
//     team's saved currency, with USD as the explicit fallback in the UI.
//   - This endpoint persists the team's saved default.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  // Body parsing — accept either { currency: "PHP" } or { currency: null }.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }
  const { currency } = body as { currency?: unknown };
  if (currency !== null && currency !== undefined && typeof currency !== 'string') {
    return NextResponse.json({ error: 'currency must be a string or null' }, { status: 400 });
  }

  // Normalize: uppercase, trim, max 3 chars, or null to clear.
  let normalizedCurrency: string | null = null;
  if (typeof currency === 'string') {
    const c = currency.trim().toUpperCase().slice(0, 3);
    if (c.length === 0) {
      normalizedCurrency = null; // empty string = clear the default
    } else if (!/^[A-Z]{3}$/.test(c)) {
      return NextResponse.json({ error: 'currency must be a 3-letter ISO 4217 code' }, { status: 400 });
    } else {
      normalizedCurrency = c;
    }
  } else if (currency === null) {
    normalizedCurrency = null;
  } else {
    return NextResponse.json({ error: 'currency is required' }, { status: 400 });
  }

  // Auth: approved claim OR super_admin.
  const isSuperAdmin = (cu?.publicMetadata as { role?: string } | undefined)?.role === 'super_admin';
  if (!isSuperAdmin) {
    const { count: claimCount } = await supabaseAdmin
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('claim_type', 'team')
      .eq('entity_id', id)
      .eq('status', 'approved');
    if (!claimCount) {
      return NextResponse.json({ error: 'Not authorized for this team' }, { status: 403 });
    }
  }

  // Update.
  const { data, error } = await supabaseAdmin
    .from('team_workspaces')
    .update({ currency: normalizedCurrency, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, currency, home_country')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, currency: data.currency, country: data.home_country });
}
