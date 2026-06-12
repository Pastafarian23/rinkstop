-- 2026-06-12_profiles_account_type.sql
-- Adds account_type to profiles so users can self-identify (drives dashboard personalization).
-- Independent of tier (subscription level). Free to pick, skippable.
-- Values: fan, player, coach, scout, business, team, league, rink

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_type TEXT
CHECK (account_type IS NULL OR account_type IN ('fan', 'player', 'coach', 'scout', 'business', 'team', 'league', 'rink'));

COMMENT ON COLUMN public.profiles.account_type IS
'Self-identified user type. Drives dashboard personalization. Independent of tier (subscription level).';
