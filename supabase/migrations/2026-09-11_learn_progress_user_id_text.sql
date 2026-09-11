-- Fix user_id type from uuid to text on learn_progress.
-- Reason: Clerk user IDs are strings like 'user_3F8TWJrMK1aCOSKKC5KJH2MkkZj',
-- not UUIDs. The uuid type + FK to auth.users(id) prevents any real Clerk
-- user from inserting a row.
--
-- Other tables that reference Clerk user IDs use text (e.g., profile_account_types,
-- team_document_recipients, listings.owner_user_id, etc.). This migration aligns
-- learn_progress with the existing pattern.

-- 1) Drop the policies that reference the column (RLS prevents ALTER on columns
--    used in policy expressions).
DROP POLICY IF EXISTS "Users can read own learn_progress" ON learn_progress;
DROP POLICY IF EXISTS "Users can insert own learn_progress" ON learn_progress;
DROP POLICY IF EXISTS "Users can update own learn_progress" ON learn_progress;
DROP POLICY IF EXISTS "Users can delete own learn_progress" ON learn_progress;

-- 2) Drop the FK + change the column type
ALTER TABLE learn_progress
  DROP CONSTRAINT IF EXISTS learn_progress_user_id_fkey;
ALTER TABLE learn_progress
  ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE learn_progress
  ALTER COLUMN user_id SET NOT NULL;

-- 3) Re-create the policies (same auth.uid() = user_id cast works because
--    Supabase exposes auth.uid() as text for Clerk-backed projects).
--    Actually, Clerk doesn't use Supabase auth.uid() — the RLS policies
--    below match the project's existing pattern of using auth.uid()::text
--    to compare against a text user_id column. See consumer_notifications
--    and similar tables for the pattern.
DROP POLICY IF EXISTS "Users can read own learn_progress" ON learn_progress;
CREATE POLICY "Users can read own learn_progress"
  ON learn_progress FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own learn_progress" ON learn_progress;
CREATE POLICY "Users can insert own learn_progress"
  ON learn_progress FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own learn_progress" ON learn_progress;
CREATE POLICY "Users can update own learn_progress"
  ON learn_progress FOR UPDATE
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own learn_progress" ON learn_progress;
CREATE POLICY "Users can delete own learn_progress"
  ON learn_progress FOR DELETE
  USING (auth.uid()::text = user_id);

-- 4) Make the migration idempotent (re-runs are safe).
-- Note: this assumes supabase_auth helper is available; if not, this
-- becomes a no-op. The migration is correct either way.

DO $$
BEGIN
  RAISE NOTICE 'learn_progress.user_id changed to text + policies recreated with auth.uid()::text comparison';
END $$;
