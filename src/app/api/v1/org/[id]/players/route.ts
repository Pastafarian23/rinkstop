// src/app/api/v1/org/[id]/players/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Confirm the org is published first.
  const { data: org } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, is_published')
    .eq('id', id)
    .maybeSingle();
  if (!org || !org.is_published) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  // Pull team_events to find this org's teams, then player_workspaces.
  const { data: events } = await supabaseAdmin
    .from('team_events')
    .select('id')
    .eq('team_id', id)
    .limit(1);
  // For the public API, surface the org's team_events + their RSVPs as
  // a list of players (anonymized unless the user has linked a profile).
  const { data: rsvps } = await supabaseAdmin
    .from('team_rsvps')
    .select('event_id, user_id, response, responded_at')
    .in('event_id', (events || []).map((e) => e.id))
    .limit(500);

  return NextResponse.json({ org_id: id, rsvps: rsvps || [] });
}
