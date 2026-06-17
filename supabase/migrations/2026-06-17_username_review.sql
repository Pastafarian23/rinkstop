-- 2026-06-17_username_review.sql
--
-- Layer 2 (Arnel, 2026-06-17): brand-prefix username review queue.
-- Layer 3 (same turn): profanity / inappropriate username filter.
--
-- Pattern: instead of hard-blocking, queue for human review.
-- - reserved_slugs: hard block, instant reject
-- - pending_username_review: soft block, "your username is being reviewed"
-- - bad_words: regex list, hard block on obvious slurs, soft queue on
--   borderline terms or evasion attempts
--
-- Arnel's specific question: "We also need a way to ban all profanities
-- and inappropriate usernames, since this is a professional platform."
--
-- Design:
--   1. BRAND_PREFIXES — the only "auto-soft-block" prefixes. Catches
--      "rinkstophelper", "rink-stop-helper", "kiloclaw-fan", etc.
--   2. bad_words.severity = 'hard' — auto-reject with a polite message
--      ("username contains inappropriate language")
--   3. bad_words.severity = 'soft' — push to review queue with note
--   4. Leet-speak evasion: normalize the slug (lowercase + leet map)
--      before checking, so "h4t3r" maps to "hater" and is caught.

-- 1. Review queue
CREATE TABLE IF NOT EXISTS pending_username_review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  requested_slug TEXT NOT NULL,
  reason TEXT NOT NULL,         -- 'brand_prefix' | 'soft_profanity' | 'pattern'
  reason_detail TEXT,           -- human-readable detail (e.g. "contains 'fck'")
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewer_user_id TEXT REFERENCES profiles(user_id),
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, requested_slug)
);
CREATE INDEX IF NOT EXISTS pending_username_review_status_idx
  ON pending_username_review (status, created_at DESC)
  WHERE status = 'pending';

-- 2. Bad words list (seed with a starter set — Arnel can extend)
-- Severity:
--   'hard'  → auto-reject on username set, no queue
--   'soft'  → push to review queue
-- word is the canonical lowercase form. Match is done on leet-normalized
-- slug so 'h4t3r' → 'hater' is caught.
CREATE TABLE IF NOT EXISTS bad_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL CHECK (severity IN ('hard','soft')),
  category TEXT,  -- 'slur' | 'profanity' | 'sexual' | 'hate' | 'violence' | 'drugs'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bad_words_severity_idx ON bad_words (severity);

-- 3. Seed a starter bad-words list.
-- This is a conservative starter set, not exhaustive. Arnel can extend
-- via /admin/bad-words. All words are lowercased. We're flagging clear
-- violations only; soft-bucket catches the gray area for human review.
-- Note: the bad-words list is intentionally short in code. For a real
-- production rollout, pull from an established list (e.g., LDNOOBW,
-- Shutterstock's, or a paid API). The list here is just to wire the
-- pipeline so we can validate the review flow works end-to-end.
INSERT INTO bad_words (word, severity, category) VALUES
  -- Hard-block clear slurs / hate speech (placeholder set; extend in production)
  ('nigger',     'hard', 'slur'),
  ('faggot',     'hard', 'slur'),
  ('kike',       'hard', 'slur'),
  ('chink',      'hard', 'slur'),
  ('spic',       'hard', 'slur'),
  ('retard',     'hard', 'slur'),
  -- Soft-queue profanity (auto-flag for human review)
  ('fuck',       'soft', 'profanity'),
  ('shit',       'soft', 'profanity'),
  ('bitch',      'soft', 'profanity'),
  ('asshole',    'soft', 'profanity'),
  ('cunt',       'soft', 'sexual'),
  ('bastard',    'soft', 'profanity'),
  ('damn',       'soft', 'profanity'),
  -- Soft-queue violent / threatening language
  ('kill',       'soft', 'violence'),
  ('rape',       'soft', 'violence'),
  -- Soft-queue sexual
  ('porn',       'soft', 'sexual'),
  ('sex',        'soft', 'sexual'),
  -- Soft-queue drugs
  ('coke',       'soft', 'drugs'),
  ('heroin',     'soft', 'drugs')
ON CONFLICT (word) DO NOTHING;

-- 4. Brand prefixes (Layer 2 rule)
-- These aren't stored in a table — they're hard-coded in the app code
-- because the list is small (~5 entries) and changes are deliberate.
-- The app reads from a constant in src/lib/username-brand-prefixes.ts.
-- We don't store them in DB because we don't want admins to be able to
-- add prefixes that silently block users without code review.

-- 5. RLS: only admins can read the review queue
ALTER TABLE pending_username_review ENABLE ROW LEVEL SECURITY;
-- We use service role for reads/writes from /admin endpoints; no
-- client-side policy needed.
ALTER TABLE bad_words ENABLE ROW LEVEL SECURITY;
-- Same: only service role touches this table.

-- 6. Log view for admins
CREATE OR REPLACE VIEW pending_username_review_queue AS
SELECT
  p.id,
  p.user_id,
  p.requested_slug,
  p.reason,
  p.reason_detail,
  p.status,
  p.created_at,
  p.reviewed_at,
  p.reviewer_user_id,
  p.review_note,
  pr.display_name AS requester_name,
  pr.username AS requester_username,
  pr.tier AS requester_tier
FROM pending_username_review p
LEFT JOIN profiles pr ON pr.user_id = p.user_id
WHERE p.status = 'pending'
ORDER BY p.created_at DESC;
