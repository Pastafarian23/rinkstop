-- Migration: Add rinks.status column for proper classification
-- Date: 2026-06-10
-- Reason: The is_active boolean was conflating "permanently closed" with
-- "planned", "under construction", and "placeholder" categories. Different
-- categories need different banner copy and different SEO treatment.
--
-- Categories:
--   open              - normal, indexable, no banner
--   closed            - permanently closed, noindex but keep link equity
--   planned           - announced but not yet built/breaking ground, indexable
--   under_construction - construction in progress, indexable
--   placeholder       - no permanent rink in this city/region, noindex
--                       (negative-content SEO avoidance)
--   seasonal          - real but seasonal/temporary only, indexable
--
-- Initial migration: 51 inactive rinks reclassified (40 placeholder,
-- 5 under construction, 3 closed, 1 planned, 2 seasonal). Plus 9 active
-- rinks reclassified as seasonal (Limerick, Swords, Ushuaia, 4 Cerogrado
-- Chile rinks, Iceinline Alexandra, Morača).

ALTER TABLE public.rinks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open'
  CHECK (status IN (
    'open',
    'closed',
    'planned',
    'under_construction',
    'placeholder',
    'seasonal'
  ));

-- Index for fast filtering by status (e.g. in directory listings, sitemap splits)
CREATE INDEX IF NOT EXISTS rinks_status_idx ON public.rinks (status);

-- Reclassification was performed via Supabase REST API after this migration.
-- See: memory/2026-06-10.md "Noindex audit + Rink page enrichment"
-- Total counts after migration:
--   open: 843 | closed: 3 | placeholder: 40 | planned: 1
--   under_construction: 5 | seasonal: 11
