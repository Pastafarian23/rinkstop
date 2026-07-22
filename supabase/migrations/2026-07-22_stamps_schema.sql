-- RinkStop Hockey Passport — Workstream 3 PR1: Stamp System Schema
-- Date: 2026-07-22
-- Author: KiloClaw (per Arnel directive; plan in workstreams/workstream-3-stamps.md)
--
-- Purpose: Add the stamp/venue-verification layer to the Hockey Passport. Holders
-- scan QR codes at rinks, venues, and events to record verified attendance. This
-- migration adds the schema. Application behavior stays gated behind
-- STAMPS_ENABLED (added to src/lib/passport/02-feature-flags.ts in this PR),
-- which defaults to false — so prod behavior is unchanged even after this
-- migration applies.
--
-- Per Workstream 1 Rule 5 (Feature Flags Mandatory): runtime gate is
-- PASSPORT_ENABLED && STAMPS_ENABLED. Migration itself ships unconditionally;
-- flags gate app behavior.
-- Per Workstream 1 Rule 9 (No Existing Foreign Keys Change): only ADDS FKs from
-- new tables TO existing tables. Does not modify FKs on existing tables.
--
-- Per WS3 plan, six decisions + three follow-ups locked 2026-07-22:
--   - Curated venues (admin seeds; no self-serve mint in v1)
--   - Opt-in per-stamp visibility, default private
--   - Verified = RinkStop's existing verification (paid plan + admin review)
--   - Both venue-only and event-instance stamps (two semantics)
--   - No bulk-scan (single-scan only in v1)
--   - Coach→player scan: default private, player gets in-app notification
--
-- Out of scope (WS3): challenges, prizes, leaderboards, sponsor integrations,
-- photo verification, witness cross-check, bulk-scan, native mobile push.
--
-- Conventions (matched to existing migrations):
--   - Every CREATE uses IF NOT EXISTS
--   - Every ADD COLUMN uses IF NOT EXISTS
--   - Every CREATE INDEX uses IF NOT EXISTS
--   - Every RLS policy is DROP IF EXISTS + CREATE (idempotent re-run)
--   - gen_random_uuid() (matches 2026-07-16_passport_qr_identifier.sql style)
--   - No DROP, no ALTER on existing columns
--   - verification_tier: TEXT + CHECK (not ENUM — easier to extend later)

BEGIN;

-- ============================================================
-- 0. Pre-flight: ensure PostGIS is available for public.venues.location
-- ============================================================
-- Supabase projects have PostGIS installed by default but not always enabled.
-- The IF NOT EXISTS guard makes this safe regardless. If PostGIS is not
-- available on the target project, this migration fails loud at this line,
-- which is preferable to silently dropping the location column.
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 1. Add stamp-related columns to public.rinks
-- ============================================================
-- qr_identifier: opaque UUID for the stamp system. Encoded into QR images.
--   Resolves via /qr/[qrIdentifier] (extended in WS3 PR2 to dispatch on
--   target type). UNIQUE — backfilled with gen_random_uuid() so existing
--   rows get identifiers; new inserts also auto-generate.
-- verification_tier: 1:1 derived attribute. Values:
--   unverified | self_reported | claimed | federation_verified | nhl_arena
--   Migration sets tiers via three backfill queries below.
-- qr_revoked_at: for QR rotation. Re-issued QRs write the old identifier to
--   public.qr_revocations (audit table created below).
ALTER TABLE public.rinks
  ADD COLUMN IF NOT EXISTS qr_identifier uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS verification_tier text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS qr_revoked_at timestamptz;

-- CHECK constraint on verification_tier. Added idempotently via DO block
-- because Postgres doesn't have ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rinks_verification_tier_check'
      AND conrelid = 'public.rinks'::regclass
  ) THEN
    ALTER TABLE public.rinks
      ADD CONSTRAINT rinks_verification_tier_check
      CHECK (verification_tier IN (
        'unverified', 'self_reported', 'claimed',
        'federation_verified', 'nhl_arena'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS rinks_verification_tier_idx
  ON public.rinks (verification_tier)
  WHERE verification_tier IS NOT NULL;

-- ============================================================
-- 2. Backfill verification_tier for existing public.rinks rows
-- ============================================================
-- Order matters: NHL arenas are the strongest signal, then claimed rinks,
-- then federation-affiliated rinks. Later UPDATE statements only touch
-- rows that are still 'unverified', so an NHL arena never gets demoted
-- to 'claimed' or 'federation_verified' even if a stale claim row exists.

-- 2a. NHL arenas: manual slug list, audited 2026-07-22.
-- 5 rows in production today. Update this list if more NHL arenas get added.
UPDATE public.rinks
SET verification_tier = 'nhl_arena'
WHERE slug IN (
    'madison-square-garden',
    'united-center',
    'scotiabank-arena',
    'scotiabank-saddledome',
    'scotiabank-centre'
  )
  AND verification_tier = 'unverified';

-- 2b. Approved rink claims = 'claimed'
-- Note: claims.entity_id is TEXT, rinks.id is UUID — explicit cast required.
UPDATE public.rinks r
SET verification_tier = 'claimed'
WHERE verification_tier = 'unverified'
  AND EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.entity_id = r.id::text
      AND c.claim_type = 'rink'
      AND c.status = 'approved'
  );

-- 2c. Federation-affiliated rinks via existing league column.
-- Named-list approach (no regex) — easier to audit when federations shift.
-- Audited 2026-07-22 from production distinct(league) query.
UPDATE public.rinks
SET verification_tier = 'federation_verified'
WHERE verification_tier = 'unverified'
  AND league IN (
    'DEL', 'DEL2', 'DEL youth',
    'SHL', 'Mestis',
    'HockeyAllsvenskan', 'Hockeyettan',
    'Liiga',
    'Oberliga', 'Oberliga Nord',
    'Division'
  );

-- ============================================================
-- 3. public.venues — non-rink venues (tournament hotels, training
-- facilities, school gyms, anything hosting hockey events but not in
-- public.rinks). Curated: admin seeds only. No self-serve mint in v1.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.venues (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id           uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  venue_type          text NOT NULL
                      CHECK (venue_type IN ('rink', 'tournament', 'training', 'other')),
  address             text,
  city                text,
  country             text,
  location            geography(Point, 4326),
  operator_user_id    text,
  verification_tier   text NOT NULL DEFAULT 'unverified'
                      CHECK (verification_tier IN (
                        'unverified', 'self_reported',
                        'claimed', 'federation_verified'
                      )),
  status              text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'deactivated')),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS venues_location_gist
  ON public.venues USING gist (location);

CREATE INDEX IF NOT EXISTS venues_operator_idx
  ON public.venues (operator_user_id)
  WHERE operator_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS venues_verification_tier_idx
  ON public.venues (verification_tier)
  WHERE verification_tier IS NOT NULL;

CREATE INDEX IF NOT EXISTS venues_status_idx
  ON public.venues (status)
  WHERE status = 'active';

-- ============================================================
-- 4. public.venue_events — events at either rinks or venues. Optional
-- second-level stamp target. Polymorphic parent: exactly one of
-- parent_rink_id / parent_venue_id is non-null (enforced below).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.venue_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id           uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  parent_type         text NOT NULL
                      CHECK (parent_type IN ('rink', 'venue')),
  parent_rink_id      uuid NULL REFERENCES public.rinks(id) ON DELETE CASCADE,
  parent_venue_id     uuid NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name                text NOT NULL,
  starts_at           timestamptz NOT NULL,
  ends_at             timestamptz NULL,
  federation          text NULL,
  status              text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'cancelled', 'deactivated')),
  created_by_user_id  text,
  created_at          timestamptz NOT NULL DEFAULT NOW()
);

-- Polymorphic parent integrity: exactly one of parent_rink_id / parent_venue_id
-- is non-null. CHECK constraint enforces both nullity directions.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'venue_events_exactly_one_parent_check'
      AND conrelid = 'public.venue_events'::regclass
  ) THEN
    ALTER TABLE public.venue_events
      ADD CONSTRAINT venue_events_exactly_one_parent_check
      CHECK (
        (parent_type = 'rink'  AND parent_rink_id  IS NOT NULL AND parent_venue_id IS NULL)
        OR
        (parent_type = 'venue' AND parent_venue_id IS NOT NULL AND parent_rink_id  IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS venue_events_parent_rink_idx
  ON public.venue_events (parent_rink_id)
  WHERE parent_rink_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS venue_events_parent_venue_idx
  ON public.venue_events (parent_venue_id)
  WHERE parent_venue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS venue_events_starts_at_idx
  ON public.venue_events (starts_at DESC)
  WHERE status = 'active';

-- ============================================================
-- 5. public.stamps — the actual attendance records. Polymorphic
-- target: exactly one of target_rink_id / target_venue_id /
-- target_event_id is non-null. target_event_id takes precedence when
-- present (an event stamp also counts as a stamp at the parent rink/venue
-- for aggregate counts, but a single stamp row stays focused).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stamps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type         text NOT NULL
                      CHECK (target_type IN ('rink', 'venue', 'event')),

  target_rink_id      uuid NULL REFERENCES public.rinks(id)       ON DELETE CASCADE,
  target_venue_id     uuid NULL REFERENCES public.venues(id)      ON DELETE CASCADE,
  target_event_id     uuid NULL REFERENCES public.venue_events(id) ON DELETE CASCADE,

  actor_user_id       text NOT NULL,
  actor_type          text NOT NULL
                      CHECK (actor_type IN (
                        'player', 'parent', 'coach',
                        'rink_operator', 'tournament_organizer'
                      )),

  subject_user_id     text NULL,
  subject_type        text NULL
                      CHECK (subject_type IN ('player', 'coach', 'team') OR subject_type IS NULL),

  context             text NULL
                      CHECK (context IN ('practice', 'game', 'check-in', 'registration') OR context IS NULL),
  source              text NOT NULL
                      CHECK (source IN ('self_scan', 'third_party_scan')),
  visibility          text NOT NULL DEFAULT 'private'
                      CHECK (visibility IN ('private', 'public')),
  status              text NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('confirmed', 'disputed', 'revoked')),

  geo_lat             double precision NULL,
  geo_lng             double precision NULL,
  distance_meters     integer NULL,

  stamped_at          timestamptz NOT NULL DEFAULT NOW(),

  -- Polymorphic target integrity: exactly one of target_rink_id /
  -- target_venue_id / target_event_id is non-null, AND target_type
  -- matches. CHECK enforces all four constraints in one expression.
  CONSTRAINT stamps_exactly_one_target_check CHECK (
    (target_type = 'rink'  AND target_rink_id  IS NOT NULL AND target_venue_id IS NULL AND target_event_id IS NULL)
    OR
    (target_type = 'venue' AND target_venue_id IS NOT NULL AND target_rink_id  IS NULL AND target_event_id IS NULL)
    OR
    (target_type = 'event' AND target_event_id IS NOT NULL AND target_rink_id  IS NULL AND target_venue_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS stamps_actor_idx
  ON public.stamps (actor_user_id, stamped_at DESC);

CREATE INDEX IF NOT EXISTS stamps_target_rink_idx
  ON public.stamps (target_rink_id)
  WHERE target_rink_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS stamps_target_venue_idx
  ON public.stamps (target_venue_id)
  WHERE target_venue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS stamps_target_event_idx
  ON public.stamps (target_event_id)
  WHERE target_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS stamps_subject_idx
  ON public.stamps (subject_user_id, stamped_at DESC)
  WHERE subject_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS stamps_visibility_idx
  ON public.stamps (visibility, stamped_at DESC)
  WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS stamps_status_idx
  ON public.stamps (status, stamped_at DESC)
  WHERE status <> 'confirmed';

-- Partial unique indexes: one stamp per (target_*, actor_*, day) at most.
-- Three indexes, one per target column, each scoped via WHERE so the
-- NULL/non-null pattern doesn't cause conflicts across the three target
-- columns. Day boundary uses date_trunc('day', stamped_at AT TIME ZONE 'UTC')
-- — wrapping in AT TIME ZONE 'UTC' makes the cast to timestamp WITHOUT time
-- zone, which is the only input type for which date_trunc is IMMUTABLE
-- (date_trunc on timestamptz directly is STABLE, so it can't be used in
-- an index expression). Dedupe basis is UTC calendar day.
CREATE UNIQUE INDEX IF NOT EXISTS stamps_dedup_rink
  ON public.stamps (target_rink_id, actor_user_id, date_trunc('day', stamped_at AT TIME ZONE 'UTC'))
  WHERE target_rink_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS stamps_dedup_venue
  ON public.stamps (target_venue_id, actor_user_id, date_trunc('day', stamped_at AT TIME ZONE 'UTC'))
  WHERE target_venue_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS stamps_dedup_event
  ON public.stamps (target_event_id, actor_user_id, date_trunc('day', stamped_at AT TIME ZONE 'UTC'))
  WHERE target_event_id IS NOT NULL;

-- ============================================================
-- 6. public.qr_revocations — audit table for QR rotations.
-- Polymorphic: rink / venue / event.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.qr_revocations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type         text NOT NULL
                      CHECK (target_type IN ('rink', 'venue', 'event')),
  target_rink_id      uuid NULL REFERENCES public.rinks(id)        ON DELETE CASCADE,
  target_venue_id     uuid NULL REFERENCES public.venues(id)       ON DELETE CASCADE,
  target_event_id     uuid NULL REFERENCES public.venue_events(id) ON DELETE CASCADE,
  old_qr_identifier   uuid NOT NULL,
  new_qr_identifier   uuid NOT NULL,
  reason              text,
  revoked_by_user_id  text,
  revoked_at          timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT qr_revocations_exactly_one_target_check CHECK (
    (target_type = 'rink'  AND target_rink_id  IS NOT NULL AND target_venue_id IS NULL AND target_event_id IS NULL)
    OR
    (target_type = 'venue' AND target_venue_id IS NOT NULL AND target_rink_id  IS NULL AND target_event_id IS NULL)
    OR
    (target_type = 'event' AND target_event_id IS NOT NULL AND target_rink_id  IS NULL AND target_venue_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS qr_revocations_target_rink_idx
  ON public.qr_revocations (target_rink_id)
  WHERE target_rink_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS qr_revocations_target_venue_idx
  ON public.qr_revocations (target_venue_id)
  WHERE target_venue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS qr_revocations_target_event_idx
  ON public.qr_revocations (target_event_id)
  WHERE target_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS qr_revocations_old_qr_idx
  ON public.qr_revocations (old_qr_identifier);

CREATE INDEX IF NOT EXISTS qr_revocations_revoked_at_idx
  ON public.qr_revocations (revoked_at DESC);

-- ============================================================
-- 7. public.scan_events — internal audit log of every scan attempt
-- (success and failure). Used for fraud signals, dispute investigation,
-- rate-limit hits. Never exposed via API.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scan_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_identifier       uuid NOT NULL,
  actor_user_id       text,
  outcome             text NOT NULL
                      CHECK (outcome IN (
                        'stamp_created', 'duplicate', 'rate_limited',
                        'flagged_dispute', 'invalid_target', 'error'
                      )),
  details             jsonb,
  created_at          timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_events_actor_idx
  ON public.scan_events (actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS scan_events_qr_idx
  ON public.scan_events (qr_identifier, created_at DESC);

CREATE INDEX IF NOT EXISTS scan_events_outcome_idx
  ON public.scan_events (outcome, created_at DESC);

-- ============================================================
-- 8. RLS — enable on all new tables. No policies yet (Phase 1: PR2+
-- will add policies as routes go in). Service role bypasses RLS via
-- existing supabaseAdmin client; the existing pattern is unchanged.
-- ============================================================
-- NOTE: Enabling RLS without policies means all access is denied except
-- service_role. That is the safe default for new tables — nothing reads
-- or writes them through the app until policies exist in PR2. If you
-- need to verify the schema right after this migration, run queries
-- with the service_role key.

ALTER TABLE public.venues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamps        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_events   ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================
-- End of migration
-- ============================================================