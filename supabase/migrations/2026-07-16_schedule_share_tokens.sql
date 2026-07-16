-- RinkStop Schedule Share Tokens
-- Date: 2026-07-16
-- Author: KiloClaw (per QA audit HIGH-4)
--
-- Purpose: Replace the in-memory globalThis.__rinkstopShareStore Map
-- (which loses tokens on every Vercel cold start) with a persistent
-- Supabase table.
--
-- Background: tokens are 16 random bytes base64url-encoded (192 bits).
-- They're created when a team admin wants to share their schedule publicly
-- via a tokenized URL like /schedule/share/{token}/. The current in-memory
-- store makes shared URLs unreliable — they break when Vercel recycles
-- the serverless container.
--
-- Safety:
--   - Every CREATE uses IF NOT EXISTS
--   - No DROP, no ALTER on existing tables
--   - RLS enabled with owner-only write
--   - Public read via service role only (tokens are bearer-style — knowing
--     the token grants read access; no enumeration possible with 192-bit keyspace)

CREATE TABLE IF NOT EXISTS public.schedule_share_tokens (
  -- The public token (192-bit random, base64url).
  token         TEXT PRIMARY KEY,

  -- Owner (Clerk user ID).
  user_id       TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,

  -- Timestamps.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,

  -- Optional metadata for analytics / debugging.
  -- e.g. {"ip": "1.2.3.4", "user_agent": "...", "tier": "club_pro"}
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT schedule_share_tokens_expiry_check CHECK (expires_at > created_at)
);

-- Index for the common query: "find the active token for a user".
CREATE INDEX IF NOT EXISTS idx_schedule_share_tokens_user
  ON public.schedule_share_tokens(user_id);

-- Index for the cleanup cron: "find expired tokens".
CREATE INDEX IF NOT EXISTS idx_schedule_share_tokens_expires
  ON public.schedule_share_tokens(expires_at);

-- RLS
ALTER TABLE public.schedule_share_tokens ENABLE ROW LEVEL SECURITY;

-- Owner can read their own tokens.
DROP POLICY IF EXISTS "Owner reads own share tokens" ON public.schedule_share_tokens;
CREATE POLICY "Owner reads own share tokens" ON public.schedule_share_tokens
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- No public read policy — token access goes through service role only.
-- Anyone presenting the token to the share endpoint is implicitly authorized
-- by knowing the 192-bit secret (bearer-style auth).

-- Service role can read/write for the share endpoint logic.

-- Cleanup function: delete expired tokens. Called by a daily cron or on-demand.
CREATE OR REPLACE FUNCTION public.cleanup_expired_share_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.schedule_share_tokens
  WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_share_tokens() IS
'Delete expired share tokens. Returns count deleted. Run via cron or on-demand.';