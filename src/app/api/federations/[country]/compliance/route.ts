// src/app/api/federations/[country]/compliance/route.ts
//
// Federation feature: Compliance and regulatory tools.
//   GET /api/federations/[country]/compliance
//     - Returns the federation's compliance records (public read).
//   POST /api/federations/[country]/compliance
//     - Federation admin only (any authenticated user, gated by tier +
//       claim check). Updates the record.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TIER_RANK: Record<string, number> = { free: 0, business_listing: 1, business_plus: 2, club_starter: 1, club_pro: 2, club_elite: 3, league: 4, federation: 5 };
function tierAtLeast(a: string, m: string) { return (TIER_RANK[a] ?? 0) >= (TIER_RANK[m] ?? 0); }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const code = country.toUpperCase();
  const { data, error } = await supabaseAdmin
    .from('federation_compliance')
    .select('federation_id, compliance_year, member_count, verified_clubs_count, verified_players_count, last_audit_at, next_audit_due, regulatory_flags, updated_at')
    .eq('federation_id', code)
    .order('compliance_year', { ascending: false })
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ federation: code, records: data || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ country: string }> }) {
  const session = await auth();
  const cu = await currentUser();
  if (!session.userId || !cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = cu.id;
  const { country } = await params;
  const code = country.toUpperCase();

  // Tier check: federation or higher
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('tier').eq('user_id', userId).maybeSingle();
  if (!tierAtLeast(profile?.tier || 'free', 'federation')) {
    return NextResponse.json(
      { error: 'Compliance edits require a Federation subscription', required_tier: 'federation' },
      { status: 402 }
    );
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const year = parseInt(body?.compliance_year, 10);
  if (!year || year < 1900 || year > 2100) {
    return NextResponse.json({ error: 'compliance_year required (1900-2100)' }, { status: 400 });
  }
  const update = {
    federation_id: code,
    compliance_year: year,
    member_count: body?.member_count ?? null,
    verified_clubs_count: body?.verified_clubs_count ?? null,
    verified_players_count: body?.verified_players_count ?? null,
    last_audit_at: body?.last_audit_at ?? null,
    next_audit_due: body?.next_audit_due ?? null,
    audit_notes: body?.audit_notes ?? null,
    regulatory_flags: body?.regulatory_flags ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin
    .from('federation_compliance')
    .upsert(update, { onConflict: 'federation_id,compliance_year' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ record: data });
}
