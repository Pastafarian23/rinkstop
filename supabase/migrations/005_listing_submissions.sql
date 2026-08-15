-- Create listing_submissions table for user-submitted directory additions
CREATE TABLE IF NOT EXISTS public.listing_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_type TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  website TEXT,
  description TEXT,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.listing_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public can submit)
CREATE POLICY "Allow anonymous inserts" ON public.listing_submissions
  FOR INSERT TO anon WITH CHECK (true);

-- Only allow reading by authenticated users or admins (for review)
CREATE POLICY "Allow read by authenticated" ON public.listing_submissions
  FOR SELECT TO authenticated USING (true);

-- Service_role bypass for admin routes (supabaseAdmin client)
CREATE POLICY "Allow service_role full" ON public.listing_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_submissions;
