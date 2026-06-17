/**
 * src/app/api/identity/verify/decision/route.ts
 *
 * GET /api/identity/verify/decision?session_id=<didit-uuid>
 *
 * Polled by the client after returning from Didit. Re-fetches the decision
 * via Didit's API to confirm the final state, applies the PII scrubber,
 * updates profiles + didit_sessions if the status changed.
 *
 * Idempotent: can be called repeatedly. Webhook is the primary signal;
 * this is a fallback for the case where the webhook was lost.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getDecision } from '@/lib/didit';
import { scrubDecision, deriveVerificationMethod } from '@/lib/didit-scrubber';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json(
      { error: 'missing_session_id', message: 'session_id query param required' },
      { status: 400 }
    );
  }

  // 1. Look up our local session row
  const { data: sessionRow, error: sessionErr } = await supabaseAdmin
    .from('didit_sessions')
    .select('id, user_id, status, decision')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (sessionErr || !sessionRow) {
    return NextResponse.json(
      { error: 'session_not_found', message: 'No local session with that id' },
      { status: 404 }
    );
  }
  if (sessionRow.user_id !== userId) {
    return NextResponse.json(
      { error: 'forbidden', message: 'Session belongs to a different user' },
      { status: 403 }
    );
  }

  try {
    // 2. Fetch decision from Didit
    const decision = await getDecision(sessionId);

    // 3. Scrub PII before any DB write
    const scrubbed = scrubDecision(decision);
    const method = deriveVerificationMethod(decision);

    // 4. Update didit_sessions with scrubbed decision + new status
    const newStatus = (decision.status || 'in_review').toLowerCase();
    const { error: updateSessionErr } = await supabaseAdmin
      .from('didit_sessions')
      .update({
        status: newStatus,
        decision: scrubbed,
        cost_cents: scrubbed.cost_cents ?? null,
        completed_at: ['approved', 'declined', 'abandoned'].includes(newStatus)
          ? new Date().toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionRow.id);

    if (updateSessionErr) {
      // Throw — same as webhook handler — to alert the operator.
      // The client can retry.
      console.error('[identity/decision] didit_sessions update failed:', updateSessionErr);
      throw new Error('Failed to update session row');
    }

    // 5. If approved, update profiles. Re-verify extends the expiry.
    if (newStatus === 'approved') {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setFullYear(now.getFullYear() + 2);   // 2-year cadence

      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({
          identity_verified_at: now.toISOString(),
          identity_verification_method: method,
          identity_expires_at: expiresAt.toISOString(),
          didit_session_id: sessionRow.id,
          updated_at: now.toISOString(),
        })
        .eq('user_id', userId);

      if (profileErr) {
        console.error('[identity/decision] profiles update failed:', profileErr);
        throw new Error('Failed to update profile');
      }
    }

    // 6. Return the current state for the client to render
    return NextResponse.json({
      session_id: sessionId,
      status: newStatus,
      approved: newStatus === 'approved',
      // Note: only non-PII fields are echoed back, even from a "decision" lookup
      document_type: scrubbed.document_type,
      issuing_country: scrubbed.issuing_country,
      liveness_score: scrubbed.liveness_score,
      face_match_score: scrubbed.face_match_score,
    });
  } catch (err) {
    console.error('[identity/decision] error:', err);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to fetch decision' },
      { status: 500 }
    );
  }
}
