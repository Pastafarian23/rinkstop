-- =============================================================================
-- 2026-10-29 — Federation ownership, claim type, and invite-gated claiming
-- =============================================================================
-- Context (Arnel, 2026-10-29 18:07 CDT): federations are contacted directly
-- (e.g. Ice Hockey Association of India via their General Secretary). The
-- invite link goes to the vetted contact only — there is NO public federation
-- claim button. This migration provides the schema that makes that flow real:
--
--   1. federations gains ownership + editable profile fields.
--   2. claims.claim_type accepts 'federation'.
--   3. federation_claim_invites holds the single-use, expiring, email-bound
--      tokens that gate /profile/claim.
--   4. federation_member_requests holds league/club additions submitted by a
--      federation admin, which Arnel approves in admin before they go live.
--
-- Design notes:
-- - Profile edits (name/logo/website/contact/description) publish INSTANTLY:
--   they are self-evident and the federation is a vetted counterparty.
-- - Member league / club additions go through admin approval so a leaked or
--   stolen invite token cannot spam the public directory.
-- - All table/column references are public.-qualified because the lookup
--   helpers set search_path to ''. (See MEMORY.md: search-path hardening
--   breaks unqualified table references.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. federations: ownership + editable profile fields
-- -----------------------------------------------------------------------------
ALTER TABLE public.federations
  ADD COLUMN IF NOT EXISTS owner_user_id TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS logo_source TEXT,
  ADD COLUMN IF NOT EXISTS logo_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pending_name TEXT,
  ADD COLUMN IF NOT EXISTS pending_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS pending_description TEXT,
  ADD COLUMN IF NOT EXISTS pending_website_url TEXT,
  ADD COLUMN IF NOT EXISTS pending_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS pending_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS pending_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_submitted_by TEXT;

CREATE INDEX IF NOT EXISTS idx_federations_owner_user_id
  ON public.federations (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_federations_country_code_active
  ON public.federations (country_code)
  WHERE is_active = true;

COMMENT ON COLUMN public.federations.owner_user_id IS
  'Clerk user id of the approved federation admin. Null = not claimed.';
COMMENT ON COLUMN public.federations.claimable IS
  'False = never claimable by invite (e.g. curated IIHF-only entries).';
COMMENT ON COLUMN public.federations.pending_name IS
  'Pending display-name change, awaiting RinkStop admin approval.';

-- -----------------------------------------------------------------------------
-- 2. claims: allow 'federation' as a claim type
-- -----------------------------------------------------------------------------
-- Live constraint (verified 2026-10-29):
--   claims_claim_type_check CHECK (claim_type = ANY (ARRAY['rink','team','player']))
-- The league/player paths rely on this list, so the new value is added rather
-- than replacing the constraint.
ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS claims_claim_type_check;
ALTER TABLE public.claims ADD CONSTRAINT claims_claim_type_check
  CHECK (claim_type = ANY (ARRAY['rink'::text, 'team'::text, 'player'::text, 'federation'::text]));

-- -----------------------------------------------------------------------------
-- 3. federation_claim_invites — the invite tokens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.federation_claim_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token         TEXT NOT NULL UNIQUE,
  federation_id UUID NOT NULL REFERENCES public.federations(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  contact_name  TEXT,
  note          TEXT,
  max_uses      INTEGER NOT NULL DEFAULT 1,
  times_used    INTEGER NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  revoked_at    TIMESTAMPTZ,
  created_by    TEXT,
  accepted_by   TEXT,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_federation_claim_invites_federation_id
  ON public.federation_claim_invites (federation_id);
CREATE INDEX IF NOT EXISTS idx_federation_claim_invites_email
  ON public.federation_claim_invites (email);

COMMENT ON TABLE public.federation_claim_invites IS
  'Single-use, expiring, email-bound invite tokens for /profile/claim. Created by a RinkStop admin; redeemed by the vetted federation contact.';

ALTER TABLE public.federation_claim_invites ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: every read/write goes through the service-role
-- client in server code (admin API + /profile/claim). No anon/authenticated
-- role may read or write this table directly.

-- -----------------------------------------------------------------------------
-- 4. federation_member_requests — league / club additions needing approval
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.federation_member_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federation_id  UUID NOT NULL REFERENCES public.federations(id) ON DELETE CASCADE,
  member_type    TEXT NOT NULL CHECK (member_type IN ('league', 'club')),
  -- For member_type='league': the league being linked.
  -- For member_type='club': the team_workspaces row being linked.
  league_id      UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  team_id        UUID REFERENCES public.team_workspaces(id) ON DELETE CASCADE,
  -- For a NEW league the federation wants us to create.
  proposed_name  TEXT,
  proposed_slug  TEXT,
  proposed_country TEXT,
  proposed_level TEXT,
  proposed_website_url TEXT,
  proposed_description TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by    TEXT,
  reviewed_at    TIMESTAMPTZ,
  review_note    TEXT,
  submitted_by   TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_federation_member_requests_federation_id
  ON public.federation_member_requests (federation_id);
CREATE INDEX IF NOT EXISTS idx_federation_member_requests_status
  ON public.federation_member_requests (status);

-- Exactly one target: either an existing row is being linked, or a new
-- league is being proposed.
ALTER TABLE public.federation_member_requests
  DROP CONSTRAINT IF EXISTS federation_member_requests_exactly_one_target;
ALTER TABLE public.federation_member_requests
  ADD CONSTRAINT federation_member_requests_exactly_one_target CHECK (
    (member_type = 'league' AND (league_id IS NOT NULL OR proposed_name IS NOT NULL))
    OR (member_type = 'club' AND team_id IS NOT NULL)
  );

COMMENT ON TABLE public.federation_member_requests IS
  'Member league/club submissions from a federation admin. Require RinkStop admin approval before they affect the public directory.';

ALTER TABLE public.federation_member_requests ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. leagues + team_workspaces: federation link columns already exist
-- -----------------------------------------------------------------------------
-- public.leagues.federation_id  -> UUID (exists)
-- public.team_workspaces.federation_id -> UUID (exists)
-- Both are currently 0/NULL. The member-request approval flow sets them.
-- Nothing to add here — recorded so the link is not duplicated.

-- -----------------------------------------------------------------------------
-- 6. Helper: is this user an approved admin of this federation?
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER so the check can read federations.owner_user_id while the
-- caller's own search_path is empty. Fully qualified inside.
CREATE OR REPLACE FUNCTION public.is_federation_admin(p_user_id TEXT, p_federation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner TEXT;
BEGIN
  IF p_user_id IS NULL OR p_federation_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT f.owner_user_id INTO v_owner
  FROM public.federations f
  WHERE f.id = p_federation_id;

  RETURN v_owner IS NOT NULL AND v_owner = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.is_federation_admin(TEXT, UUID) IS
  'True when the user owns the federation (approved claim). Used by the federation dashboard and manage API.';

-- -----------------------------------------------------------------------------
-- 7. Helper: redeem an invite (validates token, expiry, email, uses)
-- -----------------------------------------------------------------------------
-- Returns the federation id if the token is usable, else raises.
-- Email binding is enforced by the caller passing the signed-in user's email.
CREATE OR REPLACE FUNCTION public.redeem_federation_claim_invite(
  p_token TEXT,
  p_email TEXT,
  p_user_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.federation_claim_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite
  FROM public.federation_claim_invites i
  WHERE i.token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;
  IF v_invite.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'invite_revoked';
  END IF;
  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;
  IF v_invite.times_used >= v_invite.max_uses THEN
    RAISE EXCEPTION 'invite_exhausted';
  END IF;
  IF lower(trim(v_invite.email)) <> lower(trim(p_email)) THEN
    RAISE EXCEPTION 'invite_email_mismatch';
  END IF;

  UPDATE public.federation_claim_invites i
  SET times_used = i.times_used + 1,
      accepted_by = COALESCE(i.accepted_by, p_user_id),
      accepted_at = COALESCE(i.accepted_at, now())
  WHERE i.id = v_invite.id;

  RETURN v_invite.federation_id;
END;
$$;

COMMENT ON FUNCTION public.redeem_federation_claim_invite(TEXT, TEXT, TEXT) IS
  'Validates + consumes a federation claim invite. Raises invite_not_found / invite_revoked / invite_expired / invite_exhausted / invite_email_mismatch.';
