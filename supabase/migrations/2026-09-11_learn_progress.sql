-- 2026-09-11: learn_progress
--
-- Phase 5 interactive features per memory/learn-overhaul-2026-09-10.md:
-- (a) per-account "your progress" tracker — which /learn pages the user has read
-- (b) "next step" recommendations — derived from read state + profile + read time
--
-- One row per (user, href). UNIQUE constraint prevents duplicates. RLS:
--   - users read/update their own rows (auth.uid() = user_id)
--   - service role bypasses RLS for cron / admin reads
--   - no public reads — progress is private
--
-- This migration is idempotent.

CREATE TABLE IF NOT EXISTS learn_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Owner: who marked the page as read
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Which /learn page (matches LEARN[].href in src/lib/learn-catalog.ts)
  -- Example: '/learn/hockey-rules'
  href text NOT NULL,

  -- When the user marked it as read (or first opened it for auto-track)
  read_at timestamptz NOT NULL DEFAULT now(),

  -- Optional: how long they actually spent on the page (for analytics).
  -- 0 = marked-as-read without dwell time. >=1 = real dwell seconds.
  dwell_seconds integer NOT NULL DEFAULT 0,

  -- One row per (user, href). Prevents the duplicate-on-refresh bug from
  -- 2026-06-10 fixture dedup work.
  CONSTRAINT learn_progress_user_href_uniq UNIQUE (user_id, href)
);

-- Index for the dashboard query "what has this user read?"
CREATE INDEX IF NOT EXISTS learn_progress_user_idx
  ON learn_progress (user_id, read_at DESC);

-- Index for the global "how many people have read this page?" stat (admin)
CREATE INDEX IF NOT EXISTS learn_progress_href_idx
  ON learn_progress (href);

-- updated_at trigger (keep in sync with the project pattern)
CREATE OR REPLACE FUNCTION learn_progress_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS learn_progress_updated_at ON learn_progress;
CREATE TRIGGER learn_progress_updated_at
  BEFORE UPDATE ON learn_progress
  FOR EACH ROW
  EXECUTE FUNCTION learn_progress_set_updated_at();

-- Row Level Security
ALTER TABLE learn_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
DROP POLICY IF EXISTS "Users can read own learn_progress" ON learn_progress;
CREATE POLICY "Users can read own learn_progress"
  ON learn_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert/update their own progress
DROP POLICY IF EXISTS "Users can insert own learn_progress" ON learn_progress;
CREATE POLICY "Users can insert own learn_progress"
  ON learn_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own learn_progress" ON learn_progress;
CREATE POLICY "Users can update own learn_progress"
  ON learn_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own progress (e.g., "mark unread")
DROP POLICY IF EXISTS "Users can delete own learn_progress" ON learn_progress;
CREATE POLICY "Users can delete own learn_progress"
  ON learn_progress FOR DELETE
  USING (auth.uid() = user_id);

-- No public SELECT — progress is private.

-- Roll-forward safety: if these already exist from a partial apply, the
-- DROP POLICY IF EXISTS + CREATE POLICY pair handles it.
DO $$
BEGIN
  RAISE NOTICE 'learn_progress table created with RLS + 3 indexes + updated_at trigger';
END $$;
