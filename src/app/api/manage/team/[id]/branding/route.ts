// src/app/api/manage/team/[id]/branding/route.ts
//
// Club Elite feature: Custom branding.
//   GET  /api/manage/team/[id]/branding  -> returns the team's branding record
//   PUT  /api/manage/team/[id]/branding  -> updates branding fields
//
// Branding record lives on team_workspaces (new columns added in
// 2026-10-12_club_elite_features.sql).

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_FIELDS = new Set([
  'brand_primary_color',
  'brand_secondary_color',
  'brand_accent_color',
  'brand_logo_url',
  'brand_favicon_url',
  'brand_tagline',
  'brand_custom_domain',
  'brand_og_image_url',
]);

// Organization-tier gate. Reads profiles.org_tier, not profiles.tier.
import { tierAtLeast } from '@/lib/tier';

// Hex color validation: #RGB or #RRGGBB
function isHexColor(s: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, name, brand_primary_color, brand_secondary_color, brand_accent_color, brand_logo_url, brand_favicon_url, brand_tagline, brand_custom_domain, brand_og_image_url')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  return NextResponse.json({ branding: data });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const cu = await currentUser();
  if (!session.userId || !cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = cu.id;
  const { id } = await params;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Body must be object' }, { status: 400 });

  // Whitelist fields
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (k.endsWith('_color') && typeof v === 'string' && !isHexColor(v)) {
      return NextResponse.json({ error: `${k} must be a hex color like #041E42` }, { status: 400 });
    }
    update[k] = v ?? null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Verify ownership + tier
  const { data: team, error: tErr } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, owner_user_id')
    .eq('id', id)
    .maybeSingle();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.owner_user_id !== userId) {
    return NextResponse.json({ error: 'Not the team owner' }, { status: 403 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('org_tier')
    .eq('user_id', userId)
    .maybeSingle();
  const tier = profile?.org_tier || 'org_free';
  if (!tierAtLeast(tier, 'org_elite')) {
    return NextResponse.json(
      { error: 'Custom branding requires Organization Elite', required_tier: 'org_elite', current_tier: tier },
      { status: 402 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('team_workspaces')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(Array.from(ALLOWED_FIELDS).join(','))
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ branding: data });
}
