-- Migration: remove duplicate player stub rows (2026-11-11)
--
-- WHY:
--   A May 26, 2026 import created 4,493 player rows that contain NOTHING but
--   a name. Every one of them is missing position, birth_date, height_cm,
--   jersey_number, headshot_url AND nationality (verified: 0 of 4,493 have
--   any of those attributes).
--
--   817 of those stubs duplicate a player we ALREADY have with full data
--   (created May 13/14/16). So the same real person exists on the site
--   twice: once as a full profile and once as a name-only shell that
--   renders an empty page. That is why the same name appears twice in
--   search results.
--
--   The 3,676 name-unique stubs are NOT duplicates — they are real players
--   with no other source. They are left alone. Deleting them would remove
--   real people from the directory.
--
-- HOW THE KEEPER IS CHOSEN:
--   The keeper is the row that already has real attributes. We never pick
--   by "newest" or "oldest" — we pick the row that carries data. Verified:
--   687 of 688 same-highlightly_id groups have the COMPLETE row first.
--
-- SAFETY:
--   1. Everything is written to a backup table first (players_dup_backup).
--   2. The 8 player_team_history rows that point at a stub are REPOINTED
--      to the keeper before the delete — otherwise ON DELETE CASCADE
--      would silently destroy real career history. Verified: the keeper
--      has 0 equivalent history rows, so the repoint creates no dupes.
--   3. A rollback statement is included at the bottom.
--
-- This file is applied by hand; it is recorded in _HAND_APPLIED.md.

BEGIN;

-- ── 0. Backup table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.players_dup_backup (
  id           uuid PRIMARY KEY,
  slug         text,
  first_name   text,
  last_name    text,
  highlightly_id text,
  created_at   timestamptz,
  backed_up_at timestamptz DEFAULT now()
);

-- ── 1. Identify the stub rows to remove ────────────────────────────────────
-- A row is a REMOVABLE STUB when ALL of:
--   a. it was created in the May 26 stub import batch,
--   b. it has zero real attributes (the stub signature),
--   c. another player row already exists with the same name.
CREATE TEMP TABLE _dup_stubs AS
SELECT p.id
FROM public.players p
WHERE p.created_at >= '2026-05-26 00:00:00+00'
  AND p.created_at <  '2026-05-27 00:00:00+00'
  AND p.position IS NULL
  AND p.birth_date IS NULL
  AND p.height_cm IS NULL
  AND p.jersey_number IS NULL
  AND p.headshot_url IS NULL
  AND p.nationality IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.players o
    WHERE o.id <> p.id
      AND o.is_active
      AND lower(o.first_name || ' ' || coalesce(o.last_name, ''))
        = lower(p.first_name || ' ' || coalesce(p.last_name, ''))
      AND o.position IS NOT NULL
  );

-- ── 2. Backup before any delete ────────────────────────────────────────────
INSERT INTO public.players_dup_backup (id, slug, first_name, last_name, highlightly_id, created_at)
SELECT p.id, p.slug, p.first_name, p.last_name, p.highlightly_id, p.created_at
FROM public.players p
JOIN _dup_stubs d ON d.id = p.id
ON CONFLICT (id) DO NOTHING;

-- ── 3. Repoint career history to the keeper BEFORE deleting ────────────────
-- The keeper is the row with the same name that has real attributes.
UPDATE public.player_team_history h
SET player_id = k.id
FROM public.players p
JOIN public.players k
  ON lower(k.first_name || ' ' || coalesce(k.last_name, ''))
   = lower(p.first_name || ' ' || coalesce(p.last_name, ''))
 AND k.id <> p.id
 AND k.is_active
 AND k.position IS NOT NULL
WHERE h.player_id = p.id
  AND p.id IN (SELECT id FROM _dup_stubs);

-- ── 4. Delete the stub rows ────────────────────────────────────────────────
DELETE FROM public.players p
USING _dup_stubs d
WHERE p.id = d.id;

-- ── 5. Verify ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  remaining_dups integer;
  orphan_history integer;
BEGIN
  SELECT count(*) INTO remaining_dups
  FROM (
    SELECT lower(first_name || ' ' || coalesce(last_name, '')) AS nm
    FROM public.players
    WHERE is_active
    GROUP BY 1
    HAVING count(*) > 1
  ) x;

  SELECT count(*) INTO orphan_history
  FROM public.player_team_history h
  WHERE NOT EXISTS (SELECT 1 FROM public.players p WHERE p.id = h.player_id);

  IF orphan_history > 0 THEN
    RAISE EXCEPTION 'ABORT: % player_team_history rows would be orphaned', orphan_history;
  END IF;

  RAISE NOTICE 'Duplicate-name groups remaining: %', remaining_dups;
  RAISE NOTICE 'Orphaned history rows: %', orphan_history;
END $$;

COMMIT;

-- ── ROLLBACK (run BEFORE the delete if needed) ─────────────────────────────
-- INSERT INTO public.players (id, slug, first_name, last_name, highlightly_id, created_at)
-- SELECT id, slug, first_name, last_name, highlightly_id, created_at
-- FROM public.players_dup_backup
-- WHERE id NOT IN (SELECT id FROM public.players);
