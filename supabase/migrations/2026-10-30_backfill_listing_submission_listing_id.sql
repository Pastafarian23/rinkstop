-- =============================================================================
-- 2026-10-30 — Backfill listing_submissions.listing_id from the notes link
-- =============================================================================
--
-- WHY:
--   The approve endpoint now writes `listing_id` directly, but rows approved
--   BEFORE that change only have the link inside the free-text `notes`
--   column. Without this backfill the public status page cannot resolve the
--   live URL for those submissions.
--
-- TRAP (worth remembering):
--   The first attempt at this used a generic regex that matched the FIRST
--   "table/id" pair in the notes. For Slough Satans the notes mention BOTH
--   the team and the rink:
--
--     "Team listing created: /directory/teams/slough-satans
--      (team_workspaces/4383433c-..., ... home_rink_id -> Slough Ice Arena)"
--     "Venue listing already existed: /directory/rinks/slough-ice-arena
--      (rinks/2ac2a42e-..., ...)"
--
--   The rink id appeared first, so listing_id got the RINK id while
--   listing_type is 'team'. The status page then looked up a rink id in
--   team_workspaces, found nothing, and silently returned a null live_url.
--   The test caught it ("approved submission has a live_url — null").
--
--   The lesson: when backfilling a structured field from prose, match the
--   entity by the submission's OWN type, not by "the first id that looks
--   like a uuid".
--
--   For tournaments, the primary listing is the EVENT (rink_events), with
--   the venue (rinks) as the fallback — that matches how the GLXY submission
--   was actually fulfilled.
-- =============================================================================

UPDATE public.listing_submissions s
SET listing_id = m.uuid::uuid
FROM (
  SELECT id,
         CASE s2.listing_type
           WHEN 'team' THEN substring(s2.notes FROM 'team_workspaces/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
           WHEN 'rink' THEN substring(s2.notes FROM 'rinks/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
           WHEN 'league' THEN substring(s2.notes FROM 'leagues/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
           WHEN 'tournament' THEN COALESCE(
             substring(s2.notes FROM 'rink_events/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'),
             substring(s2.notes FROM 'rinks/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
           )
         END AS uuid
  FROM public.listing_submissions s2
) AS m
WHERE s.id = m.id
  AND m.uuid IS NOT NULL
  AND s.listing_id IS DISTINCT FROM m.uuid::uuid;
