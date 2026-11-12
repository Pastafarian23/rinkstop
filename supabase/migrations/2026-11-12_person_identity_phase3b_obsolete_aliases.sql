-- =============================================================================
-- 2026-11-12_person_identity_phase3b_obsolete_aliases.sql
--
-- PHASE 3B — restore the OBSOLETE player URL redirects for the 38 merged
-- identities, using the ORIGINAL source slugs from the verified pre-merge
-- backup snapshot.
--
-- Authorized by Arnel Larracas 2026-11-12 — "Restore the 38 obsolete player
-- URL redirects using the original source slugs from the verified pre-merge
-- backup. Map each old URL to the surviving person's canonical /profile/ URL.
-- Do not modify existing player records or canonical URLs. Check for redirect
-- loops and collisions."
--
-- WHY THIS EXISTS
--   The Phase 2C merge re-pointed both source rows of each merged pair onto
--   the survivor, and gave the survivor ONE canonical profile slug. For 9 of
--   the 38 pairs, the survivor's slug is the NAME-ONLY form while the OLD
--   player-page URL carried a team suffix:
--
--     old player URL   /profile/tim-st-tzle-ott   (the players.slug)
--     survivor slug    /profile/tim-st-tzle       (the name-only form)
--
--   Those 9 old paths resolved to nothing. Without an alias, a visitor who
--   had the old URL (or a search engine that indexed it) hits a 404.
--
--   The Phase 3 backfill could not create them: it derived the obsolete path
--   from the merged-away person's NAME, and for these pairs the name form
--   COLLIDES with the survivor's own canonical path — which the schema's
--   UNIQUE constraint on `person_aliases.path` forbids. So the obsolete path
--   has to come from the PRE-MERGE `players.slug`, which only the backup
--   snapshot still holds.
--
-- WHAT IT DOES (and does NOT do)
--   INSERTS 9 `person_aliases` rows:
--     person_id  = the SURVIVOR (never the merged-away person)
--     path       = '/profile/<pre-merge players.slug>'
--     is_canonical = false
--     alias_type = 'player'
--     source/source_id = the pre-merge player row's namespace and id
--
--   It does NOT touch:
--     - `players` (no row is modified, renamed, or deleted)
--     - `persons` (no slug is changed; no public_id is changed)
--     - `person_sources` / `person_roles` (no re-pointing)
--     - `person_claims` / `claims` / `managed_profiles` (ownership untouched)
--     - any existing canonical alias or its path
--
-- WHY ONLY 9 ROWS, NOT 38
--   For the other 29 pairs, the pre-merge `players.slug` and the survivor's
--   canonical slug are the SAME STRING (e.g. 'alex-beaucage' both sides).
--   Those two persons were created from the SAME player record, so the old
--   URL and the canonical URL are one path — the path already resolves to
--   the survivor. There is nothing to redirect, and inserting an alias for
--   it would be a SELF-LOOP (the path would point at itself), which the
--   UNIQUE constraint blocks anyway.
--
-- LOOP AND COLLISION SAFETY (all asserted inside the transaction)
--   1. No inserted path may equal the survivor's own canonical path.
--   2. No inserted path may equal ANY existing alias path.
--   3. No inserted path may collide with a `profiles.username`.
--   4. Every inserted alias must point at a person that is NOT merged away.
--   5. The survivor's canonical path must never itself be an obsolete alias
--      (that would chain A -> B -> C).
--   6. No two merged pairs may claim the same obsolete path.
--   7. The target canonical path must resolve to the survivor.
--   Any failure RAISEs and aborts the whole transaction.
--
-- ROLLBACK
--   DELETE FROM public.person_aliases
--    WHERE is_canonical = false AND source = 'rinkstop_players'
--      AND path IN (the 9 paths this file inserted);
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Preconditions.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_merged  bigint;
  v_backup  bigint;
  v_obs     bigint;
BEGIN
  SELECT count(*) INTO v_merged FROM public.persons WHERE identity_state = 'merged';
  IF v_merged <> 38 THEN
    RAISE EXCEPTION 'phase3b: expected 38 merged persons, found %', v_merged;
  END IF;

  SELECT count(*) INTO v_backup FROM public.person_identity_merge_backup
   WHERE backup_of = 'person_sources';
  IF v_backup = 0 THEN
    RAISE EXCEPTION 'phase3b: the pre-merge snapshot is empty — cannot restore old slugs';
  END IF;

  -- The set of obsolete paths this migration will create.
  SELECT count(*) INTO v_obs
    FROM public.persons m
    JOIN public.persons s ON s.id = m.canonical_person_id
    JOIN public.person_identity_merge_backup b
      ON b.backup_of = 'person_sources' AND b.original_person_id = m.id
   WHERE m.identity_state = 'merged'
     AND (b.row_data->>'source') = 'rinkstop_players'
     AND (b.row_data->>'source_slug') IS NOT NULL
     AND (b.row_data->>'source_slug') <> ''
     AND (b.row_data->>'source_slug') <> s.slug;

  RAISE NOTICE 'phase3b: merged=% backup_rows=% obsolete_paths_to_create=%',
    v_merged, v_backup, v_obs;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Insert the obsolete aliases.
-- -----------------------------------------------------------------------------
INSERT INTO public.person_aliases
  (person_id, path, alias_type, is_canonical, source, source_id)
SELECT
  m.canonical_person_id AS person_id,
  '/profile/' || (b.row_data->>'source_slug') AS path,
  'player' AS alias_type,
  false AS is_canonical,
  (b.row_data->>'source') AS source,
  (b.row_data->>'source_id') AS source_id
FROM public.persons m
JOIN public.persons s ON s.id = m.canonical_person_id
JOIN public.person_identity_merge_backup b
  ON b.backup_of = 'person_sources' AND b.original_person_id = m.id
WHERE m.identity_state = 'merged'
  AND (b.row_data->>'source') = 'rinkstop_players'
  AND (b.row_data->>'source_slug') IS NOT NULL
  AND (b.row_data->>'source_slug') <> ''
  -- Skip when the old slug IS the survivor's canonical slug: same path, no
  -- redirect, and an alias there would be a self-loop.
  AND (b.row_data->>'source_slug') <> s.slug
  -- The path must be free.
  AND NOT EXISTS (
    SELECT 1 FROM public.person_aliases a
     WHERE a.path = '/profile/' || (b.row_data->>'source_slug')
  )
  -- Never shadow an account URL.
  AND (b.row_data->>'source_slug') NOT IN (
    SELECT username FROM public.profiles WHERE username IS NOT NULL
  );

-- -----------------------------------------------------------------------------
-- 3. Verification. Any failure RAISEs and aborts the transaction.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_created        bigint;
  v_expected       bigint;
  v_self_loop      bigint;
  v_on_merged      bigint;
  v_dup            bigint;
  v_missing_target bigint;
  v_chain          bigint;
  v_account_clash  bigint;
  v_players_intact bigint;
BEGIN
  -- How many obsolete aliases exist now, from this migration's shape.
  SELECT count(*) INTO v_created
    FROM public.person_aliases
   WHERE is_canonical = false
     AND source = 'rinkstop_players'
     AND path LIKE '/profile/%';

  -- How many SHOULD exist (the same set the INSERT selected).
  SELECT count(*) INTO v_expected
    FROM public.persons m
    JOIN public.persons s ON s.id = m.canonical_person_id
    JOIN public.person_identity_merge_backup b
      ON b.backup_of = 'person_sources' AND b.original_person_id = m.id
   WHERE m.identity_state = 'merged'
     AND (b.row_data->>'source') = 'rinkstop_players'
     AND (b.row_data->>'source_slug') IS NOT NULL
     AND (b.row_data->>'source_slug') <> ''
     AND (b.row_data->>'source_slug') <> s.slug;

  IF v_created <> v_expected THEN
    RAISE EXCEPTION 'phase3b verify: % obsolete aliases exist, expected %', v_created, v_expected;
  END IF;

  -- 1. No obsolete alias may point at a path that is ALSO a canonical alias.
  SELECT count(*) INTO v_self_loop
    FROM public.person_aliases o
    JOIN public.person_aliases c
      ON c.path = o.path AND c.is_canonical AND c.person_id = o.person_id
   WHERE o.is_canonical = false;
  IF v_self_loop <> 0 THEN
    RAISE EXCEPTION 'phase3b verify: % obsolete aliases point at their own canonical path', v_self_loop;
  END IF;

  -- 4. No obsolete alias may point at a merged-away person.
  SELECT count(*) INTO v_on_merged
    FROM public.person_aliases a
    JOIN public.persons p ON p.id = a.person_id
   WHERE a.is_canonical = false AND p.identity_state = 'merged';
  IF v_on_merged <> 0 THEN
    RAISE EXCEPTION 'phase3b verify: % obsolete aliases point at a merged-away person', v_on_merged;
  END IF;

  -- 6. No two obsolete aliases may share a path.
  SELECT count(*) INTO v_dup
    FROM (SELECT path FROM public.person_aliases GROUP BY path HAVING count(*) > 1) t;
  IF v_dup <> 0 THEN
    RAISE EXCEPTION 'phase3b verify: % duplicate alias paths', v_dup;
  END IF;

  -- 7. Every obsolete alias's target must have a live canonical alias.
  SELECT count(*) INTO v_missing_target
    FROM public.person_aliases o
   WHERE o.is_canonical = false
     AND NOT EXISTS (
       SELECT 1 FROM public.person_aliases c
        WHERE c.person_id = o.person_id AND c.is_canonical
     );
  IF v_missing_target <> 0 THEN
    RAISE EXCEPTION 'phase3b verify: % obsolete aliases have no canonical target', v_missing_target;
  END IF;

  -- 5. No chain: an obsolete path must not be another obsolete path's target
  --    canonical path. (A -> B where B is itself obsolete.)
  SELECT count(*) INTO v_chain
    FROM public.person_aliases o1
    JOIN public.person_aliases o2
      ON o2.path = (SELECT c.path FROM public.person_aliases c
                     WHERE c.person_id = o1.person_id AND c.is_canonical)
   WHERE o1.is_canonical = false AND o2.is_canonical = false;
  IF v_chain <> 0 THEN
    RAISE EXCEPTION 'phase3b verify: % obsolete aliases chain to another obsolete alias', v_chain;
  END IF;

  -- 3. No obsolete path may collide with an account username.
  SELECT count(*) INTO v_account_clash
    FROM public.person_aliases a
    JOIN public.profiles p ON p.username = split_part(a.path, '/', 3)
   WHERE a.path LIKE '/profile/%';
  IF v_account_clash <> 0 THEN
    RAISE EXCEPTION 'phase3b verify: % alias paths collide with a profiles.username', v_account_clash;
  END IF;

  -- The player records must be UNTOUCHED: every pre-merge player row still
  -- exists in `players` with the same slug.
  SELECT count(*) INTO v_players_intact
    FROM public.person_identity_merge_backup b
    JOIN public.players pl
      ON pl.id::text = (b.row_data->>'source_id')
   WHERE b.backup_of = 'person_sources'
     AND (b.row_data->>'source') = 'rinkstop_players'
     AND pl.slug = (b.row_data->>'source_slug');
  IF v_players_intact <> (SELECT count(*) FROM public.person_identity_merge_backup
                            WHERE backup_of = 'person_sources'
                              AND row_data->>'source' = 'rinkstop_players') THEN
    RAISE EXCEPTION 'phase3b verify: a pre-merge player record or its slug changed';
  END IF;

  RAISE NOTICE 'phase3b COMPLETE: obsolete aliases=% (paths: %) · players intact=%',
    v_created,
    (SELECT string_agg(path, ', ' ORDER BY path) FROM public.person_aliases
      WHERE is_canonical = false AND source = 'rinkstop_players'),
    v_players_intact;
END $$;

COMMIT;
