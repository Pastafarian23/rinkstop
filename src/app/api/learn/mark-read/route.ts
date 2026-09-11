/**
 * POST /api/learn/mark-read
 *
 * Mark a /learn page as read for the current user. Idempotent — re-marking
 * the same href updates the read_at + dwell_seconds instead of erroring.
 *
 * Body: { href: string, dwellSeconds?: number }
 *   href:         '/learn/hockey-rules' etc. — must start with '/learn/'
 *   dwellSeconds: optional, default 0
 *
 * Auth: required (Clerk). 401 if unauthenticated.
 * Validation: 400 if href missing or not under /learn/.
 *
 * UNIQUE(user_id, href) constraint prevents duplicates at the DB level.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const href = typeof body?.href === 'string' ? body.href.trim() : '';
  if (!href || !href.startsWith('/learn/')) {
    return NextResponse.json(
      { error: 'invalid_href', message: 'href must start with /learn/' },
      { status: 400 }
    );
  }

  const dwellSeconds =
    typeof body?.dwellSeconds === 'number' && body.dwellSeconds >= 0
      ? Math.min(Math.floor(body.dwellSeconds), 60 * 60 * 8) // cap at 8 hours
      : 0;

  // Upsert: if a row already exists for (user, href), update read_at + dwell.
  // Otherwise insert a new row.
  const { data, error } = await supabaseAdmin
    .from('learn_progress')
    .upsert(
      {
        user_id: session.userId,
        href,
        read_at: new Date().toISOString(),
        dwell_seconds: dwellSeconds,
      },
      { onConflict: 'user_id,href' }
    )
    .select()
    .single();

  if (error) {
    console.error('[learn/mark-read] upsert failed:', error);
    return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, progress: data });
}
