-- Rink contact discovery — admin-only table for scraped email candidates.
-- Holds candidate contact info for rinks, scraped from their public websites.
-- NEVER read by non-admin code paths. Public RLS is revoked; admin auth
-- is enforced server-side in /api/admin/rink-contact-discovery/*.
--
-- Design rules:
--   - One row per (rink, email) — a rink may have multiple candidate addresses
--   - `discovered_at` is when the scrape ran
--   - `source_url` is the page we found the email on (proof + audit trail)
--   - `confidence` is 0.0-1.0 — high for contact/about/staff pages,
--     medium for footer/header, low for footer-but-not-on-contact-page
--   - `status` flows: pending (just found) → approved (you trust it) →
--     rejected (test data / wrong rink / role mismatch) → used (sent an email)
--   - We never auto-write back to rinks.email. That's a manual review step.

CREATE TABLE IF NOT EXISTS rink_contact_discovery (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  source_url TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.50
    CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'used')),
  rejected_reason TEXT,
  notes TEXT,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  UNIQUE(rink_id, email)
);

CREATE INDEX IF NOT EXISTS idx_rcd_rink ON rink_contact_discovery(rink_id);
CREATE INDEX IF NOT EXISTS idx_rcd_status ON rink_contact_discovery(status);
CREATE INDEX IF NOT EXISTS idx_rcd_confidence ON rink_contact_discovery(confidence DESC);

-- RLS: admin-only via service role key. anon/authenticated get nothing.
ALTER TABLE rink_contact_discovery ENABLE ROW LEVEL SECURITY;

-- No policies = no public access. Admin endpoints use the service_role key,
-- which bypasses RLS. Any future anon exposure must explicitly grant.

COMMENT ON TABLE rink_contact_discovery IS
  'Internal: scraped rink contact candidates. Never exposed publicly. Used by /admin/rink-contact-discovery. Admin endpoints use service_role.';
COMMENT ON COLUMN rink_contact_discovery.confidence IS
  '0.0-1.0. 0.90+ = contact/about page; 0.70-0.89 = staff/team page; 0.50-0.69 = site footer; <0.50 = parked.';
COMMENT ON COLUMN rink_contact_discovery.source_url IS
  'Exact page where this email was found. Used for audit and re-verification.';
