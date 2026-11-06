-- 2026-11-06: Mark pro-team arenas as not user-claimable.
--
-- Context (Arnel directive: "major rinks should NOT show an own-this-rink
-- claim message"):
--   Every rink page rendered an unconditional "Is this your rink? / Claim
--   this rink" CTA — including TD Garden, Madison Square Garden, Barclays
--   Center and every other major venue. RinkStop indexes 1,920 rinks; the
--   32 arenas that are the home rink of an NHL / AHL / PWHL / KHL team are
--   operated by franchises that are already indexed, curated and not
--   claiming through the public form.
--
--   The schema already anticipated this. The 2026-08-23
--   `claimable_pro_only` migration added `rinks.claimable BOOLEAN NOT NULL
--   DEFAULT TRUE` with the comment:
--
--     "Rinks intentionally NOT marked today: rinks.league is a free-text
--      column that doesn't reliably match leagues.name. A rink-flagging
--      pass can be added later if pro-team-arena mapping becomes reliable."
--
--   That mapping IS now reliable: `team_workspaces.home_rink_id` links every
--   NHL / AHL / PWHL / KHL team to its arena (verified 2026-11-06: 32 pro
--   teams each resolve to a distinct real rink, zero dangling references).
--
-- Fix: mark those 32 arenas `claimable = false`. The public rink page
-- already selects `claimable`; this migration supplies the data it needs.
-- Rinks with no pro-team link keep claimable = true — the CTA is a real
-- conversion path for independent operators, which is why it exists.
--
-- Idempotent: re-running is a no-op.
--
-- Verification (live, before/after):
--   before: /directory/rinks/td-garden renders "Is this your rink?" + "Claim TD Garden on RinkStop"
--   after:  no claim CTA on that page; independent rinks keep theirs.

UPDATE public.rinks r
   SET claimable = FALSE
 WHERE r.claimable IS DISTINCT FROM FALSE
   AND r.id IN (
     SELECT DISTINCT tw.home_rink_id
       FROM public.team_workspaces tw
       JOIN public.leagues l ON l.id = tw.league_id
      WHERE tw.home_rink_id IS NOT NULL
        AND tw.is_active = TRUE
        AND l.name IN (
          'National Hockey League',
          'American Hockey League',
          'Kontinental Hockey League',
          'Professional Women''s Hockey League'
        )
   );

COMMENT ON COLUMN public.rinks.claimable IS
  'WS25: when false, the rink is not user-claimable (pro-team home arena) and the public rink page omits the claim CTA. Set false for arenas that are the home_rink_id of an NHL/AHL/KHL/PWHL team (backfilled 2026-11-06). Defaults true for independent rinks.';
