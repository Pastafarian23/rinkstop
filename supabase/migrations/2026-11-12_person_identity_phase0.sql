-- =============================================================================
-- 2026-11-12_person_identity_phase0.sql
--
-- PHASE 0 — Central person identity: schema only. NO DATA.
--
-- Authorized by Arnel Larracas on 2026-11-11 (Phase 0 + Phase 1 only).
-- Audit: ARCHITECTURE-AUDIT-person-identity-2026-11-11.md
--
-- WHAT THIS DOES
--   Creates five additive tables that introduce ONE central person identity
--   without changing any existing table, route, URL, or resolution path:
--
--     persons          — the central, permanent person identity (UUID)
--     person_sources   — provenance: which source row produced which person
--     person_roles     — professional roles (player/coach/official/...) on a person
--     person_claims    — the single ownership model (account <-> person)
--     person_aliases   — preserves every existing public URL
--
-- DESIGN RULES ENFORCED HERE
--   1. IDENTITY IS NEVER A SLUG OR A NAME.
--      `person_sources (source, source_id)` is the uniqueness key. `source_id`
--      holds the ORIGINAL primary key from the source table, cast to TEXT so
--      that integer PKs (nhl_players.id, nhl_coaching_staff.id) and uuid PKs
--      (players.id, team_members.id) can coexist in one namespace.
--      Slugs and names are stored as ATTRIBUTES, never as keys.
--   2. NOTHING EXISTING IS MODIFIED.
--      No existing table is altered. No existing row is read for write. No
--      trigger is attached to any existing table. Existing directory
--      resolution is untouched — these tables are inert until Phase 3.
--   3. ADDITIVE ONLY.
--      No DROP of anything pre-existing. The five new tables are the only
--      objects created.
--   4. IDEMPOTENT.
--      Every statement is IF NOT EXISTS. Re-running is a no-op.
--   5. FEATURE FLAGS STAY OFF.
--      This migration creates no behaviour. The identity subsystem remains
--      gated (see src/lib/passport/02-feature-flags.ts).
--
-- ROLLBACK
--   DROP TABLE public.person_aliases, public.person_claims,
--              public.person_roles, public.person_sources, public.persons;
--   (Phase 0 only — nothing else references these tables. Phase 1's rollback
--    is a TRUNCATE of the data plus the same DROP.)
--   A full verbatim rollback statement is at the bottom of this file.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Schema guard — fail loudly if the environment is not what we expect.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF current_database() NOT IN ('postgres', 'rinkstop') THEN
    RAISE EXCEPTION 'person-identity: unexpected database %', current_database();
  END IF;
  -- profiles.user_id must be unique for person_claims' FK to be meaningful.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='profiles'
      AND constraint_type='UNIQUE'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.key_column_usage
        WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
      )
  ) THEN
    RAISE EXCEPTION 'person-identity: profiles.user_id is not uniquely constrained';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. persons — THE central person identity.
--
--    One row = one human being, forever. `id` is permanent and is never
--    reused, never renamed, and never derived from a name or slug.
--
--    `identity_state` tracks confidence WITHOUT implying a merge:
--      unverified — created from a source row, not yet claimed by an account
--      claimed    — an approved person_claims row exists
--      verified   — the owning account passed Didit (set in a later phase)
--      merged     — this person was merged INTO another (canonical_person_id
--                   points at the survivor). The row is RETAINED, never
--                   deleted, so the inverse mapping stays recoverable.
--      deprecated — retired, retained for history
--
--    `canonical_person_id` is a self-reference used only by merges. It is
--    NULL for every row created in Phase 1.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.persons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Optional stable public handle. NULL until Phase 3 assigns one.
  public_id           text UNIQUE,

  -- Canonical slug for the future central page. NULL in Phase 0/1: slugs are
  -- assigned in Phase 3 precisely so that no existing URL has to change.
  slug                text UNIQUE,

  -- Display attributes. NOT identity keys.
  display_name        text NOT NULL,
  first_name          text,
  last_name           text,

  birth_date          date,
  nationality         text,

  -- How much we trust that this row is one specific human.
  identity_state      text NOT NULL DEFAULT 'unverified'
                      CHECK (identity_state IN
                        ('unverified','claimed','verified','merged','deprecated')),

  -- Merge pointer: set only when this row was merged into another person.
  -- The row itself is retained so every source id stays resolvable.
  canonical_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,

  -- Provenance of the name/attributes shown on this person.
  name_source         text,

  -- Deterministic origin key: name_source || ':' || source_id of the row that
  -- CREATED this person. Because (source, source_id) is unique in
  -- person_sources, this value is unique per person and lets the backfill
  -- re-derive the exact person for a source row WITHOUT matching on name.
  -- Name matching is unsafe here: nhl_players contains 314 duplicate-name
  -- groups, so a name join would fan out and could attach a source row to
  -- the wrong person. This key removes that failure mode entirely.
  origin_key          text UNIQUE,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT persons_display_name_not_blank CHECK (length(btrim(display_name)) > 0),
  -- A merged row must point at a survivor; a non-merged row must not.
  CONSTRAINT persons_merge_pointer_consistent CHECK (
    (identity_state = 'merged' AND canonical_person_id IS NOT NULL)
    OR (identity_state <> 'merged' AND canonical_person_id IS NULL)
  ),
  -- A person cannot be merged into itself.
  CONSTRAINT persons_no_self_merge CHECK (canonical_person_id IS NULL OR canonical_person_id <> id)
);

COMMENT ON TABLE public.persons IS
  'Central person identity. One row = one human. Phase 0 (2026-11-12): created empty. '
  'Identity is the uuid `id`; slugs and names are attributes, never keys.';

CREATE INDEX IF NOT EXISTS idx_persons_identity_state ON public.persons (identity_state);
CREATE INDEX IF NOT EXISTS idx_persons_canonical_person_id ON public.persons (canonical_person_id);
CREATE INDEX IF NOT EXISTS idx_persons_last_first_name ON public.persons (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_persons_name_source ON public.persons (name_source);
CREATE INDEX IF NOT EXISTS idx_persons_origin_key ON public.persons (origin_key);
CREATE INDEX IF NOT EXISTS idx_persons_display_name_lower ON public.persons (lower(display_name));

-- -----------------------------------------------------------------------------
-- 2. person_sources — provenance and the de-duplication mechanism.
--
--    Exactly one row per source record. The uniqueness of
--    (source, source_id) is what makes the Phase 1 backfill idempotent AND
--    what prevents the same source row being mapped to two people.
--
--    `source` is a STABLE NAMESPACE (the source table's identity), never a
--    slug. `source_id` is the source table's original primary key as TEXT.
--
--    `source_slug` and `source_name` are carried for URL preservation and for
--    human review. They are NEVER used as an identity key.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_sources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  person_id     uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,

  -- Stable namespace. The set is closed and versioned:
  --   rinkstop_players | nhl_players | nhl_coaching_staff | team_members
  --   | coach_profiles | profiles_account
  source        text NOT NULL,

  -- The source table name, kept explicit so a namespace rename is auditable.
  source_table  text NOT NULL,

  -- The ORIGINAL primary key from the source table, as TEXT.
  -- uuid PKs and integer PKs share this namespace without collision because
  -- `source` separates them.
  source_id     text NOT NULL,

  -- Original slug / name from the source row. Attributes only.
  source_slug   text,
  source_name   text,

  -- Set when this source row was folded into an existing person during a
  -- merge (Phase 2). NULL in Phase 1.
  merged_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT person_sources_unique UNIQUE (source, source_id),
  CONSTRAINT person_sources_namespace_known CHECK (source IN (
    'rinkstop_players','nhl_players','nhl_coaching_staff',
    'team_members','coach_profiles','profiles_account'
  )),
  CONSTRAINT person_sources_id_not_blank CHECK (length(btrim(source_id)) > 0)
);

COMMENT ON TABLE public.person_sources IS
  'Provenance: one row per legacy source record. (source, source_id) is the identity '
  'key — never a slug or a name. This is the backfill idempotency anchor and the '
  'inverse mapping that makes merges reversible.';

CREATE INDEX IF NOT EXISTS idx_person_sources_person_id ON public.person_sources (person_id);
CREATE INDEX IF NOT EXISTS idx_person_sources_source ON public.person_sources (source);
CREATE INDEX IF NOT EXISTS idx_person_sources_source_slug ON public.person_sources (source_slug);
CREATE INDEX IF NOT EXISTS idx_person_sources_merged_at ON public.person_sources (merged_at)
  WHERE merged_at IS NULL;

-- -----------------------------------------------------------------------------
-- 3. person_roles — many professional roles on ONE person.
--
--    A coach who also played gets two role rows and one person id. A person
--    with no professional role (e.g. a fan account) simply has no role rows.
--
--    `source` + `source_id` mirrors person_sources so a role can always be
--    traced back to the exact row that produced it. For sources that are
--    role-bearing (team_members, nhl_coaching_staff, nhl_players), the
--    (source, source_id) pair is the same pair used in person_sources, which
--    makes the mapping lossless and reversible.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_roles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  person_id     uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,

  role_type     text NOT NULL,
  role_detail   text,

  -- Organizational context. Deliberately NULLable: a retired coach has no
  -- current team, and a role must survive losing its team reference.
  team_id       uuid REFERENCES public.team_workspaces(id) ON DELETE SET NULL,
  league_id     uuid REFERENCES public.leagues(id) ON DELETE SET NULL,
  season        text,

  jersey_number text,
  position      text,

  -- Which source row produced this role.
  source        text NOT NULL,
  source_id     text NOT NULL,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT person_roles_unique UNIQUE (source, source_id),
  CONSTRAINT person_roles_type_known CHECK (role_type IN (
    'player','coach','official','scout','staff','executive','referee'
  )),
  CONSTRAINT person_roles_namespace_known CHECK (source IN (
    'rinkstop_players','nhl_players','nhl_coaching_staff',
    'team_members','coach_profiles','profiles_account'
  )),
  CONSTRAINT person_roles_id_not_blank CHECK (length(btrim(source_id)) > 0)
);

COMMENT ON TABLE public.person_roles IS
  'Professional roles on a central person. A person may hold several roles; '
  'every role references persons.id rather than creating a duplicate person.';

CREATE INDEX IF NOT EXISTS idx_person_roles_person_id ON public.person_roles (person_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_type ON public.person_roles (role_type);
CREATE INDEX IF NOT EXISTS idx_person_roles_team_id ON public.person_roles (team_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_league_id ON public.person_roles (league_id);

-- -----------------------------------------------------------------------------
-- 4. person_claims — the SINGLE ownership model.
--
--    Replaces three competing models:
--      players.user_id            (self-claim, 1 of 6,352 rows)
--      managed_profiles           (parent/guardian, 1 dangling row)
--      claims (claim_type='player') (approved claims, 0 rows)
--
--    The account relationship is preserved by referencing profiles.user_id.
--    Nothing is written here in Phase 0 — the table is created empty.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  person_id     uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  user_id       text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,

  relationship  text NOT NULL DEFAULT 'self',
  status        text NOT NULL DEFAULT 'pending',

  verification_status text,
  verified_at   timestamptz,

  -- Minor-consent fields, carried over from managed_profiles so the parent
  -- consent trail survives the migration to this model.
  minor_consent_at         timestamptz,
  minor_consent_method     text,
  minor_consent_revoked_at timestamptz,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT person_claims_relationship_known CHECK (relationship IN (
    'self','parent','guardian','authorized_agent','owner'
  )),
  CONSTRAINT person_claims_status_known CHECK (status IN (
    'pending','approved','rejected','revoked'
  )),
  -- One account cannot file two claims for the same person.
  CONSTRAINT person_claims_unique_user_person UNIQUE (person_id, user_id)
);

COMMENT ON TABLE public.person_claims IS
  'The single ownership model: which account manages which central person. '
  'Replaces players.user_id, managed_profiles and claims(claim_type=player). '
  'Empty in Phase 0 — existing ownership is NOT migrated until Phase 5.';

CREATE INDEX IF NOT EXISTS idx_person_claims_person_id ON public.person_claims (person_id);
CREATE INDEX IF NOT EXISTS idx_person_claims_user_id ON public.person_claims (user_id);
CREATE INDEX IF NOT EXISTS idx_person_claims_status ON public.person_claims (status);
-- At most one approved self/owner claim per person.
CREATE UNIQUE INDEX IF NOT EXISTS idx_person_claims_one_owner
  ON public.person_claims (person_id)
  WHERE status = 'approved' AND relationship IN ('self','owner');

-- -----------------------------------------------------------------------------
-- 5. person_aliases — preserves every existing public URL.
--
--    Populated in Phase 3. Created empty here. `path` is the existing public
--    path (e.g. '/directory/players/darnell-nurse'), which is what makes a
--    later central-page change non-breaking: the alias keeps resolving.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_aliases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  person_id     uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,

  path          text NOT NULL,
  alias_type    text NOT NULL,
  is_canonical  boolean NOT NULL DEFAULT false,

  source        text NOT NULL,
  source_id     text NOT NULL,

  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT person_aliases_path_unique UNIQUE (path),
  CONSTRAINT person_aliases_type_known CHECK (alias_type IN (
    'player','coach','scout','official','staff','executive','profile'
  )),
  CONSTRAINT person_aliases_namespace_known CHECK (source IN (
    'rinkstop_players','nhl_players','nhl_coaching_staff',
    'team_members','coach_profiles','profiles_account'
  )),
  CONSTRAINT person_aliases_path_not_blank CHECK (length(btrim(path)) > 0)
);

COMMENT ON TABLE public.person_aliases IS
  'Existing public URLs preserved as aliases of a central person. Empty in Phase 0; '
  'populated in Phase 3. Guarantees that unifying identities never breaks a URL.';

CREATE INDEX IF NOT EXISTS idx_person_aliases_person_id ON public.person_aliases (person_id);
CREATE INDEX IF NOT EXISTS idx_person_aliases_type ON public.person_aliases (alias_type);
CREATE INDEX IF NOT EXISTS idx_person_aliases_source ON public.person_aliases (source, source_id);

-- -----------------------------------------------------------------------------
-- 6. Row Level Security.
--
-- These tables are SERVICE-ROLE ONLY. Nothing reads them publicly yet, and
-- nothing should until Phase 3 ships the central person page. The identity
-- tables carry names, birth dates, nationalities and account links — they
-- must not be world-readable the moment they are created.
--
-- This mirrors `nhl_players`, which uses the same deny-anon +
-- deny-authenticated shape. `service_role` has BYPASSRLS, so the
-- server-side loader in src/lib/person-identity.ts is unaffected.
--
-- Phase 3 will replace these deny policies with a deliberate public-read
-- policy for whichever columns the public page actually needs.
-- -----------------------------------------------------------------------------
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_persons ON public.persons;
CREATE POLICY deny_anon_persons ON public.persons AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS deny_authenticated_persons ON public.persons;
CREATE POLICY deny_authenticated_persons ON public.persons AS RESTRICTIVE FOR ALL TO authenticated USING (false);

ALTER TABLE public.person_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_person_sources ON public.person_sources;
CREATE POLICY deny_anon_person_sources ON public.person_sources AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS deny_authenticated_person_sources ON public.person_sources;
CREATE POLICY deny_authenticated_person_sources ON public.person_sources AS RESTRICTIVE FOR ALL TO authenticated USING (false);

ALTER TABLE public.person_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_person_roles ON public.person_roles;
CREATE POLICY deny_anon_person_roles ON public.person_roles AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS deny_authenticated_person_roles ON public.person_roles;
CREATE POLICY deny_authenticated_person_roles ON public.person_roles AS RESTRICTIVE FOR ALL TO authenticated USING (false);

ALTER TABLE public.person_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_person_claims ON public.person_claims;
CREATE POLICY deny_anon_person_claims ON public.person_claims AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS deny_authenticated_person_claims ON public.person_claims;
CREATE POLICY deny_authenticated_person_claims ON public.person_claims AS RESTRICTIVE FOR ALL TO authenticated USING (false);

ALTER TABLE public.person_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_person_aliases ON public.person_aliases;
CREATE POLICY deny_anon_person_aliases ON public.person_aliases AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS deny_authenticated_person_aliases ON public.person_aliases;
CREATE POLICY deny_authenticated_person_aliases ON public.person_aliases AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- -----------------------------------------------------------------------------
-- 7. updated_at maintenance.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_person_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_persons_touch ON public.persons;
CREATE TRIGGER trg_persons_touch BEFORE UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.touch_person_updated_at();

DROP TRIGGER IF EXISTS trg_person_roles_touch ON public.person_roles;
CREATE TRIGGER trg_person_roles_touch BEFORE UPDATE ON public.person_roles
  FOR EACH ROW EXECUTE FUNCTION public.touch_person_updated_at();

DROP TRIGGER IF EXISTS trg_person_claims_touch ON public.person_claims;
CREATE TRIGGER trg_person_claims_touch BEFORE UPDATE ON public.person_claims
  FOR EACH ROW EXECUTE FUNCTION public.touch_person_updated_at();

COMMIT;

-- =============================================================================
-- VERBATIM ROLLBACK — Phase 0
--
-- Run this to remove every object this migration created. It touches nothing
-- that existed before 2026-11-12.
--
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_persons_touch ON public.persons;
--   DROP TRIGGER IF EXISTS trg_person_roles_touch ON public.person_roles;
--   DROP TRIGGER IF EXISTS trg_person_claims_touch ON public.person_claims;
--   DROP FUNCTION IF EXISTS public.touch_person_updated_at();
--   DROP TABLE IF EXISTS public.person_aliases;
--   DROP TABLE IF EXISTS public.person_claims;
--   DROP TABLE IF EXISTS public.person_roles;
--   DROP TABLE IF EXISTS public.person_sources;
--   DROP TABLE IF EXISTS public.persons;
--   COMMIT;
--
--   (Dropping a table also drops its policies and the RLS enablement; no
--   separate REVOKE or policy cleanup is needed.)
-- =============================================================================
