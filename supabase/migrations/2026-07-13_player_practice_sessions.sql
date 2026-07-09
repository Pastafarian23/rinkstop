-- 2026-07-13 — Player Practice Sessions (Phase 3 dashboard wedge)
-- 
-- Smallest piece of the "interactive dashboard, better hockey player" loop:
-- when a player starts a practice plan and marks it done, record it so
-- we can show weekly/monthly cadence on the dashboard.
--
-- Ties together:
--   - practice_plans (existing — content layer)
--   - profile_account_types (existing — role 'player')
--   - profiles.user_id (Clerk user)
--
-- Why a NEW table instead of reusing player_achievements:
--   - player_achievements is one-shot badges ("first hat trick")
--   - practice_sessions is recurring activity (start/complete/log-rating)
--   - Self-rating is on the session, not the achievement
--
-- No DELETE policy by default; players can re-do a plan.

BEGIN;

CREATE TABLE public.player_practice_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  practice_plan_id uuid NOT NULL REFERENCES public.practice_plans(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'started'
                    CHECK (status IN ('started', 'completed', 'skipped')),
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  self_rating     smallint CHECK (self_rating BETWEEN 1 AND 5),
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_pps_user_completed ON public.player_practice_sessions(user_id, completed_at DESC);
CREATE INDEX idx_pps_plan_user ON public.player_practice_sessions(practice_plan_id, user_id);

-- One active "started" session per (user, plan). Once completed, a new row can be created.
CREATE UNIQUE INDEX idx_pps_user_plan_active
  ON public.player_practice_sessions(user_id, practice_plan_id)
  WHERE status = 'started';

-- RLS: users see + mutate only their own sessions
ALTER TABLE public.player_practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own practice sessions"
  ON public.player_practice_sessions FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub')::text);

CREATE POLICY "Users can insert own practice sessions"
  ON public.player_practice_sessions FOR INSERT
  WITH CHECK (user_id = (auth.jwt() ->> 'sub')::text);

CREATE POLICY "Users can update own practice sessions"
  ON public.player_practice_sessions FOR UPDATE
  USING (user_id = (auth.jwt() ->> 'sub')::text);

-- updated_at trigger — reuse the project-wide set_updated_at().
CREATE TRIGGER trg_pps_updated_at
  BEFORE UPDATE ON public.player_practice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;
