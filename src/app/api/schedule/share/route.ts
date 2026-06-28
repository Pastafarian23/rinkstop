import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { hasTeamAdminAccess } from '@/lib/tier-gate';

// In-memory token store. Per Next.js, each route file is bundled separately
// in production so module-level Maps don't share between sibling routes.
// We use globalThis so the POST /api/schedule/share (create) handler and
// the GET /api/schedule/share/[token] (read) handler see the same store.
// Tradeoff: tokens are ephemeral and lost on server restart. Acceptable for
// v1 — documented in piece-G1c prep doc. If usage grows, migrate to a
// Supabase table.

declare global {
  // eslint-disable-next-line no-var
  var __rinkstopShareStore: Map<string, { userId: string; createdAt: number; expiresAt: number }> | undefined;
}

function getStore(): Map<string, { userId: string; createdAt: number; expiresAt: number }> {
  if (!globalThis.__rinkstopShareStore) {
    globalThis.__rinkstopShareStore = new Map();
  }
  return globalThis.__rinkstopShareStore;
}

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const dynamic = 'force-dynamic';

function generateToken(): string {
  // 32-char URL-safe token: 16 random bytes → base64url
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // base64url encode (no padding)
  let b64 = '';
  for (let i = 0; i < bytes.length; i++) b64 += String.fromCharCode(bytes[i]);
  return btoa(b64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * GET /api/schedule/share
 *
 * Returns the user's existing share token (if any). 404 if no active token.
 * Tier-gated: paid tier required.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
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

  const now = Date.now();
  for (const [token, meta] of getStore().entries()) {
    if (meta.userId === userId) {
      if (meta.expiresAt < now) {
        getStore().delete(token);
      } else {
        return NextResponse.json({
          token,
          createdAt: new Date(meta.createdAt).toISOString(),
          expiresAt: new Date(meta.expiresAt).toISOString(),
          url: `/schedule/share/${token}/`,
        });
      }
    }
  }
  return new NextResponse(JSON.stringify({ error: 'no_active_token' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/schedule/share
 *
 * Generates a new share token for the user (replaces any existing one).
 * Tier-gated.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
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

  // Revoke any existing tokens for this user
  for (const [token, meta] of getStore().entries()) {
    if (meta.userId === userId) getStore().delete(token);
  }

  const now = Date.now();
  const token = generateToken();
  getStore().set(token, {
    userId,
    createdAt: now,
    expiresAt: now + TOKEN_TTL_MS,
  });

  return NextResponse.json({
    token,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TOKEN_TTL_MS).toISOString(),
    url: `/schedule/share/${token}/`,
  });
}

/**
 * DELETE /api/schedule/share
 *
 * Revokes any active share token for the user. No content-type required.
 */
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse(JSON.stringify({ error: 'unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let revoked = 0;
  for (const [token, meta] of getStore().entries()) {
    if (meta.userId === userId) {
      getStore().delete(token);
      revoked++;
    }
  }
  return NextResponse.json({ ok: true, revoked });
}