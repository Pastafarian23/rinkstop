-- 2026-06-14 — Favorites extended types
-- The original favorites table only allowed favorite_type IN ('rink','team','player').
-- Phase 3 adds 'league' so users can save leagues from the directory page.
-- 'business' is reserved for Phase 2.5 (listings) — adds it too while we're here.
--
-- Migration is idempotent: drops the old check, adds the new one. Postgres
-- doesn't support ALTER CHECK in-place, so we have to drop + recreate.

ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_favorite_type_check;

ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_favorite_type_check
  CHECK (favorite_type IN ('rink', 'team', 'player', 'league', 'business'));
