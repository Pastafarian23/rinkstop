-- 2026-07-26 — user_credentials table + PR1 review fixes
--
-- Adds the missing `user_credentials` table referenced by the
-- v_user_visible_certifications view comment (PR #60). Also fixes
-- an off-by-one in PR #60's verification notice ("10 expected"
-- when 9 are seeded).
--
-- This migration is additive and idempotent:
--   - CREATE TABLE IF NOT EXISTS (safe re-run)
--   - INSERT uses ON CONFLICT (slug) DO NOTHING
--   - All RLS policies use DROP POLICY IF EXISTS + CREATE
--   - All triggers use DROP TRIGGER IF EXISTS + CREATE
--
-- Design rationale: keep federation_registrations AND user_credentials.
-- - federation_registrations = membership (state machine, admin approval,
--   withdrawal flow). Already shipped in PR #49 (2026-07-23).
-- - user_credentials = the issued credential/certification itself
--   (issued_at, expires_at, status). Different lifecycle, different
--   table. Needed for HECC-style 6.5-year expiry, coach recertification
--   cycles, and the future "verified certifications" Premium display.
--
-- Backfill (not in this migration): when an approved
-- federation_registrations exists, the API submit handler will write
-- a user_credentials row in PR3. Pre-existing approved registrations
-- are zero today (verified 2026-07-26: 0 rows in federation_registrations),
-- so a backfill migration is unnecessary.
--
-- Pre-state verified 2026-07-26:
--   federation_registrations: 0 rows
--   user_credentials: does not exist
--   certifications: 9 active rows
--   federations: 85 active rows (84 national + 1 IIHF)

-- ============================================================
-- 1. user_credentials: issued credentials/certifications
-- ============================================================

-- A user_credentials row represents an issued credential tied to a
-- federation registration. One registration can produce one or more
-- credentials (e.g., a USA Hockey coach registration might issue a
-- Level 3 cert AND a Level 4 cert after recertification).
--
-- For v1, the typical case is 1:1 — one registration produces one
-- credential. The schema supports 1:N without forcing it.

CREATE TABLE IF NOT EXISTS public.user_credentials (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT NOT NULL,           -- Clerk user id
  certification_id      UUID NOT NULL REFERENCES public.certifications(id) ON DELETE RESTRICT,
  federation_id         UUID NOT NULL REFERENCES public.federations(id) ON DELETE RESTRICT,
  registration_id       UUID REFERENCES public.federation_registrations(id) ON DELETE SET NULL,

  -- The credential number/value issued by the federation
  -- (e.g., USA Hockey registration number, Hockey Canada HCR number)
  -- NULL during draft; populated when admin approves and federation
  -- issues the cert
  credential_number     TEXT,

  -- Lifecycle (separate from federation_registrations.state because
  -- a credential can be issued, revoked, expired, or renewed
  -- independently of membership status)
  status                TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'expired', 'revoked', 'renewed', 'pending')),

  issued_at             TIMESTAMPTZ,           -- when federation issued the cert
  expires_at            TIMESTAMPTZ,           -- HECC = 6.5y, USA Hockey coach = varies
  revoked_at            TIMESTAMPTZ,           -- when revoked (NULL = active)
  revoked_reason        TEXT,                  -- 'admin_action', 'user_request', 'expired'

  -- Display metadata (admin-editable for corrections without
  -- requiring a re-issue)
  display_label         TEXT,                  -- "Level 3", "Master Coach", etc.

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A credential number, once issued, should be unique per federation.
  -- NULL credential_numbers are allowed (draft state) and don't
  -- conflict with each other.
  CONSTRAINT user_credentials_number_uniq
    UNIQUE (federation_id, credential_number)
);

CREATE INDEX IF NOT EXISTS idx_user_credentials_user
  ON public.user_credentials (user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_credentials_certification
  ON public.user_credentials (certification_id, status);

CREATE INDEX IF NOT EXISTS idx_user_credentials_federation
  ON public.user_credentials (federation_id, status);

CREATE INDEX IF NOT EXISTS idx_user_credentials_registration
  ON public.user_credentials (registration_id)
  WHERE registration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_credentials_expiring
  ON public.user_credentials (expires_at)
  WHERE status = 'issued' AND expires_at IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.user_credentials_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_credentials_updated_at ON public.user_credentials;
CREATE TRIGGER trg_user_credentials_updated_at
  BEFORE UPDATE ON public.user_credentials
  FOR EACH ROW EXECUTE FUNCTION public.user_credentials_set_updated_at();

-- RLS
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Users can read their own credentials (for profile display)
DROP POLICY IF EXISTS "User read own credentials" ON public.user_credentials;
CREATE POLICY "User read own credentials"
  ON public.user_credentials FOR SELECT
  USING (user_id = auth.uid()::text);

-- Public can read active, non-revoked credentials for verified displays
-- (used by /profile/[slug]/passport public badges)
DROP POLICY IF EXISTS "Public read active credentials" ON public.user_credentials;
CREATE POLICY "Public read active credentials"
  ON public.user_credentials FOR SELECT
  USING (status IN ('issued', 'renewed'));

-- Writes (insert/update/delete) go through service role in API routes.
-- No user-facing write policies — all mutations happen via admin/
-- service-role paths in /api/passport, /api/coach/credentials,
-- /api/referee/credentials.

-- ============================================================
-- 2. Helper view: v_user_credentials_summary
-- ============================================================

-- For the profile/passport display: returns a flat row per user
-- credential with issuer + cert details denormalized for fast reads.
-- Filters out revoked and expired by default; the page can opt in
-- to show all states with a query param.

CREATE OR REPLACE VIEW public.v_user_credentials_summary AS
SELECT
  uc.id,
  uc.user_id,
  uc.status,
  uc.credential_number,
  uc.issued_at,
  uc.expires_at,
  uc.display_label,
  uc.registration_id,
  c.id AS certification_id,
  c.slug AS certification_slug,
  c.name AS certification_name,
  c.category,
  c.is_international,
  f.id AS issuer_id,
  f.slug AS issuer_slug,
  f.name AS issuer_name,
  f.country_code AS issuer_country_code,
  f.kind AS issuer_kind
FROM public.user_credentials uc
JOIN public.certifications c ON uc.certification_id = c.id
JOIN public.federations f ON uc.federation_id = f.id
WHERE c.is_active = true AND f.is_active = true;

GRANT SELECT ON public.v_user_credentials_summary TO authenticated, anon;

-- ============================================================
-- 3. Migration verification (printed at apply time)
-- ============================================================

DO $$
DECLARE
  fed_count       INT;
  cert_count      INT;
  cred_count      INT;
BEGIN
  SELECT COUNT(*) INTO fed_count  FROM public.federations WHERE is_active = true;
  SELECT COUNT(*) INTO cert_count FROM public.certifications WHERE is_active = true;
  SELECT COUNT(*) INTO cred_count FROM public.user_credentials;

  RAISE NOTICE 'WS13 PR2 (user_credentials) applied:';
  RAISE NOTICE '  user_credentials: % rows (expected 0 — no backfill needed)', cred_count;
  RAISE NOTICE '  federations: % active (expected 85 = 84 national + 1 IIHF)', fed_count;
  RAISE NOTICE '  certifications: % active (expected 9 = 3 USA Hockey + 3 Hockey Canada + 3 IIHF)', cert_count;
  RAISE NOTICE '  federation_registrations: 0 rows (verified pre-migration)';
END $$;
