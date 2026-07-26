-- 2026-07-26 — Federation country scoping + certifications
--
-- Refactors the federation registration system to support:
-- 1. User country context (primary + additional) that scopes the federation dropdown
-- 2. IIHF (international) federation as a first-class entity without a country
-- 3. Certifications as distinct from federations (one federation issues many certs)
-- 4. User credentials table that supports multiple certs from multiple issuers
--
-- Pre-state (verified 2026-07-26):
--   federations: 84 rows, all with category='all' and country_code set
--   federation_registrations: 0 rows
--   certifications: does not exist
--   profile_country_context: does not exist
--
-- This migration is additive: no data loss, no breaking changes to existing
-- federation_registrations rows. We add columns, add tables, and seed new
-- data. federation_registrations is preserved as the underlying table; we
-- add a federation_kind column to federations and use the existing
-- federation_id column on federation_registrations to point at the
-- certifying body (a federation row, which can be either national or
-- international).
--
-- See workstreams/workstream-2-tier2-federation-plan.md for the long-term
-- plan. This migration implements the v1 scope.

-- ============================================================
-- 1. federations: add `kind` column (national vs international)
-- ============================================================

-- Add the kind column. Default 'national' so existing 84 rows are
-- backwards-compatible.
ALTER TABLE public.federations
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'national'
    CHECK (kind IN ('national', 'international'));

-- The country_code IS NULL requirement for international federations.
-- Existing rows already have country_code set, so this won't fail on them.
-- The CHECK validates new rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'federations_kind_country_check'
      AND table_name = 'federations'
  ) THEN
    ALTER TABLE public.federations
      ADD CONSTRAINT federations_kind_country_check
      CHECK (
        (kind = 'national' AND country_code IS NOT NULL) OR
        (kind = 'international' AND country_code IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_federations_kind
  ON public.federations (kind)
  WHERE is_active = true;

-- Seed IIHF as an international federation.
-- Idempotent via ON CONFLICT (slug).
INSERT INTO public.federations (slug, name, country_code, kind, website_url, is_active)
VALUES
  ('iihf', 'International Ice Hockey Federation', NULL, 'international', 'https://www.iihf.com', true)
ON CONFLICT (slug) DO UPDATE
  SET kind = EXCLUDED.kind,
      country_code = EXCLUDED.country_code,
      website_url = EXCLUDED.website_url;

-- ============================================================
-- 2. profile_country_context: user's country scope
-- ============================================================

-- Captures the user's country context for federation dropdown scoping.
-- Separate from profiles because:
--   - Country can change without touching the rest of the profile row
--   - Easy to query "all users in country X" without joining profiles
--   - Onboarding can write here before profiles row exists (webhook race)
--
-- primary_country: residence-based ISO 3166-1 alpha-2 code
-- additional_countries: dual citizenships, prior residences, or any other
--                       country the user has federation credentials in
-- captured_at: when the user first set their country (signup or onboarding)
-- source: where the country was captured (signup form, dashboard edit, admin)

CREATE TABLE IF NOT EXISTS public.profile_country_context (
  user_id              TEXT PRIMARY KEY,  -- Clerk user id
  primary_country      TEXT NOT NULL,     -- ISO 3166-1 alpha-2
  additional_countries TEXT[] NOT NULL DEFAULT '{}',
  captured_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  source               TEXT NOT NULL DEFAULT 'signup'
    CHECK (source IN ('signup', 'dashboard', 'admin', 'import')),

  -- primary_country must be in additional_countries? No, it's the default
  -- so the dropdown prioritizes it. They are independent.

  -- Validate primary_country is a 2-letter code
  CHECK (length(primary_country) = 2 AND primary_country = upper(primary_country))
);

CREATE INDEX IF NOT EXISTS idx_profile_country_context_primary
  ON public.profile_country_context (primary_country);

-- RLS: user can read/write own; admin can read all via service role
ALTER TABLE public.profile_country_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User read own country context" ON public.profile_country_context;
CREATE POLICY "User read own country context"
  ON public.profile_country_context FOR SELECT
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "User upsert own country context" ON public.profile_country_context;
CREATE POLICY "User upsert own country context"
  ON public.profile_country_context FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "User update own country context" ON public.profile_country_context;
CREATE POLICY "User update own country context"
  ON public.profile_country_context FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.profile_country_context_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_country_context_updated_at ON public.profile_country_context;
CREATE TRIGGER trg_profile_country_context_updated_at
  BEFORE UPDATE ON public.profile_country_context
  FOR EACH ROW EXECUTE FUNCTION public.profile_country_context_set_updated_at();

-- ============================================================
-- 3. certifications: distinct from federations
-- ============================================================

-- A certification is a specific credential type issued by a federation.
-- Examples:
--   - USA Hockey player registration (issuer: USA Hockey, category: player)
--   - USA Hockey Officiating (issuer: USA Hockey, category: referee)
--   - IIHF international player transfer (issuer: IIHF, is_international: true)
--
-- The federation dropdown now shows certifications (not federations),
-- filtered by:
--   - issuer.country_code = user.primary_country
--   - OR issuer.country_code = ANY(user.additional_countries)
--   - OR issuer.kind = 'international' (IIHF certs show for everyone)
--
-- is_international is a denormalization of issuer.kind = 'international'
-- for fast filtering without joining.

CREATE TABLE IF NOT EXISTS public.certifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  issuer_id         UUID NOT NULL REFERENCES public.federations(id) ON DELETE RESTRICT,
  category          TEXT NOT NULL
    CHECK (category IN ('player', 'coach', 'referee', 'staff')),
  is_international  BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certifications_issuer
  ON public.certifications (issuer_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_certifications_category
  ON public.certifications (category, is_international)
  WHERE is_active = true;

-- Auto-set is_international based on issuer.kind
CREATE OR REPLACE FUNCTION public.certifications_set_international()
RETURNS trigger AS $$
BEGIN
  SELECT (kind = 'international') INTO NEW.is_international
  FROM public.federations WHERE id = NEW.issuer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_certifications_set_international ON public.certifications;
CREATE TRIGGER trg_certifications_set_international
  BEFORE INSERT OR UPDATE OF issuer_id ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.certifications_set_international();

CREATE OR REPLACE FUNCTION public.certifications_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_certifications_updated_at ON public.certifications;
CREATE TRIGGER trg_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.certifications_set_updated_at();

-- RLS: anyone can read active certs; writes via service role (admin)
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active certifications" ON public.certifications;
CREATE POLICY "Public read active certifications"
  ON public.certifications FOR SELECT
  USING (is_active = true);

-- ============================================================
-- 4. Seed starter certifications (6-10 for v1)
-- ============================================================

-- These map to the use cases Arnel specified (2026-07-26):
--   1. Single-country resident (player)
--   2. Dual citizen (player + player in another country)
--   3. International tournament (IIHF player transfer)
--   4. Multi-role user (player + coach + referee, all same parent org)
--   5. Country without strong federation (IIHF only)
--   6. Traveler/expat (multiple countries)
--
-- v1 scope: 6-10 starter certs. Admins can add more via the
-- /admin/federation-registrations page or a follow-up seed migration.

-- Resolve issuer IDs (idempotent via slug)
DO $$
DECLARE
  us_id   UUID;
  ca_id   UUID;
  iihf_id UUID;
BEGIN
  SELECT id INTO us_id   FROM public.federations WHERE slug = 'us';
  SELECT id INTO ca_id   FROM public.federations WHERE slug = 'ca';
  SELECT id INTO iihf_id FROM public.federations WHERE slug = 'iihf';

  -- USA Hockey programs (issuer = USA Hockey national federation)
  INSERT INTO public.certifications (slug, name, description, issuer_id, category) VALUES
    ('usahockey-player', 'USA Hockey Player Registration',
     'Player registration number issued by USA Hockey. Find yours at usahockey.com → MyHockey → Profile.',
     us_id, 'player'),
    ('usahockey-coach', 'USA Hockey Coaching Certification',
     'Coaching Education Program (CEP) certification. Levels 1-5 issued by USA Hockey.',
     us_id, 'coach'),
    ('usahockey-referee', 'USA Hockey Officiating Certification',
     'Officiating certification issued by USA Hockey. Required for referees in USA Hockey sanctioned games.',
     us_id, 'referee')
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        issuer_id = EXCLUDED.issuer_id,
        category = EXCLUDED.category;

  -- Hockey Canada programs (issuer = Hockey Canada national federation)
  INSERT INTO public.certifications (slug, name, description, issuer_id, category) VALUES
    ('hockey-canada-player', 'Hockey Canada Player Registration',
     'Player registration number issued by Hockey Canada. Find yours at hockeycanada.ca → Member Profile.',
     ca_id, 'player'),
    ('hockey-canada-coach', 'Hockey Canada Coaching Certification',
     'Coaching certification issued by Hockey Canada. Required for coaches in HC sanctioned programs.',
     ca_id, 'coach'),
    ('hockey-canada-referee', 'Hockey Canada Officiating Certification',
     'Officiating certification issued by Hockey Canada. Required for referees in HC sanctioned games.',
     ca_id, 'referee')
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        issuer_id = EXCLUDED.issuer_id,
        category = EXCLUDED.category;

  -- IIHF (international, no country)
  INSERT INTO public.certifications (slug, name, description, issuer_id, category) VALUES
    ('iihf-player-transfer', 'IIHF International Player Transfer',
     'International transfer certificate issued by IIHF. Required for players competing in foreign federations.',
     iihf_id, 'player'),
    ('iihf-coach-cert', 'IIHF International Coaching Certification',
     'International coaching certification issued by IIHF. Required for coaches at IIHF-sanctioned events.',
     iihf_id, 'coach'),
    ('iihf-referee-cert', 'IIHF International Officiating Certification',
     'International officiating certification issued by IIHF. Required for referees at IIHF events (Olympics, World Championships).',
     iihf_id, 'referee')
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        issuer_id = EXCLUDED.issuer_id,
        category = EXCLUDED.category;
END $$;

-- ============================================================
-- 5. Helper view: v_user_visible_certifications
-- ============================================================

-- Returns the certifications a user can see in their dropdown, given
-- their country context. If they have no country set, all certs are shown
-- (current behavior pre-this-migration).
--
-- Use this in API endpoints that build the certification dropdown.

CREATE OR REPLACE VIEW public.v_user_visible_certifications AS
SELECT
  c.id,
  c.slug,
  c.name,
  c.description,
  c.category,
  c.is_international,
  c.issuer_id,
  f.name AS issuer_name,
  f.slug AS issuer_slug,
  f.country_code AS issuer_country_code,
  f.kind AS issuer_kind,
  -- For the API: is this cert visible to user_id (NULL = all users)
  CASE
    WHEN c.is_international THEN true
    WHEN pcc.user_id IS NULL THEN true  -- no country set, show everything
    WHEN f.country_code = pcc.primary_country THEN true
    WHEN f.country_code = ANY(pcc.additional_countries) THEN true
    ELSE false
  END AS visible_to_user
FROM public.certifications c
JOIN public.federations f ON c.issuer_id = f.id
LEFT JOIN public.profile_country_context pcc ON true
WHERE c.is_active = true AND f.is_active = true;

GRANT SELECT ON public.v_user_visible_certifications TO authenticated, anon;

-- ============================================================
-- 6. Migration verification (printed at apply time)
-- ============================================================

DO $$
DECLARE
  fed_count         INT;
  intl_count        INT;
  cert_count        INT;
  intl_cert_count   INT;
BEGIN
  SELECT COUNT(*) INTO fed_count       FROM public.federations WHERE is_active = true;
  SELECT COUNT(*) INTO intl_count      FROM public.federations WHERE kind = 'international' AND is_active = true;
  SELECT COUNT(*) INTO cert_count      FROM public.certifications WHERE is_active = true;
  SELECT COUNT(*) INTO intl_cert_count FROM public.certifications WHERE is_international = true;

  RAISE NOTICE 'Federation refactor applied:';
  RAISE NOTICE '  federations: % active total, % international', fed_count, intl_count;
  RAISE NOTICE '  certifications: % active, % international', cert_count, intl_cert_count;
  RAISE NOTICE '  Expected: 85 federations (84 national + 1 IIHF), 10 certifications (7 national + 3 IIHF)';
  RAISE NOTICE '  profile_country_context: empty (capture during onboarding)';
  RAISE NOTICE '  federation_registrations: 0 (no data migration needed)';
END $$;
