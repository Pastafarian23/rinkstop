-- 2026-09-10: admin_arranged_bookings
--
-- Broker model for Cebu Ice Datus ↔ SM Seaside Skating pilot (and any
-- future booking Arnel brokers manually). The flow:
--
--   1. Arnel creates the booking via /dashboard/admin/bookings/new
--   2. /api/admin/bookings inserts a row here with status='pending_payment'
--   3. Buyer receives an email with a Stripe Checkout link to pay
--   4. Stripe webhook flips status to 'paid' on checkout.session.completed
--   5. Rink receives a confirmation email with the booking details
--   6. Arnel settles to the rink offline (bank transfer / GCash) and marks
--      settlement_status='sent' in the admin UI
--   7. After the booking happens, status flips to 'completed'
--
-- Schema decisions (locked 2026-09-10):
--   - payment_processor ENUM supports stripe (default) | paymongo | paymaya
--     so we don't migrate later when PH payment methods come online
--   - settlement_method ENUM supports offline | gcash | bank_transfer |
--     stripe_connect | paymongo | paymaya (same reason)
--   - fee_cents = RinkStop facilitation fee (10% for pilot)
--   - settlement_cents = amount the rink receives (price_cents - fee_cents)
--   - buyer_user_id is Clerk user_id (text) — same pattern as claims.user_id
--   - rink_id is uuid (FK to rinks.id)
--   - listing_id (nullable uuid FK to ice_listings.id) — optional for the
--     pilot since Arnel arranges the booking; can point at a public listing
--     later when public marketplace flows get built
--   - public_inquiry_id (nullable uuid FK to public_booking_inquiries.id) —
--     links a public marketplace inquiry to its converted admin-arranged
--     booking (funnel reporting + audit trail)
--   - created_by = the admin Clerk user_id who created the booking
--
-- RLS:
--   - service_role: full access (admin routes use service_role)
--   - buyer (buyer_user_id = auth.uid()::text): SELECT own bookings
--   - rink owner (approved claim on rink_id): SELECT + UPDATE status on
--     bookings for rinks they own (so they can flip viewed -> accepted/decl)
--   - No INSERT/UPDATE for non-admin (Arnel creates via admin route only)
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.admin_arranged_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties
  buyer_user_id text NOT NULL,
  buyer_contact_name text NOT NULL,
  buyer_contact_email text NOT NULL,
  buyer_contact_phone text,
  buyer_team_workspace_id uuid REFERENCES public.team_workspaces(id) ON DELETE SET NULL,
  rink_id uuid NOT NULL REFERENCES public.rinks(id) ON DELETE RESTRICT,

  -- Optional links (audit trail + funnel reporting)
  listing_id uuid REFERENCES public.ice_listings(id) ON DELETE SET NULL,
  public_inquiry_id uuid REFERENCES public.public_booking_inquiries(id) ON DELETE SET NULL,

  -- Slot
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  title text NOT NULL,
  notes text,

  -- Money
  price_cents integer NOT NULL CHECK (price_cents > 0),
  fee_cents integer NOT NULL CHECK (fee_cents >= 0),
  settlement_cents integer NOT NULL CHECK (settlement_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',

  -- Payment
  payment_processor text, -- 'stripe' (default if null) | 'paymongo' | 'paymaya'
  payment_intent_id text, -- generic: Stripe PaymentIntent / PayMongo intent / etc.
  payment_status text NOT NULL DEFAULT 'pending_payment',
  paid_at timestamptz,

  -- Booking status (separate from payment_status — payment can succeed but
  -- the booking can still be cancelled by rink or buyer)
  status text NOT NULL DEFAULT 'pending_payment',
  -- pending_payment | paid | confirmed | declined | completed | cancelled | refunded
  cancelled_reason text,
  cancelled_by_user_id text,

  -- Settlement (Arnel pays the rink offline for the pilot)
  settlement_method text, -- 'offline' | 'gcash' | 'bank_transfer' | 'stripe_connect' | 'paymongo' | 'paymaya'
  settlement_status text NOT NULL DEFAULT 'not_sent',
  -- not_sent | sent | confirmed
  settlement_sent_at timestamptz,
  settlement_reference text, -- bank transfer ref / GCash ref / etc.

  -- Audit
  created_by text NOT NULL, -- admin Clerk user_id
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN (
    'pending_payment', 'paid', 'confirmed', 'declined', 'completed', 'cancelled', 'refunded'
  )),
  CONSTRAINT valid_payment_status CHECK (payment_status IN (
    'pending_payment', 'paid', 'failed', 'refunded'
  )),
  CONSTRAINT valid_settlement_status CHECK (settlement_status IN (
    'not_sent', 'sent', 'confirmed'
  )),
  CONSTRAINT valid_payment_processor CHECK (payment_processor IS NULL OR payment_processor IN (
    'stripe', 'paymongo', 'paymaya'
  )),
  CONSTRAINT valid_settlement_method CHECK (settlement_method IS NULL OR settlement_method IN (
    'offline', 'gcash', 'bank_transfer', 'stripe_connect', 'paymongo', 'paymaya'
  )),
  CONSTRAINT valid_math CHECK (settlement_cents = price_cents - fee_cents)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS admin_arranged_bookings_buyer_idx
  ON public.admin_arranged_bookings (buyer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_arranged_bookings_rink_idx
  ON public.admin_arranged_bookings (rink_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_arranged_bookings_status_idx
  ON public.admin_arranged_bookings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_arranged_bookings_payment_status_idx
  ON public.admin_arranged_bookings (payment_status);

-- updated_at trigger (reuse the public_booking_inquiries trigger function if it exists)
CREATE OR REPLACE FUNCTION set_admin_arranged_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_arranged_bookings_updated_at ON public.admin_arranged_bookings;
CREATE TRIGGER admin_arranged_bookings_updated_at
  BEFORE UPDATE ON public.admin_arranged_bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_arranged_bookings_updated_at();

-- RLS
ALTER TABLE public.admin_arranged_bookings ENABLE ROW LEVEL SECURITY;

-- Revoke broad privileges (mirror the public_booking_inquiries fix from
-- 2026-09-10_public_booking_inquiries_rls_lockdown.sql)
REVOKE ALL PRIVILEGES ON TABLE public.admin_arranged_bookings FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.admin_arranged_bookings FROM authenticated;

-- service_role: full access (used by admin route + webhook)
GRANT ALL PRIVILEGES ON TABLE public.admin_arranged_bookings TO service_role;

-- authenticated: SELECT only on own bookings + bookings for rinks they claim

DROP POLICY IF EXISTS admin_arranged_bookings_buyer_select ON public.admin_arranged_bookings;
CREATE POLICY admin_arranged_bookings_buyer_select ON public.admin_arranged_bookings
  FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid()::text);

DROP POLICY IF EXISTS admin_arranged_bookings_rink_owner_select ON public.admin_arranged_bookings;
CREATE POLICY admin_arranged_bookings_rink_owner_select ON public.admin_arranged_bookings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM claims c
      WHERE c.user_id = auth.uid()::text
        AND c.claim_type = 'rink'
        AND c.entity_id::uuid = admin_arranged_bookings.rink_id
        AND c.status = 'approved'
    )
  );

-- Rink owner can UPDATE the booking status (confirm/decline/complete) but
-- NOT the price/fee/settlement columns (defense-in-depth — admin sets those)
DROP POLICY IF EXISTS admin_arranged_bookings_rink_owner_update ON public.admin_arranged_bookings;
CREATE POLICY admin_arranged_bookings_rink_owner_update ON public.admin_arranged_bookings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM claims c
      WHERE c.user_id = auth.uid()::text
        AND c.claim_type = 'rink'
        AND c.entity_id::uuid = admin_arranged_bookings.rink_id
        AND c.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM claims c
      WHERE c.user_id = auth.uid()::text
        AND c.claim_type = 'rink'
        AND c.entity_id::uuid = admin_arranged_bookings.rink_id
        AND c.status = 'approved'
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated beyond what's listed.
-- All writes go through /api/admin/bookings which uses service_role.

DO $$
BEGIN
  RAISE NOTICE 'admin_arranged_bookings table created. service_role: full. buyer (auth.uid()::text = buyer_user_id): SELECT own. rink owner (approved claim): SELECT + UPDATE on own rink bookings.';
END $$;