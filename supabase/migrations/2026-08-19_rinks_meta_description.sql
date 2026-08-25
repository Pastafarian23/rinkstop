-- WS22 (2026-08-19): Add meta_description column to rinks table for SEO backfill.
-- Idempotent: IF NOT EXISTS guards against re-run.
ALTER TABLE public.rinks ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Index for the backfill query (top 30 high-imp rinks sorted by id for determinism).
CREATE INDEX IF NOT EXISTS idx_rinks_meta_description ON public.rinks (id) WHERE meta_description IS NULL;

COMMENT ON COLUMN public.rinks.meta_description IS 'Hand-crafted meta description for SEO (150-160 chars). Used by rink page generateMetadata when present; falls back to buildRinkBlurb() when null.';
