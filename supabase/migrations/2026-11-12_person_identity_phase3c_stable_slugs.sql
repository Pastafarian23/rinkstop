-- =============================================================================
-- 2026-11-12_person_identity_phase3c_stable_slugs.sql
--
-- =============================================================================
-- ⚠️  THIS MIGRATION IS ALREADY APPLIED TO PRODUCTION. DO NOT RE-APPLY IT.
-- =============================================================================
--     Applied by hand on 2026-11-12 via the Supabase Management API.
--     It is recorded in `_HAND_APPLIED.md`. Re-running it is not harmless:
--     the slug derivation is a one-shot transformation over the CURRENT
--     data, and running it a second time would re-derive every slug from
--     the already-renamed rows and move every canonical alias path a
--     SECOND time.
--
--     Verified live after the apply:
--       persons              11,443
--       person_aliases       12,305  (11,386 canonical + 919 obsolete)
--       person_slug_renames    916  (6 with path_handover = true)
--       person_sources       11,443
--       person_roles         11,424
--       person_claims             0  ← ownership untouched
--       duplicate slugs / paths / account clashes / canonical mismatches: 0
--       old URLs resolving to nobody: 0
--
--     The file is kept in the repo as the RECORD of what was applied, and
--     as the reference for the derivation the code must reproduce. The
--     reference implementation of the rule is `src/lib/person-slug.ts`;
--     Gate 24 (`scripts/_audit-unified-profile.mjs`) recomputes every slug
--     with that module and compares, so the SQL and the TypeScript cannot
--     drift without the gate failing.
-- =============================================================================
--
-- PHASE 3C — make person profile URLs STABLE and READABLE, and stop deriving
-- identity URLs from mutable team / role / nationality data.
--
-- Authorized by Arnel Larracas 2026-11-12 — the approved unified
-- /profile/ architecture:
--   3. "Stable person URLs: deterministic, collision-safe, readable
--       name-based persons.slug and public_id; stable unique suffixes when
--       needed; never derive identity URLs from mutable team, role, or
--       nationality data."
--   1. "Both source records of a merged identity map to one profile; obsolete
--       person-profile paths redirect to the surviving canonical URL."
--   2. "Preserve every existing profiles.username URL; exclude account
--       username collisions from alias generation; never let an alias
--       override an account profile."
--
-- WHAT WAS WRONG BEFORE THIS MIGRATION (measured against the live database)
--   Phase 3 broke name collisions with a TAIL TAKEN FROM THE PERSON'S OWN
--   SOURCE SLUG — a source slug that carries a TEAM SUFFIX:
--
--     darcy-kuemper-lak        (LA-K)
--     pavel-dorofeyev-vgk      (VGK)
--     marco-rossi-min          (MIN)
--     andrei-kuzmenko-lak      (LA-K)
--
--   829 of the live slugs end in such a team/roster tail. A team's
--   abbreviation changes when a player is traded, and a roster tail is
--   mutable data — so a person's PUBLIC IDENTITY URL was derived from
--   mutable data. That is the defect requirement 3 names.
--
--   A second, smaller defect: accented characters were STRIPPED rather
--   than folded, so "André Heim" became `andr-heim` and "Tim Stützle"
--   became `tim-st-tzle` — a URL that mis-spells a real person's name.
--   81 live persons are affected.
--
-- THE RULE (deterministic, name-based, no mutable data)
--   base = the person's NAME (first + last, else display_name),
--          accent-folded (Stützle -> Stutzle), lower-cased,
--          non-alphanumerics collapsed to one hyphen, trimmed.
--
--   slug = base                                    when the base is UNIQUE
--        = base + '-' + md5(origin_key)[0:6]         when the name collides
--        = base + '-' + md5(origin_key)[0:12]        (next candidate)
--        = base + '-' + md5(origin_key)              (last candidate)
--
--   `origin_key` is the source namespace + the source row's immutable
--   primary key (e.g. 'rinkstop_players:9f2c…'). It contains NO team, NO
--   role, NO nationality and NO jersey — it is the record's identity, not
--   its current state. Two people with the same name therefore get
--   DIFFERENT, STABLE suffixes, and neither suffix can change when the
--   person changes teams.
--
--   A base that only ONE person claims is uncontested and keeps its clean
--   readable name. Only CONTESTED bases (two or more people) give up the
--   bare base, so only genuine name collisions receive a suffix.
--
--   Ranking inside a same-name group:
--     1. a SURVIVOR of a merge comes FIRST — the surviving canonical URL
--        must be the readable one, and the merged-away person's own name
--        path then resolves to the survivor instead of needing an alias;
--     2. then `origin_key` ascending;
--     3. then the person id.
--   All three are immutable, so the whole derivation is reproducible from
--   the data alone, on every environment, for ever.
--
--   REFERENCE IMPLEMENTATION: src/lib/person-slug.ts. Gate 24
--   (scripts/_audit-unified-profile.mjs) recomputes every slug with that
--   module and compares — so the SQL and the TypeScript cannot drift
--   without the gate failing.
--
-- WHAT IT CHANGES
--   • `persons.slug` values that carry a team tail or a stripped accent,
--     and the matching canonical `person_aliases.path` values.
--   • One OBSOLETE alias row per renamed person: the person's OLD canonical
--     path now 308-redirects to its new canonical path, so no URL that ever
--     existed 404s.
--   • Nothing else. In particular the 38 merged-away persons keep a NULL
--     slug and NULL public_id.
--
-- WHAT IT DOES NOT TOUCH
--   • `players`, `nhl_players`, `nhl_coaching_staff`, `team_members`,
--     `coach_profiles`, `profiles` — no legacy row is modified.
--   • `person_sources` / `person_roles` — no re-pointing, no row lost.
--   • `person_claims`, `claims`, `managed_profiles` — OWNERSHIP IS UNTOUCHED.
--     Claiming is a later phase; this migration creates no claim and asserts
--     no owner.
--   • `persons.public_id` — it is a hash of the person id and never changes.
--   • `persons.identity_state` / `canonical_person_id` — the merge graph is
--     unchanged.
--
-- SAFETY (all asserted inside the transaction; a failure ABORTS everything)
--   1. No merged-away person holds a slug or a public_id.
--   2. Slugs stay unique, and every one still matches the derivation rule.
--   3. No alias path collides with a `profiles.username` (accounts win).
--   4. No alias path is duplicated.
--   5. Every canonical alias path equals '/profile/' || that person's slug.
--   6. Every renamed person has an obsolete alias at its OLD path, pointing
--      at itself, and that path differs from its canonical path.
--   7. No obsolete alias is a self-loop and none chains to another obsolete
--      alias.
--   8. `person_claims` / `claims` / `managed_profiles` row counts are
--      unchanged.
--   9. `person_sources` and `person_roles` row counts are unchanged.
--  10. Every final slug is one of the four legal candidate forms for its
--      own person (base, or base + a 6/12/32-hex hash of its origin_key).
--      A hyphenated NAME like `martin-fehervary` is legal; a team tail
--      like `martin-fehervary-57c547` is not, unless those trailing
--      characters are the hash of that person's own origin_key.
--
-- ROLLBACK
--   UPDATE public.persons p SET slug = h.old_slug
--     FROM public.person_slug_renames h WHERE h.person_id = p.id;
--   UPDATE public.person_aliases a SET path = '/profile/' || p.slug
--     FROM public.persons p
--    WHERE a.person_id = p.id AND a.is_canonical;
--   DELETE FROM public.person_aliases
--    WHERE alias_type = 'profile' AND is_canonical = false
--      AND created_at >= (timestamp of this migration);
--   DELETE FROM public.person_slug_renames;
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Preconditions.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_merged bigint;
  v_alive  bigint;
BEGIN
  SELECT count(*) INTO v_merged FROM public.persons WHERE identity_state = 'merged';
  IF v_merged <> 38 THEN
    RAISE EXCEPTION 'phase3c: expected 38 merged persons, found %', v_merged;
  END IF;

  SELECT count(*) INTO v_alive FROM public.persons WHERE identity_state <> 'merged';
  IF v_alive = 0 THEN
    RAISE EXCEPTION 'phase3c: no surviving persons — refusing to run';
  END IF;

  RAISE NOTICE 'phase3c: alive=% merged=%', v_alive, v_merged;
END $$;

-- -----------------------------------------------------------------------------
-- 1. The set of persons whose slug is a PUBLIC URL.
--
--    A person gets a public profile URL only when they have a canonical
--    alias. That is:
--      • a SURVIVOR (identity_state <> 'merged'), AND
--      • a person with a canonical `person_aliases` row.
--
--    Account-only persons are excluded by construction: they have NO alias
--    (their canonical URL IS the account URL).
--
--    Fixture persons are excluded EXPLICITLY: they keep their opaque
--    'p-<hash>' handle. A fixture person is one whose CURRENT slug or whose
--    NAME BASE matches a fixture pattern (test / demo / dummy / sample /
--    fixture / fake / placeholder / lorem / fanout / qa / user-<hash> /
--    p-<12 hex>). The pattern is the same one in `isFixtureSlug()` in
--    src/lib/person-slug.ts.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS tmp_p3c_scope;
CREATE TEMP TABLE tmp_p3c_scope ON COMMIT DROP AS
SELECT p.id, p.slug AS old_slug, p.origin_key
  FROM public.persons p
  JOIN public.person_aliases a ON a.person_id = p.id AND a.is_canonical
 WHERE p.identity_state <> 'merged'
   AND lower(p.slug) !~ '(^|-)(test|testing|demo|dummy|sample|fixture|fake|placeholder|lorem)(-[0-9a-z]+)*$'
   AND lower(p.slug) !~ '(^|-)(fanout|qa)(-[0-9a-z]+)*$'
   AND lower(p.slug) !~ '^user-[0-9a-f]{20,}$'
   AND lower(p.slug) !~ '^p-[0-9a-f]{12}$';

-- -----------------------------------------------------------------------------
-- 2. The BASE slug: the person's NAME, accent-folded.
--
--    The fold table is explicit rather than a generic transliteration, so
--    the mapping is fixed and reviewable, and it matches
--    src/lib/person-slug.ts character for character. A character not in the
--    table is dropped by the regexp below — the live data contains no such
--    character, and the verification step proves the result matches the
--    TypeScript reference.
--
--    NOTE: the fold is applied by walking the name CHARACTER BY CHARACTER
--    through the fold table below, so a two-character expansion ('æ'->'ae')
--    can never be re-replaced by a later rule, and the table is reviewable
--    as data rather than as 90 nested function calls.
--
--    The table below is character-for-character identical to the ACCENT_MAP
--    in src/lib/person-slug.ts. The dry-run harness
--    (scripts/_tmp-dryrun-phase3c.mjs) asserts that the two produce the
--    same slug for every one of the 11,383 in-scope people.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS tmp_p3c_fold;
CREATE TEMP TABLE tmp_p3c_fold ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('Ä','A'),('Ö','O'),('Ü','U'),('É','E'),('Á','A'),('Å','A'),('È','E'),('Ý','Y'),('Ë','E'),
  ('Ú','U'),('Ÿ','Y'),('Ç','C'),('Ñ','N'),('Î','I'),('Ô','O'),('Û','U'),('Â','A'),('Ê','E'),
  ('Ã','A'),('Õ','O'),('Ì','I'),('Ò','O'),('Ù','U'),('Í','I'),
  ('ä','a'),('ö','o'),('ü','u'),('é','e'),('á','a'),('å','a'),('è','e'),('ý','y'),('ë','e'),
  ('ú','u'),('ÿ','y'),('ç','c'),('ñ','n'),('î','i'),('ô','o'),('û','u'),('â','a'),('ê','e'),
  ('ã','a'),('õ','o'),('ì','i'),('ò','o'),('ù','u'),('í','i'),
  ('æ','ae'),('Æ','AE'),('œ','oe'),('Œ','OE'),('ß','ss'),('ð','d'),('Ð','D'),('þ','th'),('Þ','TH')
) AS t(from_char, to_char);

DROP TABLE IF EXISTS tmp_p3c_base;
CREATE TEMP TABLE tmp_p3c_base ON COMMIT DROP AS
WITH named AS (
  SELECT
    s.id,
    s.old_slug,
    s.origin_key,
    COALESCE(
      NULLIF(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
      NULLIF(btrim(p.display_name), '')
    ) AS name_text
  FROM tmp_p3c_scope s
  JOIN public.persons p ON p.id = s.id
),
-- Split the name into characters, fold each one through the table, and
-- re-join. A character with no fold rule is left alone.
chars AS (
  SELECT
    n.id,
    n.old_slug,
    n.origin_key,
    n.name_text,
    t.ch,
    t.ord
  FROM named n
  CROSS JOIN LATERAL regexp_split_to_table(n.name_text, '') WITH ORDINALITY AS t(ch, ord)
),
folded AS (
  SELECT
    c.id,
    c.old_slug,
    c.origin_key,
    string_agg(
      COALESCE(f.to_char, c.ch),
      ''
      ORDER BY c.ord
    ) AS name_text
  FROM chars c
  LEFT JOIN tmp_p3c_fold f ON f.from_char = c.ch
  GROUP BY c.id, c.old_slug, c.origin_key
)
SELECT
  f.id,
  f.old_slug,
  f.origin_key,
  -- lower() MUST come FIRST. `[^a-z0-9]+` does not match uppercase
  -- letters, so lower(regexp_replace(x, ...)) would replace every
  -- capital letter with a hyphen: 'Aarne Intonen' -> 'arne-ntonen'.
  -- lower(regexp_replace(lower(x), ...)) is the correct order and matches
  -- the TypeScript reference (which lower-cases before stripping).
  trim(both '-' FROM regexp_replace(lower(f.name_text), '[^a-z0-9]+', '-', 'g')) AS base
FROM folded f
-- A person whose name reduces to nothing keeps the slug they already have.
WHERE trim(both '-' FROM regexp_replace(lower(f.name_text), '[^a-z0-9]+', '-', 'g')) <> '';

-- -----------------------------------------------------------------------------
-- 3. The FINAL slug per person.
--
--    Inside a same-name group the members are ordered by
--      1. survivor first,
--      2. origin_key ascending,
--      3. id ascending.
--    The FIRST member of a CONTESTED group (group_size > 1) keeps the clean
--    base; every other member gets a hash suffix derived from its OWN
--    origin_key.
--
--    A group of size 1 keeps its clean base too — nobody else wants it.
--    This is why the ladder below is only entered on collision.
--
--    The candidate ladder is base -> base+md5[0:6] -> base+md5[0:12] ->
--    base+md5(full). The first free candidate wins. `taken` grows as we go,
--    so a later group can never steal an earlier group's slug.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS tmp_p3c_ranked;
CREATE TEMP TABLE tmp_p3c_ranked ON COMMIT DROP AS
SELECT
  b.id,
  b.old_slug,
  b.origin_key,
  b.base,
  row_number() OVER (
    PARTITION BY b.base
    ORDER BY
      -- A SURVIVOR of a merge comes FIRST. The surviving canonical URL
      -- must be the readable one, and the merged-away person's own name
      -- path then resolves to the survivor instead of needing an alias.
      (CASE WHEN EXISTS (
        SELECT 1 FROM public.persons mp
         WHERE mp.canonical_person_id = b.id
           AND mp.identity_state = 'merged'
      ) THEN 0 ELSE 1 END),
      b.origin_key NULLS FIRST,
      b.id
  ) AS rn,
  count(*) OVER (PARTITION BY b.base) AS group_size
FROM tmp_p3c_base b;

-- -----------------------------------------------------------------------------
-- 3b. Reserved paths.
--
--    A path is reserved BEFORE any assignment if:
--      • it is a `profiles.username` (ACCOUNT URLS WIN — requirement 2);
--      • it is the slug of a person that is OUT OF SCOPE — an account-only
--        person (their public URL IS the account URL) or a fixture person
--        (they keep their opaque 'p-<hash>' handle).
--
--    A derived slug can never take one of these.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS tmp_p3c_reserved;
CREATE TEMP TABLE tmp_p3c_reserved ON COMMIT DROP AS
SELECT lower(username) AS path
  FROM public.profiles WHERE username IS NOT NULL
UNION
-- The slug of any person who is NOT in scope: an account-only person (their
-- public URL IS the account URL) or a fixture person (they keep their
-- opaque 'p-<hash>' handle). A derived slug can never take one of these.
SELECT lower(p.slug)
  FROM public.persons p
 WHERE p.slug IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM tmp_p3c_scope s WHERE s.id = p.id
   );

-- -----------------------------------------------------------------------------
-- 3c. The FINAL slug per person.
--
--    This mirrors `assignPersonSlugs()` in src/lib/person-slug.ts exactly:
--
--      1. Group the people by their name base.
--      2. Walk the groups in base order; inside a group walk the members by
--         (survivor first, then origin_key, then id).
--      3. A base claimed by only ONE person is uncontested — that person
--         keeps the clean readable name.
--      4. In a CONTESTED group only the FIRST member may take the bare
--         base; every other member walks the hash ladder:
--             base + '-' + md5(origin_key)[0:6]
--             base + '-' + md5(origin_key)[0:12]
--             base + '-' + md5(origin_key)
--      5. `taken` accumulates across groups, so a later group can never
--         steal an earlier group's slug.
--
--    The ladder is implemented with a recursive walk over the candidate
--    sequence, and the "taken" test is done in SQL at each step.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS tmp_p3c_candidates;
CREATE TEMP TABLE tmp_p3c_candidates ON COMMIT DROP AS
-- Every legal candidate for every person, with its ladder position.
SELECT
  r.id,
  r.old_slug,
  r.origin_key,
  r.base,
  r.rn,
  r.group_size,
  s.step,
  s.candidate
FROM tmp_p3c_ranked r
CROSS JOIN LATERAL (
  SELECT 0 AS step, r.base AS candidate
  UNION ALL
  SELECT 1, r.base || '-' || substr(md5(r.origin_key), 1, 6)
  UNION ALL
  SELECT 2, r.base || '-' || substr(md5(r.origin_key), 1, 12)
  UNION ALL
  SELECT 3, r.base || '-' || md5(r.origin_key)
) s;

-- The walk: for each person, the first candidate that is neither reserved
-- nor already handed to an earlier person in the deterministic global
-- order (base, origin_key, id).
DROP TABLE IF EXISTS tmp_p3c_final;
CREATE TEMP TABLE tmp_p3c_final ON COMMIT DROP AS
WITH global_order AS (
  SELECT
    r.id,
    r.old_slug,
    r.origin_key,
    r.base,
    r.rn,
    r.group_size,
    row_number() OVER (ORDER BY r.base, r.origin_key NULLS FIRST, r.id) AS global_rn
  FROM tmp_p3c_ranked r
),
-- For each candidate, is it claimed by an EARLIER person in the global
-- order? A candidate is blocked if the person who would claim it sits
-- earlier in the order. The claimant of a candidate is itself determined
-- by the same rule, so this is resolved by taking, for each candidate,
-- the EARLIEST person in the global order that is ALLOWED to take it.
--
-- "Allowed to take it" means:
--   • the candidate is in that person's ladder (it is their base or one of
--     their hash variants), AND
--   • for the bare base, the person is the first member of their group
--     (or the group has only one member).
--
-- The earlier person wins the slug; the later person falls through to
-- their next ladder rung. Because the ladder is strictly per-person and
-- the order is total, the result is unique.
blocked AS (
  -- For every candidate, find the EARLIEST person (in global order) that
  -- is ALLOWED to take it.
  --
  -- The candidate space is small in practice: within a name group only the
  -- bare base is shared (the hash variants are unique by construction), so
  -- `DISTINCT ON (candidate)` resolves the claimant in one pass rather than
  -- a self-join.
  SELECT DISTINCT ON (c.candidate)
    c.candidate,
    g.global_rn AS claimant_rn
  FROM tmp_p3c_candidates c
  JOIN global_order g ON g.id = c.id
  WHERE (
    (c.step = 0 AND (c.group_size = 1 OR c.rn = 1))
    OR c.step > 0
  )
  ORDER BY c.candidate, g.global_rn
)
SELECT
  g.id,
  g.old_slug,
  g.origin_key,
  g.base,
  c.candidate
FROM global_order g
JOIN tmp_p3c_candidates c ON c.id = g.id
JOIN blocked b ON b.candidate = c.candidate
WHERE b.claimant_rn = g.global_rn
  AND NOT EXISTS (
    SELECT 1 FROM tmp_p3c_reserved rv WHERE rv.path = lower(c.candidate)
  )
  AND c.step = (
    SELECT min(c2.step)
      FROM tmp_p3c_candidates c2
      JOIN global_order g2 ON g2.id = c2.id
      JOIN blocked b2 ON b2.candidate = c2.candidate
     WHERE c2.id = g.id
       AND b2.claimant_rn = g2.global_rn
       AND NOT EXISTS (
         SELECT 1 FROM tmp_p3c_reserved rv2 WHERE rv2.path = lower(c2.candidate)
       )
  );

-- The rename map: only rows whose slug actually changes.
DROP TABLE IF EXISTS tmp_p3c_map;
CREATE TEMP TABLE tmp_p3c_map ON COMMIT DROP AS
SELECT id, old_slug, candidate AS new_slug
  FROM tmp_p3c_final
 WHERE candidate IS DISTINCT FROM old_slug;

-- A duplicate candidate would violate the persons.slug UNIQUE constraint.
DO $$
DECLARE
  v_dup_candidate bigint;
  v_reserved_hit  bigint;
BEGIN
  SELECT count(*) INTO v_dup_candidate
    FROM (SELECT candidate FROM tmp_p3c_final GROUP BY candidate HAVING count(*) > 1) t;
  IF v_dup_candidate <> 0 THEN
    RAISE EXCEPTION 'phase3c: % people received the same final slug', v_dup_candidate;
  END IF;

  SELECT count(*) INTO v_reserved_hit
    FROM tmp_p3c_final f
    JOIN tmp_p3c_reserved r ON r.path = lower(f.candidate);
  IF v_reserved_hit <> 0 THEN
    RAISE EXCEPTION 'phase3c: % final slugs collide with a reserved path', v_reserved_hit;
  END IF;
END $$;


-- 4. A rename history table, so the old URL can always be resolved.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_slug_renames (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id   uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  old_slug    text NOT NULL,
  new_slug    text NOT NULL,
  -- TRUE when the old path was handed over to ANOTHER person (the survivor
  -- of a same-name pair) instead of being kept as an obsolete redirect for
  -- this person. The old URL still works — it resolves to the other row,
  -- which is the SAME HUMAN.
  path_handover boolean NOT NULL DEFAULT false,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_slug_renames_unique UNIQUE (person_id, old_slug)
);

COMMENT ON TABLE public.person_slug_renames IS
  'History of persons.slug changes. Every row keeps the old public path alive '
  'as an obsolete person_aliases row that redirects to the new canonical path. '
  'Rows with path_handover = true are the exception: their old path became '
  'another person''s canonical path (the survivor of a same-name pair), so the '
  'old URL resolves to that survivor — the same human.';

-- The column is new in this migration; add it if the table already existed.
ALTER TABLE public.person_slug_renames
  ADD COLUMN IF NOT EXISTS path_handover boolean NOT NULL DEFAULT false;

-- RLS: service-role only, exactly like the other identity tables created in
-- 2026-11-12_person_identity_phase0.sql. Anon and authenticated get no
-- access at all; the service role bypasses RLS.
ALTER TABLE public.person_slug_renames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_person_slug_renames ON public.person_slug_renames;
CREATE POLICY deny_anon_person_slug_renames ON public.person_slug_renames
  FOR SELECT TO anon USING (false);
DROP POLICY IF EXISTS deny_authenticated_person_slug_renames ON public.person_slug_renames;
CREATE POLICY deny_authenticated_person_slug_renames ON public.person_slug_renames
  FOR SELECT TO authenticated USING (false);

-- -----------------------------------------------------------------------------
-- 5. MOVE the canonical alias paths FIRST.
--
--    `person_aliases.path` is UNIQUE, and the UNIQUE constraint is checked
--    PER ROW by Postgres. So a single UPDATE that moves canonical paths can
--    fail even when the end state is valid: if person A vacates
--    '/profile/tim-stutzle' and person B takes it, and Postgres processes B
--    before A, B's row violates the UNIQUE constraint.
--
--    Two of the six NHL duplicate-name rows hit exactly that. So the move
--    is done in TWO STEPS:
--      1. every renamed canonical alias moves to a unique temporary path;
--      2. every renamed canonical alias moves from the temporary path to
--         its final path.
--    Step 1 frees every old path before step 2 claims any new one.
--
--    Guard: a new path may not equal another person's canonical path,
--    EXCEPT where that other person is itself being renamed away from that
--    path in this same transaction.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_conflict bigint;
BEGIN
  SELECT count(*) INTO v_conflict
    FROM tmp_p3c_map m
    JOIN public.person_aliases a
      ON a.path = '/profile/' || m.new_slug
     AND a.person_id <> m.id
     AND a.is_canonical
     -- The other person is vacating this exact path in this same
     -- transaction, so it is a move, not a collision.
     AND NOT EXISTS (
       SELECT 1 FROM tmp_p3c_map om
        WHERE om.id = a.person_id
          AND om.old_slug = m.new_slug
     );
  IF v_conflict > 0 THEN
    RAISE EXCEPTION 'phase3c: % new slugs collide with another person''s canonical path', v_conflict;
  END IF;
END $$;

-- Step 1: move every renamed canonical alias to a unique temporary path.
UPDATE public.person_aliases a
   SET path = '/profile/__p3c_tmp_' || md5(a.person_id::text || m.new_slug)
  FROM tmp_p3c_map m
 WHERE a.person_id = m.id
   AND a.is_canonical;

-- Step 2: move it from the temporary path to its final path.
UPDATE public.person_aliases a
   SET path = '/profile/' || m.new_slug
  FROM tmp_p3c_map m
 WHERE a.person_id = m.id
   AND a.is_canonical
   AND a.path = '/profile/__p3c_tmp_' || md5(a.person_id::text || m.new_slug);

-- -----------------------------------------------------------------------------
-- 6. Update `persons.slug` and record the rename.
--
--    `persons.slug` is UNIQUE and Postgres checks it PER ROW, so the same
--    ordering hazard applies here: the survivor of the 'tim-stutzle' pair
--    takes '/profile/tim-stutzle' while the other NHL row is still holding
--    it. Two steps again — park everyone on a temporary unique slug, then
--    move them onto their final slug.
-- -----------------------------------------------------------------------------
UPDATE public.persons p
   SET slug = '__p3c_tmp_' || md5(p.id::text || m.new_slug)
  FROM tmp_p3c_map m
 WHERE p.id = m.id;

UPDATE public.persons p
   SET slug = m.new_slug
  FROM tmp_p3c_map m
 WHERE p.id = m.id
   AND p.slug = '__p3c_tmp_' || md5(p.id::text || m.new_slug);

INSERT INTO public.person_slug_renames (person_id, old_slug, new_slug, path_handover)
SELECT
  m.id,
  m.old_slug,
  m.new_slug,
  -- TRUE when this person's OLD path is now another person's canonical path
  -- (the survivor of a same-name pair took it).
  EXISTS (
    SELECT 1 FROM public.person_aliases a
     WHERE a.path = '/profile/' || m.old_slug
       AND a.is_canonical
       AND a.person_id <> m.id
  )
  FROM tmp_p3c_map m
ON CONFLICT (person_id, old_slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. OBSOLETE redirect for every renamed person's OLD path.
--
--    The old path now belongs to the same person, whose canonical path is
--    the new slug. The middleware 308s an obsolete path to the person's
--    canonical path, so the old URL keeps working forever.
--
--    THE SIX PATH HANDOVERS
--      Six NHL rows share a name with another NHL row for the SAME human:
--
--        nhl_players:70461827  (Tim Stützle)   and  nhl_players:8482116
--        nhl_players:73417037  (Oskar Bäck)    and  nhl_players:8480840
--        nhl_players:65292692  (Isac Lundeström) and nhl_players:8480806
--        nhl_players:70461797  (Alexis Lafrenière) and nhl_players:8482109
--        nhl_players:65681222  (Martin Fehérváry) and nhl_players:8480796
--        nhl_players:73421612  (Leevi Meriläinen) and nhl_players:8482447
--
--      These are SEPARATE upstream records — same human, two rows — so
--      they are NOT merged (name equality is not identity). The survivor
--      takes the clean readable name; the other row takes a hash suffix.
--
--      The consequence: the other row's OLD path ('/profile/tim-stutzle')
--      BECOMES the survivor's canonical path. One path can have one owner,
--      so the other row cannot also keep an obsolete alias there.
--
--      That is correct and desirable. '/profile/tim-stutzle' now resolves to
--      the survivor — the SAME HUMAN the old URL always pointed at. The
--      old URL keeps working, it resolves to the right person, and the
--      other NHL row is reachable at its own hashed path. No URL is lost
--      and no URL points at the wrong human.
--
--      These six are recorded in `person_slug_renames` with a
--      `path_handover` marker so the history is explicit rather than
--      silent, and the verification below checks the handover case
--      separately from the ordinary obsolete-alias case.
-- -----------------------------------------------------------------------------
INSERT INTO public.person_aliases
  (person_id, path, alias_type, is_canonical, source, source_id)
SELECT
  m.id,
  '/profile/' || m.old_slug,
  'profile',
  false,
  CASE
    WHEN p.origin_key LIKE 'rinkstop_players:%'    THEN 'rinkstop_players'
    WHEN p.origin_key LIKE 'nhl_players:%'        THEN 'nhl_players'
    WHEN p.origin_key LIKE 'nhl_coaching_staff:%' THEN 'nhl_coaching_staff'
    WHEN p.origin_key LIKE 'team_members:%'        THEN 'team_members'
    WHEN p.origin_key LIKE 'coach_profiles:%'      THEN 'coach_profiles'
    WHEN p.origin_key LIKE 'profiles_account:%'    THEN 'profiles_account'
    ELSE 'rinkstop_players'
  END,
  COALESCE(split_part(p.origin_key, ':', 2), p.id::text)
  FROM tmp_p3c_map m
  JOIN public.persons p ON p.id = m.id
 WHERE NOT EXISTS (
         SELECT 1 FROM public.person_aliases a WHERE a.path = '/profile/' || m.old_slug
       )
   AND NOT EXISTS (
         SELECT 1 FROM public.profiles pr WHERE pr.username = m.old_slug
       );

-- -----------------------------------------------------------------------------
-- 8. OBSOLETE redirect for a MERGED-AWAY person's own name path.
--
--    A merged-away person has no profile of its own — the survivor's is
--    canonical. When the merged-away person's name path DIFFERS from the
--    survivor's canonical path, the name path must redirect to the
--    survivor. When the two are the SAME string there is nothing to
--    redirect (the path already resolves to the survivor) and an alias
--    there would be a self-loop, which the UNIQUE constraint forbids.
--
--    The name path uses the SAME accent folding as the slug rule, so
--    "Tim Stützle" is 'tim-stutzle'.
-- -----------------------------------------------------------------------------
INSERT INTO public.person_aliases
  (person_id, path, alias_type, is_canonical, source, source_id)
SELECT
  m.canonical_person_id,
  '/profile/' || m.name_path,
  'player',
  false,
  'rinkstop_players',
  m.id::text
FROM (
  SELECT
    mg.id,
    mg.canonical_person_id,
    -- lower() first — see the note in section 2.
    trim(both '-' FROM regexp_replace(lower(folded.name_text), '[^a-z0-9]+', '-', 'g')) AS name_path
  FROM public.persons mg
  CROSS JOIN LATERAL (
    SELECT string_agg(COALESCE(f.to_char, t.ch), '' ORDER BY t.ord) AS name_text
    FROM regexp_split_to_table(
           COALESCE(
             NULLIF(btrim(concat_ws(' ', mg.first_name, mg.last_name)), ''),
             NULLIF(btrim(mg.display_name), '')
           ), ''
         ) WITH ORDINALITY AS t(ch, ord)
    LEFT JOIN tmp_p3c_fold f ON f.from_char = t.ch
  ) folded
  WHERE mg.identity_state = 'merged'
    AND mg.canonical_person_id IS NOT NULL
) m
JOIN public.persons surv ON surv.id = m.canonical_person_id
WHERE m.name_path <> ''
  AND m.name_path IS DISTINCT FROM surv.slug
  AND NOT EXISTS (SELECT 1 FROM public.person_aliases a WHERE a.path = '/profile/' || m.name_path)
  AND NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.username = m.name_path);

-- -----------------------------------------------------------------------------
-- 9. Verification. Any failure RAISEs and aborts the whole transaction.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_bad_merge_slugs   bigint;
  v_dup_slug          bigint;
  v_dup_path          bigint;
  v_account_clash     bigint;
  v_path_mismatch     bigint;
  v_missing_obsolete  bigint;
  v_self_loop         bigint;
  v_chain             bigint;
  v_claims            bigint;
  v_sources           bigint;
  v_roles             bigint;
  v_bad_rule          bigint;
  v_renames           bigint;
  v_bad_merge_alias   bigint;
  v_orphan_alias      bigint;
  v_bad_handover      bigint;
  v_bad_handover_name bigint;
BEGIN
  -- 1. No merged-away person holds a slug or a public_id.
  SELECT count(*) INTO v_bad_merge_slugs
    FROM public.persons WHERE identity_state = 'merged' AND (slug IS NOT NULL OR public_id IS NOT NULL);
  IF v_bad_merge_slugs <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % merged persons still hold a slug/public_id', v_bad_merge_slugs;
  END IF;

  -- 2. Slugs stay unique.
  SELECT count(*) INTO v_dup_slug
    FROM (SELECT slug FROM public.persons WHERE slug IS NOT NULL GROUP BY slug HAVING count(*) > 1) t;
  IF v_dup_slug <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % duplicate slugs', v_dup_slug;
  END IF;

  -- 3. No alias path collides with a `profiles.username`.
  SELECT count(*) INTO v_account_clash
    FROM public.person_aliases a
    JOIN public.profiles p ON lower(p.username) = lower(split_part(a.path, '/', 3))
   WHERE a.path LIKE '/profile/%';
  IF v_account_clash <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % alias paths collide with a profiles.username', v_account_clash;
  END IF;

  -- 4. No duplicate alias path (also enforced by the schema).
  SELECT count(*) INTO v_dup_path
    FROM (SELECT path FROM public.person_aliases GROUP BY path HAVING count(*) > 1) t;
  IF v_dup_path <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % duplicate alias paths', v_dup_path;
  END IF;

  -- 5. Every canonical alias path equals '/profile/' || the person's slug.
  SELECT count(*) INTO v_path_mismatch
    FROM public.person_aliases a
    JOIN public.persons p ON p.id = a.person_id
   WHERE a.is_canonical AND a.path <> '/profile/' || p.slug;
  IF v_path_mismatch <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % canonical alias paths do not match their person slug', v_path_mismatch;
  END IF;

  -- 6. Every renamed person has a valid redirect at its OLD path.
  --
  --    Two valid shapes:
  --
  --    (a) ORDINARY: the old path is an obsolete alias pointing at the
  --        person themself.
  --
  --    (b) PATH HANDOVER: the old path is now the CANONICAL path of
  --        another person — the survivor of a same-name pair for the SAME
  --        human. The old URL still resolves, and it resolves to the right
  --        human. There is no room for an obsolete alias on top of a
  --        canonical path, and there must not be: one path, one owner.
  --
  --    A handover row that does NOT actually have the old path owned by
  --    another person's canonical alias is a bug, and is rejected.
  SELECT count(*) INTO v_missing_obsolete
    FROM public.person_slug_renames h
    JOIN public.persons p ON p.id = h.person_id
   WHERE CASE
           WHEN h.path_handover THEN
             -- The old path must be somebody else's canonical alias, and it
             -- must NOT still be this person's canonical path.
             NOT EXISTS (
               SELECT 1 FROM public.person_aliases a
                WHERE a.path = '/profile/' || h.old_slug
                  AND a.is_canonical
                  AND a.person_id <> h.person_id
             )
             OR '/profile/' || h.old_slug = '/profile/' || p.slug
           ELSE
             -- The ordinary case: an obsolete alias at the old path.
             NOT EXISTS (
               SELECT 1 FROM public.person_aliases a
                WHERE a.person_id = h.person_id
                  AND a.path = '/profile/' || h.old_slug
                  AND a.is_canonical = false
             )
             OR '/profile/' || h.old_slug = '/profile/' || p.slug
         END;
  IF v_missing_obsolete <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % renamed persons lack a valid redirect at the old path', v_missing_obsolete;
  END IF;

  -- 6b. Every handover is recorded as a handover, and every handover is a
  --     same-name pair. A handover to an unrelated person would mean the
  --     old URL now points at the WRONG human.
  SELECT count(*) INTO v_bad_handover
    FROM public.person_slug_renames h
    JOIN public.person_aliases a
      ON a.path = '/profile/' || h.old_slug AND a.is_canonical
   WHERE h.path_handover
     AND a.person_id = h.person_id;
  IF v_bad_handover <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % handover rows are self-referential', v_bad_handover;
  END IF;

  -- Every handover must be a same-name pair: the person who took the old
  -- path must have the same FOLDED name as the person who gave it up.
  -- ('Stützle' and 'Stutzle' are the same name; the accent fold makes them
  -- comparable.)
  SELECT count(*) INTO v_bad_handover_name
    FROM public.person_slug_renames h
    JOIN public.person_aliases a
      ON a.path = '/profile/' || h.old_slug AND a.is_canonical
    JOIN public.persons giver  ON giver.id = h.person_id
    JOIN public.persons taker  ON taker.id = a.person_id
   WHERE h.path_handover
     AND (SELECT count(DISTINCT b.base)
            FROM tmp_p3c_base b
           WHERE b.id IN (h.person_id, a.person_id)) <> 1;
  IF v_bad_handover_name <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % path handovers are not between same-name people', v_bad_handover_name;
  END IF;

  -- 7. No obsolete alias is a self-loop.
  SELECT count(*) INTO v_self_loop
    FROM public.person_aliases o
    JOIN public.person_aliases c
      ON c.person_id = o.person_id AND c.is_canonical AND c.path = o.path
   WHERE o.is_canonical = false;
  IF v_self_loop <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % obsolete aliases point at their own canonical path', v_self_loop;
  END IF;

  -- 7. No chain: an obsolete alias's canonical target must not itself be an
  --    obsolete alias.
  SELECT count(*) INTO v_chain
    FROM public.person_aliases o1
    JOIN public.person_aliases o2
      ON o2.path = (SELECT c.path FROM public.person_aliases c
                     WHERE c.person_id = o1.person_id AND c.is_canonical)
   WHERE o1.is_canonical = false AND o2.is_canonical = false;
  IF v_chain <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % obsolete aliases chain to another obsolete alias', v_chain;
  END IF;

  -- 8. Ownership is untouched.
  SELECT count(*) INTO v_claims FROM public.person_claims;
  IF v_claims <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: person_claims is no longer empty (% rows) — ownership was touched', v_claims;
  END IF;

  -- 9. No source or role row was lost.
  SELECT count(*) INTO v_sources FROM public.person_sources;
  IF v_sources <> 11443 THEN
    RAISE EXCEPTION 'phase3c verify: person_sources count changed (% rows)', v_sources;
  END IF;

  SELECT count(*) INTO v_roles FROM public.person_roles;
  IF v_roles <> 11424 THEN
    RAISE EXCEPTION 'phase3c verify: person_roles count changed (% rows)', v_roles;
  END IF;

  -- 10. Every live slug is one of the FOUR legal candidate forms for its
  --     own person:
  --         base
  --         base + '-' + md5(origin_key)[0:6]
  --         base + '-' + md5(origin_key)[0:12]
  --         base + '-' + md5(origin_key)
  --
  --     A hyphenated NAME like 'martin-fehervary' is legal — the base is
  --     whatever the person's folded name reduces to, and may itself
  --     contain hyphens. A team tail like 'martin-fehervary-57c547' is
  --     legal ONLY when those trailing characters are the hash of that
  --     person's own origin_key.
  --
  --     This replaces the earlier broken rule
  --     `^[a-z0-9]+(-[0-9a-f]{6})?$`, which rejected every legitimate
  --     hyphenated name.
  SELECT count(*) INTO v_bad_rule
    FROM public.persons p
    JOIN public.person_aliases a ON a.person_id = p.id AND a.is_canonical
   WHERE NOT EXISTS (
     SELECT 1
       FROM tmp_p3c_base b
      WHERE b.id = p.id
        AND p.slug IN (
          b.base,
          b.base || '-' || substr(md5(b.origin_key), 1, 6),
          b.base || '-' || substr(md5(b.origin_key), 1, 12),
          b.base || '-' || md5(b.origin_key)
        )
   )
   -- Fixture persons keep their opaque 'p-<hash>' handle and are NOT
   -- re-slugged by this migration, so they are out of scope for the rule.
   AND lower(p.slug) !~ '(^|-)(test|testing|demo|dummy|sample|fixture|fake|placeholder|lorem)(-[0-9a-z]+)*$'
   AND lower(p.slug) !~ '(^|-)(fanout|qa)(-[0-9a-z]+)*$'
   AND lower(p.slug) !~ '^user-[0-9a-f]{20,}$'
   AND lower(p.slug) !~ '^p-[0-9a-f]{12}$';
  IF v_bad_rule <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % slugs do not match the derivation rule', v_bad_rule;
  END IF;

  -- 11. No canonical alias points at a merged-away person.
  SELECT count(*) INTO v_bad_merge_alias
    FROM public.person_aliases a
    JOIN public.persons p ON p.id = a.person_id
   WHERE a.is_canonical AND p.identity_state = 'merged';
  IF v_bad_merge_alias <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % canonical aliases point at merged persons', v_bad_merge_alias;
  END IF;

  -- 12. Every obsolete alias points at a SURVIVOR.
  SELECT count(*) INTO v_orphan_alias
    FROM public.person_aliases a
    JOIN public.persons p ON p.id = a.person_id
   WHERE NOT a.is_canonical AND p.identity_state = 'merged';
  IF v_orphan_alias <> 0 THEN
    RAISE EXCEPTION 'phase3c verify: % obsolete aliases point at merged persons', v_orphan_alias;
  END IF;

  SELECT count(*) INTO v_renames FROM public.person_slug_renames;

  RAISE NOTICE 'phase3c COMPLETE: renames=% obsolete_aliases=% total_aliases=%',
    v_renames,
    (SELECT count(*) FROM public.person_aliases WHERE is_canonical = false),
    (SELECT count(*) FROM public.person_aliases);
END $$;

COMMIT;
