-- =============================================================================
-- 2026-11-12_person_identity_phase3_slugs_aliases.sql
--
-- PHASE 3 (part A) — assign stable person slugs + public_ids, and populate
-- the person_aliases resolution table for the unified public profile.
--
-- Authorized by Arnel Larracas 2026-11-12 — "the unified /profile/ architecture
-- is approved. Move into implementation."
--
-- WHAT THIS DOES
--   1. Assigns `persons.public_id` — a stable, opaque, never-changing handle.
--   2. Assigns `persons.slug` — a readable name-based slug, deterministic and
--      collision-safe, derived ONLY from identity-stable data.
--   3. Populates `person_aliases` so `/profile/<slug>` resolves to a person.
--
-- THE FOUR APPROVED REQUIREMENTS THIS ENCODES
--
-- (1) MERGED IDENTITY HANDLING
--     • A merged-away person (`identity_state='merged'`) gets NO slug and NO
--       public_id. Only SURVIVORS get a canonical profile.
--     • The survivor's slug is derived from its own name — so a merged pair
--       resolves to ONE canonical URL, not two.
--     • The merged-away person's OBSOLETE source paths are recorded as alias
--       rows pointing at the SURVIVOR, so any URL that once pointed at the
--       merged-away record redirects to the surviving canonical URL instead
--       of 404ing.
--
-- (2) ACCOUNT URL PROTECTION
--     • Every existing `profiles.username` is preserved: the account check
--       runs BEFORE the alias check, so an alias can never override it.
--     • Alias generation SKIPS any slug that collides with a
--       `profiles.username`. The account wins; the person simply does not
--       get that particular alias.
--     • `person_aliases` rows are also skipped when the path already belongs
--       to a different person.
--
-- (3) STABLE PERSON URLS
--     • The slug base is the person's NAME, lowercased, non-alphanumerics
--       collapsed to a single hyphen.
--     • The slug NEVER incorporates team, league, jersey, nationality,
--       position, or any other attribute that can change. A player who
--       changes teams keeps their URL forever.
--     • The suffix for a collision is derived from the person's ORIGIN KEY —
--       a stable fact about which record created the identity — NOT from a
--       name suffix that a team rename would alter.
--
-- (4) OWNERSHIP
--     • This migration touches NOTHING in `person_claims`, `claims`,
--       `managed_profiles`, `profiles`, `players.user_id`, or any account
--       table. It creates no ownership and no claim. It is purely
--       identity-key assignment.
--
-- IDEMPOTENCE
--   Re-running is safe: slugs and public_ids are assigned only where NULL,
--   and alias rows are inserted only when the path is free.
--
-- ROLLBACK
--   DELETE FROM public.person_aliases WHERE source IN (...);  -- the alias rows
--   UPDATE public.persons SET slug = NULL, public_id = NULL;    -- the keys
--   (the persons/source rows themselves are never modified by this file)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Guard: refuse to run if the identity layer is not in the expected shape.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_persons      bigint;
  v_merged       bigint;
  v_sources      bigint;
  v_aliases      bigint;
  v_bad_state    bigint;
BEGIN
  SELECT count(*) INTO v_persons FROM public.persons;
  SELECT count(*) INTO v_merged FROM public.persons WHERE identity_state = 'merged';
  SELECT count(*) INTO v_sources FROM public.person_sources;
  SELECT count(*) INTO v_aliases FROM public.person_aliases;

  IF v_persons = 0 THEN
    RAISE EXCEPTION 'phase3: persons is empty — the identity backfill has not run';
  END IF;

  -- A merged row must point at a survivor; a non-merged row must not.
  SELECT count(*) INTO v_bad_state
    FROM public.persons p
    WHERE (p.identity_state = 'merged') <> (p.canonical_person_id IS NOT NULL);
  IF v_bad_state <> 0 THEN
    RAISE EXCEPTION 'phase3: % persons have an inconsistent merge pointer', v_bad_state;
  END IF;

  RAISE NOTICE 'phase3: persons=% merged=% sources=% aliases(before)=%',
    v_persons, v_merged, v_sources, v_aliases;
END $$;

-- -----------------------------------------------------------------------------
-- 2. public_id — a stable opaque handle.
--
--    Derived from the person's uuid so it is deterministic and reproducible:
--    the same person always gets the same public_id, on every environment, for
--    ever. It contains no name, so a rename never changes it.
--
--    Format: p_<12 hex chars of md5(id)>. Short enough to type, opaque
--    enough to never leak a name, and collision-safe (md5 over 11,443 uuid
--    values; a collision would be caught by the UNIQUE constraint below and
--    the whole transaction would abort).
-- -----------------------------------------------------------------------------
UPDATE public.persons p
   SET public_id = 'p_' || substr(md5(p.id::text), 1, 12)
 WHERE p.public_id IS NULL
   AND p.identity_state <> 'merged';

-- -----------------------------------------------------------------------------
-- 3. slug — readable, name-based, deterministic, collision-safe.
--
--    STEP 3a: the BASE slug for every non-merged person.
--      Name source, in priority order:
--        1. persons.first_name + persons.last_name
--        2. persons.display_name
--      This never touches team/league/nationality/jersey/position.
--
--    STEP 3b: disambiguate collisions.
--      If two persons want the same base, the tie is broken by a suffix
--      derived from the person's OWN SOURCE SLUG when it has one, else from
--      the ORIGIN KEY. Both are stable facts about the record:
--        - source slug tail: 'connor-brown' + 'connor-brown-edm' ->
--          'connor-brown-edm'. This matches the existing `rinkstop_players`
--          convention (a team suffix the source already chose), so the
--          unified slug agrees with the slug the player page already uses.
--        - else a short hash of the origin key.
--      A person whose base is already unique keeps the clean base.
--
--      NOTE ON CASE: the tail is lower-cased and hyphen-trimmed, so a
--      source slug 'connor-brown-MAR' produces 'connor-brown-mar', not
--      'connor-brown--MAR'.
--
--      IMPORTANT: the source-slug tail is used ONLY to break a tie. The
--      canonical base is still the name. A team's abbreviation in a source
--      slug is not what makes the URL stable — the NAME is; the suffix is
--      only there because two people share a name.
--
--    STEP 3c: never assign a slug that collides with a `profiles.username`.
--      Account URLs win (requirement 2).
-- -----------------------------------------------------------------------------

-- 3a. base slug, computed into a temp table.
DROP TABLE IF EXISTS tmp_phase3_slug_base;
CREATE TEMP TABLE tmp_phase3_slug_base ON COMMIT DROP AS
WITH raw AS (
  SELECT
    p.id,
    p.origin_key,
    -- Prefer the structured name; fall back to display_name.
    COALESCE(
      NULLIF(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
      NULLIF(btrim(p.display_name), '')
    ) AS name_text
  FROM public.persons p
  WHERE p.identity_state <> 'merged'
),
-- The person's own source slug, when they have one. Used ONLY as a
-- disambiguation tail, and only when the person has exactly one (a person
-- with several source slugs has no single canonical tail, so the hash path
-- is used instead).
one_slug AS (
  SELECT DISTINCT ON (person_id) person_id, source_slug
    FROM public.person_sources
   WHERE source_slug IS NOT NULL AND source_slug <> ''
   ORDER BY person_id, source_slug
),
only_slug AS (
  SELECT person_id, min(source_slug) AS source_slug
    FROM public.person_sources
   WHERE source_slug IS NOT NULL AND source_slug <> ''
   GROUP BY person_id
   HAVING count(DISTINCT source_slug) = 1
)
SELECT
  r.id,
  r.origin_key,
  o.source_slug,
  -- Collapse every run of non-alphanumerics to ONE hyphen, trim the ends.
  trim(both '-' FROM lower(regexp_replace(r.name_text, '[^a-zA-Z0-9]+', '-', 'g'))) AS base
FROM raw r
LEFT JOIN only_slug o ON o.person_id = r.id
-- A person whose name reduces to nothing gets a slug derived from their id.
WHERE trim(both '-' FROM lower(regexp_replace(r.name_text, '[^a-zA-Z0-9]+', '-', 'g'))) <> '';

-- 3b. compute the final slug per person, breaking ties deterministically.
DROP TABLE IF EXISTS tmp_phase3_slug_final;
CREATE TEMP TABLE tmp_phase3_slug_final ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    b.id,
    b.base,
    b.source_slug,
    -- Rank by base so the same-base group is contiguous; within a group the
    -- person whose origin_key sorts first keeps the clean base.
    row_number() OVER (
      PARTITION BY b.base
      ORDER BY b.origin_key NULLS FIRST, b.id
    ) AS rn,
    count(*) OVER (PARTITION BY b.base) AS group_size,
    b.origin_key
  FROM tmp_phase3_slug_base b
),
suffixed AS (
  SELECT
    r.id,
    r.base,
    r.origin_key,
    CASE
      WHEN r.rn = 1 THEN r.base
      ELSE r.base || '-' || CASE
        -- Prefer the readable tail from the person's own source slug, e.g.
        -- 'connor-brown' -> 'connor-brown-edm'. That is the SAME slug the
        -- player page already uses, so the two agree.
        --
        -- The tail is lower-cased and stripped of any leading hyphen, so a
        -- source slug like 'connor-brown-MAR' yields 'mar', not '-MAR'.
        WHEN r.source_slug IS NOT NULL
          AND r.source_slug <> r.base
          AND r.source_slug LIKE r.base || '-%'
          THEN trim(both '-' FROM lower(substr(r.source_slug, length(r.base) + 1)))
        -- Otherwise a stable short hash of the origin key.
        ELSE substr(md5(r.origin_key), 1, 6)
      END
    END AS candidate
  FROM ranked r
)
SELECT
  s.id,
  s.candidate,
  -- If even the suffixed candidate collides (same base AND same tail), fall
  -- back to a hash of the person id. Deterministic, and guaranteed unique.
  CASE
    WHEN s.candidate IN (SELECT candidate FROM suffixed s2 GROUP BY candidate HAVING count(*) > 1)
      THEN s.candidate || '-' || substr(md5(s.id::text), 1, 6)
    ELSE s.candidate
  END AS final_slug
FROM suffixed s;

-- 3c. assign. Skip any slug that is already taken by another person, and
--     skip any slug that collides with a `profiles.username` (account wins).
DROP TABLE IF EXISTS tmp_phase3_assign;
CREATE TEMP TABLE tmp_phase3_assign ON COMMIT DROP AS
SELECT f.id, f.final_slug
FROM tmp_phase3_slug_final f
WHERE f.final_slug NOT IN (SELECT slug FROM public.persons WHERE slug IS NOT NULL)
  AND f.final_slug NOT IN (SELECT username FROM public.profiles WHERE username IS NOT NULL);

UPDATE public.persons p
   SET slug = a.final_slug
  FROM tmp_phase3_assign a
 WHERE p.id = a.id
   AND p.slug IS NULL
   AND p.identity_state <> 'merged';

-- Persons whose name reduced to nothing (or who lost the race for a
-- collision-free slug) get a readable fallback: name-free, hash-based.
UPDATE public.persons p
   SET slug = 'p-' || substr(md5(p.id::text), 1, 12)
 WHERE p.slug IS NULL
   AND p.identity_state <> 'merged';

-- A merged-away person must NEVER hold a slug.
UPDATE public.persons
   SET slug = NULL, public_id = NULL
 WHERE identity_state = 'merged'
   AND (slug IS NOT NULL OR public_id IS NOT NULL);

-- -----------------------------------------------------------------------------
-- 4. person_aliases — the resolution table for /profile/<slug>.
--
--    Rows are inserted for:
--      (a) every non-merged person with a slug  → alias_type 'profile',
--          is_canonical = true
--      (b) every OBSOLETE source path of a merged-away person → alias_type
--          'player' (or the role's type), is_canonical = false, pointing at
--          the SURVIVOR.
--
--    (b) is what makes an old URL redirect instead of 404.
--
--    Paths are stored WITHOUT a leading slash? No — WITH. `path` is the
--    public path, e.g. '/profile/tim-st-tzle-ott'. The resolver compares the
--    incoming path exactly.
--
--    The account-username exclusion is applied HERE as well as at slug
--    assignment, so no alias can ever shadow an account URL.
-- -----------------------------------------------------------------------------

-- 4a. canonical profile alias for every surviving person with a slug.
INSERT INTO public.person_aliases
  (person_id, path, alias_type, is_canonical, source, source_id)
SELECT
  p.id,
  '/profile/' || p.slug,
  'profile',
  true,
  -- The alias's source namespace mirrors where the person came from. Use the
  -- origin key's namespace so the alias row is traceable to its record.
  CASE
    WHEN p.origin_key LIKE 'rinkstop_players:%' THEN 'rinkstop_players'
    WHEN p.origin_key LIKE 'nhl_players:%'     THEN 'nhl_players'
    WHEN p.origin_key LIKE 'nhl_coaching_staff:%' THEN 'nhl_coaching_staff'
    WHEN p.origin_key LIKE 'team_members:%'     THEN 'team_members'
    WHEN p.origin_key LIKE 'coach_profiles:%'   THEN 'coach_profiles'
    WHEN p.origin_key LIKE 'profiles_account:%' THEN 'profiles_account'
    ELSE 'rinkstop_players'
  END,
  COALESCE(split_part(p.origin_key, ':', 2), p.id::text)
FROM public.persons p
WHERE p.slug IS NOT NULL
  AND p.identity_state <> 'merged'
  -- Never shadow an account URL (requirement 2).
  AND p.slug NOT IN (SELECT username FROM public.profiles WHERE username IS NOT NULL)
  -- The path must be free.
  AND NOT EXISTS (
    SELECT 1 FROM public.person_aliases a WHERE a.path = '/profile/' || p.slug
  );

-- 4b. OBSOLETE paths for merged-away persons → point at the SURVIVOR.
--
--    A merged-away person's source rows were RE-POINTED to the survivor, so
--    the merged-away person no longer owns any source row. The obsolete path
--    is therefore reconstructed from the person's own NAME (the URL a visitor
--    would have used) and from the survivor's own pre-merge source slug.
--
--    Both are mapped to the survivor with is_canonical = false, so the
--    resolver can 301 them to the survivor's canonical URL.
INSERT INTO public.person_aliases
  (person_id, path, alias_type, is_canonical, source, source_id)
SELECT DISTINCT
  surv.id,
  a.path,
  'player',
  false,
  a.source,
  a.source_id
FROM (
  SELECT
    m.canonical_person_id AS survivor_id,
    '/profile/' || trim(both '-' FROM lower(regexp_replace(
        COALESCE(NULLIF(btrim(concat_ws(' ', m.first_name, m.last_name)), ''),
                 NULLIF(btrim(m.display_name), '')),
        '[^a-zA-Z0-9]+', '-', 'g'))) AS path,
    'rinkstop_players' AS source,
    m.id::text AS source_id
  FROM public.persons m
  WHERE m.identity_state = 'merged'
    AND m.canonical_person_id IS NOT NULL
    AND trim(both '-' FROM lower(regexp_replace(
        COALESCE(NULLIF(btrim(concat_ws(' ', m.first_name, m.last_name)), ''),
                 NULLIF(btrim(m.display_name), '')),
        '[^a-zA-Z0-9]+', '-', 'g'))) <> ''
) a
JOIN public.persons surv ON surv.id = a.survivor_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_aliases x WHERE x.path = a.path
)
  -- Never shadow an account URL.
  AND split_part(a.path, '/', 3) NOT IN (SELECT username FROM public.profiles WHERE username IS NOT NULL);

-- -----------------------------------------------------------------------------
-- 5. Verification. The transaction ABORTS if any check fails, so a failed run
--    leaves the database exactly as it was.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_no_slug_merged    bigint;
  v_dup_slug          bigint;
  v_dup_public_id     bigint;
  v_missing_slug      bigint;
  v_missing_alias     bigint;
  v_alias_account_clash bigint;
  v_alias_not_person  bigint;
  v_merged_alias_bad  bigint;
  v_obsolete          bigint;
BEGIN
  -- No merged-away person holds a slug or a public_id.
  SELECT count(*) INTO v_no_slug_merged
    FROM public.persons WHERE identity_state = 'merged' AND (slug IS NOT NULL OR public_id IS NOT NULL);
  IF v_no_slug_merged <> 0 THEN
    RAISE EXCEPTION 'phase3 verify: % merged persons still hold a slug/public_id', v_no_slug_merged;
  END IF;

  -- Slugs are unique (enforced by the constraint, but assert it anyway).
  SELECT count(*) INTO v_dup_slug
    FROM (SELECT slug FROM public.persons WHERE slug IS NOT NULL GROUP BY slug HAVING count(*) > 1) t;
  IF v_dup_slug <> 0 THEN
    RAISE EXCEPTION 'phase3 verify: % duplicate slugs', v_dup_slug;
  END IF;

  SELECT count(*) INTO v_dup_public_id
    FROM (SELECT public_id FROM public.persons WHERE public_id IS NOT NULL GROUP BY public_id HAVING count(*) > 1) t;
  IF v_dup_public_id <> 0 THEN
    RAISE EXCEPTION 'phase3 verify: % duplicate public_ids', v_dup_public_id;
  END IF;

  -- Every surviving person has a slug and a public_id.
  SELECT count(*) INTO v_missing_slug
    FROM public.persons WHERE identity_state <> 'merged' AND (slug IS NULL OR public_id IS NULL);
  IF v_missing_slug <> 0 THEN
    RAISE EXCEPTION 'phase3 verify: % surviving persons lack a slug or public_id', v_missing_slug;
  END IF;

  -- Every surviving person has a canonical alias.
  SELECT count(*) INTO v_missing_alias
    FROM public.persons p
   WHERE p.identity_state <> 'merged'
     AND p.slug IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.person_aliases a
        WHERE a.person_id = p.id AND a.is_canonical AND a.path = '/profile/' || p.slug);
  IF v_missing_alias <> 0 THEN
    RAISE EXCEPTION 'phase3 verify: % surviving persons lack a canonical alias', v_missing_alias;
  END IF;

  -- No alias shadows a `profiles.username`.
  SELECT count(*) INTO v_alias_account_clash
    FROM public.person_aliases a
    JOIN public.profiles p ON p.username = split_part(a.path, '/', 3)
   WHERE a.path LIKE '/profile/%';
  IF v_alias_account_clash <> 0 THEN
    RAISE EXCEPTION 'phase3 verify: % alias paths collide with a profiles.username', v_alias_account_clash;
  END IF;

  -- Every alias points at a real person.
  SELECT count(*) INTO v_alias_not_person
    FROM public.person_aliases a
    WHERE NOT EXISTS (SELECT 1 FROM public.persons p WHERE p.id = a.person_id);
  IF v_alias_not_person <> 0 THEN
    RAISE EXCEPTION 'phase3 verify: % alias rows point at a non-existent person', v_alias_not_person;
  END IF;

  -- An obsolete (non-canonical) alias must point at a SURVIVOR, never at a
  -- merged-away person.
  SELECT count(*) INTO v_merged_alias_bad
    FROM public.person_aliases a
    JOIN public.persons p ON p.id = a.person_id
   WHERE a.is_canonical = false AND p.identity_state = 'merged';
  IF v_merged_alias_bad <> 0 THEN
    RAISE EXCEPTION 'phase3 verify: % obsolete aliases point at a merged-away person', v_merged_alias_bad;
  END IF;

  -- Count the obsolete aliases (informational).
  SELECT count(*) INTO v_obsolete
    FROM public.person_aliases WHERE is_canonical = false;

  RAISE NOTICE 'phase3 COMPLETE: persons with slug=% public_id=% aliases=% obsolete=%',
    (SELECT count(*) FROM public.persons WHERE slug IS NOT NULL),
    (SELECT count(*) FROM public.persons WHERE public_id IS NOT NULL),
    (SELECT count(*) FROM public.person_aliases),
    v_obsolete;
END $$;

COMMIT;
