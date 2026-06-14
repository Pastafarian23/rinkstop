-- Adds period_scores + ot/so flags to game_stats_audit
-- so non-NHL leagues (which only have match-level data) can still
-- record their final breakdown here without needing separate tables.
--
-- Migration is additive: ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
-- Safe to run on a fresh database or one with the v1 tables already.
-- v1 = 2026-06-14-game-stats-foundation.sql

ALTER TABLE public.game_stats_audit
  ADD COLUMN IF NOT EXISTS period_scores JSONB,
  ADD COLUMN IF NOT EXISTS was_ot BOOLEAN,
  ADD COLUMN IF NOT EXISTS was_so BOOLEAN,
  ADD COLUMN IF NOT EXISTS home_score INT,
  ADD COLUMN IF NOT EXISTS away_score INT,
  ADD COLUMN IF NOT EXISTS league_name TEXT;
