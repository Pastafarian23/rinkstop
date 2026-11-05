-- 2026-11-05: /launch — ice marketplace funnel fields
--
-- Context (Arnel, 2026-11-05): "Ice marketplace listing should be optimized.
-- Submit listing shouldn't require paid plan. Let's use this as a funnel to
-- gain user info, since submitted listings require approval anyways."
--
-- The /launch form captured org contact details and a paid tier, but nothing
-- about the ICE — which is the actual product. These two fields capture what
-- we need to onboard a rink properly:
--   ice_type    — what kind of open ice they have (drives what a listing
--                 looks like and which slots we suggest).
--   primary_goal — what outcome they want (lets us triage who to contact
--                 first instead of treating every signup the same).
--
-- Both are ADDITIVE and NULLABLE: existing rows are untouched, and the API
-- falls back to NULL when a field is not submitted.
--
-- Schema read before write (2026-11-05): founding_partner_signups has 21
-- columns, one CHECK constraint set (fk_contact_email_format, fk_org_type,
-- fk_status, fk_tier_interest), one BEFORE UPDATE trigger
-- (founding_partner_signups_updated_at), RLS enabled with 2 policies, and 4
-- indexes. Neither new column participates in a constraint, trigger, or
-- index, so adding them cannot affect existing behaviour.
--
-- Note: fk_tier_interest ALREADY allowed 'org_free' — the form simply never
-- offered it and required a selection, which forced every submission to
-- choose a paid tier. No DB change was needed for that part.

BEGIN;

ALTER TABLE public.founding_partner_signups
  ADD COLUMN IF NOT EXISTS ice_type text,
  ADD COLUMN IF NOT EXISTS primary_goal text;

COMMENT ON COLUMN public.founding_partner_signups.ice_type IS
  'What kind of open ice the org has — from the /launch funnel form.';
COMMENT ON COLUMN public.founding_partner_signups.primary_goal IS
  'What the org wants from the ice marketplace — from the /launch funnel form.';

COMMIT;
