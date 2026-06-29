-- Migration: 2026-06-29_claim_approved_trigger.sql
-- Date: 2026-06-29
-- Author: KiloClaw
--
-- Logs a 'claim_approved' analytics event whenever a claim's status
-- transitions into 'approved'. This feeds the /admin/funnel page so the
-- operator-conversion funnel can see claim approvals in real time,
-- regardless of whether the user ever loads their dashboard.
--
-- Why a trigger (Option B.3, vetted as best/safest):
--   - Fires the moment an admin approves a claim, no dashboard visit needed
--   - Doesn't depend on app code paths or webhook availability
--   - Captures approvals made via Supabase dashboard, manual SQL, or any
--     future admin endpoint without further code changes
--
-- Safety properties:
--   1. Fires only on actual transitions (OLD.status IS DISTINCT FROM NEW.status
--      AND NEW.status = 'approved'). Skips no-op updates.
--   2. Function is wrapped in EXCEPTION WHEN OTHERS + RAISE WARNING +
--      RETURN NEW. Analytics failures NEVER block the claim approval.
--   3. Idempotent at the row level via unique partial index on
--      (user_id, props->>'claim_id') WHERE name = 'claim_approved'.
--      ON CONFLICT DO NOTHING prevents duplicate fires on retried writes.
--   4. AFTER UPDATE OF status — fires only when the status column is in
--      the SET clause. Minimal perf impact on other UPDATEs.
--   5. Verified: no app code updates claims.status today. Status changes
--      happen only via Supabase dashboard or manual SQL. So this trigger
--      catches every approval, every time.
--
-- Revert (single block, run if needed):
--   DROP TRIGGER IF EXISTS claim_approved_trigger ON public.claims;
--   DROP FUNCTION IF EXISTS public.log_claim_approved();
--   DROP INDEX IF EXISTS public.analytics_events_claim_approved_dedupe;

BEGIN;

-- 1. Trigger function. Logs to analytics_events inside the claim transaction.
CREATE OR REPLACE FUNCTION public.log_claim_approved()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire on actual transitions into approved state.
  -- DISTINCT FROM handles NULL->approved correctly (NULL IS DISTINCT FROM 'approved' = true).
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.analytics_events (name, user_id, pathname, props, ts)
    VALUES (
      'claim_approved',
      NEW.user_id,
      '/dashboard/claims',
      jsonb_build_object(
        'claim_id', NEW.id::text,
        'claim_type', NEW.claim_type,
        'entity_id', NEW.entity_id,
        'entity_name', NEW.entity_name
      ),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never propagate errors to the parent claim update. Log to postgres
  -- log so we can debug without breaking approvals.
  RAISE WARNING 'log_claim_approved failed for claim %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Idempotency index. Partial unique index over the funnel-relevant
-- columns so ON CONFLICT DO NOTHING actually conflicts.
-- Note: NULL entity_id is fine — we don't include it in the uniqueness key.
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_claim_approved_dedupe
  ON public.analytics_events (user_id, (props->>'claim_id'))
  WHERE name = 'claim_approved';

-- 3. Trigger. AFTER UPDATE OF status means it only fires when the status
-- column is explicitly set. UPDATEs that don't touch status are skipped.
DROP TRIGGER IF EXISTS claim_approved_trigger ON public.claims;
CREATE TRIGGER claim_approved_trigger
  AFTER UPDATE OF status ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.log_claim_approved();

COMMIT;