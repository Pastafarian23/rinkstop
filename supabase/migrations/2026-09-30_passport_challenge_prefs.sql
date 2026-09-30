-- ============================================================
-- Hockey Passport — Challenge Preferences (opt-in regions + leagues)
--
-- Issue date: 2026-09-30
-- Ref: 2026-09-30 3-step monetization plan (Arnel-approved)
--      memory/2026-09-30-passport-monetization.md
--
-- PURPOSE:  Customize, tailor, and personalize the challenges shown on a user's
-- Hockey Passport. A Philippines player should NOT see "NHL Rink Circuit"
-- unless they explicitly opted in. A USA coach should not see "Philippines rinks"
-- unless they explicitly opted in.
--
-- DESIGN:
--   - One row per user (upsert on conflict)
--   - opted_in_leagues text[]   — leagues user wants to track (slugs like 'nhl','khl','shl')
--   - opted_in_countries text[] — countries (ISO codes like 'PH','US','CA') user wants to track
--   - DEFAULT arrays empty — code computes the default-on scope at read time
--     from profiles.country + account_type. Users only need to write to this
--     table when they want to ADD regions/leagues beyond the default.
--
-- RLS:
--   - Enable RLS
--   - Owner can SELECT/UPDATE/INSERT/DELETE their own row
--   - service_role bypass (used by public ChallengesSection read)
--
-- APP USAGE:
--   - src/components/passport/ChallengesSection.tsx — reads via service_role
--     to compute the active challenge set for a passport page
--   - src/app/dashboard/passport/challenges/preferences — owner UI for opt-in
--   - API: /api/passport/challenge-prefs (POST to upsert)
-- ============================================================

create table if not exists public.passport_challenge_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opted_in_leagues text[] not null default '{}',
  opted_in_countries text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint passport_challenge_prefs_user_unique unique (user_id)
);

create index if not exists passport_challenge_prefs_user_idx
  on public.passport_challenge_prefs (user_id);

-- RLS
alter table public.passport_challenge_prefs enable row level security;

-- Owner can SELECT their own row
drop policy if exists "passport_challenge_prefs: owner select" on public.passport_challenge_prefs;
create policy "passport_challenge_prefs: owner select"
  on public.passport_challenge_prefs
  for select
  to authenticated
  using (user_id = auth.uid());

-- Owner can INSERT/UPDATE/DELETE their own row
drop policy if exists "passport_challenge_prefs: owner insert" on public.passport_challenge_prefs;
create policy "passport_challenge_prefs: owner insert"
  on public.passport_challenge_prefs
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "passport_challenge_prefs: owner update" on public.passport_challenge_prefs;
create policy "passport_challenge_prefs: owner update"
  on public.passport_challenge_prefs
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "passport_challenge_prefs: owner delete" on public.passport_challenge_prefs;
create policy "passport_challenge_prefs: owner delete"
  on public.passport_challenge_prefs
  for delete
  to authenticated
  using (user_id = auth.uid());

-- service_role bypasses RLS for public passport page reads
-- (no explicit policy needed — service_role bypass is default)

-- Default-on scope mapping lives in code (no table needed). See
-- src/components/passport/ChallengesSection.tsx and
-- memory/2026-09-30-passport-monetization.md §D for the implementation.

comment on table public.passport_challenge_prefs is
  'Per-user opt-in list of leagues/countries for Hockey Passport challenges. Empty arrays = use default-on scope derived from profile.country + account_type.';