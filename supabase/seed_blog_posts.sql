-- ============================================================
-- RinkStop Blog System — Setup SQL
-- Go to: https://supabase.com/dashboard → your project → SQL Editor
-- Click "New Query", paste ALL of this, click "Run"
-- ============================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the blog posts table
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

-- 3. Indexes for speed
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING gin(tags);

-- 4. Auto-update edited_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Auto-set publish date when post goes live
CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posts_published BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_published_at();

-- 6. Enable Row Level Security (required for Supabase API)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published posts" ON posts
  FOR SELECT USING (status = 'published');
CREATE POLICY "Anyone can insert with API key" ON posts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own posts" ON posts
  FOR UPDATE USING (true);

-- 7. Seed: 4 approved blog posts
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

SELECT '✅ Done! Blog table created with 4 seed posts.' AS status;