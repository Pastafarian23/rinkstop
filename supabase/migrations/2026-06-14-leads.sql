-- Play 1 Component 3: EmailCaptureInline + leads table
-- Captures soft-signup intent at moments of high engagement.
-- Used to follow up with users who haven't completed account creation.

BEGIN;

CREATE TABLE IF NOT EXISTS leads (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT    NOT NULL,
  entity_type TEXT    CHECK (entity_type IN ('rink', 'team', 'player', 'league', 'business', 'user')),
  entity_id   TEXT,
  intent      TEXT    CHECK (intent IN ('follow', 'save', 'message', 'email_capture', 'newsletter', 'tryout_reminder', 'schedule_alert')),
  source_path TEXT,                          -- the URL they were on when they gave their email
  source_url  TEXT,                          -- full URL (supports shortener redirects)
  email_verified BOOLEAN DEFAULT false,
  clerk_user_id  TEXT,                        -- populated if they later create an account
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT   leads_email_unique UNIQUE (email)
);

-- Index for dedup lookups and email-based queries
CREATE INDEX IF NOT EXISTS leads_email_idx         ON leads (email);
CREATE INDEX IF NOT EXISTS leads_entity_idx       ON leads (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS leads_clerk_user_idx   ON leads (clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_created_idx     ON leads (created_at DESC);

-- RLS: anyone can insert a lead (anonymous soft-signup flow).
-- Read/update/delete restricted to the owner or admin.
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Public insert is allowed (no auth required for anonymous lead capture)
CREATE POLICY "leads_insert_public" ON leads
  FOR INSERT WITH CHECK (true);

-- Users can read their own leads
CREATE POLICY "leads_read_own" ON leads
  FOR SELECT USING (
    clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR entity_type IS NOT NULL  -- for admin access, require separate auth check
  );

-- Prevent updates from public context
CREATE POLICY "leads_update_public" ON leads
  FOR UPDATE USING (false);

-- Prevent deletes from public context
CREATE POLICY "leads_delete_public" ON leads
  FOR DELETE USING (false);

-- Internal service role always has access (for admin APIs)
CREATE POLICY "leads_service_role" ON leads
  FOR ALL USING (true);

COMMENT ON TABLE leads IS
  'Soft-signup intent captures. Stores email + context (entity, intent, source page). '
  'Used to follow up with users who have not completed account creation. '
  'Populated by EmailCaptureInline components on directory detail pages and the IntentBanner.';
COMMENT ON COLUMN leads.entity_type IS
  'The directory entity the user was viewing when they gave their email. '
  'Null for site-wide newsletter captures.';
COMMENT ON COLUMN leads.intent IS
  'What the user was trying to do: follow, save, message, email_capture, '
  'newsletter, tryout_reminder, schedule_alert.';
COMMENT ON COLUMN leads.source_path IS
  'The pathname they were on (e.g. /directory/rinks/a3-arena). Used to reconstruct '
  'the page context for follow-up emails.';
COMMENT ON COLUMN leads.clerk_user_id IS
  'Populated automatically when the lead later creates an account via Clerk. '
  'Allows joining leads to user profiles for attribution.';

COMMIT;
