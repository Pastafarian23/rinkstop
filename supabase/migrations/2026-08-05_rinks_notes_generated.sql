-- WS16 PR6 — notes_generated column for AdSense trust
-- Additive + idempotent. Originals in `notes` preserved 100%.
-- Tier 1B: generated notes (from buildRinkBlurb template) stored separately
-- so we can lift rich-notes coverage from 17% → ~95% without overwriting originals.

ALTER TABLE public.rinks ADD COLUMN IF NOT EXISTS notes_generated TEXT;
