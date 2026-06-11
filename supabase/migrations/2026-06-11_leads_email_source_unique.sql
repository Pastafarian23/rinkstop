-- Add the unique constraint that the /api/leads upsert was assuming.
--
-- The leads route has been doing an upsert with onConflict: 'email,source'
-- since at least 2026-04. The constraint it was expecting was never created.
-- Every upsert was failing with 42P10 ("no unique or exclusion constraint
-- matching the ON CONFLICT specification"), but the route was failing
-- silently for legit requests because:
--   1) The honeypot field was set in test requests → return 200 without DB write
--   2) Production requests without the honeypot → route returned 500
--
-- The leads table had a non-unique index named `leads_email_source_uniq`
-- (probably auto-created by a Supabase migration), which masked the missing
-- constraint. We drop the index and create a real UNIQUE constraint.
--
-- Safe to apply: leads table was empty at time of this migration (verified).

DROP INDEX IF EXISTS public.leads_email_source_uniq;
ALTER TABLE public.leads ADD CONSTRAINT leads_email_source_key UNIQUE (email, source);
