// src/app/api/v1/org/[id]/route.ts
//
// Club Elite feature: API access.
//   GET /api/v1/org/[id]            -> public org profile
//   GET /api/v1/org/[id]/players    -> org's players
//   GET /api/v1/org/[id]/events     -> org's upcoming events
//   GET /api/v1/org/[id]/finances   -> org's financial summary (only for the org owner)
//
// Auth: any caller with a valid x-api-key tied to the org can read.
// Public org profile is readable without auth (Club Elite opted in).
//
// API key management: see /api/manage/team/[id]/api-keys.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Only return fields the org has explicitly published via Club Elite.
  const { data, error } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, name, slug, country, city, brand_primary_color, brand_secondary_color, brand_accent_color, brand_logo_url, brand_tagline, brand_og_image_url, is_published')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  if (!data.is_published) return NextResponse.json({ error: 'Org not published' }, { status: 404 });
  return NextResponse.json({ org: data });
}
