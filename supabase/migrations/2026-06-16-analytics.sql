-- Analytics events table
-- Date: 2026-06-16
-- Author: KiloClaw
--
-- Lightweight server-side analytics store. Captures the conversion funnel
-- we care about:
--   page_view, pricing_viewed, checkout_started, checkout_completed,
--   subscription_active, claim_started, claim_submitted, lead_captured,
--   affiliate_clicked, etc.
--
-- Why server-side instead of PostHog/GA:
-- - No third-party JS, no cookie banner overlap, no client blocking
-- - Already have Supabase + service role key
-- - No account setup, no per-event billing
-- - Privacy-by-default (no IPs, no cookies, no fingerprinting)
-- - One structured table we control end-to-end
--
-- Indexes target the actual query patterns:
--   - "How many checkout_completed in last 7 days?"  → (name, ts)
--   - "What did user X do?"                          → (user_id, ts)
--   - "How is /pricing converting this week?"        → (pathname, ts) + (name)
--
-- The analytics library at src/lib/analytics.ts always logs to console
-- too, so even before this migration is applied we have structured JSON
-- in Vercel runtime logs queryable via:
--   vercel logs <url> --json --no-follow | jq 'select(.message|startswith("[analytics]"))'

BEGIN;

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  user_id TEXT,
  pathname TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  props JSONB
);

-- Funnel query: "how many X in the last 7 days, grouped by day"
CREATE INDEX IF NOT EXISTS analytics_events_name_ts_idx
  ON analytics_events (name, ts DESC);

-- Per-user session query: "what did this user do"
CREATE INDEX IF NOT EXISTS analytics_events_user_ts_idx
  ON analytics_events (user_id, ts DESC);

-- Per-page query: "how is /pricing converting"
CREATE INDEX IF NOT EXISTS analytics_events_pathname_ts_idx
  ON analytics_events (pathname, ts DESC);

-- TTL: drop events older than 1 year. Keeps table small for the high-
-- volume, low-stakes data this is. If you need long-term, snapshot to
-- a separate archive table before vacuuming.
ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_ttl_check;
-- Note: actual vacuum isn't part of this migration. Set up a cron job
-- to delete rows older than 365 days (e.g. monthly).

COMMIT;
