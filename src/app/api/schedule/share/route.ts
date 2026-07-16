import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';
import { hasTeamAdminAccess } from '@/lib/tier-gate';
import { supabaseAdmin } from '@/lib/supabase';

// Schedule share tokens are stored in the public.schedule_share_tokens table.
// Replaces the prior in-memory globalThis Map that lost tokens on every
// Vercel cold start, making share URLs unreliable. See migration
// 2026-07-16_schedule_share_tokens.sql for the schema.

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const dynamic = 'force-dynamic';

function generateToken(): string {
  // 32-char URL-safe token: 16 random bytes → base64url.
  // crypto.getRandomValues is always available in Node.js runtime (>=15).
  // If unavailable, throw rather than fall back to Math.random — a guessable
  // share token would expose private schedule data.
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('crypto.getRandomValues is required for share token generation');
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let b64 = '';
  for (let i = 0; i < bytes.length; i++) b64 += String.fromCharCode(bytes[i]);
  return btoa(b64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * GET /api/schedule/share
 *
 * Returns the user's existing active share token (if any). 404 if no
 * active token. Tier-gated: paid tier required.
 */
export async function GET() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return new NextResponse(JSON.stringify({ error: 'unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const gate = await hasTeamAdminAccess(userId);
  if (!gate.allowed) {
    return new NextResponse(JSON.stringify({ error: gate.reason, upgradeUrl: '/pricing' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Find the active token for this user.
  const { data, error } = await supabaseAdmin
    .from('schedule_share_tokens')
    .select('token, created_at, expires_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return new NextResponse(JSON.stringify({ error: 'lookup_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!data) {
    return new NextResponse(JSON.stringify({ error: 'no_active_token' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json({
    token: data.token,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    url: `/schedule/share/${data.token}/`,
  });
}

/**
 * POST /api/schedule/share
 *
 * Generates a new share token for the user (replaces any existing one).
 * Tier-gated.
 */
export async function POST() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return new NextResponse(JSON.stringify({ error: 'unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const gate = await hasTeamAdminAccess(userId);
  if (!gate.allowed) {
    return new NextResponse(JSON.stringify({ error: gate.reason, upgradeUrl: '/pricing' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);

  // Revoke any existing tokens for this user.
  const { error: delErr } = await supabaseAdmin
    .from('schedule_share_tokens')
    .delete()
    .eq('user_id', userId);

  if (delErr) {
    return new NextResponse(JSON.stringify({ error: 'revoke_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Issue new token.
  const token = generateToken();
  const { error: insErr } = await supabaseAdmin
    .from('schedule_share_tokens')
    .insert({
      token,
      user_id: userId,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

  if (insErr) {
    return new NextResponse(JSON.stringify({ error: 'create_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json({
    token,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    url: `/schedule/share/${token}/`,
  });
}

/**
 * DELETE /api/schedule/share
 *
 * Revokes any active share token for the user. No content-type required.
 */
export async function DELETE() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return new NextResponse(JSON.stringify({ error: 'unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Count tokens to be deleted before deletion (for response).
  const { count } = await supabaseAdmin
    .from('schedule_share_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { error } = await supabaseAdmin
    .from('schedule_share_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    return new NextResponse(JSON.stringify({ error: 'revoke_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json({ ok: true, revoked: count ?? 0 });
}