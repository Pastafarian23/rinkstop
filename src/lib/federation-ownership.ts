/**
 * Federation ownership, claim invites, and owner capabilities.
 *
 * ⚠️  DO NOT confuse this with `src/lib/federations.ts`, which is the
 *     static IIHF membership reference table (FEDERATIONS, lookupFederation,
 *     Federation, FederationDoc, COUNTRY_OPTIONS). That file is a DATA
 *     TABLE, not an ownership system. This file is the ownership system.
 *
 * Context (Arnel, 2026-10-29 18:07 CDT): federations are contacted directly
 * (e.g. Ice Hockey Association of India via their General Secretary). The
 * federation gets a SINGLE invite link that Arnel sends personally. There is
 * NO public federation claim button — `/profile/claim` is useless without a
 * valid, email-bound invite token.
 *
 * All DB access is via `supabaseAdmin` (service role). The invite tables have
 * RLS enabled with NO policies and no anon/authenticated grants, so nothing
 * here is reachable from a browser except through these server-side paths.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';

/** The federation entity type as stored in `claims.claim_type`. */
export const FEDERATION_CLAIM_TYPE = 'federation' as const;

/**
 * Invite tokens are URL-safe. 32 bytes of entropy → 43 base64url chars.
 * That is not guessable, and the table lookup is by exact match, so the
 * token IS the credential.
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Default invite lifetime. Long enough for a national body to route an
 *  email to the right person; short enough that a leaked link goes stale. */
export const DEFAULT_INVITE_DAYS = 30;

export interface FederationInvite {
  id: string;
  token: string;
  federation_id: string;
  email: string;
  contact_name: string | null;
  note: string | null;
  max_uses: number;
  times_used: number;
  expires_at: string;
  revoked_at: string | null;
  created_by: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface FederationInviteWithFederation extends FederationInvite {
  federation_name: string;
  federation_slug: string;
  federation_country_code: string | null;
}

export type InviteFailureReason =
  | 'invite_not_found'
  | 'invite_revoked'
  | 'invite_expired'
  | 'invite_exhausted'
  | 'invite_email_mismatch';

export type InviteValidation =
  | { ok: true; invite: FederationInviteWithFederation; message?: string }
  | { ok: false; reason: InviteFailureReason; message: string };

const FAILURE_COPY: Record<InviteFailureReason, string> = {
  invite_not_found: 'This claim link is not valid. Ask us for a new one.',
  invite_revoked: 'This claim link has been revoked. Ask us for a new one.',
  invite_expired: 'This claim link has expired. Ask us for a new one.',
  invite_exhausted: 'This claim link has already been used. Ask us for a new one.',
  invite_email_mismatch:
    'This claim link was sent to a different email address. Sign in with the address it was sent to, or ask us for a new link.',
};

/**
 * Look up an invite by token WITHOUT consuming it, so the page can render
 * "you are invited to claim X" before the user signs in.
 *
 * The email check is NOT applied here — the signed-in user may not exist yet.
 * It is applied at redemption time (see redeemInvite), which is the only
 * point where we know the user's email.
 */
/**
 * Fetch the raw invite row + its federation, WITHOUT applying the
 * usage/expiry checks.
 *
 * Split out from `getInviteByToken` because `redeemInvite` must be able to
 * read an invite it has just consumed (times_used is now at max) without
 * that read reporting the invite as exhausted.
 */
async function fetchInviteRow(clean: string) {
  const { data, error } = await supabaseAdmin
    .from('federation_claim_invites')
    .select(
      'id, token, federation_id, email, contact_name, note, max_uses, times_used, expires_at, revoked_at, created_by, accepted_by, accepted_at, created_at',
    )
    .eq('token', clean)
    .maybeSingle();

  if (error) {
    console.error('[federation-ownership] invite lookup failed:', error);
    return { data: null, invite: null };
  }
  if (!data) return { data: null, invite: null };

  const { data: federation } = await supabaseAdmin
    .from('federations')
    .select('name, slug, country_code')
    .eq('id', data.federation_id)
    .maybeSingle();

  const invite: FederationInviteWithFederation = {
    ...(data as FederationInvite),
    federation_name: federation?.name ?? 'this federation',
    federation_slug: federation?.slug ?? '',
    federation_country_code: federation?.country_code ?? null,
  };
  return { data, invite };
}

export async function getInviteByToken(token: string): Promise<InviteValidation> {
  const clean = (token || '').trim();
  if (!clean) {
    return { ok: false, reason: 'invite_not_found', message: FAILURE_COPY.invite_not_found };
  }

  const { invite } = await fetchInviteRow(clean);
  if (!invite) {
    return { ok: false, reason: 'invite_not_found', message: FAILURE_COPY.invite_not_found };
  }

  if (invite.revoked_at) {
    return { ok: false, reason: 'invite_revoked', message: FAILURE_COPY.invite_revoked };
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'invite_expired', message: FAILURE_COPY.invite_expired };
  }
  if (invite.times_used >= invite.max_uses) {
    return { ok: false, reason: 'invite_exhausted', message: FAILURE_COPY.invite_exhausted };
  }

  return { ok: true, invite };
}

/**
 * Validate + consume an invite for a signed-in user.
 *
 * Uses the `redeem_federation_claim_invite` SQL function so the check-and-
 * consume happens atomically under a row lock (no double-redemption race).
 */
export async function redeemInvite(
  token: string,
  email: string,
  userId: string,
): Promise<InviteValidation> {
  const { data, error } = await supabaseAdmin.rpc('redeem_federation_claim_invite', {
    p_token: (token || '').trim(),
    p_email: (email || '').trim(),
    p_user_id: userId,
  });

  if (error) {
    const raw = String(error.message || '');
    const known: InviteFailureReason[] = [
      'invite_not_found',
      'invite_revoked',
      'invite_expired',
      'invite_exhausted',
      'invite_email_mismatch',
    ];
    const reason = known.find((k) => raw.includes(k)) ?? 'invite_not_found';
    return { ok: false, reason, message: FAILURE_COPY[reason] };
  }

  // The invite was consumed by the RPC above. Re-read it WITHOUT the usage
  // check — calling getInviteByToken here would report `invite_exhausted`
  // for a redemption that just succeeded (times_used is now at max).
  const { invite } = await fetchInviteRow((token || '').trim());
  if (!invite) {
    return { ok: false, reason: 'invite_not_found', message: FAILURE_COPY.invite_not_found };
  }
  return { ok: true, invite };
}

/**
 * Is this user the approved owner of this federation?
 *
 * Reads `federations.owner_user_id` directly (service role). The SQL helper
 * `public.is_federation_admin` exists too, but the direct read is cheaper and
 * lets us distinguish "no federation" from "not the owner".
 */
export async function isFederationOwner(
  userId: string | null | undefined,
  federationId: string,
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabaseAdmin
    .from('federations')
    .select('owner_user_id')
    .eq('id', federationId)
    .maybeSingle();
  if (error || !data) return false;
  return data.owner_user_id === userId;
}

/**
 * Fields a federation owner may edit directly. These publish immediately —
 * they are self-evident facts about the organisation (its own name, logo,
 * website, contact).
 *
 * Deliberately NOT in this list: `slug`, `country_code`, `kind`, `category`,
 * `is_active`, `owner_user_id`. Those change the URL, the country mapping,
 * or the ownership itself — Arnel's call, not the federation's.
 */
export const FEDERATION_OWNER_EDITABLE_FIELDS = [
  'name',
  'description',
  'website_url',
  'contact_email',
  'contact_phone',
  'logo_url',
] as const;

export type FederationOwnerEditableField = (typeof FEDERATION_OWNER_EDITABLE_FIELDS)[number];

const FIELD_VALIDATORS: Record<FederationOwnerEditableField, (v: unknown) => string | null> = {
  name: (v) =>
    typeof v === 'string' && v.trim().length >= 1 && v.length <= 200
      ? null
      : 'name must be 1-200 characters',
  description: (v) =>
    typeof v === 'string' && v.length <= 4000 ? null : 'description must be 4000 characters or fewer',
  website_url: (v) =>
    v === null || (typeof v === 'string' && v.length <= 500)
      ? null
      : 'website_url must be 500 characters or fewer',
  contact_email: (v) =>
    v === null || (typeof v === 'string' && v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v))
      ? null
      : 'contact_email must be a valid email address',
  contact_phone: (v) =>
    v === null || (typeof v === 'string' && v.length <= 50) ? null : 'contact_phone is too long',
  logo_url: (v) =>
    v === null || (typeof v === 'string' && v.length <= 500) ? null : 'logo_url is too long',
};

/**
 * Validate a patch of federation profile fields.
 * Returns the cleaned update object, or an error.
 */
export function validateFederationPatch(
  body: Record<string, unknown>,
):
  | { ok: true; update: Partial<Record<FederationOwnerEditableField, unknown>> }
  | { ok: false; field: string; message: string } {
  const update: Partial<Record<FederationOwnerEditableField, unknown>> = {};

  for (const [field, value] of Object.entries(body)) {
    if (!(FEDERATION_OWNER_EDITABLE_FIELDS as readonly string[]).includes(field)) {
      return { ok: false, field, message: `Field "${field}" cannot be edited here.` };
    }
    const err = FIELD_VALIDATORS[field as FederationOwnerEditableField](value);
    if (err) return { ok: false, field, message: err };
    update[field as FederationOwnerEditableField] = value === null ? null : value;
  }

  if (Object.keys(update).length === 0) {
    return { ok: false, field: '(none)', message: 'Nothing to update.' };
  }

  return { ok: true, update };
}

/**
 * The DB-backed federation row (as opposed to the static IIHF reference).
 *
 * `federations` is the system of record for anything a federation owner can
 * change: description, logo, contact details, ownership, and the member
 * leagues/clubs linked to it.
 */
export interface FederationRow {
  id: string;
  slug: string;
  name: string;
  country_code: string | null;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  owner_user_id: string | null;
  is_active: boolean | null;
  kind: string | null;
  category: string | null;
  claimable: boolean | null;
}

const FEDERATION_ROW_FIELDS =
  'id, slug, name, country_code, logo_url, website_url, description, contact_email, contact_phone, owner_user_id, is_active, kind, category, claimable';

/** Look up the DB federation row for an ISO-2 country code. */
export async function getFederationByCountryCode(
  countryCode: string | null | undefined,
): Promise<FederationRow | null> {
  if (!countryCode) return null;
  const { data, error } = await supabaseAdmin
    .from('federations')
    .select(FEDERATION_ROW_FIELDS)
    .eq('country_code', countryCode.trim().toUpperCase())
    .maybeSingle();
  if (error) {
    console.error('[federation-ownership] federation lookup by country code failed:', error);
    return null;
  }
  return (data as FederationRow) ?? null;
}

/** Look up the DB federation row by its own slug (e.g. `in`, `ca`). */
export async function getFederationBySlug(slug: string | null | undefined): Promise<FederationRow | null> {
  if (!slug) return null;
  const { data, error } = await supabaseAdmin
    .from('federations')
    .select(FEDERATION_ROW_FIELDS)
    .eq('slug', slug.trim().toLowerCase())
    .maybeSingle();
  if (error) {
    console.error('[federation-ownership] federation lookup by slug failed:', error);
    return null;
  }
  return (data as FederationRow) ?? null;
}

/**
 * The leagues and clubs linked to a federation (i.e. its members).
 * Returns empty arrays when nothing is linked yet.
 */
export async function getFederationMembers(
  federationId: string,
): Promise<{ leagues: Record<string, unknown>[]; clubs: Record<string, unknown>[] }> {
  const [{ data: leagues }, { data: clubs }] = await Promise.all([
    supabaseAdmin
      .from('leagues')
      .select('id, name, slug, country, level, website_url, is_active')
      .eq('federation_id', federationId)
      .order('name', { ascending: true })
      .limit(200),
    supabaseAdmin
      .from('team_workspaces')
      .select('id, name, slug, home_city, home_country, level, visibility, is_active')
      .eq('federation_id', federationId)
      .eq('visibility', 'public')
      .order('name', { ascending: true })
      .limit(400),
  ]);
  return {
    leagues: (leagues ?? []) as unknown as Record<string, unknown>[],
    clubs: (clubs ?? []) as unknown as Record<string, unknown>[],
  };
}

/**
 * Apply the side effect of APPROVING a federation claim.
 *
 * Kept here (not inline in the review route) so it can be exercised by
 * `scripts/_test-federation-claim-flow.mjs` against the live database —
 * a test that re-implements the rules would only test the copy.
 *
 * Rules:
 *   - The federation must exist and be claimable.
 *   - Ownership is NEVER transferred away from an existing different owner.
 *   - One admin per federation for now: if the claimer already owns another
 *     federation, the claim is recorded but ownership is not transferred.
 *
 * Returns either { ok: true } or { ok: false, code, message }.
 */
export type OwnershipResult =
  | { ok: true; warning: string | null }
  | { ok: false; code: string; message: string };

export async function applyFederationOwnership(
  claim: { user_id: string; entity_id: string | null },
): Promise<OwnershipResult> {
  if (!claim.entity_id) {
    return { ok: false, code: 'no_entity_id', message: 'Claim has no entity_id; cannot approve automatically.' };
  }

  const { data: federation, error: fedErr } = await supabaseAdmin
    .from('federations')
    .select('id, name, slug, owner_user_id, claimable')
    .eq('id', claim.entity_id)
    .maybeSingle();

  if (fedErr) {
    console.error('[federation-ownership] federation lookup failed:', fedErr);
    return { ok: false, code: 'federation_lookup_failed', message: 'Failed to look up the federation.' };
  }
  if (!federation) {
    return { ok: false, code: 'federation_missing', message: 'Federation not found; cannot approve.' };
  }
  if (federation.claimable === false) {
    return { ok: false, code: 'federation_not_claimable', message: 'This federation is not claimable.' };
  }

  if (federation.owner_user_id && federation.owner_user_id !== claim.user_id) {
    return {
      ok: true,
      warning:
        'This federation already has an owner. The claim was recorded, but ownership was NOT transferred. Transfer ownership manually if that was the intent.',
    };
  }

  // One federation per admin (for now).
  const { data: otherOwned } = await supabaseAdmin
    .from('federations')
    .select('id, name')
    .eq('owner_user_id', claim.user_id)
    .neq('id', claim.entity_id)
    .limit(1);
  if (otherOwned && otherOwned.length > 0) {
    return {
      ok: true,
      warning: `This user already administers ${otherOwned[0].name}. The claim was recorded, but ownership was NOT transferred — one admin per federation for now.`,
    };
  }

  const { error: ownerErr } = await supabaseAdmin
    .from('federations')
    .update({ owner_user_id: claim.user_id, updated_at: new Date().toISOString() })
    .eq('id', claim.entity_id);
  if (ownerErr) {
    console.error('[federation-ownership] owner update failed:', ownerErr);
    return { ok: false, code: 'federation_owner_update_failed', message: 'Failed to set federation ownership.' };
  }

  return { ok: true, warning: null };
}

/**
 * ISO-2 country code → country name, matching the names used in
 * `rinks.country`, `leagues.country`, and `team_workspaces.home_country`.
 *
 * `federations.country_code` stores ISO-2 ('IN'). The directory tables store
 * full names ('India'). This map is the bridge.
 *
 * Built by inverting `COUNTRY_TO_ISO` from `src/lib/country-page.ts` so the
 * two cannot drift.
 */
let _countryByCode: Map<string, string> | null = null;

export async function countryNameFromCode(code: string | null | undefined): Promise<string | null> {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  if (!upper) return null;

  if (!_countryByCode) {
    const { COUNTRY_TO_ISO } = await import('@/lib/country-page');
    const map = new Map<string, string>();
    for (const [name, iso] of Object.entries(COUNTRY_TO_ISO)) {
      // A couple of duplicate keys point at one code ('United Kingdom' and
      // 'Great Britain' → GB). First name wins so the output matches the
      // canonical directory name.
      if (!map.has(iso)) map.set(iso, name);
    }
    // Canonical fixes for the codes the directory tables actually use.
    map.set('GB', 'United Kingdom');
    map.set('IN', 'India');
    _countryByCode = map;
  }

  return _countryByCode.get(upper) ?? null;
}
