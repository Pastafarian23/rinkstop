import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/dashboard/practice-session
 *
 * Body params:
 *   - action: 'start' | 'complete' (required)
 *   - practice_plan_id: uuid (required for action=start)
 *   - session_id: uuid (required for action=complete)
 *
 * action=start:
 *   - Insert a row with status='started' and the calling user_id.
 *   - ON CONFLICT (user_id, practice_plan_id) WHERE status='started' → ignore
 *     (user already has an in-progress session for this plan).
 *
 * action=complete:
 *   - Update status='completed', completed_at=now() for the given session_id.
 *   - Accept optional form fields: self_rating (1-5) and notes.
 *
 * All writes run as supabaseAdmin (service role) but verify the row's
 * user_id matches the calling Clerk user before mutating — defence in depth.
 */

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const formData = await req.formData();
    const action = String(formData.get('action') || '');
    const userId = await resolveCanonicalUserId(
      session.userId,
      session.userId // best-effort; if owner_email is the canonical, the helper covers it
    );

    if (action === 'start') {
      const planId = String(formData.get('practice_plan_id') || '');
      if (!planId) {
        return NextResponse.json({ error: 'missing practice_plan_id' }, { status: 400 });
      }
      // Verify plan exists and is published
      const { data: plan } = await supabaseAdmin
        .from('practice_plans')
        .select('id, is_published')
        .eq('id', planId)
        .maybeSingle();
      if (!plan || !plan.is_published) {
        return NextResponse.json({ error: 'plan_not_published' }, { status: 400 });
      }
      // Insert; ignore conflict (active session already exists)
      const { error } = await supabaseAdmin
        .from('player_practice_sessions')
        .insert({
          user_id: userId,
          practice_plan_id: planId,
          status: 'started',
          started_at: new Date().toISOString(),
        });
      if (error && error.code !== '23505') {
        console.error('[practice-session] start failed:', error);
        return NextResponse.json({ error: 'db_error' }, { status: 500 });
      }
      // Redirect back to dashboard so the new active session renders.
      return NextResponse.redirect(new URL('/dashboard#practice', req.url), { status: 303 });
    }

    if (action === 'complete') {
      const sessionId = String(formData.get('session_id') || '');
      if (!sessionId) {
        return NextResponse.json({ error: 'missing session_id' }, { status: 400 });
      }
      // Defence in depth: only complete YOUR OWN session
      const { data: existing } = await supabaseAdmin
        .from('player_practice_sessions')
        .select('user_id, status')
        .eq('id', sessionId)
        .maybeSingle();
      if (!existing || existing.user_id !== userId) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      if (existing.status === 'completed') {
        return NextResponse.redirect(new URL('/dashboard#practice', req.url), { status: 303 });
      }
      const ratingRaw = formData.get('self_rating');
      const notesRaw = formData.get('notes');
      const rating = ratingRaw ? Math.max(1, Math.min(5, parseInt(String(ratingRaw), 10))) : null;
      const notes = notesRaw ? String(notesRaw).slice(0, 500) : null;

      const { error } = await supabaseAdmin
        .from('player_practice_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          self_rating: rating,
          notes,
        })
        .eq('id', sessionId);
      if (error) {
        console.error('[practice-session] complete failed:', error);
        return NextResponse.json({ error: 'db_error' }, { status: 500 });
      }
      return NextResponse.redirect(new URL('/dashboard#practice', req.url), { status: 303 });
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch (e) {
    console.error('[practice-session] unhandled error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
