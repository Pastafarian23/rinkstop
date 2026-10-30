-- =============================================================================
-- 2026-10-30 — Public submission-status token for listing_submissions
-- =============================================================================
--
-- WHY:
--   A submitter who uses /add-listing gets a dead-end "LISTING SUBMITTED"
--   screen and an email containing a Submission ID that is not clickable and
--   not usable anywhere. There is no page they can visit to see whether their
--   submission is still in review, has been approved, or was rejected.
--
--   Real impact, measured 2026-10-30:
--     Slough Satans  submitted 2026-10-02, approved 2026-10-29  = 27.3 days
--     GLXY Cup       submitted 2026-10-21, approved 2026-10-29  =  8.5 days
--   Both were told "we review within 1-2 business days". Neither could check
--   on progress, so both went silent and we had to chase them by email.
--
-- WHAT THIS ADDS:
--   A `public_token` — an unguessable, URL-safe random string — stored on the
--   submission. The public status page is keyed by this token.
--
-- CRITICAL SECURITY CONSTRAINT:
--   This MUST be a token-keyed, service-role-backed endpoint. A public RLS
--   read on `listing_submissions` would re-open the PII leak closed by
--   2026-10-30_listing_submissions_pii_lockdown.sql — the submitter's email
--   and our internal notes would be readable by anyone with the public
--   Supabase key.
--
--   So: the anon role still cannot SELECT this table. The status page
--   resolves the token server-side with the service-role client and returns
--   ONLY the fields the submitter is meant to see.
--
-- COLUMN CHOICES:
--   public_token text — 43 chars, base64url of 32 random bytes (256 bits of
--   entropy). Same shape as the federation invite token
--   (src/lib/federation-ownership.ts). Stored as text, not uuid, because we
--   want URL-safe base64url rather than a hex uuid.
--
--   public_token_expires_at — the token stops working after this. 180 days is
--   generous enough that a submitter who bookmarks the page still finds it
--   useful, and short enough that a leaked URL stops working eventually.
--
--   The unique index is PARTIAL — many legacy rows have NULL here, and
--   Postgres treats NULLs as distinct, so a plain unique index would still
--   work but would bloat; the partial form only indexes real tokens.
-- =============================================================================

BEGIN;

-- 1. The token columns.
ALTER TABLE public.listing_submissions
  ADD COLUMN IF NOT EXISTS public_token text,
  ADD COLUMN IF NOT EXISTS public_token_expires_at timestamptz;

-- 2. Unique index over real tokens only (NULL tokens are excluded).
CREATE UNIQUE INDEX IF NOT EXISTS listing_submissions_public_token_idx
  ON public.listing_submissions (public_token)
  WHERE public_token IS NOT NULL;

-- 3. Index for expiry sweeps.
CREATE INDEX IF NOT EXISTS listing_submissions_token_expiry_idx
  ON public.listing_submissions (public_token_expires_at)
  WHERE public_token IS NOT NULL;

-- 4. Backfill tokens for existing submissions so the status page works for
--    anyone who submitted before this migration.
--
--    gen_random_bytes comes from pgcrypto, which Supabase enables by
--    default. We encode to base64 and then translate the two non-URL-safe
--    characters ('+' and '/') into '-' and '_', and strip '=' padding, giving
--    a 43-character URL-safe token.
UPDATE public.listing_submissions
SET public_token = translate(
      rtrim(encode(gen_random_bytes(32), 'base64'), '='),
      '+/', '-_'
    )
WHERE public_token IS NULL;

-- 5. Give every token an expiry (180 days from now).
UPDATE public.listing_submissions
SET public_token_expires_at = now() + interval '180 days'
WHERE public_token IS NOT NULL
  AND public_token_expires_at IS NULL;

COMMIT;
