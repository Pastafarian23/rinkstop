-- Add player verified/paid tier fields
-- Safe migration: only adds columns if they don't exist

ALTER TABLE players ADD COLUMN IF NOT EXISTS badge_tier TEXT DEFAULT 'free' CHECK (badge_tier IN ('free', 'verified', 'elite'));
ALTER TABLE players ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS video_links JSONB DEFAULT '[]';
ALTER TABLE players ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_birthdate_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS recruit_profile_visible BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS open_to_college BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS open_to_pro BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS parent_contact_name TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS parent_contact_email TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS parent_contact_phone TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS recruiting_bio TEXT;

-- Add index for efficient badge_tier queries
CREATE INDEX IF NOT EXISTS idx_players_badge_tier ON players(badge_tier) WHERE badge_tier != 'free';

-- Add index for scout search on verified/elite players
CREATE INDEX IF NOT EXISTS idx_players_recruit_visible ON players(recruit_profile_visible) WHERE recruit_profile_visible = TRUE;

COMMENT ON COLUMN players.badge_tier IS 'free | verified | elite - controls profile visibility and features';
COMMENT ON COLUMN players.certifications IS 'JSON array of {type, name, issuer, year} objects';
COMMENT ON COLUMN players.video_links IS 'JSON array of {platform, url, title} objects';