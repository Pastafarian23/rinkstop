-- 2026-10-22_org_tier_consolidation.sql
--
-- PURPOSE
-- Split the single `profiles.tier` column into two tracks:
--   profiles.tier      -> PERSONAL only: free | verified_identity | identity_plus
--   profiles.org_tier  -> ORGANIZATION only: org_free | org_plus | org_pro
--                          | org_elite | org_enterprise
--
-- WHY
-- A person can hold a personal Hockey Passport AND own an organization.
-- One column cannot express that, and an org purchase overwriting `tier`
-- would silently destroy a paid personal entitlement.
--
-- Legacy org/business names (club_starter, club_pro, club_elite, league,
-- federation, business_listing, business_plus, ...) are canonicalized into
-- org_tier, and the owning row's `tier` is reset to 'free' so the personal
-- track only ever holds personal values.
--
-- Verified against the live DB 2026-10-22: profiles has 19 rows
-- (free 11, identity_plus 7, verified_identity 1) and ZERO org/business
-- rows, so the backfill is a no-op on today's data. It exists so a row
-- written between the code deploy and this migration still lands correctly.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add the org_tier column
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS org_tier TEXT NOT NULL DEFAULT 'org_free';

COMMENT ON COLUMN profiles.org_tier IS
  'Organization track tier. One of: org_free, org_plus, org_pro, org_elite, org_enterprise. Separate from profiles.tier, which holds the personal track (free, verified_identity, identity_plus).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill legacy org/business values out of `tier` into `org_tier`
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE profiles SET org_tier = CASE tier
    WHEN 'club_starter'      THEN 'org_plus'
    WHEN 'business_listing'  THEN 'org_plus'
    WHEN 'business_starter'  THEN 'org_plus'
    WHEN 'club_pro'          THEN 'org_pro'
    WHEN 'business_plus'     THEN 'org_pro'
    WHEN 'business_pro'      THEN 'org_pro'
    WHEN 'business_premium'  THEN 'org_pro'
    WHEN 'club_elite'        THEN 'org_elite'
    WHEN 'league'            THEN 'org_enterprise'
    WHEN 'federation'        THEN 'org_enterprise'
    WHEN 'enterprise'        THEN 'org_enterprise'
    ELSE org_tier
  END
WHERE tier IN (
    'club_starter','club_pro','club_elite','league','federation','enterprise',
    'business_listing','business_plus','business_starter','business_pro',
    'business_premium','business_free'
  );

-- Reset those rows' personal tier to 'free' — the org entitlement now lives
-- in org_tier, and the personal track must only hold personal values.
UPDATE profiles SET tier = 'free'
WHERE tier IN (
    'club_starter','club_pro','club_elite','league','federation','enterprise',
    'business_listing','business_plus','business_starter','business_pro',
    'business_premium','business_free'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Replace the tier CHECK constraint with personal-only values
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_tier_check
  CHECK (tier IN ('free', 'verified_identity', 'identity_plus'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3b. Separate Stripe subscription columns per track
--
-- A person can hold a personal Hockey Passport subscription AND an
-- organization subscription at the same time. One `stripe_subscription_id`
-- column can only point at ONE Stripe subscription, so the second purchase
-- would overwrite the first and the billing/cancel UI would show the wrong
-- subscription. The org track gets its own column.
--
-- `stripe_subscription_id` keeps meaning the PERSONAL subscription (that is
-- what every existing reader assumed). `stripe_org_subscription_id` is the
-- organization subscription.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_org_subscription_id TEXT;

COMMENT ON COLUMN profiles.stripe_org_subscription_id IS
  'Stripe subscription ID for the ORGANIZATION track plan. profiles.stripe_subscription_id remains the PERSONAL track subscription.';

-- Same problem for the status column: a cancelled PERSONAL subscription must
-- not make the ORGANIZATION subscription look cancelled (and vice versa).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS org_subscription_status TEXT;

COMMENT ON COLUMN profiles.org_subscription_status IS
  'Stripe subscription status for the ORGANIZATION track plan. profiles.subscription_status remains the PERSONAL track status.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. org_tier CHECK constraint
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_org_tier_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_org_tier_check
  CHECK (org_tier IN ('org_free', 'org_plus', 'org_pro', 'org_elite', 'org_enterprise'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. founding_partner_signups.tier_interest CHECK
--    (It is a CHECK constraint, not a real FK — see
--    supabase/migrations/2026-09-09_founding_partner_signups.sql:52.)
--
--    The interest list is org-oriented. It now accepts the canonical
--    organization names AND the legacy names (rows already written with
--    'club_starter' etc. must not fail the constraint).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE founding_partner_signups DROP CONSTRAINT IF EXISTS fk_tier_interest;

ALTER TABLE founding_partner_signups
  ADD CONSTRAINT fk_tier_interest CHECK (
    tier_interest IN (
      -- Canonical organization ladder
      'org_free', 'org_plus', 'org_pro', 'org_elite', 'org_enterprise',
      -- Legacy names retained so existing signup rows stay valid
      'club_starter', 'club_pro', 'club_elite', 'league', 'federation',
      'business_listing', 'business_plus'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Recreate profile_tier_ranks VIEW
--    The view fed the old flat rank table. It now exposes the canonical
--    ladder plus the legacy aliases (kept resolvable so in-flight rows and
--    old webhooks still rank correctly).
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS profile_tier_ranks;

CREATE VIEW profile_tier_ranks AS
  SELECT 'free'::text AS tier, 0::int AS rank, 'personal'::text AS track
  UNION ALL SELECT 'verified_identity', 1, 'personal'
  UNION ALL SELECT 'identity_plus', 2, 'personal'
  UNION ALL SELECT 'org_free', 0, 'organization'
  UNION ALL SELECT 'org_plus', 1, 'organization'
  UNION ALL SELECT 'org_pro', 2, 'organization'
  UNION ALL SELECT 'org_elite', 3, 'organization'
  UNION ALL SELECT 'org_enterprise', 4, 'organization'
  -- Legacy aliases (pre-2026-10-22 names), retained so historical rows and
  -- in-flight webhook payloads still resolve to a rank.
  UNION ALL SELECT 'roster', 1, 'personal'
  UNION ALL SELECT 'roster_plus', 2, 'personal'
  UNION ALL SELECT 'pro', 2, 'personal'
  UNION ALL SELECT 'premium', 2, 'personal'
  UNION ALL SELECT 'club_starter', 1, 'organization'
  UNION ALL SELECT 'club_pro', 2, 'organization'
  UNION ALL SELECT 'club_elite', 3, 'organization'
  UNION ALL SELECT 'league', 4, 'organization'
  UNION ALL SELECT 'federation', 4, 'organization'
  UNION ALL SELECT 'enterprise', 4, 'organization'
  UNION ALL SELECT 'business_free', 0, 'organization'
  UNION ALL SELECT 'business_listing', 1, 'organization'
  UNION ALL SELECT 'business_starter', 1, 'organization'
  UNION ALL SELECT 'business_plus', 2, 'organization'
  UNION ALL SELECT 'business_pro', 2, 'organization'
  UNION ALL SELECT 'business_premium', 2, 'organization';

COMMENT ON VIEW profile_tier_ranks IS
  'Canonical tier ladder (2026-10-22) plus retained legacy aliases. Personal track: free/verified_identity/identity_plus. Organization track: org_free..org_enterprise.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. team_workspaces.owner_user_id
--
-- WHY
-- The org-tier ladder advertises team-workspace quotas ("1 team", "up to 3
-- teams", "up to 10 teams", "unlimited"). Enforcing them requires a stable
-- "who owns this team" column on team_workspaces.
--
-- The table currently has `created_by` (nullable TEXT, the Clerk user id of
-- whoever created the row) and NO `owner_user_id` column. Multiple code
-- paths already reference `owner_user_id`:
--   - src/lib/org-limits.ts (countUserTeams)
--   - src/app/api/team/[slug]/reports/financial/route.ts (org tier lookup)
--   - src/app/dashboard/team/[slug]/reports/page.tsx
-- Those queries would fail with "column team_workspaces.owner_user_id does
-- not exist" (PostgREST 42703).
--
-- Fix: add the column, backfill from created_by, and keep both in sync.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE team_workspaces
  ADD COLUMN IF NOT EXISTS owner_user_id TEXT;

COMMENT ON COLUMN team_workspaces.owner_user_id IS
  'Clerk user id of the team owner. Canonical owner column for org tier quotas and financial reporting. Backfilled from created_by.';

UPDATE team_workspaces
   SET owner_user_id = created_by
 WHERE owner_user_id IS NULL
   AND created_by IS NOT NULL;

-- Keep the two in sync going forward for writes that only set one of them.
CREATE OR REPLACE FUNCTION public.sync_team_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_user_id IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.owner_user_id := NEW.created_by;
  ELSIF NEW.created_by IS NULL AND NEW.owner_user_id IS NOT NULL THEN
    NEW.created_by := NEW.owner_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_workspace_owner_sync ON team_workspaces;
CREATE TRIGGER trg_team_workspace_owner_sync
  BEFORE INSERT OR UPDATE ON team_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_team_workspace_owner();


-- ─────────────────────────────────────────────────────────────────────────────
-- 7b. Team-workspace quota helpers
--
-- Mirrors TEAM_LIMIT_PER_TIER in src/lib/pricing.ts:
--   org_free  -> 1 team
--   org_plus  -> 3 teams
--   org_pro   -> 10 teams
--   org_elite -> unlimited (-1)
--   org_enterprise -> unlimited (-1)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.team_workspace_quota_for_tier(p_org_tier TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_org_tier
    WHEN 'org_plus'       THEN 3
    WHEN 'org_pro'        THEN 10
    WHEN 'org_elite'      THEN -1   -- unlimited
    WHEN 'org_enterprise' THEN -1   -- unlimited
    ELSE 1
  END;
$$;

COMMENT ON FUNCTION public.team_workspace_quota_for_tier(TEXT) IS
  'Maximum team workspaces per organization tier. -1 means unlimited. Mirrors TEAM_LIMIT_PER_TIER in src/lib/pricing.ts.';

CREATE OR REPLACE FUNCTION public.count_user_team_workspaces(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM team_workspaces
   WHERE owner_user_id = p_user_id OR created_by = p_user_id;
$$;

COMMENT ON FUNCTION public.count_user_team_workspaces(TEXT) IS
  'Counts team workspaces owned by a user (owner_user_id, falling back to created_by).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. create_team_workspace — enforce the advertised team-workspace quota
--
-- WHY
-- The pricing page advertises "1 team workspace" (org_free), "up to 3"
-- (org_plus), "up to 10" (org_pro) and "unlimited" (org_elite+). Before this
-- migration the RPC did NO quota check at all, so any free user could create
-- unlimited teams.
--
-- The live function signature and body were read from the database on
-- 2026-10-22 with pg_get_functiondef — this replacement preserves that body
-- exactly and adds only the quota guard plus the owner_user_id write.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_team_workspace(
  p_name            TEXT,
  p_slug            TEXT,
  p_country         CHAR(2) DEFAULT NULL,
  p_age_cat         TEXT    DEFAULT 'youth',
  p_rink_id         UUID    DEFAULT NULL,
  p_short_name      TEXT    DEFAULT NULL,
  p_season          TEXT    DEFAULT NULL,
  p_level           TEXT    DEFAULT NULL,
  p_age_label       TEXT    DEFAULT NULL,
  p_age_min         INTEGER DEFAULT NULL,
  p_age_max         INTEGER DEFAULT NULL,
  p_federation_id   UUID    DEFAULT NULL,
  p_organization_id UUID    DEFAULT NULL,
  p_league_id       UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
  v_user_id   TEXT;
  v_team      team_workspaces%ROWTYPE;
  v_identity  BOOLEAN;
  v_slug_ok   BOOLEAN;
  v_rink_city    TEXT;
  v_rink_country TEXT;
  v_org_tier  TEXT;
  v_quota     INTEGER;
  v_current   INTEGER;
BEGIN
  v_user_id := current_user_id();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 2026-10-22: Organization-tier team-workspace quota.
  --
  -- The pricing page advertises "1 team workspace" (org_free), "up to 3"
  -- (org_plus), "up to 10" (org_pro) and "unlimited" (org_elite+). Before
  -- this change the RPC did NO quota check at all, so any free user could
  -- create unlimited teams — an advertised quota that is not enforced is a
  -- pricing lie and a support burden.
  --
  -- The quota is checked here (not only in the app layer) because this RPC
  -- is SECURITY DEFINER and directly callable by the client.
  -- ───────────────────────────────────────────────────────────────────────────
  SELECT COALESCE(p.org_tier, 'org_free') INTO v_org_tier
    FROM profiles p
   WHERE p.user_id = v_user_id;

  IF v_org_tier IS NULL THEN
    v_org_tier := 'org_free';
  END IF;

  v_quota := public.team_workspace_quota_for_tier(v_org_tier);

  -- Admins and the project owner are never capped (they run the platform).
  IF EXISTS (
    SELECT 1 FROM profiles p
     WHERE p.user_id = v_user_id
       AND p.role IN ('super_admin','admin')
  ) THEN
    v_quota := -1;
  END IF;

  IF v_quota > 0 THEN
    v_current := public.count_user_team_workspaces(v_user_id);
    IF v_current >= v_quota THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'team_quota_reached',
        'current', v_current,
        'limit', v_quota,
        'tier', v_org_tier,
        'message', 'Your plan includes ' || v_quota || ' team workspace' ||
                   CASE WHEN v_quota = 1 THEN '. Upgrade your organization plan for more teams.'
                        ELSE 's. Upgrade your organization plan for more teams.' END
      );
    END IF;
  END IF;
  v_slug_ok := p_slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$';
  IF NOT v_slug_ok THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_slug',
      'message', 'Slug must be 3-50 chars, lowercase letters, digits, hyphens.');
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM profile_identity_status
    WHERE user_id = v_user_id AND status = 'active'
  ) INTO v_identity;
  IF NOT v_identity THEN
    RETURN jsonb_build_object('ok', false, 'error', 'identity_required',
      'message', 'Verify your identity via /dashboard/identity before creating a team.');
  END IF;
  IF p_age_cat NOT IN ('youth','adult','mixed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_age_category');
  END IF;
  IF p_age_min IS NOT NULL AND p_age_min < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_age_min',
      'message', 'age_min must be >= 0.');
  END IF;
  IF p_age_max IS NOT NULL AND p_age_max < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_age_max',
      'message', 'age_max must be >= 0.');
  END IF;
  IF p_age_min IS NOT NULL AND p_age_max IS NOT NULL AND p_age_min > p_age_max THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_age_range',
      'message', 'age_min must be <= age_max.');
  END IF;
  IF p_rink_id IS NOT NULL THEN
    SELECT city, country INTO v_rink_city, v_rink_country
    FROM rinks WHERE id = p_rink_id AND is_active = true;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_rink',
        'message', 'The selected rink is not active or does not exist.');
    END IF;
  END IF;
  INSERT INTO team_workspaces (
    slug, name, short_name, country_code, age_category,
    home_rink_id, home_city, home_country, season_label, level, created_by,
    age_label, age_min, age_max,
    federation_id, organization_id, league_id, owner_user_id
  ) VALUES (
    p_slug, p_name, p_short_name, p_country, p_age_cat,
    p_rink_id, v_rink_city, v_rink_country, p_season, p_level, v_user_id,
    p_age_label, p_age_min, p_age_max,
    p_federation_id, p_organization_id, p_league_id, v_user_id
  )
  RETURNING * INTO v_team;
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team.id, v_user_id, 'head_coach');
  RETURN jsonb_build_object(
    'ok', true,
    'team_id', v_team.id,
    'team_slug', v_team.slug,
    'team_name', v_team.name,
    'currency', v_team.currency
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'slug_taken',
      'message', 'That slug is already in use. Try another.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unexpected',
      'message', SQLERRM);
END;
$function$;

COMMENT ON FUNCTION public.create_team_workspace(TEXT, TEXT, CHAR, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, UUID, UUID, UUID) IS
  'Creates a team workspace. Enforces the organization-tier team quota (team_workspace_quota_for_tier) before inserting.';

-- Drop the stale 15-arg overload left behind by the 2026-07-11 migration. It
-- still inserts the `parent_org` column, which was dropped on 2026-07-12, so
-- it was already broken — and having two overloads made PostgREST's RPC
-- resolution ambiguous ("function ... is not unique").
DROP FUNCTION IF EXISTS public.create_team_workspace(TEXT, TEXT, CHAR, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID, UUID, UUID);

COMMIT;
