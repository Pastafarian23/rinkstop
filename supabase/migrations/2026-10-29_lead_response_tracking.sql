-- 2026-10-29 — Lead response tracking for listing_submissions
--
-- WHY (Arnel's revenue audit):
--   Two real leads (Slough Satans submitted 2026-10-02, GLXY Cup submitted
--   2026-10-21) sat untouched for weeks. There was NO field anywhere that
--   recorded whether we had replied, how long it took, or what the outcome
--   was — and no outreach log in the repo or the database. "We never
--   answered" is invisible unless the data model can hold it.
--
--   These columns make the lead pipeline measurable:
--     contacted_at       when we first replied
--     contacted_by       who replied
--     reply_channel      email | telegram | phone | whatsapp
--     outcome            listed | claimed | paid | declined | no_response
--     outcome_notes      free text
--     first_response_hours  submitted -> first reply (the SLA metric)
--     listing_id         the rink/team/league created from this submission
--
-- NOTES:
--   - All columns are nullable and additive, so this is safe to apply to the
--     live table. No backfill: existing rows simply have NULLs, which means
--     "never contacted" — which is TRUE for both current rows.
--   - No CHECK constraints on `outcome`/`reply_channel`: they are free-text
--     for now so the admin UI can never be blocked by a schema mismatch, and
--     a constraint can be added once the value set is stable.
--   - `first_response_hours` is a generated column so it can never drift out
--     of sync with contacted_at.

alter table public.listing_submissions
  add column if not exists contacted_at timestamptz,
  add column if not exists contacted_by text,
  add column if not exists reply_channel text,
  add column if not exists outcome text,
  add column if not exists outcome_notes text,
  add column if not exists listing_id uuid;

-- First-response SLA, computed so it cannot drift.
alter table public.listing_submissions
  drop column if exists first_response_hours;
alter table public.listing_submissions
  add column first_response_hours numeric
    generated always as (
      case
        when contacted_at is null then null
        else round(extract(epoch from (contacted_at - created_at)) / 3600.0, 1)
      end
    ) stored;

comment on column public.listing_submissions.contacted_at is
  'When we first replied to the submitter. NULL = never contacted.';
comment on column public.listing_submissions.contacted_by is
  'Who replied (email or id).';
comment on column public.listing_submissions.reply_channel is
  'email | telegram | phone | whatsapp | other';
comment on column public.listing_submissions.outcome is
  'listed | claimed | paid | declined | no_response';
comment on column public.listing_submissions.listing_id is
  'The rink/team/league created from (or matched to) this submission.';
comment on column public.listing_submissions.first_response_hours is
  'Hours from submission to first reply. The lead-response SLA metric.';
