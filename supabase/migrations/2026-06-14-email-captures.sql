-- Play 1 Component 3: email_captures table
-- Soft-signup intent captures at moments of high engagement.
-- Used to follow up with users who haven't completed account creation.
-- Separate from the existing `leads` table (which is for listing submissions).

BEGIN;

CREATE TABLE IF NOT EXISTS email_captures (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  email          TEXT    NOT NULL,
  entity_type    TEXT    CHECK (entity_type IN ('rink', 'team', 'player', 'league', 'business', 'user')),
  entity_id      TEXT,
  intent         TEXT    CHECK (intent IN ('follow', 'save', 'message', 'email_capture', 'newsletter', 'tryout_reminder', 'schedule_alert')),
  source_path    TEXT,                          -- the URL path they were on (e.g. /directory/rinks/a3-arena)
  source_url     TEXT,                          -- full URL
  email_verified BOOLEAN DEFAULT false,
  clerk_user_id  TEXT,                          -- populated if they later create an account
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT     email_captures_email_unique UNIQUE (email)
);

-- Indexes for fast lookups and deduplication
CREATE INDEX IF NOT EXISTS email_captures_email_idx       ON email_captures (email);
CREATE INDEX IF NOT EXISTS email_captures_entity_idx     ON email_captures (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS email_captures_clerk_user_idx  ON email_captures (clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_captures_created_idx    ON email_captures (created_at DESC);

ALTER TABLE email_captures ENABLE ROW LEVEL SECURITY;

-- Public insert (anonymous soft-signup flow — no auth required)
CREATE POLICY "email_captures_insert_public" ON email_captures
  FOR INSERT WITH CHECK (true);

-- Service role always has full access (for admin reads)
CREATE POLICY "email_captures_service_role" ON email_captures
  FOR ALL USING (true)
  WITH CHECK (true);

COMMENT ON TABLE email_captures IS
  'Soft-signup intent captures. Stores email + context (entity, intent, source page). '
  'Used to follow up with users who have not completed account creation. '
  'Populated by EmailCaptureInline components on directory detail pages.';
COMMENT ON COLUMN email_captures.entity_type IS
  'The directory entity the user was viewing when they gave their email. '
  'Null for site-wide newsletter captures.';
COMMENT ON COLUMN email_captures.intent IS
  'What the user was trying to do: follow, save, message, email_capture, '
  'newsletter, tryout_reminder, schedule_alert.';
COMMENT ON COLUMN email_captures.source_path IS
  'The pathname they were on (e.g. /directory/rinks/a3-arena). Used to reconstruct '
  'the page context for follow-up emails.';
COMMENT ON COLUMN email_captures.clerk_user_id IS
  'Populated automatically when the lead later creates an account via Clerk. '
  'Allows joining email_captures to user profiles for attribution.';

COMMIT;
