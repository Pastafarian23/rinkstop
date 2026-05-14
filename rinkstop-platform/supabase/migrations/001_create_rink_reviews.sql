-- Migration: Create rink_reviews table
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS rink_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  reviewer_name TEXT DEFAULT 'Anonymous',
  reviewer_email TEXT,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rink_reviews_rink_id ON rink_reviews(rink_id);
CREATE INDEX IF NOT EXISTS rink_reviews_status ON rink_reviews(status);
