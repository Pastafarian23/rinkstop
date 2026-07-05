-- 2026-07-05 — Family Setup Wizard state on profiles
-- Phase 1a (Consumer-First Growth) prep doc §3.6, approved by Arnel 2026-07-05 18:23 CDT.
--
-- Adds a single nullable timestamp column to profiles:
--   family_setup_completed_at TIMESTAMPTZ NULL
--
-- Semantics:
--   NULL  → wizard has never been dismissed; render <FamilySetupWizard /> on /dashboard.
--   SET   → wizard is dismissed; do not render. Resume link on /dashboard/family
--           clears the column to re-show the wizard.
--
-- Gate (read-side, in src/app/dashboard/page.tsx):
--   account_type === 'parent'
--   && tierAtLeastSameTrack(tier, 'identity_plus')
--   && family_setup_completed_at IS NULL
--
-- The column is nullable, ignored by every existing query, and only read by the
-- new FamilySetupWizard component + the Family Hub "Resume setup" link. Droppable
-- in a follow-up migration if Phase 1a is reverted.
--
-- Backfill: no-op. Existing rows get NULL, which means "wizard visible" — correct
-- because no parent has seen the wizard yet (the wizard does not ship in this
-- migration; it ships in the next commit).

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS family_setup_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.family_setup_completed_at IS
  'Timestamp when the parent dismissed or completed the Family Setup Wizard. NULL = wizard visible. Used by /dashboard server component to gate FamilySetupWizard render. Tier-gated to identity_plus+ parents via tierAtLeastSameTrack. Cleared (set to NULL) by the "Resume Hockey Passport setup" link on /dashboard/family.';

COMMIT;
