-- Add payment-pending email preference column.
-- Default TRUE so existing users opt-in (matches the team_news/results default).
-- Users can opt out via /dashboard/settings/notifications.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_payment_notifications BOOLEAN DEFAULT TRUE;

-- Backfill NULLs to TRUE for any rows where the column was added with default NULL
UPDATE profiles
  SET email_payment_notifications = TRUE
  WHERE email_payment_notifications IS NULL;