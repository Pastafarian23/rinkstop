-- 2026-10-23_profiles_subscription_status_check_fix.sql
--
-- THE BUG
-- profiles had this constraint:
--
--   CHECK (subscription_status = ANY (
--       ARRAY['active','past_due','cancelled','trialing',NULL::text]))
--
-- The NULL::text element makes the whole `= ANY(...)` expression evaluate to
-- NULL for any value not in the list, rather than FALSE. A CHECK constraint
-- passes when the expression is NULL, so this constraint has never rejected
-- anything in production.
--
-- Verified live 2026-10-23:
--   select 'unpaid' = ANY(ARRAY['active','past_due','cancelled','trialing',NULL::text]);
--   -> NULL   (not false)
--   update profiles set subscription_status='unpaid' where user_id=<qa row>;
--   -> succeeded, row read back as 'unpaid'
--
-- WHY IT MATTERS
-- The Stripe webhook writes raw Stripe statuses, which include values outside
-- the intended list: `unpaid`, `canceled` (one L, vs the constraint's
-- `cancelled` two L's), `incomplete`, `incomplete_expired`. Because the
-- constraint was inert, all of those were silently accepted, so the database
-- holds a mix of British/American spellings and dunning states that no reader
-- in the app knows how to interpret.
--
-- This is a DATA INTEGRITY bug, not an availability bug: the tier downgrade in
-- the same UPDATE does land. But it means the dunning policy documented in
-- src/app/api/webhooks/stripe/route.ts is not reliably observable from the DB,
-- and any future code that filters on subscription_status='active' will behave
-- differently for a user whose status is 'unpaid' vs 'past_due'.
--
-- THE FIX
-- Two parts, deliberately separated:
--
--   1. Normalize the existing data to the canonical vocabulary the application
--      actually reads. 'canceled' -> 'cancelled' so there is one spelling.
--   2. Replace the constraint with the correct NULL-safe form:
--         CHECK (subscription_status IS NULL
--                OR subscription_status IN ('active','past_due','cancelled','trialing'))
--      which correctly rejects unknown values while still permitting NULL.
--
-- The full Stripe status vocabulary is intentionally NOT added to the
-- constraint. Dunning states (past_due, trialing) are recorded; terminal
-- states are normalized to 'cancelled' by the webhook before they get here.
-- Keeping the constraint narrow means an unmapped status is a loud failure
-- rather than a silent data-quality problem recurring.

begin;

-- ---------------------------------------------------------------------------
-- 1. Inspect before changing. This migration deliberately logs what it finds
--    so the data normalization is auditable rather than silent.
-- ---------------------------------------------------------------------------

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.profiles
   where subscription_status is not null
     and subscription_status not in ('active','past_due','cancelled','trialing');
  raise notice 'profiles with non-canonical subscription_status: %', v_count;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Normalize to the canonical vocabulary
-- ---------------------------------------------------------------------------

-- American spelling used by Stripe and by the webhook, British spelling used
-- by the old constraint and by some read paths.
update public.profiles
   set subscription_status = 'cancelled'
 where subscription_status = 'canceled';

-- Terminal dunning outcomes all mean "no longer paying".
update public.profiles
   set subscription_status = 'cancelled'
 where subscription_status in ('unpaid', 'incomplete_expired');

-- A never-completed first payment is not a cancellation; it is closer to
-- trialing (access granted, payment not yet collected).
update public.profiles
   set subscription_status = 'trialing'
 where subscription_status = 'incomplete';

-- ---------------------------------------------------------------------------
-- 3. Replace the inert constraint with a NULL-safe one
-- ---------------------------------------------------------------------------

alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
  add constraint profiles_subscription_status_check
  check (
    subscription_status is null
    or subscription_status in ('active', 'past_due', 'cancelled', 'trialing')
  );

-- VALIDATE explicitly. ADD CONSTRAINT validates by default, but stating it
-- makes the intent auditable: this constraint WILL reject unknown values, which
-- is the entire point of the fix.
alter table public.profiles
  validate constraint profiles_subscription_status_check;

comment on constraint profiles_subscription_status_check on public.profiles is
  'Canonical subscription statuses only. Written in NULL-safe form: the '
  'previous version used ANY(ARRAY[... NULL::text]) which evaluates to NULL '
  'for non-matching values and therefore never rejected anything. The webhook '
  'is responsible for normalizing raw Stripe statuses (canceled/unpaid/'
  'incomplete_expired -> cancelled, incomplete -> trialing) before writing.';

commit;