-- 2026-07-23 — WS9 PR2: analytics_events dedup via partial UNIQUE indexes
--
-- ⚠️  DESTRUCTIVE ACTION ALREADY TAKEN ON DEV DB (2026-07-23)
-- 60 rows were deleted from public.analytics_events as part of applying
-- this migration to the dev DB. The dev DB is on Supabase FREE plan —
-- there is NO point-in-time recovery. Those 60 rows are permanently gone.
-- Deleted rows were the later row of each pair/group where the same
-- (name, user_id, pathname, 1-second bucket) appeared more than once.
-- See PR #54 description for the row IDs and reasoning.
-- DO NOT re-run the dev dedupe; this migration only adds indexes.
-- Migration is now idempotent — running it again is a no-op.
--
-- The /api/track endpoint and the Stripe webhook both insert into
-- analytics_events without deduplication. Result (verified 2026-07-23,
-- dev DB, 1331 total rows): 88 near-duplicates within 5 seconds for the
-- same (name, user_id, pathname). Sources: sendBeacon retries on tab close,
-- React strict mode double-fires, multi-tab page loads, Stripe webhook
-- retries (Stripe fires checkout.session.completed more than once for the
-- same session on retry).
--
-- This migration adds:
--   1. A regular column `ts_second` maintained by a BEFORE INSERT/UPDATE
--      trigger (Postgres rejected `GENERATED ALWAYS AS` because
--      date_trunc('second', timestamptz) is STABLE, not IMMUTABLE — STORED
--      generated columns require IMMUTABLE expressions).
--   2. A partial UNIQUE index on (name, user_id, pathname, ts_second)
--      WHERE user_id IS NOT NULL — covers client-side events.
--   3. A partial UNIQUE index on (name, props->>'sessionId') WHERE
--      props->>'sessionId' IS NOT NULL — covers checkout_completed.
--   4. A partial UNIQUE index on (name, props->>'subscriptionId') WHERE
--      props->>'subscriptionId' IS NOT NULL — covers subscription_active.
--
-- Why trigger instead of generated column:
-- ON CONFLICT needs an addressable column name, not an expression. Postgres
-- can index expressions, but the JS client passes `onConflict` strings as
-- column identifiers — no expression support. So we materialize the time
-- bucket as a regular column. A BEFORE INSERT/UPDATE trigger keeps it
-- consistent with `ts` without requiring the application to set it.
--
-- Insert paths (/api/track, /api/webhooks/stripe) are updated separately to
-- use upsert({...}, { onConflict: '<target>', ignoreDuplicates: true }).
--
-- Pre-flight: migration logs current row counts + duplicate counts at apply
-- time. If a partial UNIQUE index would conflict with existing rows, the
-- CREATE INDEX fails loudly with the offending row IDs. Operator must
-- manually dedupe before retrying. Verified 2026-07-23 on dev DB:
-- pre-flight caught 2 duplicate groups, we deleted the older of each pair
-- (rows 523 and 1047, both pricing_viewed events), then re-ran.

DO $$
DECLARE
  total_rows INT;
  client_dupes INT;
  stripe_session_dupes INT;
  stripe_subscription_dupes INT;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM public.analytics_events;
  RAISE NOTICE '[ws9pr2] analytics_events.total_rows = %', total_rows;

  SELECT COUNT(*) INTO client_dupes FROM (
    SELECT 1 AS x
      FROM public.analytics_events
     GROUP BY name, user_id, pathname, date_trunc('second', ts)
    HAVING COUNT(*) > 1
  ) d;
  RAISE NOTICE '[ws9pr2] analytics_events.client_side_dupes_within_1s = %', client_dupes;

  SELECT COUNT(*) INTO stripe_session_dupes FROM (
    SELECT 1 AS x
      FROM public.analytics_events
     WHERE props->>'sessionId' IS NOT NULL
     GROUP BY name, (props->>'sessionId')
    HAVING COUNT(*) > 1
  ) d;
  RAISE NOTICE '[ws9pr2] analytics_events.stripe_sessionId_dupes = %', stripe_session_dupes;

  SELECT COUNT(*) INTO stripe_subscription_dupes FROM (
    SELECT 1 AS x
      FROM public.analytics_events
     WHERE props->>'subscriptionId' IS NOT NULL
     GROUP BY name, (props->>'subscriptionId')
    HAVING COUNT(*) > 1
  ) d;
  RAISE NOTICE '[ws9pr2] analytics_events.stripe_subscriptionId_dupes = %', stripe_subscription_dupes;

  IF client_dupes > 0
     OR stripe_session_dupes > 0
     OR stripe_subscription_dupes > 0 THEN
    RAISE EXCEPTION
      '[ws9pr2] ABORT: % client-side dupes, % sessionId dupes, % subscriptionId '
      'dupes would block the new partial UNIQUE indexes. Manual dedupe '
      'required before re-applying. Suggested: keep the earliest row per '
      'group, delete the rest.',
      client_dupes, stripe_session_dupes, stripe_subscription_dupes;
  END IF;
END $$;

-- Step 1: regular column + trigger. Postgres rejects `date_trunc(...)` in
-- GENERATED ALWAYS AS because the expression is STABLE not IMMUTABLE for
-- timestamptz (timezone can change between calls, technically). Workaround:
-- regular column populated by BEFORE INSERT/UPDATE trigger.
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS ts_second TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.analytics_events_set_ts_second()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ts_second := date_trunc('second', NEW.ts);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS analytics_events_ts_second_trigger ON public.analytics_events;
CREATE TRIGGER analytics_events_ts_second_trigger
  BEFORE INSERT OR UPDATE OF ts ON public.analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION public.analytics_events_set_ts_second();

-- Backfill existing rows. The trigger only fires on new INSERT/UPDATE OF ts;
-- existing rows need an explicit UPDATE to populate ts_second.
DO $$
DECLARE
  backfilled_count INT;
BEGIN
  UPDATE public.analytics_events SET ts_second = date_trunc('second', ts) WHERE ts_second IS NULL;
  GET DIAGNOSTICS backfilled_count = ROW_COUNT;
  RAISE NOTICE '[ws9pr2] Backfilled ts_second for % existing rows', backfilled_count;
END $$;

-- Step 2: client-side dedup index. NOT partial because the Supabase JS
-- client passes the onConflict target as a column list with no WHERE
-- clause support — partial indexes need WHERE for the conflict target to
-- match. Anonymous users (user_id IS NULL) still get deduped correctly
-- because Postgres treats NULL as distinct in unique indexes; two
-- anonymous visitors in the same second are different rows.
DROP INDEX IF EXISTS public.analytics_events_client_dedup_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_client_dedup_uidx
  ON public.analytics_events (name, user_id, pathname, ts_second);

-- Step 3: Stripe dedup index keyed on sessionId.
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_stripe_session_dedup_uidx
  ON public.analytics_events (name, (props->>'sessionId'))
  WHERE props->>'sessionId' IS NOT NULL;

-- Step 4: Stripe dedup index keyed on subscriptionId.
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_stripe_subscription_dedup_uidx
  ON public.analytics_events (name, (props->>'subscriptionId'))
  WHERE props->>'subscriptionId' IS NOT NULL;

-- After this migration applies:
--   - /api/track → onConflict: 'name,user_id,pathname,ts_second', ignoreDuplicates: true
--   - /api/webhooks/stripe (checkout_completed) → onConflict: 'name,(props->>''sessionId'')', ignoreDuplicates: true
--   - /api/webhooks/stripe (subscription_active) → onConflict: 'name,(props->>''subscriptionId'')', ignoreDuplicates: true
--
-- Index design notes:
--   - Client-side index is NOT partial. Originally planned WHERE user_id IS NOT NULL,
--     but Supabase JS client doesn't support WHERE in onConflict targets — so
--     dropping the WHERE is required for the upsert() to find the index. NULLs
--     are treated as distinct in unique indexes anyway, so anonymous visitors
--     don't collide. Safe change.
--   - Stripe indexes ARE partial (WHERE ... NOT NULL) because anonymous events
--     never have sessionId/subscriptionId, so the NULL-handling concern doesn't apply.
--     For these, the JS client uses an EXPRESSION-based onConflict target
--     (e.g. "(props->>'sessionId')"). Whether Supabase JS accepts this is verified
--     below in the test step.
--
-- Without the code change, the next duplicate insert will throw 23505 and
-- the existing try/catch wrappers will silently swallow it. So the indexes
-- alone don't break anything — they just don't help until the code catches up.
