import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// A-iv: a signer can revoke their own signature with a reason.
//   - Auth: caller's user_id must equal signatures.signed_by_user_id.
//   - Idempotent: re-withdrawing an already-withdrawn row returns 200
//     and leaves withdrawn_at as the original timestamp.
//   - Validation: reason string, min 10 chars (so withdrawal isn't silent).
//   - Side effect: sets withdrawn_at = NOW() on first call.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; sigId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, id: docId, sigId } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  let body: { reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 10) {
    return NextResponse.json(
      { error: 'reason required (min 10 chars) — withdrawals are part of the audit trail' },
      { status: 400 }
    );
  }

  // Verify team + fetch the signature row.
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const { data: sig } = await supabaseAdmin
    .from('document_signatures')
    .select('id, document_id, signed_by_user_id, withdrawn_at')
    .eq('id', sigId)
    .maybeSingle();
  if (!sig) return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
  if (sig.document_id !== docId) {
    return NextResponse.json({ error: 'Signature does not belong to this document' }, { status: 400 });
  }
  if (sig.signed_by_user_id !== userId) {
    return NextResponse.json({ error: 'Only the original signer can withdraw this signature' }, { status: 403 });
  }
  if (sig.withdrawn_at) {
    // Idempotent: already withdrawn, return as-is.
    return NextResponse.json({ ok: true, already_withdrawn: true, withdrawn_at: sig.withdrawn_at });
  }

  const withdrawnAt = new Date().toISOString();
  const { data: updated, error: updErr } = await supabaseAdmin
    .from('document_signatures')
    .update({
      withdrawn_at: withdrawnAt,
      withdrawn_reason: reason,
      withdrawn_by_user_id: userId,
    })
    .eq('id', sigId)
    .select('id, withdrawn_at, withdrawn_reason, withdrawn_by_user_id')
    .single();
  if (updErr || !updated) {
    return NextResponse.json({ error: updErr?.message || 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, signature: updated });
}
