-- ============================================================
-- RinkStop Database Setup — Run All At Once
-- ============================================================

-- 1. Core tables: leagues, teams, players, rinks, brands, fixtures, stats
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS leagues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  country TEXT,
  level TEXT CHECK (level IN ('professional', 'junior', 'amateur', 'youth', 'recreational')),
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
  city TEXT,
  country TEXT,
  division TEXT,
  logo_url TEXT,
  colors TEXT[],
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  position TEXT CHECK (position IN ('goalie', 'defenseman', 'left_wing', 'right_wing', 'center', 'defense', NULL)),
  jersey_number INTEGER,
  shoots TEXT CHECK (shoots IN ('left', 'right', NULL)),
  catches TEXT CHECK (catches IN ('left', 'right', NULL)),
  height_cm INTEGER,
  weight_kg INTEGER,
  birth_date DATE,
  nationality TEXT,
  bio TEXT,
  headshot_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rinks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  city TEXT,
  province_state TEXT,
  country TEXT,
  address TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  capacity INTEGER,
  ice_size TEXT CHECK (ice_size IN ('NHL', 'Olympic', 'Recreational', NULL)),
  surface_type TEXT CHECK (surface_type IN ('ice', 'synthetic', 'other')),
  website_url TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  category TEXT CHECK (category IN ('sticks', 'skates', 'helmets', 'pads', 'gloves', 'apparel', 'accessories', 'other')),
  country_of_origin TEXT,
  website_url TEXT,
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fixtures (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  home_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES rinks(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  home_score INTEGER DEFAULT NULL,
  away_score INTEGER DEFAULT NULL,
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')) DEFAULT 'scheduled',
  season TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  fixture_id UUID REFERENCES fixtures(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  plus_minus INTEGER DEFAULT 0,
  penalty_minutes INTEGER DEFAULT 0,
  shots_on_goal INTEGER DEFAULT 0,
  time_on_ice TEXT,
  game_rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  season TEXT,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  overtime_losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('super_admin', 'editor', 'viewer')) DEFAULT 'editor',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_home ON fixtures(home_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_away ON fixtures(away_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_league ON fixtures(league_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_scheduled ON fixtures(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_fixture ON player_stats(fixture_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_team ON team_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_season ON team_stats(season);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leagues_updated BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_players_updated BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rinks_updated BEFORE UPDATE ON rinks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Blog posts table + RLS + seed data
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  content_html TEXT,
  author_name TEXT DEFAULT 'Arnel',
  author_role TEXT DEFAULT 'Founder, RinkStop',
  status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'blog',
  reading_time_minutes INTEGER DEFAULT 5,
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING gin(tags);

CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_posts_published BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_published_at();

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published posts" ON posts
  FOR SELECT USING (status = 'published');
CREATE POLICY "Anyone can insert with API key" ON posts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own posts" ON posts
  FOR UPDATE USING (true);

-- Seed 4 blog posts
INSERT INTO posts (slug, title, subtitle, content, status, published_at, seo_title, seo_description, tags, category, created_at) VALUES
(
  'global-hockey-directory-building-05-09-2026',
  'How RinkStop Is Building a Global Hockey Directory — One Team at a Time',
  'From Cebu to the world — the story behind the platform',
  'I remember the first time someone asked me, "Where can I find a hockey team in the Philippines?" It was 2021. I had just started coaching youth hockey here in Cebu, and the question caught me off guard. Honestly? I had no idea. There was no central place to look. No database. No directory. Just scattered Facebook groups and word of mouth. That moment stuck with me. If someone in the Philippines couldnt find hockey resources, what about someone in Kenya? Or Brazil? Or Norway? I realized hockeys biggest problem wasnt the sport itself — it was discoverability.',
  'published',
  '2026-05-09',
  'How RinkStop Is Building a Global Hockey Directory',
  'Discover how RinkStop is creating the worlds most comprehensive hockey directory — connecting players, teams, leagues, and rinks across 80+ countries.',
  ARRAY['hockey','directory','global','youth-hockey'],
  'blog',
  '2026-05-09'
),
(
  'coaching-cebu-lessons-05-08-2026',
  'Coaching Hockey in Cebu: 5 Lessons That Changed How I Lead',
  'What a decade of youth coaching in the Philippines taught me about leadership',
  'Five years ago, I started coaching youth hockey in Cebu. Back then, we had six kids, a borrowed stick, and a dream. Today, we have over 80 players across three age groups. But the growth wasnt just in numbers — it changed how I lead, coach, and build community.',
  'published',
  '2026-05-08',
  'Coaching Hockey in Cebu: 5 Leadership Lessons',
  'Five years of coaching youth hockey in the Philippines taught these powerful lessons about leadership, community building, and growing the game globally.',
  ARRAY['coaching','cebu','leadership','youth-hockey','philippines'],
  'coaching',
  '2026-05-08'
),
(
  'youth-hockey-overseas-05-08-2026',
  'Why Youth Hockey Is Growing in Unexpected Places',
  'From the Philippines to Kenya — how hockey is finding new homes',
  'When you think of youth hockey, you probably picture Canada, Minnesota, or maybe Russia. But the game is changing. Today, youth hockey programs are popping up in places nobody expected — the Philippines, Brazil, Malaysia, and beyond.',
  'published',
  '2026-05-08',
  'Youth Hockey Growth in Unexpected Markets',
  'Discover how youth hockey is expanding beyond traditional markets — from the Philippines to Brazil, new programs are growing the global game.',
  ARRAY['youth-hockey','growth','global','emerging-markets'],
  'global-scenes',
  '2026-05-08'
),
(
  'youth-hockey-growth-04-22-2026',
  'Youth Hockey Growth: How Local Programs Go Global',
  'The playbook for building hockey communities anywhere',
  'Every hockey program starts the same way: one coach, a handful of kids, and a sheet of ice. But some programs grow beyond their local rinks and become part of something bigger. Here is what I have learned about how youth hockey programs go global — and why it matters for the future of the sport.',
  'published',
  '2026-04-22',
  'Youth Hockey Growth: From Local Programs to Global Communities',
  'How local youth hockey programs grow into global communities. Insights from coaching hockey across three continents.',
  ARRAY['youth-hockey','coaching','growth','community'],
  'blog',
  '2026-04-22'
);

SELECT '✅ All tables created and 4 blog posts seeded!' AS result;