-- Create playoff_updates table for live playoff update tracking
CREATE TABLE IF NOT EXISTS playoff_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  update_type TEXT NOT NULL CHECK (update_type IN ('update', 'analysis', 'goal', 'period', 'final', 'trade')),
  content TEXT NOT NULL,
  author TEXT DEFAULT 'RinkStop',
  game_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE playoff_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can read playoff updates" ON playoff_updates
  FOR SELECT USING (true);

-- Anyone can post
CREATE POLICY "Anyone can post playoff updates" ON playoff_updates
  FOR INSERT WITH CHECK (true);

-- Index for ordered feed
CREATE INDEX IF NOT EXISTS idx_playoff_updates_created_at ON playoff_updates (created_at DESC);