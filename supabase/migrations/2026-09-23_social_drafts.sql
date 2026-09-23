-- 2026-09-23: social_drafts table for the social-draft cron pipeline.
--
-- Every newly-published article (created by the article-from-highlight cron
-- and gated by auto-publish) becomes a `social_drafts` row with the FB /
-- X / LinkedIn copy attached. Telegram message_id is stored so we can
-- edit / delete / react to the original draft message when Arnel reacts
-- with ✅ or ❌.
--
-- Approval flow (handled by the cron + a callback route):
--   1. cron fires every 30 min
--   2. finds posts WHERE published_at BETWEEN NOW()-30min AND NOW()-5min
--      AND NOT EXISTS (social_drafts WHERE article_id = posts.id)
--   3. builds FB/X/LI blocks + YouTube highlight thumbnail URL
--   4. sends ONE Telegram message with attached image + 3 inline buttons (✅/❌/✏)
--   5. inserts social_drafts row (status='pending_review', message_id=telegram msg id)
--   6. when Arnel reacts ✅ → cron updates status='approved'
--   7. when Arnel reacts ❌ → cron updates status='rejected'
--
-- Why a table (not Redis / not in-memory):
--   - durable across Vercel cold starts
--   - easy to query "what's pending" + "what posted this week"
--   - same RLS pattern as posts.lead_id (we added today)

CREATE TABLE IF NOT EXISTS public.social_drafts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- The article this draft is for.
  article_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,

  -- Block-level copy. One row per draft, full text in copy_json so we don't
  -- have to do 3 separate Telegram messages.
  copy_json JSONB NOT NULL,
  -- shape:
  --   {
  --     fb:    { text: string, hashtags: string[] },
  --     x:     { text: string, hashtags: string[] },
  --     li:    { text: string, hashtags: string[] },
  --   }

  -- Image URL sent to Telegram (YouTube highlight thumbnail preferred,
  -- fallback to posts.og_image_url). Nullable if neither available.
  image_url TEXT,

  -- Telegram message id of the draft. Used so we can edit / react when Arnel
  -- approves or rejects.
  message_id BIGINT,

  -- Lifecycle. pending_review → approved → arnel_posted | rejected.
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'arnel_posted', 'rejected')),

  -- Optional note from Arnel (when he rejects with a reason).
  reviewer_note TEXT,

  -- Timestamps for analytics.
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,

  -- For unique-per-article constraint:
  CONSTRAINT social_drafts_article_id_unique UNIQUE (article_id)
);

CREATE INDEX IF NOT EXISTS idx_social_drafts_status ON public.social_drafts(status);
CREATE INDEX IF NOT EXISTS idx_social_drafts_sent_at ON public.social_drafts(sent_at DESC)
  WHERE status = 'pending_review';

-- RLS: same pattern as posts.lead_id — only service_role reads/writes.
ALTER TABLE public.social_drafts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.social_drafts FROM anon, authenticated;
GRANT ALL ON public.social_drafts TO service_role;

CREATE POLICY "service_role full" ON public.social_drafts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
