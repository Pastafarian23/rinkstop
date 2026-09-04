-- ============================================================
-- Equipment + rental system for Cebu ice datus (and any rink)
-- ============================================================
--
-- 2026-09-04 supersedes 2026-07-22_equipment.sql (which was never
-- applied to dev or prod). Re-creates the equipment items +
-- assignments schema with owner-scoped RLS, and adds:
--
--   equipment_rentals       — rental lifecycle record (start, end,
--                              deposit, monthly rate, billing state)
--   rental_payments         — money-in records (deposit, monthly fee)
--   rental_contracts        — links rentals to signed agreements
--   rink_rental_settings    — per-rink rental policy (deposit required?
--                              monthly billing day? late fee? etc.)
--
-- Lifecycle:
--   1. Owner/manager adds items to inventory (equipment_items)
--   2. Manager creates a rental for a kid + item (equipment_rentals)
--   3. Optional: link a signed contract (rental_contracts. contract_id)
--   4. Parent pays deposit (rental_payments, kind=deposit)
--   5. Monthly fee billed on cycle day (rental_payments, kind=monthly)
--   6. Manager marks returned -> equipment_rentals.returned_at,
--      equipment_assignments.returned_at both set
--
-- Additive to existing tables. profiles.user_id and rinks.id are
-- pre-existing; no FK changes to existing tables.

-- =============================================================================
-- Section 1: Types from the prior migration that we're now using
-- (Supersedes 2026-07-22_equipment.sql — these types were created there
-- but never applied to dev. Defined here as part of THIS migration.)
-- =============================================================================

CREATE TYPE public.equipment_type_enum AS ENUM (
  'skates','stick','helmet','gloves','pants','shin_pads','shoulder_pads',
  'elbow_pads','jersey','sock','puck','cones','goal','net','bag',
  'water_bottle','tape','mouthguard','skate_sharpener','other'
);

CREATE TYPE public.equipment_status_enum AS ENUM (
  'active','retired','lost','broken','lent'
);

CREATE TYPE public.equipment_condition_enum AS ENUM (
  'new','excellent','good','worn','damaged','needs_repair'
);

CREATE TYPE public.equipment_owner_type_enum AS ENUM (
  'user','team','rink','org'
);

CREATE TYPE public.rental_status_enum AS ENUM (
  'pending','active','overdue','returned','cancelled'
);

CREATE TYPE public.rental_payment_kind_enum AS ENUM (
  'deposit','monthly','late_fee','damage','replacement','refund'
);

CREATE TYPE public.rental_payment_status_enum AS ENUM (
  'pending','succeeded','failed','refunded'
);

-- =============================================================================
-- Section 2: equipment_items — physical inventory
-- (Same shape as 2026-07-22_equipment.sql — single polymorphic table.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_items (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type           public.equipment_owner_type_enum NOT NULL,
  owner_id             text NOT NULL,
  type                 public.equipment_type_enum NOT NULL DEFAULT 'other',
  label                text NOT NULL,
  brand                text,
  model                text,
  size                 text,
  status               public.equipment_status_enum NOT NULL DEFAULT 'active',
  condition            public.equipment_condition_enum NOT NULL DEFAULT 'good',
  acquired_at          date,
  acquired_price_cents integer,
  notes                text,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  updated_at           timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_items_owner
  ON public.equipment_items(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_equipment_items_type
  ON public.equipment_items(type);
CREATE INDEX IF NOT EXISTS idx_equipment_items_active
  ON public.equipment_items(owner_type, owner_id)
  WHERE status = 'active';

-- =============================================================================
-- Section 3: equipment_assignments — time-windowed checkout history
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_assignments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id         uuid NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  assignee_user_id     text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  assigned_by_user_id  text NOT NULL REFERENCES public.profiles(user_id),
  starts_at            timestamptz NOT NULL DEFAULT NOW(),
  due_at               timestamptz,
  returned_at          timestamptz,
  return_condition     public.equipment_condition_enum,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  updated_at           timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_assignments_assignee
  ON public.equipment_assignments(assignee_user_id)
  WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_item
  ON public.equipment_assignments(equipment_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_assigned_by
  ON public.equipment_assignments(assigned_by_user_id, starts_at DESC);

-- =============================================================================
-- Section 4: rink_rental_settings — per-rink rental policy
-- =============================================================================
--
-- One row per rink. Created when the rink first saves rental settings.
-- Controls: deposit required? default deposit amount? billing cycle day?
-- late fee? currency? settings are tenant-specific (Cebu ice datus may use
-- PHP, others USD).
--
-- deposit_policy:
--   'none'        — no deposit required
--   'required'    — deposit required upfront, refunded on return
--   'optional'    — deposit optional (rink suggests, parent decides)
--
-- billing_cycle:
--   'monthly'     — bill once per month on cycle_day (default 1)
--   'per_session' — single charge for duration, no recurring
--
CREATE TABLE IF NOT EXISTS public.rink_rental_settings (
  rink_id            uuid PRIMARY KEY REFERENCES public.rinks(id) ON DELETE CASCADE,

  -- Deposit policy
  deposit_policy     text NOT NULL DEFAULT 'required'
                       CHECK (deposit_policy IN ('none','required','optional')),
  default_deposit_cents integer,
  currency           char(3) NOT NULL DEFAULT 'PHP',

  -- Billing
  billing_cycle      text NOT NULL DEFAULT 'monthly'
                       CHECK (billing_cycle IN ('monthly','per_session')),
  billing_day        smallint NOT NULL DEFAULT 1
                       CHECK (billing_day BETWEEN 1 AND 28),
  late_fee_cents     integer,

  -- Agreement defaults
  agreement_template text,                       -- template name or path
  rental_terms       text,                       -- terms-of-rental text (markdown)

  -- Audit
  created_at         timestamptz NOT NULL DEFAULT NOW(),
  updated_at         timestamptz NOT NULL DEFAULT NOW(),

  -- Sanity
  CHECK (deposit_policy = 'none' OR default_deposit_cents IS NULL OR default_deposit_cents >= 0),
  CHECK (late_fee_cents IS NULL OR late_fee_cents >= 0)
);

-- =============================================================================
-- Section 5: equipment_rentals — rental lifecycle
-- =============================================================================
--
-- A rental wraps an equipment_assignment with rental-specific fields:
--   - monthly rate (cents)
--   - deposit amount paid (cents)
--   - billing cycle anchor
--   - status: pending → active → returned (or cancelled)
--   - optional contract_id (linked e-signed agreement)
--
-- One rental = one kid + one item rented for one window. If a kid
-- needs skates AND a stick, that's two rentals (intentional — each
-- rental can have its own monthly rate and lifecycle).
--
-- Polling note: the parent gets one Stripe subscription PER RENTAL,
-- not per kid. This is more flexible (kid's skate rental can have a
-- different cycle than stick rental) and aligns with how actual
-- billing works (separate invoices).
--
CREATE TABLE IF NOT EXISTS public.equipment_rentals (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rink_id               uuid NOT NULL REFERENCES public.rinks(id) ON DELETE CASCADE,

  -- The kid (parent account) and the item being rented
  parent_user_id        text NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  item_id               uuid NOT NULL REFERENCES public.equipment_items(id) ON DELETE RESTRICT,

  -- Lifecycle (mirrors equipment_assignments for the underlying
  -- physical checkout; rental-specific status is the source of truth)
  starts_at             date NOT NULL,
  ends_at               date,                       -- null = open-ended
  returned_at           timestamptz,
  status                public.rental_status_enum NOT NULL DEFAULT 'pending',

  -- Pricing
  deposit_required_cents integer NOT NULL DEFAULT 0,
  deposit_paid_cents     integer NOT NULL DEFAULT 0,
  monthly_rate_cents     integer NOT NULL DEFAULT 0,
  currency               char(3) NOT NULL DEFAULT 'PHP',

  -- Billing
  billing_day            smallint NOT NULL DEFAULT 1
                            CHECK (billing_day BETWEEN 1 AND 28),
  next_bill_at           date,                       -- denormalized for fast dashboard queries
  stripe_subscription_id text,                       -- nullable; populated when subscription created

  -- Notes
  notes                 text,

  -- Audit
  created_by_user_id    text NOT NULL REFERENCES public.profiles(user_id),
  approved_at            timestamptz,
  approved_by_user_id    text REFERENCES public.profiles(user_id),
  created_at             timestamptz NOT NULL DEFAULT NOW(),
  updated_at             timestamptz NOT NULL DEFAULT NOW(),

  -- Sanity
  CHECK (deposit_required_cents >= 0),
  CHECK (deposit_paid_cents >= 0),
  CHECK (deposit_paid_cents <= deposit_required_cents OR deposit_required_cents = 0),
  CHECK (monthly_rate_cents >= 0),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_equipment_rentals_rink
  ON public.equipment_rentals(rink_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_parent
  ON public.equipment_rentals(parent_user_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_item
  ON public.equipment_rentals(item_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_next_bill
  ON public.equipment_rentals(next_bill_at)
  WHERE status = 'active';

-- =============================================================================
-- Section 6: rental_payments — money-in records
-- =============================================================================
--
-- Append-only log of every payment attempt on a rental. Stripe webhook
-- is the source of truth for status; this table is for fast dashboard
-- queries and reconciliation.
--
CREATE TABLE IF NOT EXISTS public.rental_payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id           uuid NOT NULL REFERENCES public.equipment_rentals(id) ON DELETE CASCADE,
  rink_id             uuid NOT NULL REFERENCES public.rinks(id) ON DELETE CASCADE,

  kind                public.rental_payment_kind_enum NOT NULL,
  amount_cents        integer NOT NULL,
  currency            char(3) NOT NULL DEFAULT 'PHP',
  status              public.rental_payment_status_enum NOT NULL DEFAULT 'pending',

  -- Stripe (or future PayMongo) linkage
  provider            text NOT NULL DEFAULT 'stripe'
                        CHECK (provider IN ('stripe','paymongo','manual')),
  provider_payment_id text,                       -- Stripe payment_intent.id or PayMongo charge id

  -- Period the payment covers (for monthly fees)
  period_start        date,
  period_end          date,

  -- Audit
  paid_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT NOW(),

  CHECK (amount_cents >= 0 OR kind = 'refund')
);

CREATE INDEX IF NOT EXISTS idx_rental_payments_rental
  ON public.rental_payments(rental_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_payments_rink_status
  ON public.rental_payments(rink_id, status);
CREATE INDEX IF NOT EXISTS idx_rental_payments_provider_id
  ON public.rental_payments(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- =============================================================================
-- Section 7: rental_contracts — link rental to signed agreement
-- =============================================================================
--
-- Optional linkage to the existing contract e-signature system. Created
-- so we can show "rental agreement signed 2026-09-15" on the rental
-- detail page. The actual contract table is managed by WS17 PR4C
-- (team_documents / document_signatures) and we just store the ID here.
--
CREATE TABLE IF NOT EXISTS public.rental_contracts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id       uuid NOT NULL UNIQUE REFERENCES public.equipment_rentals(id) ON DELETE CASCADE,
  contract_id     text NOT NULL,                  -- FK to whichever contract table ships
  signed_at       timestamptz NOT NULL,
  signature_blob  text,                           -- optional cached signature data
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rental_contracts_rental
  ON public.rental_contracts(rental_id);

-- =============================================================================
-- Section 8: updated_at triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.equipment_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipment_items_updated_at ON public.equipment_items;
CREATE TRIGGER trg_equipment_items_updated_at
  BEFORE UPDATE ON public.equipment_items
  FOR EACH ROW EXECUTE FUNCTION public.equipment_set_updated_at();

DROP TRIGGER IF EXISTS trg_equipment_assignments_updated_at ON public.equipment_assignments;
CREATE TRIGGER trg_equipment_assignments_updated_at
  BEFORE UPDATE ON public.equipment_assignments
  FOR EACH ROW EXECUTE FUNCTION public.equipment_set_updated_at();

DROP TRIGGER IF EXISTS trg_equipment_rentals_updated_at ON public.equipment_rentals;
CREATE TRIGGER trg_equipment_rentals_updated_at
  BEFORE UPDATE ON public.equipment_rentals
  FOR EACH ROW EXECUTE FUNCTION public.equipment_set_updated_at();

DROP TRIGGER IF EXISTS trg_rink_rental_settings_updated_at ON public.rink_rental_settings;
CREATE TRIGGER trg_rink_rental_settings_updated_at
  BEFORE UPDATE ON public.rink_rental_settings
  FOR EACH ROW EXECUTE FUNCTION public.equipment_set_updated_at();

-- =============================================================================
-- Section 9: RLS
-- =============================================================================
--
-- v1 scope: rink owner (rinks.claimed_by_user_id = auth.uid()) can manage
-- everything for their rink; parent can read their own rentals and pay.
-- Staff role checks happen at the API service layer (src/lib/rental/owner.ts)
-- using requireRinkOwner() to keep SQL RLS simple and predictable.

ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rink_rental_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;

-- Helper SQL function: returns true if the current user is the claimed
-- owner of the given rink. Mirrors the API-level check in src/lib/owner-auth.ts
-- so RLS and API agree on what "rink staff" means.
CREATE OR REPLACE FUNCTION public.is_rink_owner(p_user_id text, p_rink_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.user_id = p_user_id
      AND c.claim_type = 'rink'
      AND c.entity_id = p_rink_id::text
      AND c.status = 'approved'
  );
$$;

-- equipment_items: rink owner reads/writes their items (owner_type='rink')
-- Parent reads items assigned to their kid via equipment_assignments RLS below.
CREATE POLICY "Rink owner read equipment_items"
  ON public.equipment_items FOR SELECT
  USING (
    owner_type = 'rink'
    AND public.is_rink_owner(auth.jwt() ->> 'sub', owner_id::uuid)
  );

CREATE POLICY "Rink owner write equipment_items"
  ON public.equipment_items FOR ALL
  USING (
    owner_type = 'rink'
    AND public.is_rink_owner(auth.jwt() ->> 'sub', owner_id::uuid)
  )
  WITH CHECK (
    owner_type = 'rink'
    AND public.is_rink_owner(auth.jwt() ->> 'sub', owner_id::uuid)
  );

-- equipment_assignments: assignee (the parent/kid) reads their own;
-- rink owner reads assignments for items they own; assigner reads/writes
-- their own assignments.
CREATE POLICY "Assignment participants read equipment_assignments"
  ON public.equipment_assignments FOR SELECT
  USING (
    assignee_user_id = auth.jwt() ->> 'sub'
    OR assigned_by_user_id = auth.jwt() ->> 'sub'
    OR EXISTS (
      SELECT 1 FROM public.equipment_items ei
      WHERE ei.id = equipment_assignments.equipment_id
        AND ei.owner_type = 'rink'
        AND public.is_rink_owner(auth.jwt() ->> 'sub', ei.owner_id::uuid)
    )
  );

CREATE POLICY "Assignment writer write equipment_assignments"
  ON public.equipment_assignments FOR INSERT
  WITH CHECK (
    assigned_by_user_id = auth.jwt() ->> 'sub'
    OR EXISTS (
      SELECT 1 FROM public.equipment_items ei
      WHERE ei.id = equipment_assignments.equipment_id
        AND ei.owner_type = 'rink'
        AND public.is_rink_owner(auth.jwt() ->> 'sub', ei.owner_id::uuid)
    )
  );

CREATE POLICY "Assignment writer update equipment_assignments"
  ON public.equipment_assignments FOR UPDATE
  USING (
    assigned_by_user_id = auth.jwt() ->> 'sub'
    OR EXISTS (
      SELECT 1 FROM public.equipment_items ei
      WHERE ei.id = equipment_assignments.equipment_id
        AND ei.owner_type = 'rink'
        AND public.is_rink_owner(auth.jwt() ->> 'sub', ei.owner_id::uuid)
    )
  );

-- rink_rental_settings: only the rink owner can read/write
CREATE POLICY "Rink owner read rink_rental_settings"
  ON public.rink_rental_settings FOR SELECT
  USING (public.is_rink_owner(auth.jwt() ->> 'sub', rink_id));

CREATE POLICY "Rink owner write rink_rental_settings"
  ON public.rink_rental_settings FOR ALL
  USING (public.is_rink_owner(auth.jwt() ->> 'sub', rink_id))
  WITH CHECK (public.is_rink_owner(auth.jwt() ->> 'sub', rink_id));

-- equipment_rentals: parent reads their own; rink owner reads/writes their rink's
CREATE POLICY "Parent read own equipment_rentals"
  ON public.equipment_rentals FOR SELECT
  USING (parent_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Rink owner read equipment_rentals"
  ON public.equipment_rentals FOR SELECT
  USING (public.is_rink_owner(auth.jwt() ->> 'sub', rink_id));

CREATE POLICY "Rink owner write equipment_rentals"
  ON public.equipment_rentals FOR ALL
  USING (public.is_rink_owner(auth.jwt() ->> 'sub', rink_id))
  WITH CHECK (public.is_rink_owner(auth.jwt() ->> 'sub', rink_id));

-- rental_payments: parent reads their own; rink owner reads/writes their rink's
CREATE POLICY "Parent read own rental_payments"
  ON public.rental_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment_rentals er
      WHERE er.id = rental_payments.rental_id
        AND er.parent_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Rink owner read rental_payments"
  ON public.rental_payments FOR SELECT
  USING (public.is_rink_owner(auth.jwt() ->> 'sub', rink_id));

CREATE POLICY "Rink owner write rental_payments"
  ON public.rental_payments FOR ALL
  USING (public.is_rink_owner(auth.jwt() ->> 'sub', rink_id))
  WITH CHECK (public.is_rink_owner(auth.jwt() ->> 'sub', rink_id));

-- rental_contracts: parent reads their own; rink owner reads/writes their rink's
CREATE POLICY "Parent read own rental_contracts"
  ON public.rental_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment_rentals er
      WHERE er.id = rental_contracts.rental_id
        AND er.parent_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Rink owner read rental_contracts"
  ON public.rental_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment_rentals er
      WHERE er.id = rental_contracts.rental_id
        AND public.is_rink_owner(auth.jwt() ->> 'sub', er.rink_id)
    )
  );

CREATE POLICY "Rink owner write rental_contracts"
  ON public.rental_contracts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment_rentals er
      WHERE er.id = rental_contracts.rental_id
        AND public.is_rink_owner(auth.jwt() ->> 'sub', er.rink_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.equipment_rentals er
      WHERE er.id = rental_contracts.rental_id
        AND public.is_rink_owner(auth.jwt() ->> 'sub', er.rink_id)
    )
  );
