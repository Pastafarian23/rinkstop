-- 2026-06-16: Add rinks.league column for Sweden/Germany/Finland enrichment (Phase 1)
-- Per Arnel's pick of option 3 (hybrid): league becomes a real column,
-- year_opened goes into the existing notes field as a "Year Opened: X" line.
--
-- Why league as a real column:
--   - Filterable ("rinks where SHL teams play home games")
--   - Displayable on the rink detail page
--   - Indexable for search by league
-- Why year_opened in notes (not a column):
--   - ~5% of rinks will have this data
--   - Doesn't drive any user behavior on the directory
--   - The notes field already gets parsed for "Formerly known as: X" and
--     other structured lines, so adding "Year Opened: X" is consistent.
--
-- Pre-flight: confirmed no existing code reads rinks.league
-- (all `league` references in the codebase are for teams.league or related).

ALTER TABLE public.rinks ADD COLUMN IF NOT EXISTS league text;
CREATE INDEX IF NOT EXISTS idx_rinks_league ON public.rinks (league) WHERE league IS NOT NULL;
