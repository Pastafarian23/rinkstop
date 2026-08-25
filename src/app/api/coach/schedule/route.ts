// src/app/api/coach/schedule/route.ts
//
// WS17 PR4 - Coach schedule: programming slots + events assigned to the coach.
//
//   GET /api/coach/schedule   — list upcoming slots/events assigned to this coach
//
// Access: any authenticated user who is linked as a coach in rink_employees.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // Get the coach's rink_employees record
  const { data: coach, error: coachErr } = await supabaseAdmin
    .from('rink_employees')
    .select('id, rink_id, name, role, status')
    .eq('user_id', userId)
    .eq('role', 'coach')
    .eq('status', 'active')
    .maybeSingle();

  if (coachErr) {
    console.error('[coach-schedule] coach lookup failed', coachErr);
    return NextResponse.json({ error: 'Failed to load coach profile.' }, { status: 500 });
  }

  if (!coach) {
    return NextResponse.json({ error: 'You are not registered as a coach.' }, { status: 403 });
  }

  // Fetch programming slots assigned to this coach
  const { data: programming, error: progErr } = await supabaseAdmin
    .from('rink_programming')
    .select(`
      id, rink_id, day_of_week, start_time, end_time, activity_type,
      skill_level, gender, age_min, age_max, description, status,
      rink:rinks(id, name, slug)
    `)
    .eq('staff_id', coach.id)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (progErr) {
    console.error('[coach-schedule] programming load failed', progErr);
    return NextResponse.json({ error: 'Failed to load programming schedule.' }, { status: 500 });
  }

  // Fetch events assigned to this coach
  const { data: events, error: eventsErr } = await supabaseAdmin
    .from('rink_events')
    .select(`
      id, rink_id, title, description, event_type, start_time, end_time,
      skill_level, gender, age_group, status,
      rink:rinks(id, name, slug)
    `)
    .eq('staff_id', coach.id)
    .gte('end_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (eventsErr) {
    console.error('[coach-schedule] events load failed', eventsErr);
    return NextResponse.json({ error: 'Failed to load event schedule.' }, { status: 500 });
  }

  return NextResponse.json({
    coach,
    programming: programming || [],
    events: events || [],
  });
}
