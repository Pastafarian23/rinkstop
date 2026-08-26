-- ============================================================
-- WS17 PR4 Phase 2E: Email notifications
-- Extends team_notifications with rink-specific kinds and
-- consumer_notifications for user-scoped rink alerts.
-- ============================================================

-- 1. team_notifications: extend kind CHECK
ALTER TABLE public.team_notifications
  DROP CONSTRAINT IF EXISTS team_notifications_kind_check;
ALTER TABLE public.team_notifications
  ADD CONSTRAINT team_notifications_kind_check
  CHECK (kind IN (
    'news', 'result', 'schedule', 'announcement',
    'booking_request_created', 'booking_approved', 'booking_rejected',
    'contract_sent', 'contract_signed',
    'message_received', 'league_invite'
  ));

-- 2. consumer_notifications: extend kind CHECK with rink kinds
ALTER TABLE public.consumer_notifications
  DROP CONSTRAINT IF EXISTS consumer_notifications_kind_check;
ALTER TABLE public.consumer_notifications
  ADD CONSTRAINT consumer_notifications_kind_check
  CHECK (kind IN (
    'welcome', 'identity_verify_recommended', 'claim_paid_tier_unlocked',
    'claim_approved', 'claim_rejected', 'claim_expired',
    'profile_first_visitor', 'profile_verified',
    'dispute_opened', 'dispute_resolved', 'dispute_evidence_submitted',
    'booking_request_created', 'booking_approved', 'booking_rejected',
    'contract_sent', 'contract_signed',
    'message_received', 'league_invite'
  ));

-- 3. Add indexes for rink notification queries (if not exists)
-- These help dashboard queries for rink-specific notification feeds.
CREATE INDEX IF NOT EXISTS team_notifications_team_kind_idx
  ON public.team_notifications (team_id, kind, created_at DESC);

CREATE INDEX IF NOT EXISTS consumer_notifications_user_rink_kind_idx
  ON public.consumer_notifications (user_id, kind, created_at DESC)
  WHERE kind IN ('booking_request_created','booking_approved','booking_rejected',
                'contract_sent','contract_signed','message_received','league_invite');
