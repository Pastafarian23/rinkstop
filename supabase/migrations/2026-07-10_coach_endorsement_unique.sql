-- hockey-passport-v1: prevent duplicate endorsements from the same coach to the same player
-- Gap identified in post-merge audit 2026-07-10.

BEGIN;

-- If duplicates already exist, dedupe before adding the constraint.
-- Keep the most recent row per (coach_id, player_id).
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY coach_id, player_id ORDER BY created_at DESC) AS rn
    FROM coach_endorsements
)
UPDATE coach_endorsements CE
   SET text = CE.text || ' [duplicate of ' || (SELECT id FROM ranked r WHERE r.id = CE.id AND r.rn = 1) || ' — kept row preserved for audit]'
 WHERE CE.id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add the constraint.
ALTER TABLE coach_endorsements
  ADD CONSTRAINT coach_endorsements_coach_player_unique UNIQUE (coach_id, player_id);

COMMIT;
