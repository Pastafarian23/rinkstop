-- 2026-07-23 — WS8 PR3: Drop legacy player federation columns
--
-- Replaces players.usa_hockey_number + players.hockey_canada_number with
-- public.federation_registrations (added in 2026-07-23_federation_registrations.sql).
--
-- PR #49 moved all reads + writes to the new table. Zero remaining references
-- in src/ as of 2026-07-23 14:09 UTC (verified with grep).
--
-- Why drop instead of keep:
--   - Dual-write path is a data-integrity footgun (one row out of sync = which
--     one is canonical?)
--   - New code never reads these columns; they're dead weight
--   - Future readers won't know they're deprecated
--
-- Safe to drop because:
--   - PATCH /api/passport/federation no longer writes to them (writes to
--     federation_registrations only)
--   - All read sites (FederationSection, PassportSections, OnboardingChecklist,
--     dashboard/passport page) read from federation_registrations
--   - The only remaining strings matching "usa_hockey_number" / "hockey_canada_number"
--     in src/ are the PATCH API field names + UI labels, which are the JSON
--     body contract for the API — those don't touch the DB columns
--
-- Coach-side deprecation (coach_profiles.license_number, license_issuing_authority)
-- is deferred — that needs a separate PR after the coach credentials page
-- replaces those writes entirely.

ALTER TABLE public.players
  DROP COLUMN IF EXISTS usa_hockey_number,
  DROP COLUMN IF EXISTS hockey_canada_number;
