-- Migration: News section [pillar]/[subpillar] taxonomy
-- Date: 2026-08-11
-- Author: KiloClaw
-- Context: Tier 1 Win 3 of the AdSense content review sprint. ChatGPT audit
-- flagged the /news page as "loose category bucket" — 13 distinct category
-- strings with inconsistent casing (blog vs Business of Hockey vs nhl-playoffs).
-- This migration adds explicit pillar/subpillar columns, backfills from existing
-- category data, and renders traffic to a canonical [pillar]/[subpillar] URL
-- structure.
--
-- Mapping (category → pillar[/subpillar]):
--   highlights     → high-volume-content/highlights
--   guides         → high-volume-content/guides
--   blog           → blog
--   news           → blog (legacy)
--   NHL            → nhl
--   NHL Draft      → nhl/draft
--   Analysis       → nhl/analysis
--   nhl-playoffs   → nhl/playoffs
--   PWHL           → womens/pwhl
--   Recruiting     → business/recruiting
--   Business of Hockey → business
--   business       → business (legacy)
--   Hockey Resources → blog (legacy)
--   (NULL)         → blog
--
-- Canonical pillar set (5 high-volume + 3 future):
--   high-volume-content (→ highlights + guides subpillars)
--   blog
--   nhl
--   international
--   womens
--   business
--
-- Why this is a six-column migration and not a fresh table:
--   Posts already have a `category` text column. Adding pillar/subpillar as
--   nullable columns keeps the existing `category` value intact (so any
--   legacy code that reads it still works) while giving the new routes a
--   canonical signal to query on.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS pillar TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS subpillar TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pillar_slug TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS subpillar_slug TEXT;

-- Backfill from category. The slug columns are lowercase-kebab-case versions
-- of the human-readable labels so '/news/[pillar_slug]/[subpillar_slug]' URLs
-- read cleanly.
UPDATE posts
SET
  pillar = CASE lower(category)
    WHEN 'highlights' THEN 'highlights'
    WHEN 'guides' THEN 'highlights'
    WHEN 'blog' THEN 'blog'
    WHEN 'news' THEN 'blog'
    WHEN 'hockey resources' THEN 'blog'
    WHEN 'nhl' THEN 'nhl'
    WHEN 'nhl draft' THEN 'nhl'
    WHEN 'analysis' THEN 'nhl'
    WHEN 'nhl-playoffs' THEN 'nhl'
    WHEN 'pwhl' THEN 'womens'
    WHEN 'business of hockey' THEN 'business'
    WHEN 'business' THEN 'business'
    WHEN 'recruiting' THEN 'business'
    ELSE 'blog'
  END,
  subpillar = CASE lower(category)
    WHEN 'highlights' THEN 'highlights'
    WHEN 'guides' THEN 'guides'
    WHEN 'blog' THEN 'blog'
    WHEN 'news' THEN 'blog'
    WHEN 'hockey resources' THEN 'blog'
    WHEN 'nhl' THEN 'nhl'
    WHEN 'nhl draft' THEN 'draft'
    WHEN 'analysis' THEN 'analysis'
    WHEN 'nhl-playoffs' THEN 'playoffs'
    WHEN 'pwhl' THEN 'pwhl'
    WHEN 'business of hockey' THEN 'business'
    WHEN 'business' THEN 'business'
    WHEN 'recruiting' THEN 'recruiting'
    ELSE NULL
  END,
  pillar_slug = CASE lower(category)
    WHEN 'highlights' THEN 'highlights'
    WHEN 'guides' THEN 'highlights'
    WHEN 'blog' THEN 'blog'
    WHEN 'news' THEN 'blog'
    WHEN 'hockey resources' THEN 'blog'
    WHEN 'nhl' THEN 'nhl'
    WHEN 'nhl draft' THEN 'nhl'
    WHEN 'analysis' THEN 'nhl'
    WHEN 'nhl-playoffs' THEN 'nhl'
    WHEN 'pwhl' THEN 'womens'
    WHEN 'business of hockey' THEN 'business'
    WHEN 'business' THEN 'business'
    WHEN 'recruiting' THEN 'business'
    ELSE 'blog'
  END,
  subpillar_slug = CASE lower(category)
    WHEN 'highlights' THEN 'highlights'
    WHEN 'guides' THEN 'guides'
    WHEN 'blog' THEN 'blog'
    WHEN 'news' THEN 'blog'
    WHEN 'hockey resources' THEN 'blog'
    WHEN 'nhl' THEN 'nhl'
    WHEN 'nhl draft' THEN 'draft'
    WHEN 'analysis' THEN 'analysis'
    WHEN 'nhl-playoffs' THEN 'playoffs'
    WHEN 'pwhl' THEN 'pwhl'
    WHEN 'business of hockey' THEN 'business'
    WHEN 'business' THEN 'business'
    WHEN 'recruiting' THEN 'recruiting'
    ELSE NULL
  END
WHERE pillar IS NULL;

-- Index for the new pillar/subpillar route lookups
CREATE INDEX IF NOT EXISTS idx_posts_pillar_subpillar ON posts(pillar_slug, subpillar_slug, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_pillar ON posts(pillar_slug, published_at DESC) WHERE status = 'published';

-- Trigger: auto-fill pillar/subpillar from category on INSERT/UPDATE if null
-- (lets the editorial pipeline keep writing `category` and let the DB
-- project the canonical pillar). Idempotent.
CREATE OR REPLACE FUNCTION posts_set_pillar()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.pillar IS NULL THEN
    NEW.pillar := CASE lower(NEW.category)
      WHEN 'highlights' THEN 'highlights'
      WHEN 'guides' THEN 'highlights'
      WHEN 'blog' THEN 'blog'
      WHEN 'news' THEN 'blog'
      WHEN 'hockey resources' THEN 'blog'
      WHEN 'nhl' THEN 'nhl'
      WHEN 'nhl draft' THEN 'nhl'
      WHEN 'analysis' THEN 'nhl'
      WHEN 'nhl-playoffs' THEN 'nhl'
      WHEN 'pwhl' THEN 'womens'
      WHEN 'business of hockey' THEN 'business'
      WHEN 'business' THEN 'business'
      WHEN 'recruiting' THEN 'business'
      ELSE 'blog'
    END;
  END IF;
  IF NEW.subpillar IS NULL THEN
    NEW.subpillar := CASE lower(NEW.category)
      WHEN 'highlights' THEN 'highlights'
      WHEN 'guides' THEN 'guides'
      WHEN 'blog' THEN 'blog'
      WHEN 'news' THEN 'blog'
      WHEN 'hockey resources' THEN 'blog'
      WHEN 'nhl' THEN 'nhl'
      WHEN 'nhl draft' THEN 'draft'
      WHEN 'analysis' THEN 'analysis'
      WHEN 'nhl-playoffs' THEN 'playoffs'
      WHEN 'pwhl' THEN 'pwhl'
      WHEN 'business of hockey' THEN 'business'
      WHEN 'business' THEN 'business'
      WHEN 'recruiting' THEN 'recruiting'
      ELSE NULL
    END;
  END IF;
  IF NEW.pillar_slug IS NULL THEN
    NEW.pillar_slug := NEW.pillar;
  END IF;
  IF NEW.subpillar_slug IS NULL AND NEW.subpillar IS NOT NULL THEN
    NEW.subpillar_slug := NEW.subpillar;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_set_pillar ON posts;
CREATE TRIGGER trg_posts_set_pillar
  BEFORE INSERT OR UPDATE OF category ON posts
  FOR EACH ROW EXECUTE FUNCTION posts_set_pillar();

COMMENT ON COLUMN posts.pillar IS 'Canonical pillar name. Use this for [pillar]/page.tsx routing. Idempotent — auto-set from category on insert/update by trg_posts_set_pillar.';
COMMENT ON COLUMN posts.subpillar IS 'Optional subpillar within the pillar. Use for [pillar]/[subpillar]/page.tsx routing. NULL means post lives at the pillar-level page only.';
COMMENT ON COLUMN posts.pillar_slug IS 'Kebab-case slug for the pillar route segment. Defaults to pillar for legacy compatibility.';
COMMENT ON COLUMN posts.subpillar_slug IS 'Kebab-case slug for the subpillar route segment. NULL means no subpillar.';
