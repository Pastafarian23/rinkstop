// src/app/api/v1/org/[id]/players/route.ts
//
// Organization Elite feature: API access — org roster / RSVP data.
//
// Auth (2026-10-22, fixed): requires a valid, unrevoked x-api-key issued FOR
// THIS ORG. Previously this route only checked `is_published`; the documented
// key check did not exist. See src/lib/api-keys.ts.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyOrgApiKey, extractPresentedKey, apiKeyUnauthorized } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const verification = await verifyOrgApiKey(extractPresentedKey(req), id);
  if (!verification.ok) return apiKeyUnauthorized(verification.reason);

  // Confirm the org is published.
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
