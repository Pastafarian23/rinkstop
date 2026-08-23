-- WS25 (2026-08-23): Lift claim tier gate. Free verification for all profile types.
-- Idempotent: IF NOT EXISTS guards against re-run.
--
-- Note: An earlier version of this migration added a redundant
-- profiles.verification_method column. That column was dropped in
-- 2026-08-23_verification_method_drop_redundant.sql; we use the existing
-- profiles.identity_verification_method column (unconstrained text) for
-- the path dimension instead. This file no longer adds that column.

-- 1. Track claim-level verification state. Independent of profiles.identity_verified_at
-- because claims can be approved or rejected independently of the owner's verification.
-- 'unverified' = claim approved but owner hasn't verified yet. listing shows "Pending Verification".
-- 'pending_verification' = same as unverified; transitional state during Didit session creation.
-- 'verified' = owner has verified. listing shows "Verified" badge.
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS verification_status TEXT
    CHECK (verification_status IS NULL OR verification_status IN ('unverified', 'pending_verification', 'verified'));

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 3. Default existing claims to 'unverified' so the new UI surface sees them.
-- Idempotent: skip rows that already have a verification_status set.
UPDATE public.claims
  SET verification_status = 'unverified'
  WHERE verification_status IS NULL;

-- 4. Index for the verification-status filter (admin queries, pending claim counts).
CREATE INDEX IF NOT EXISTS idx_claims_verification_status
  ON public.claims (verification_status)
  WHERE verification_status IS NULL OR verification_status != 'verified';

COMMENT ON COLUMN public.claims.verification_status IS 'Claim-level verification state. unverified = approved but owner not verified, pending_verification = Didit session in flight, verified = owner has verified and listing shows badge.';
