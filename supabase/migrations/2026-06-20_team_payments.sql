-- ============================================================
-- Team Payments + Documents — Phase 1 (manual recording, GCash-ready)
-- ============================================================
-- Goal: Coaches can create payment events for their team, mark which
-- players have paid, and track outstanding documents (waivers, etc.).
--
-- Phase 1 ships manual recording only — no money flows through RinkStop.
-- Phase 2 (PayMongo integration) will populate the paymongo_* columns.
--
-- e-Signature in Phase 1 is typed-name + IP + timestamp (legally
-- binding in PH under RA 8792, Electronic Commerce Act).
--
-- Convenience fee: 5% baked into schema now (per Arnel 2026-06-20
-- instruction). Off by default (0). When PayMongo wires up, the
-- checkout will display "₱800 + RinkStop fee ₱40 (5%) = ₱840".
--
-- Storage: Supabase Storage bucket 'team-documents' (created in
-- a separate migration step via dashboard or storage API).

-- ─── payments ─────────────────────────────────────────────────
-- One row per "thing being collected" (e.g., "Oct 27 Sunday Session ₱800").
CREATE TABLE IF NOT EXISTS payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id               UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by            TEXT NOT NULL,        -- Clerk user_id of coach/admin
  title                 TEXT NOT NULL,
  description           TEXT,
  amount_per_player     NUMERIC(10,2) NOT NULL CHECK (amount_per_player >= 0),
  currency              TEXT NOT NULL DEFAULT 'PHP',
  convenience_fee_pct   NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (convenience_fee_pct >= 0 AND convenience_fee_pct <= 100),
  due_date              DATE,
  status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','closed','cancelled')),
  paymongo_payment_intent_id TEXT,            -- set when Phase 2 ships
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_team_id ON payments (team_id);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON payments (status);

-- ─── payment_records ──────────────────────────────────────────
-- One row per player per payment. Tracks individual payment state.
CREATE TABLE IF NOT EXISTS payment_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id            UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  player_id             TEXT NOT NULL,        -- Clerk user_id (matches team_members.user_id)
  amount_due            NUMERIC(10,2) NOT NULL CHECK (amount_due >= 0),
  amount_paid           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  status                TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','pending_verification','paid','partial','waived','refunded')),
  paid_via              TEXT,                 -- 'gcash' | 'paymaya' | 'cash' | 'bank' | 'card' | 'other' | free text
  paid_at               TIMESTAMPTZ,
  reference_number      TEXT,                 -- GCash reference / bank txn id
  receipt_url           TEXT,                 -- storage URL to screenshot/PDF
  paymongo_payment_id   TEXT,                 -- set when Phase 2 ships
  marked_by             TEXT,                 -- who flipped the status (player self-mark, coach, etc.)
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payment_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_records_payment_id ON payment_records (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_player_id  ON payment_records (player_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status     ON payment_records (status);

-- ─── documents ────────────────────────────────────────────────
-- Per team or per payment. PDF/waivers/etc.
CREATE TABLE IF NOT EXISTS team_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id               UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  payment_id            UUID REFERENCES payments(id) ON DELETE CASCADE,  -- null = team-wide doc
  title                 TEXT NOT NULL,
  description           TEXT,
  file_url              TEXT NOT NULL,        -- Supabase Storage path
  file_name             TEXT,
  file_size_bytes       BIGINT,
  mime_type             TEXT,
  required              BOOLEAN NOT NULL DEFAULT false,
  due_date              DATE,
  created_by            TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_documents_team_id    ON team_documents (team_id);
CREATE INDEX IF NOT EXISTS idx_team_documents_payment_id ON team_documents (payment_id);

-- ─── document_signatures ──────────────────────────────────────
-- Typed-name e-signature. Legally binding in PH under RA 8792.
CREATE TABLE IF NOT EXISTS document_signatures (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id           UUID NOT NULL REFERENCES team_documents(id) ON DELETE CASCADE,
  player_id             TEXT,                -- null if signed by parent/guardian
  signed_by_name        TEXT NOT NULL,        -- typed name
  signed_by_role        TEXT NOT NULL DEFAULT 'player' CHECK (signed_by_role IN ('player','parent','guardian','coach','staff')),
  signed_by_user_id     TEXT,                -- Clerk user_id of signer (if self-signing)
  ip_address            TEXT,
  user_agent            TEXT,
  acknowledged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_signatures_document_id ON document_signatures (document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_player_id  ON document_signatures (player_id);

-- ─── updated_at triggers ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_payment_records_updated_at ON payment_records;
CREATE TRIGGER trg_payment_records_updated_at BEFORE UPDATE ON payment_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_team_documents_updated_at ON team_documents;
CREATE TRIGGER trg_team_documents_updated_at BEFORE UPDATE ON team_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────
-- Pattern: coach/admin via is_team_admin() can manage;
--          players can read their own records + team-wide docs.

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;

-- payments: coach/admin can do everything; team members can read
DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = payments.team_id
        AND m.user_id = current_user_id()
        AND m.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS payments_admin_all ON payments;
CREATE POLICY payments_admin_all ON payments
  FOR ALL USING (is_team_admin(payments.team_id, current_user_id()))
  WITH CHECK (is_team_admin(payments.team_id, current_user_id()));

-- payment_records: coach/admin can manage; player can read/update own
DROP POLICY IF EXISTS payment_records_select ON payment_records;
CREATE POLICY payment_records_select ON payment_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN team_members m ON m.team_id = p.team_id
      WHERE p.id = payment_records.payment_id
        AND m.user_id = current_user_id()
        AND m.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS payment_records_admin ON payment_records;
CREATE POLICY payment_records_admin ON payment_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_records.payment_id
        AND is_team_admin(p.team_id, current_user_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_records.payment_id
        AND is_team_admin(p.team_id, current_user_id())
    )
  );

-- Players can update their own record (mark pending_verification, add ref number, upload receipt)
DROP POLICY IF EXISTS payment_records_player_update ON payment_records;
CREATE POLICY payment_records_player_update ON payment_records
  FOR UPDATE USING (player_id = current_user_id())
  WITH CHECK (player_id = current_user_id());

-- team_documents: team members can read; coach/admin can write
DROP POLICY IF EXISTS team_documents_select ON team_documents;
CREATE POLICY team_documents_select ON team_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_documents.team_id
        AND m.user_id = current_user_id()
        AND m.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS team_documents_admin ON team_documents;
CREATE POLICY team_documents_admin ON team_documents
  FOR ALL USING (is_team_admin(team_documents.team_id, current_user_id()))
  WITH CHECK (is_team_admin(team_documents.team_id, current_user_id()));

-- document_signatures: anyone in the team can sign; coach/admin can read all
DROP POLICY IF EXISTS document_signatures_select ON document_signatures;
CREATE POLICY document_signatures_select ON document_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_documents d
      JOIN team_members m ON m.team_id = d.team_id
      WHERE d.id = document_signatures.document_id
        AND m.user_id = current_user_id()
        AND m.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS document_signatures_insert ON document_signatures;
CREATE POLICY document_signatures_insert ON document_signatures
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_documents d
      JOIN team_members m ON m.team_id = d.team_id
      WHERE d.id = document_signatures.document_id
        AND m.user_id = current_user_id()
        AND m.left_at IS NULL
    )
  );