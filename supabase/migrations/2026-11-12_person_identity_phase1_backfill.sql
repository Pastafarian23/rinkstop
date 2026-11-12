-- =============================================================================
-- 2026-11-12_person_identity_phase1_backfill.sql
--
-- PHASE 1 — Backfill the central person identity from existing source tables.
--
-- Authorized by Arnel Larracas on 2026-11-11 (Phase 0 + Phase 1 only).
-- Audit: ARCHITECTURE-AUDIT-person-identity-2026-11-11.md
-- Phase 0: 2026-11-12_person_identity_phase0.sql  (must be applied first)
--
-- WHAT THIS DOES
--   Creates one `persons` row per source record, plus the matching
--   `person_sources` provenance row and (where applicable) a `person_roles` row.
--
--   NOTHING IS MERGED. One source record = one person, always. The 5,403
--   cross-table name collisions and the 314 duplicate-name groups inside
--   nhl_players are DELIBERATELY left unmerged — Phase 2 requires separate
--   authorization. A duplicate name is not an identity.
--
-- SOURCE TABLES AND NAMESPACES
--   rinkstop_players    <- public.players              (6,352 rows)
--   nhl_players         <- public.nhl_players           (4,917 rows)
--   nhl_coaching_staff  <- public.nhl_coaching_staff    (152 rows)
--   team_members        <- public.team_members          (2 rows)
--   coach_profiles      <- public.coach_profiles        (1 row)
--   profiles_account    <- public.profiles              (19 rows)
--
-- HOW THE PERSON <-> SOURCE MAPPING IS DERIVED  (the important part)
--   Every person row is stamped with `origin_key` = '<source>:<source_id>',
--   and person_sources carries the SAME '<source>:<source_id>' pair in its
--   (source, source_id) columns. The mapping is therefore derived from the
--   ORIGIN KEY — a deterministic, unique key — and NEVER from a name join.
--
--   This matters: nhl_players has 314 duplicate-name groups (642 rows).
--   A name-based join fans out on those and can attach a source row to the
--   WRONG person. The origin_key join cannot fan out, because
--   persons.origin_key is UNIQUE and person_sources(source, source_id) is
--   UNIQUE. Every source row therefore maps to exactly one person, and every
--   person has exactly one originating source row.
--
--   Names are copied as ATTRIBUTES only. They are never a key.
--
-- IDEMPOTENCY
--   Every insert is driven by a LEFT JOIN against person_sources (or
--   persons.origin_key) on that exact key, so a second run inserts ZERO new
--   persons, ZERO new sources and ZERO new roles. Asserted by
--   scripts/_audit-person-identity.mjs.
--
-- IDENTITY KEYS
--   source_id = the source table's ORIGINAL primary key, cast to TEXT.
--   For integer PKs (nhl_players.id, nhl_coaching_staff.id) this is the
--   numeric string; for uuid PKs it is the canonical uuid text.
--   The `source` namespace keeps the two kinds from colliding.
--
-- NOTHING EXISTING IS MODIFIED
--   No UPDATE, no DELETE, no TRUNCATE on any pre-existing table.
--   No trigger is attached to any pre-existing table.
--   Existing directory resolution is untouched.
--
-- ROLLBACK
--   TRUNCATE public.person_aliases, public.person_claims, public.person_roles,
--            public.person_sources, public.persons;
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Preconditions. Fail loudly rather than backfill into a broken schema.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.persons') IS NULL THEN
    RAISE EXCEPTION 'person-identity phase1: public.persons missing — apply Phase 0 first';
  END IF;
  IF to_regclass('public.person_sources') IS NULL THEN
    RAISE EXCEPTION 'person-identity phase1: public.person_sources missing — apply Phase 0 first';
  END IF;
  IF to_regclass('public.person_roles') IS NULL THEN
    RAISE EXCEPTION 'person-identity phase1: public.person_roles missing — apply Phase 0 first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='persons' AND column_name='origin_key'
  ) THEN
    RAISE EXCEPTION 'person-identity phase1: persons.origin_key missing — apply the updated Phase 0 first';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. public.players  ->  namespace 'rinkstop_players'
-- -----------------------------------------------------------------------------
INSERT INTO public.persons (display_name, first_name, last_name, birth_date, nationality, name_source, origin_key, identity_state)
SELECT
  btrim(p.first_name || ' ' || p.last_name),
  NULLIF(btrim(p.first_name), ''),
  NULLIF(btrim(p.last_name), ''),
  p.birth_date,
  p.nationality,
  'rinkstop_players',
  'rinkstop_players:' || p.id::text,
  'unverified'
FROM public.players p
WHERE length(btrim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.persons e WHERE e.origin_key = 'rinkstop_players:' || p.id::text
  );

INSERT INTO public.person_sources (person_id, source, source_table, source_id, source_slug, source_name)
SELECT
  ps.id,
  'rinkstop_players',
  'players',
  p.id::text,
  p.slug,
  btrim(p.first_name || ' ' || p.last_name)
FROM public.players p
JOIN public.persons ps
  ON ps.origin_key = 'rinkstop_players:' || p.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_sources e
  WHERE e.source = 'rinkstop_players' AND e.source_id = p.id::text
);

-- -----------------------------------------------------------------------------
-- 2. public.nhl_players  ->  namespace 'nhl_players'
--
--    nhl_players.id is bigint. The numeric string is the stable source id.
--    first/last are split from full_name when the columns are null.
-- -----------------------------------------------------------------------------
INSERT INTO public.persons (display_name, first_name, last_name, birth_date, nationality, name_source, origin_key, identity_state)
SELECT
  btrim(n.full_name),
  NULLIF(btrim(coalesce(n.first_name, split_part(btrim(n.full_name), ' ', 1))), ''),
  NULLIF(btrim(coalesce(n.last_name, regexp_replace(btrim(n.full_name), '^[^ ]+\s*', ''))), ''),
  n.birth_date,
  n.nationality,
  'nhl_players',
  'nhl_players:' || n.id::text,
  'unverified'
FROM public.nhl_players n
WHERE length(btrim(coalesce(n.full_name,''))) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.persons e WHERE e.origin_key = 'nhl_players:' || n.id::text
  );

INSERT INTO public.person_sources (person_id, source, source_table, source_id, source_name)
SELECT
  ps.id,
  'nhl_players',
  'nhl_players',
  n.id::text,
  btrim(n.full_name)
FROM public.nhl_players n
JOIN public.persons ps
  ON ps.origin_key = 'nhl_players:' || n.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_sources e
  WHERE e.source = 'nhl_players' AND e.source_id = n.id::text
);

INSERT INTO public.person_roles (person_id, role_type, role_detail, team_id, league_id, season, jersey_number, position, source, source_id)
SELECT
  psrc.person_id,
  CASE n.role
    WHEN 'player'    THEN 'player'
    WHEN 'coach'     THEN 'coach'
    WHEN 'scout'     THEN 'scout'
    WHEN 'official'  THEN 'official'
    WHEN 'referee'   THEN 'referee'
    WHEN 'executive' THEN 'executive'
    WHEN 'staff'     THEN 'staff'
    ELSE 'player'
  END,
  n.role,
  NULL,   -- team_id: nhl_players.current_team_id is bigint into nhl_teams (text PK),
          -- a different namespace from team_workspaces (uuid). NULL by design.
  NULL,   -- league_id: same reason
  NULL,
  n.jersey_number::text,
  n.position,
  'nhl_players',
  n.id::text
FROM public.nhl_players n
JOIN public.person_sources psrc
  ON psrc.source = 'nhl_players' AND psrc.source_id = n.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_roles e
  WHERE e.source = 'nhl_players' AND e.source_id = n.id::text
);

-- -----------------------------------------------------------------------------
-- 3. public.nhl_coaching_staff  ->  namespace 'nhl_coaching_staff'
--
--    This table has NO person id — only nhl_team_id + season + role + name.
--    The row's own bigint `id` is the stable source id (unique PK).
--    The SAME NAME in this table and in nhl_players is NOT merged — that is
--    a Phase 2 decision requiring separate authorization.
-- -----------------------------------------------------------------------------
INSERT INTO public.persons (display_name, first_name, last_name, name_source, origin_key, identity_state)
SELECT
  btrim(s.name),
  NULLIF(btrim(split_part(btrim(s.name), ' ', 1)), ''),
  NULLIF(btrim(regexp_replace(btrim(s.name), '^[^ ]+\s*', '')), ''),
  'nhl_coaching_staff',
  'nhl_coaching_staff:' || s.id::text,
  'unverified'
FROM public.nhl_coaching_staff s
WHERE length(btrim(coalesce(s.name,''))) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.persons e WHERE e.origin_key = 'nhl_coaching_staff:' || s.id::text
  );

INSERT INTO public.person_sources (person_id, source, source_table, source_id, source_name)
SELECT
  ps.id,
  'nhl_coaching_staff',
  'nhl_coaching_staff',
  s.id::text,
  btrim(s.name)
FROM public.nhl_coaching_staff s
JOIN public.persons ps
  ON ps.origin_key = 'nhl_coaching_staff:' || s.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_sources e
  WHERE e.source = 'nhl_coaching_staff' AND e.source_id = s.id::text
);

INSERT INTO public.person_roles (person_id, role_type, role_detail, team_id, league_id, season, source, source_id)
SELECT
  psrc.person_id,
  'coach',
  s.role,
  NULL,   -- nhl_team_id -> nhl_teams (text), not team_workspaces (uuid). NULL by design.
  NULL,
  s.season,
  'nhl_coaching_staff',
  s.id::text
FROM public.nhl_coaching_staff s
JOIN public.person_sources psrc
  ON psrc.source = 'nhl_coaching_staff' AND psrc.source_id = s.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_roles e
  WHERE e.source = 'nhl_coaching_staff' AND e.source_id = s.id::text
);

-- -----------------------------------------------------------------------------
-- 4. public.team_members  ->  namespace 'team_members'
--
--    A team member is an account (team_members.user_id -> profiles.user_id).
--    The PERSON is the human; the account link is preserved separately and
--    person_claims is NOT written here (that is Phase 5).
--
--    Display name comes from the linked profiles row. Where profiles has
--    neither display_name nor username, we fall back to the user_id so the
--    row still satisfies the non-blank display_name CHECK.
-- -----------------------------------------------------------------------------
INSERT INTO public.persons (display_name, first_name, last_name, name_source, origin_key, identity_state)
SELECT
  btrim(coalesce(nullif(pr.display_name,''), nullif(pr.username,''), tm.user_id)),
  NULL,
  NULL,
  'team_members',
  'team_members:' || tm.id::text,
  'unverified'
FROM public.team_members tm
LEFT JOIN public.profiles pr ON pr.user_id = tm.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.persons e WHERE e.origin_key = 'team_members:' || tm.id::text
);

INSERT INTO public.person_sources (person_id, source, source_table, source_id, source_name)
SELECT
  ps.id,
  'team_members',
  'team_members',
  tm.id::text,
  btrim(coalesce(nullif(pr.display_name,''), nullif(pr.username,''), tm.user_id))
FROM public.team_members tm
LEFT JOIN public.profiles pr ON pr.user_id = tm.user_id
JOIN public.persons ps
  ON ps.origin_key = 'team_members:' || tm.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_sources e
  WHERE e.source = 'team_members' AND e.source_id = tm.id::text
);

INSERT INTO public.person_roles (person_id, role_type, role_detail, team_id, league_id, jersey_number, position, source, source_id)
SELECT
  psrc.person_id,
  CASE
    WHEN tm.role IN ('head_coach','assistant_coach','goalie_coach','skills_coach','manager') THEN 'coach'
    WHEN tm.role IN ('referee','linesman','official') THEN 'official'
    ELSE 'player'
  END,
  tm.role,
  tm.team_id,
  NULL,
  tm.jersey_number::text,
  tm.position,
  'team_members',
  tm.id::text
FROM public.team_members tm
JOIN public.person_sources psrc
  ON psrc.source = 'team_members' AND psrc.source_id = tm.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_roles e
  WHERE e.source = 'team_members' AND e.source_id = tm.id::text
);

-- -----------------------------------------------------------------------------
-- 5. public.coach_profiles  ->  namespace 'coach_profiles'
--
--    coach_profiles.profile_id -> profiles.user_id (a real FK), so the person
--    is the account holder. profile_id is UNIQUE on coach_profiles.
-- -----------------------------------------------------------------------------
INSERT INTO public.persons (display_name, first_name, last_name, name_source, origin_key, identity_state)
SELECT
  btrim(coalesce(nullif(pr.display_name,''), nullif(pr.username,''), cp.profile_id)),
  NULL,
  NULL,
  'coach_profiles',
  'coach_profiles:' || cp.id::text,
  'unverified'
FROM public.coach_profiles cp
LEFT JOIN public.profiles pr ON pr.user_id = cp.profile_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.persons e WHERE e.origin_key = 'coach_profiles:' || cp.id::text
);

INSERT INTO public.person_sources (person_id, source, source_table, source_id, source_name)
SELECT
  ps.id,
  'coach_profiles',
  'coach_profiles',
  cp.id::text,
  btrim(coalesce(nullif(pr.display_name,''), nullif(pr.username,''), cp.profile_id))
FROM public.coach_profiles cp
LEFT JOIN public.profiles pr ON pr.user_id = cp.profile_id
JOIN public.persons ps
  ON ps.origin_key = 'coach_profiles:' || cp.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_sources e
  WHERE e.source = 'coach_profiles' AND e.source_id = cp.id::text
);

INSERT INTO public.person_roles (person_id, role_type, role_detail, team_id, league_id, source, source_id)
SELECT
  psrc.person_id,
  'coach',
  'certified_coach',
  cp.current_team_id,
  NULL,
  'coach_profiles',
  cp.id::text
FROM public.coach_profiles cp
JOIN public.person_sources psrc
  ON psrc.source = 'coach_profiles' AND psrc.source_id = cp.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_roles e
  WHERE e.source = 'coach_profiles' AND e.source_id = cp.id::text
);

-- -----------------------------------------------------------------------------
-- 6. public.profiles  ->  namespace 'profiles_account'
--
--    Every account gets a person row so that "one account manages one
--    identity" is expressible. The source id is profiles.id (the Supabase
--    row PK), NOT user_id, because user_id is the account identity and
--    profiles.id is this table's stable key.
--
--    3 accounts have neither display_name nor username. The persons CHECK
--    requires a non-blank display_name, so we fall back to the user_id.
--    Documented exception.
-- -----------------------------------------------------------------------------
INSERT INTO public.persons (display_name, first_name, last_name, name_source, origin_key, identity_state)
SELECT
  btrim(coalesce(nullif(pr.display_name,''), nullif(pr.username,''), pr.user_id)),
  NULLIF(btrim(split_part(coalesce(nullif(pr.display_name,''), nullif(pr.username,''), pr.user_id), ' ', 1)), ''),
  NULLIF(btrim(regexp_replace(coalesce(nullif(pr.display_name,''), nullif(pr.username,''), pr.user_id), '^[^ ]+\s*', '')), ''),
  'profiles_account',
  'profiles_account:' || pr.id::text,
  'unverified'
FROM public.profiles pr
WHERE NOT EXISTS (
  SELECT 1 FROM public.persons e WHERE e.origin_key = 'profiles_account:' || pr.id::text
);

INSERT INTO public.person_sources (person_id, source, source_table, source_id, source_slug, source_name)
SELECT
  ps.id,
  'profiles_account',
  'profiles',
  pr.id::text,
  pr.username,
  btrim(coalesce(nullif(pr.display_name,''), nullif(pr.username,''), pr.user_id))
FROM public.profiles pr
JOIN public.persons ps
  ON ps.origin_key = 'profiles_account:' || pr.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_sources e
  WHERE e.source = 'profiles_account' AND e.source_id = pr.id::text
);

-- -----------------------------------------------------------------------------
-- 7. Reconcile.
--    - no duplicate (source, source_id) pairs
--    - no person without a source row
--    - every person has exactly ONE origin_key, and the origin_key agrees
--      with the person's own source row
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  dup_sources   bigint;
  orphan_persons bigint;
  bad_origin    bigint;
BEGIN
  SELECT count(*) INTO dup_sources FROM (
    SELECT source, source_id FROM public.person_sources
    GROUP BY source, source_id HAVING count(*) > 1
  ) d;
  IF dup_sources > 0 THEN
    RAISE EXCEPTION 'person-identity phase1: % duplicate (source,source_id) pairs', dup_sources;
  END IF;

  SELECT count(*) INTO orphan_persons FROM public.persons p
  WHERE NOT EXISTS (SELECT 1 FROM public.person_sources s WHERE s.person_id = p.id);
  IF orphan_persons > 0 THEN
    RAISE EXCEPTION 'person-identity phase1: % persons with no source row', orphan_persons;
  END IF;

  -- A person whose origin_key disagrees with its source row would mean the
  -- mapping is not lossless. This must be zero.
  SELECT count(*) INTO bad_origin FROM public.persons p
  JOIN public.person_sources s ON s.person_id = p.id
  WHERE p.origin_key IS DISTINCT FROM (s.source || ':' || s.source_id);
  IF bad_origin > 0 THEN
    RAISE EXCEPTION 'person-identity phase1: % persons whose origin_key disagrees with its source row', bad_origin;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- VERBATIM ROLLBACK — Phase 1
--
--   BEGIN;
--   TRUNCATE public.person_aliases, public.person_claims, public.person_roles,
--                public.person_sources, public.persons;
--   COMMIT;
--
--   Removes ONLY data written by this migration. Touches no pre-existing table.
-- =============================================================================
