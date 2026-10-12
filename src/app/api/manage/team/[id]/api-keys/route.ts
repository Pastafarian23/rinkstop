// src/app/api/manage/team/[id]/api-keys/route.ts
//
// Club Elite feature: API key management.
//   GET   /api/manage/team/[id]/api-keys           -> list keys (without secrets)
//   POST  /api/manage/team/[id]/api-keys           -> create new key (returns plaintext once)
//   DELETE /api/manage/team/[id]/api-keys/[keyId]  -> revoke
//
// Keys are stored hashed (sha256). The plaintext is returned ONCE at
// creation time. Lost keys cannot be recovered — only revoked and replaced.

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TIER_RANK: Record<string, number> = { free: 0, business_listing: 1, business_plus: 2, club_starter: 1, club_pro: 2, club_elite: 3, league: 4, federation: 5 };
function tierAtLeast(a: string, m: string) { return (TIER_RANK[a] ?? 0) >= (TIER_RANK[m] ?? 0); }

function genKey(): { plaintext: string; prefix: string; hash: string } {
  const rnd = randomBytes(24).toString('base64url'); // 32 chars
  const plaintext = `rs_live_${rnd}`;
  const prefix = plaintext.slice(0, 11); // "rs_live_xx"
  const hash = createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, prefix, hash };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('team_api_keys')
    .select('id, name, key_prefix, scopes, last_used_at, created_at, revoked_at')
    .eq('team_id', id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const cu = await currentUser();
  if (!session.userId || !cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = cu.id;
  const { id } = await params;

  // Verify ownership + Club Elite tier
  const { data: team, error: tErr } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, owner_user_id')
    .eq('id', id)
    .maybeSingle();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.owner_user_id !== userId) return NextResponse.json({ error: 'Not the team owner' }, { status: 403 });

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('tier').eq('user_id', userId).maybeSingle();
  if (!tierAtLeast(profile?.tier || 'free', 'club_elite')) {
    return NextResponse.json({ error: 'API access requires Club Elite', required_tier: 'club_elite' }, { status: 402 });
  }

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const name = (body?.name || 'Default key').toString().slice(0, 100);
  const scopes: string[] = Array.isArray(body?.scopes) ? body.scopes.filter((s: unknown) => typeof s === 'string').slice(0, 10) : ['read:org'];

  const k = genKey();
  const { data, error } = await supabaseAdmin
    .from('team_api_keys')
    .insert({ team_id: id, owner_user_id: userId, name, key_prefix: k.prefix, key_hash: k.hash, scopes })
    .select('id, name, key_prefix, scopes, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    key: data,
    plaintext: k.plaintext,
    notice: 'Store this key now. You will not be able to retrieve it again.',
  });
}
