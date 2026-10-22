// src/app/api/v1/org/[id]/route.ts
//
// Club Elite feature: API access.
//   GET /api/v1/org/[id]            -> public org profile (requires a valid org key)
//   GET /api/v1/org/[id]/players    -> org's roster/RSVP data (requires a valid org key)
//
// Auth (2026-10-22, fixed): a valid, unrevoked x-api-key issued FOR THIS ORG.
// Previously this route documented key auth in its header comment but never
// verified it — it only checked `is_published`, so the Club Elite "API access"
// feature was advertised on a $999 plan and enforced nowhere. Verification now
// lives in src/lib/api-keys.ts (verifyOrgApiKey) and fails closed on DB error.
//
// API key management: /api/manage/team/[id]/api-keys.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyOrgApiKey, extractPresentedKey, apiKeyUnauthorized } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const verification = await verifyOrgApiKey(extractPresentedKey(req), id);
  if (!verification.ok) return apiKeyUnauthorized(verification.reason);

  // Only return fields the org has explicitly published via Club Elite.
  // Column names: the location columns on team_workspaces are `home_city` /
  // `home_country` — there is no `country` / `city` column. Selecting the
  // wrong names made this route 500 with "column team_workspaces.country
  // does not exist" on every request (pre-existing bug, fixed 2026-10-22).
  const { data, error } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, name, slug, home_city, home_country, brand_primary_color, brand_secondary_color, brand_accent_color, brand_logo_url, brand_tagline, brand_og_image_url, is_published')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  if (!data.is_published) return NextResponse.json({ error: 'Org not published' }, { status: 404 });
  return NextResponse.json({ org: data });
}
