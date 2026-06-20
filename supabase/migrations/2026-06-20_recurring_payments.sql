-- Recurring payment rules
-- Coaches set "every Sunday ₱800" once and click "Generate next" to create
-- the next instance. Lightweight cron-style approach (no real cron for Phase 1).

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS recurrence TEXT,  -- NULL | 'weekly' | 'biweekly' | 'monthly'
  ADD COLUMN IF NOT EXISTS parent_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sequence_number INT;  -- 1, 2, 3, ... for "Sunday session #12"

CREATE INDEX IF NOT EXISTS idx_payments_parent ON payments(parent_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_team_due ON payments(team_id, due_date);

COMMENT ON COLUMN payments.recurrence IS 'NULL (one-off) | weekly | biweekly | monthly';
COMMENT ON COLUMN payments.parent_payment_id IS 'For recurring instances: the original payment this was generated from';
COMMENT ON COLUMN payments.sequence_number IS 'For recurring instances: 1, 2, 3, ...';