/**
 * POST /api/profile/email-preferences
 *
 * Updates the caller's email preference columns on profiles.
 * Auth required (Clerk). One-row update keyed on user_id.
 *
 * Body (all optional, only present keys are written):
 *   {
 *     email_team_news?: boolean,
 *     email_team_results?: boolean,
 *     email_team_schedule?: boolean,
 *     email_connection_requests?: boolean,
 *     email_dm_notifications?: boolean,
 *     email_marketing?: boolean
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set([
  'email_team_news',
  'email_team_results',
  'email_team_schedule',
  'email_connection_requests',
  'email_dm_notifications',
  'email_marketing',
]);

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to update preferences.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  // Filter to known columns only. Reject other keys (defense in depth).
  const update: Record<string, boolean> = {};
  for (const k of Object.keys(body)) {
    if (ALLOWED.has(k) && typeof body[k] === 'boolean') {
      update[k] = body[k];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid preference fields.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    console.error('[email-prefs POST] update failed:', error.message);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: Object.keys(update) });
}
