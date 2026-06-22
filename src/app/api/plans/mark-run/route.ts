import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface MarkRunRequest {
  planId: string;
  duration_actual_min?: number | null;
  notes?: string | null;
  team_id?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateRequest(body: unknown): body is MarkRunRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.planId !== 'string' || !UUID_RE.test(b.planId)) return false;
  if (b.duration_actual_min !== undefined && b.duration_actual_min !== null) {
    if (typeof b.duration_actual_min !== 'number' || !Number.isFinite(b.duration_actual_min)) return false;
    if (b.duration_actual_min < 1 || b.duration_actual_min > 240) return false;
  }
  if (b.notes !== undefined && b.notes !== null && typeof b.notes !== 'string') return false;
  if (typeof b.notes === 'string' && b.notes.length > 1000) return false;
  if (b.team_id !== undefined && b.team_id !== null) {
    if (typeof b.team_id !== 'string' || !UUID_RE.test(b.team_id)) return false;
  }
  return true;
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
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Verify the plan exists and is published
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

  // If team_id is provided, verify the user is a member
  if (body.team_id) {
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', body.team_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: 'Not a member of that team' }, { status: 403 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('plan_progress')
    .insert({
      user_id: userId,
      plan_id: body.planId,
      team_id: body.team_id ?? null,
      duration_actual_min: body.duration_actual_min ?? null,
      notes: body.notes ?? null,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
