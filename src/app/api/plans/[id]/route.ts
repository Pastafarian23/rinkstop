import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadOwnedPlan(planId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('practice_plans')
    .select('id, created_by_user_id, is_template')
    .eq('id', planId)
    .single();
  if (error || !data) return { error: 'not_found' as const };
  if (data.created_by_user_id !== userId) return { error: 'forbidden' as const };
  return { plan: data };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('practice_plans')
    .select('id, slug, title, summary, focus, age_min, age_max, duration_min, skill_level, structure, coach_notes, equipment, is_template, is_published, created_by_user_id, updated_at')
    .eq('id', id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 });
  }
  const owned = await loadOwnedPlan(id, userId);
  if (owned.error === 'not_found') {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  if (owned.error === 'forbidden') {
    return NextResponse.json({ error: 'You can only edit plans you created' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body required' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  // Whitelist of fields users can update
  const updates: Record<string, unknown> = {};
  if (typeof b.title === 'string' && b.title.trim() && b.title.length <= 200) {
    updates.title = b.title.trim();
  }
  if (typeof b.summary === 'string' && b.summary.trim() && b.summary.length <= 500) {
    updates.summary = b.summary.trim();
  }
  if (typeof b.coach_notes === 'string' && b.coach_notes.length <= 2000) {
    updates.coach_notes = b.coach_notes;
  }
  if (typeof b.is_template === 'boolean') {
    updates.is_template = b.is_template;
  }
  if (Array.isArray(b.equipment) && b.equipment.length <= 20) {
    updates.equipment = b.equipment.filter((e: unknown) => typeof e === 'string' && e.length <= 200);
  }
  if (b.structure && typeof b.structure === 'object') {
    updates.structure = b.structure;
  }
  // Also allow focus/age/duration/skill_level updates (no full validation here
  // for v1 — re-use create-time checks if needed later)
  if (typeof b.focus === 'string') {
    const valid = ['skills', 'game_situations', 'off_ice', 'goalie', 'conditioning'];
    if (valid.includes(b.focus)) updates.focus = b.focus;
  }
  if (typeof b.age_min === 'number' && b.age_min >= 4 && b.age_min <= 99) {
    updates.age_min = b.age_min;
  }
  if (typeof b.age_max === 'number' && b.age_max >= 4 && b.age_max <= 99) {
    updates.age_max = b.age_max;
  }
  if (typeof b.duration_min === 'number' && b.duration_min >= 5 && b.duration_min <= 240) {
    updates.duration_min = b.duration_min;
  }
  if (typeof b.skill_level === 'string') {
    const valid = ['beginner', 'intermediate', 'advanced', 'all'];
    if (valid.includes(b.skill_level)) updates.skill_level = b.skill_level;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('practice_plans')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 });
  }
  const owned = await loadOwnedPlan(id, userId);
  if (owned.error === 'not_found') {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  if (owned.error === 'forbidden') {
    return NextResponse.json({ error: 'You can only delete plans you created' }, { status: 403 });
  }

  // Cascade: delete dependent rows first (RLS won't help on service-role deletes,
  // but be explicit so the cascade is documented)
  await supabaseAdmin.from('user_saved_plans').delete().eq('plan_id', id);
  await supabaseAdmin.from('plan_progress').delete().eq('plan_id', id);

  const { error } = await supabaseAdmin
    .from('practice_plans')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
