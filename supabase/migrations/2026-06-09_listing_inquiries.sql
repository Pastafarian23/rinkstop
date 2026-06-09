-- Listing inquiry (lead capture) support.
--
-- Goal: a Pro-tier claimer gets a "Contact this rink/team" form on their
-- listing page. Submitter fills name/email/phone/message, we store the
-- lead and surface it in the claimant's dashboard.
--
-- We extend the existing `leads` table rather than creating a new
-- listing_inquiries table — same status/source/role/rate-limit logic,
-- just new optional columns for the listing context.

alter table public.leads
  add column if not exists listing_id      text,                 -- rink/team/league uuid-as-text
  add column if not exists listing_type    text,                 -- 'rink' | 'team' | 'league'
  add column if not exists listing_name    text,                 -- denormalized for at-a-glance
  add column if not exists claimant_user_id text,                -- who owns the claimed listing
  add column if not exists submitter_name  text,                 -- person inquiring
  add column if not exists submitter_phone text,                 -- optional
  add column if not exists message        text,                 -- inquiry body
  add column if not exists read_at        timestamp with time zone; -- null = unread in dashboard

-- Source values are now valid for the existing CHECK constraint.
-- New sources: listing_inquiry_rink, listing_inquiry_team, listing_inquiry_league.
-- (If there's no CHECK on source, this is just documentation.)

-- Index for the claimant's dashboard "Leads" tab:
--   "SELECT * FROM leads WHERE claimant_user_id = $1 ORDER BY created_at DESC"
create index if not exists idx_leads_claimant_created
  on public.leads (claimant_user_id, created_at desc)
  where claimant_user_id is not null;

-- Index for the (listing_type, listing_id) lookup when the form posts:
--   "Find the active claim for this listing"
create index if not exists idx_leads_listing
  on public.leads (listing_type, listing_id, created_at desc)
  where listing_id is not null;

-- Enable RLS-aware reads: we want the claimant to see rows where
-- claimant_user_id = auth.uid(). Existing policies on `leads` (if any)
-- only cover inserts from the anon role. Add a SELECT policy for the
-- claimant role.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'leads'
      and policyname = 'leads_claimant_select'
  ) then
    create policy leads_claimant_select on public.leads
      for select
      using (
        claimant_user_id = (auth.jwt() ->> 'sub')
      );
  end if;
end $$;

-- Comment for future me
comment on column public.leads.listing_id        is 'UUID of the rink/team/league the inquiry is about';
comment on column public.leads.listing_type      is 'rink | team | league';
comment on column public.leads.claimant_user_id  is 'user_id of the person who claims this listing (Pro tier required)';
comment on column public.leads.submitter_name    is 'Inquirer name (free text)';
comment on column public.leads.submitter_phone   is 'Optional phone number';
comment on column public.leads.message          is 'Inquirer message body';
comment on column public.leads.read_at           is 'When the claimant marked the inquiry as read in the dashboard';
