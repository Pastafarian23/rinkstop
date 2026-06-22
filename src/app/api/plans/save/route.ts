import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface SaveRequest {
  planId: string;
}

function validateRequest(body: unknown): body is SaveRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.planId !== 'string') return false;
  // UUID v4-ish
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.planId);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!validateRequest(body)) {
    return NextResponse.json({ error: 'Invalid planId' }, { status: 400 });
  }

  // Verify the plan exists
  const { data: plan, error: planErr } = await supabaseAdmin
    .from('practice_plans')
    .select('id, is_published')
    .eq('id', body.planId)
    .single();

  if (planErr || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  if (!plan.is_published) {
    return NextResponse.json({ error: 'Plan is not available' }, { status: 403 });
  }

  // Idempotent insert
  const { error } = await supabaseAdmin
    .from('user_saved_plans')
    .upsert(
      { user_id: userId, plan_id: body.planId },
      { onConflict: 'user_id,plan_id' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!validateRequest(body)) {
    return NextResponse.json({ error: 'Invalid planId' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('user_saved_plans')
    .delete()
    .eq('user_id', userId)
    .eq('plan_id', body.planId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
