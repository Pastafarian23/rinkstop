-- Migration 2026-10-02 — Daily conversion funnel snapshots (Phase 12).
--
-- Per Arnel Phase 12 directive
-- (memory/2026-10-01-conversion-monetization-overhaul.md):
-- "The immediate goal is NOT maximizing traffic. The immediate goal is
--  proving that RinkStop can convert existing organic traffic into:
--  1. free accounts
--  2. free claims
--  3. qualified B2B leads
--  4. paid customers
--  Once that funnel is proven, scale traffic and paid acquisition."
--
-- This table snapshots the daily counts of each conversion-relevant event
-- so we can build trend lines. Populated by Vercel cron
-- /api/cron/conversion-snapshot (added in this PR). Admin/service-role only.

BEGIN;

CREATE TABLE IF NOT EXISTS conversion_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL UNIQUE,    -- one row per calendar day (UTC)
  created_at timestamptz NOT NULL DEFAULT NOW(),

  -- Top-of-funnel traffic indicators
  searches_total bigint NOT NULL DEFAULT 0,
  listing_views_total bigint NOT NULL DEFAULT 0,

  -- Personal funnel (parents/coaches → paid)
  tool_views bigint NOT NULL DEFAULT 0,
  calculator_used bigint NOT NULL DEFAULT 0,
  pricing_viewed bigint NOT NULL DEFAULT 0,
  checkout_started bigint NOT NULL DEFAULT 0,
  checkout_completed bigint NOT NULL DEFAULT 0,
  free_account_created bigint NOT NULL DEFAULT 0,
  tool_upsell_clicked bigint NOT NULL DEFAULT 0,
  tool_free_account_clicked bigint NOT NULL DEFAULT 0,

  -- Business funnel (operators → paid)
  claim_started bigint NOT NULL DEFAULT 0,
  claim_button_clicked bigint NOT NULL DEFAULT 0,
  claim_submitted bigint NOT NULL DEFAULT 0,
  claim_approved bigint NOT NULL DEFAULT 0,

  -- Status flags
  degraded boolean NOT NULL DEFAULT false,
  notes text,

  -- Constraint
  CONSTRAINT conversion_daily_snapshot_date_sane CHECK (
    snapshot_date >= '2026-01-01' AND snapshot_date <= '2100-12-31'
  )
);

CREATE INDEX IF NOT EXISTS conversion_daily_snapshots_date_idx
  ON conversion_daily_snapshots (snapshot_date DESC);

-- Admin/service_role only. Same posture as cron_health_snapshots — no
-- anon or authenticated policy. Operational data, not public.
ALTER TABLE conversion_daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_daily_snapshots FORCE ROW LEVEL SECURITY;

REVOKE ALL ON conversion_daily_snapshots FROM anon;
REVOKE ALL ON conversion_daily_snapshots FROM authenticated;

COMMENT ON TABLE conversion_daily_snapshots IS
  'Daily conversion funnel event counts. Populated by /api/cron/conversion-snapshot. Admin/service-role only (matches cron_health_snapshots posture). Used to track Phase 12 success metrics over time.';

COMMIT;