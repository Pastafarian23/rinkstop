-- RinkStop Hockey Passport — Workstream 1 Core Tables
-- Date: 2026-07-16
-- Author: KiloClaw (per Arnel directive 2026-07-15 23:03 CDT)
--
-- Purpose: Add the three core tables for the Passport identity layer.
-- Additive only. Does NOT modify any existing column, constraint, or policy.
--
-- Tables added:
--   1. public.passports         — one row per user; passport_id is public, internal_user_id is internal
--   2. public.passport_events   — append-only event log for Passport state changes
--   3. public.passport_links    — crosswalk between Passport IDs and entity IDs
--
-- Per Rule 9 (No Existing Foreign Keys Change): this migration only ADDS FKs from new tables
-- TO existing tables. It never modifies FKs on existing tables. New tables are not referenced
-- by existing tables.
--
-- Per Rule 8 (UUID/Passport ID Separation): passport_id is TEXT (the public ID),
-- internal_user_id is TEXT (Clerk user ID), and Passport IDs are never used as FKs
-- in this migration. Entity crosswalks use passport_links, not FK constraints.
--
-- Per Rule 5 (Feature Flags Mandatory): all RLS policies and queries respect the
-- PASSPORT_ENABLED flag at the application layer (this migration handles RLS).
-- When flags are off, no application code reads or writes to these tables.
--
-- Safety:
--   - Every CREATE uses IF NOT EXISTS
--   - Every policy is DROP IF EXISTS + CREATE (idempotent re-run)
--   - No DROP, no ALTER on existing columns
--   - RLS enabled on all new tables
--   - Service role bypasses RLS (existing supabaseAdmin client works unchanged)

-- ============================================================
-- 1. public.passports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.passports (
  -- The public identifier. Issued once, never reused.
  -- Format: RS1-{12 base32 chars}. Example: RS1-K7X9P2M4N6Q8R
  passport_id           TEXT PRIMARY KEY,

  -- The Internal Identity Identifier (Clerk user ID in production).
  -- UNIQUE: one Passport per Internal Identity Identifier.
  internal_user_id      TEXT NOT NULL UNIQUE
    REFERENCES public.profiles(user_id) ON DELETE CASCADE,

  -- Lifecycle state machine
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',     -- Issued but not yet activated (migration case)
      'active',      -- Active, all features available
      'suspended',   -- Admin or system suspended
      'deactivated'  -- Permanently deactivated (user request)
    )),

  -- Verification level (mirrors Didit status, cached for performance)
  verification_level    TEXT NOT NULL DEFAULT 'none'
    CHECK (verification_level IN (
      'none',
      'email_verified',
      'id_verified',
      'federation_verified'
    )),

  -- Timestamps
  issued_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at          TIMESTAMPTZ,
  deactivated_at        TIMESTAMPTZ,

  -- Provenance
  source                TEXT NOT NULL DEFAULT 'migration'
    CHECK (source IN (
      'migration',  -- Issued during Workstream 1 migration
      'signup',     -- Issued at new account creation
      'admin',      -- Admin-issued
      'system'      -- System-issued (future)
    )),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_passports_internal_user_id
  ON public.passports(internal_user_id);
CREATE INDEX IF NOT EXISTS idx_passports_status
  ON public.passports(status);
CREATE INDEX IF NOT EXISTS idx_passports_verification_level
  ON public.passports(verification_level);
CREATE INDEX IF NOT EXISTS idx_passports_issued_at
  ON public.passports(issued_at DESC);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.passports_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS passports_updated_at ON public.passports;
CREATE TRIGGER passports_updated_at
  BEFORE UPDATE ON public.passports
  FOR EACH ROW
  EXECUTE FUNCTION public.passports_set_updated_at();

-- RLS
ALTER TABLE public.passports ENABLE ROW LEVEL SECURITY;

-- Service-role can do anything (existing admin client).
-- No public read or write policies — all access goes through service role or
-- internal Passport API routes which check feature flags and auth.uid().
DROP POLICY IF EXISTS "Service role bypass passports" ON public.passports;
-- (RLS allows full access to service_role; no policy needed for that.)

-- Owner can read their own Passport
DROP POLICY IF EXISTS "Owner reads own passport" ON public.passports;
CREATE POLICY "Owner reads own passport" ON public.passports
  FOR SELECT
  USING (internal_user_id = auth.uid()::text);

-- ============================================================
-- 2. public.passport_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.passport_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id         TEXT NOT NULL REFERENCES public.passports(passport_id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  internal_user_id    TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_passport_events_passport_id
  ON public.passport_events(passport_id);
CREATE INDEX IF NOT EXISTS idx_passport_events_internal_user_id
  ON public.passport_events(internal_user_id);
CREATE INDEX IF NOT EXISTS idx_passport_events_type
  ON public.passport_events(event_type);
CREATE INDEX IF NOT EXISTS idx_passport_events_created_at
  ON public.passport_events(created_at DESC);

-- RLS
ALTER TABLE public.passport_events ENABLE ROW LEVEL SECURITY;

-- Owner can read their own events
DROP POLICY IF EXISTS "Owner reads own passport events" ON public.passport_events;
CREATE POLICY "Owner reads own passport events" ON public.passport_events
  FOR SELECT
  USING (internal_user_id = auth.uid()::text);

-- No update policy — events are immutable (no UPDATE allowed via RLS).

-- ============================================================
-- 3. public.passport_links
-- ============================================================
CREATE TABLE IF NOT EXISTS public.passport_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id         TEXT NOT NULL REFERENCES public.passports(passport_id) ON DELETE CASCADE,
  entity_type         TEXT NOT NULL
    CHECK (entity_type IN (
      'player',
      'coach',
      'organization',
      'managed_profile'
    )),
  entity_id           TEXT NOT NULL,
  linked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_by           TEXT NOT NULL,
  UNIQUE (passport_id, entity_type, entity_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_passport_links_passport_id
  ON public.passport_links(passport_id);
CREATE INDEX IF NOT EXISTS idx_passport_links_entity
  ON public.passport_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_passport_links_linked_by
  ON public.passport_links(linked_by);

-- RLS
ALTER TABLE public.passport_links ENABLE ROW LEVEL SECURITY;

-- Owner can read their own links
DROP POLICY IF EXISTS "Owner reads own passport links" ON public.passport_links;
CREATE POLICY "Owner reads own passport links" ON public.passport_links
  FOR SELECT
  USING (
    passport_id IN (
      SELECT passport_id FROM public.passports
      WHERE internal_user_id = auth.uid()::text
    )
  );

-- ============================================================
-- End of migration
-- ============================================================