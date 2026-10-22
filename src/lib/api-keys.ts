// src/lib/api-keys.ts
//
// Verification for RinkStop's paid public API (Organization Pro "API access").
//
// HISTORY / WHY THIS FILE EXISTS
// Keys could already be ISSUED via /api/manage/team/[id]/api-keys (stored
// sha256-hashed, plaintext returned once). But /api/v1/org/* never called any
// verification — the route header comments documented `x-api-key` auth while
// the handlers only checked `is_published`. So the feature was advertised on
// a $999 plan and enforced nowhere.
//
// This module is the single place that turns a presented key into an
// authorization decision. Every /api/v1 route must call it.
//
// SECURITY NOTES
//  - Keys are stored as sha256 hex digests, so verification is a digest
//    lookup, not a scan-and-compare. Constant-time concerns are therefore
//    not load-bearing here: we never compare a presented secret to a stored
//    digest. We compare a digest of the presented secret to a stored digest,
//    which is an indexed equality lookup.
//  - We look the row up by (team_id, key_hash) so a key issued for org A can
//    never authorize a read of org B.
//  - Revoked keys are excluded in the query itself, not in JS.
//  - `last_used_at` is bumped best-effort; a failure to record usage must
//    never fail an otherwise-valid request.

import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';

export interface ApiKeyVerification {
  ok: boolean;
  /** Present when ok — the owning team/org id. */
  teamId?: string;
  ownerUserId?: string;
  scopes?: string[];
  reason?: 'missing' | 'malformed' | 'invalid' | 'revoked';
}

function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Verify a presented API key for a given org/team.
 *
 * Returns `{ ok: true, teamId, scopes }` when the key is valid, unrevoked,
 * and was issued for THIS org. Any failure returns a discriminated reason so
 * routes can distinguish "no key" from "wrong key" without leaking whether a
 * given key exists.
 */
export async function verifyOrgApiKey(
  presented: string | null | undefined,
  orgId: string,
): Promise<ApiKeyVerification> {
  if (!presented || presented.trim() === '') {
    return { ok: false, reason: 'missing' };
  }

  const key = presented.trim();
  // Our keys are minted as `rs_live_<base64url>`. Reject obvious garbage
  // early so we never hash a megabyte-long header value.
  if (!key.startsWith('rs_live_') || key.length > 200) {
    return { ok: false, reason: 'malformed' };
  }

  const digest = hashKey(key);

  const { data, error } = await supabaseAdmin
    .from('team_api_keys')
    .select('id, team_id, owner_user_id, scopes')
    .eq('team_id', orgId)
    .eq('key_hash', digest)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    // A DB failure must fail CLOSED, not open.
    console.error('[api-keys] verification query failed:', error.message);
    return { ok: false, reason: 'invalid' };
  }

  if (!data) return { ok: false, reason: 'invalid' };

  // Best-effort usage stamp. Never blocks a valid request.
  try {
    await supabaseAdmin
      .from('team_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);
  } catch {
    /* non-fatal */
  }

  return {
    ok: true,
    teamId: data.team_id,
    ownerUserId: data.owner_user_id,
    scopes: data.scopes ?? [],
  };
}

/**
 * Read the key from the conventional places callers might use, in priority
 * order: `x-api-key` header (documented, canonical) then
 * `Authorization: Bearer <key>`.
 */
export function extractPresentedKey(req: Request): string | null {
  const header = req.headers.get('x-api-key');
  if (header) return header;
  const auth = req.headers.get('authorization');
  if (auth && /^bearer\s+/i.test(auth)) {
    return auth.replace(/^bearer\s+/i, '').trim();
  }
  return null;
}

/**
 * Uniform 401 for every failure mode.
 *
 * The response body is IDENTICAL for missing / malformed / invalid / revoked.
 * The reason is logged server-side only — putting it in the body would let an
 * attacker distinguish "no key" from "wrong key" from "revoked key" and
 * enumerate valid key prefixes. (An earlier version of this function leaked
 * it as `detail`; caught in the 2026-10-22 review.)
 */
export function apiKeyUnauthorized(reason: ApiKeyVerification['reason']) {
  console.warn('[api-keys] unauthorized request', JSON.stringify({ reason }));
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
  );
}