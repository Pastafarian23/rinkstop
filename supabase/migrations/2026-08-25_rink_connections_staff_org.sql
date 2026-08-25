-- ============================================================
-- WS17 PR4: Rink Connections, Ice Marketplace & Staff Management
-- ============================================================

-- 1. Rink employees (employees + contracted coaches)
-- Note: rink_staff table already exists with different columns; using rink_employees
CREATE TABLE rink_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),  -- null until employee claims this record
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('coach', 'instructor', 'lifeguard', 'ice_operator', 'front_desk', 'manager', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  hire_date DATE,
  hourly_rate_cents INTEGER,
  bio TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rink_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rink employees: rink admin can manage"
  ON rink_employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM claims
      WHERE claims.entity_id = rink_employees.rink_id::text
        AND claims.claim_type = 'rink'
        AND claims.user_id = auth.uid()::text
        AND claims.status = 'approved'
    )
  );

CREATE POLICY "Rink employees: employee can view own"
  ON rink_employees FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Add staff_id to existing programming + events tables
-- rink_programming.staff_id already exists
ALTER TABLE rink_events ADD COLUMN staff_id UUID REFERENCES rink_employees(id) ON DELETE SET NULL;

-- 3. NOTE: federations table already exists (national hockey federations, 85 rows)
-- We will NOT create a new one. league_members links to the existing federations.

-- 4. League members (leagues affiliated with a federation)
-- Note: rink_connections table already exists; using rink_org_connections for rink-to-org relationships
CREATE TABLE league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federation_id UUID NOT NULL REFERENCES federations(id) ON DELETE CASCADE,
  league_name TEXT NOT NULL,
  league_slug TEXT,
  country TEXT,
  website TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League members: public read"
  ON league_members FOR SELECT
  USING (true);

CREATE POLICY "League members: authenticated can create"
  ON league_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Rink org connections (rink ↔ client org relationships)
CREATE TABLE rink_org_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  org_name TEXT NOT NULL,
  org_type TEXT NOT NULL CHECK (org_type IN ('team', 'league', 'federation', 'coach', 'other')),
  org_contact_name TEXT,
  org_contact_email TEXT,
  role TEXT NOT NULL CHECK (role IN ('rink_admin', 'team_admin', 'league_admin', 'federation_admin', 'coach')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('rink', 'client')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rink_id, org_name)
);

ALTER TABLE rink_org_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rink org connections: rink admin can manage"
  ON rink_org_connections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM claims
      WHERE claims.entity_id = rink_org_connections.rink_id::text
        AND claims.claim_type = 'rink'
        AND claims.user_id = auth.uid()::text
        AND claims.status = 'approved'
    )
  );

CREATE POLICY "Rink org connections: connection creator can view"
  ON rink_org_connections FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Rink org connections: authenticated can create"
  ON rink_org_connections FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- 6. Rink threads
CREATE TABLE rink_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES rink_org_connections(id) ON DELETE CASCADE,
  thread_type TEXT NOT NULL CHECK (thread_type IN ('general', 'booking_request', 'contract_request', 'agreement', 'payment', 'dispute')),
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rink_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rink threads: participants can view"
  ON rink_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rink_org_connections rc
      WHERE rc.id = rink_threads.connection_id
        AND (rc.created_by = auth.uid()
          OR rc.rink_id IN (SELECT cr.entity_id::uuid FROM claims cr WHERE cr.claim_type = 'rink' AND cr.user_id = auth.uid()::text AND cr.status = 'approved'))
    )
  );

CREATE POLICY "Rink threads: participants can create"
  ON rink_threads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rink_org_connections rc
      WHERE rc.id = rink_threads.connection_id
        AND (rc.created_by = auth.uid()
          OR rc.rink_id IN (SELECT cr.entity_id::uuid FROM claims cr WHERE cr.claim_type = 'rink' AND cr.user_id = auth.uid()::text AND cr.status = 'approved'))
    )
  );

-- 7. Rink messages
CREATE TABLE rink_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES rink_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rink_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rink messages: thread participants can view"
  ON rink_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rink_threads rt
      JOIN rink_org_connections rc ON rc.id = rt.connection_id
      WHERE rt.id = rink_messages.thread_id
        AND (rc.created_by = auth.uid()
          OR rc.rink_id IN (SELECT cr.entity_id::uuid FROM claims cr WHERE cr.claim_type = 'rink' AND cr.user_id = auth.uid()::text AND cr.status = 'approved'))
    )
  );

CREATE POLICY "Rink messages: thread participants can create"
  ON rink_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Rink messages: own messages can update"
  ON rink_messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- 8. Ice listings
CREATE TABLE ice_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  requested_price_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'USD',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  age_group TEXT,
  skill_level TEXT,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('practice', 'game', 'tournament', 'camp', 'clinic', 'lesson', 'other')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'connections_only')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending', 'booked', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ice_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ice listings: public for available"
  ON ice_listings FOR SELECT
  USING (
    status = 'available'
    AND visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM rink_org_connections rc
      WHERE rc.rink_id = ice_listings.rink_id AND rc.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM claims
      WHERE claims.entity_id = ice_listings.rink_id::text
        AND claims.claim_type = 'rink'
        AND claims.user_id = auth.uid()::text
        AND claims.status = 'approved'
    )
  );

CREATE POLICY "Ice listings: rink admin can manage"
  ON ice_listings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM claims
      WHERE claims.entity_id = ice_listings.rink_id::text
        AND claims.claim_type = 'rink'
        AND claims.user_id = auth.uid()::text
        AND claims.status = 'approved'
    )
  );

-- 9. Booking requests
CREATE TABLE booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES rink_threads(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES ice_listings(id) ON DELETE SET NULL,
  connection_id UUID NOT NULL REFERENCES rink_org_connections(id) ON DELETE CASCADE,
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  requesting_user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'negotiating', 'approved', 'rejected', 'cancelled')),
  requested_price_cents INTEGER,
  counter_price_cents INTEGER,
  requested_start TIMESTAMPTZ NOT NULL,
  requested_end TIMESTAMPTZ NOT NULL,
  notes TEXT,
  publish_as_event BOOLEAN DEFAULT false,
  created_event_id UUID,
  activity_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking requests: rink admin can view/manage"
  ON booking_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM claims
      WHERE claims.entity_id = booking_requests.rink_id::text
        AND claims.claim_type = 'rink'
        AND claims.user_id = auth.uid()::text
        AND claims.status = 'approved'
    )
  );

CREATE POLICY "Booking requests: requester can view own"
  ON booking_requests FOR SELECT
  USING (auth.uid() = requesting_user_id);

CREATE POLICY "Booking requests: requester can create"
  ON booking_requests FOR INSERT
  WITH CHECK (auth.uid() = requesting_user_id);

CREATE POLICY "Booking requests: requester can update pending"
  ON booking_requests FOR UPDATE
  USING (auth.uid() = requesting_user_id AND status = 'pending');

-- 10. Rink contracts
CREATE TABLE rink_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES rink_org_connections(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES rink_threads(id) ON DELETE SET NULL,
  booking_request_id UUID REFERENCES booking_requests(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('ice_time', 'rental_agreement', 'sponsorship', 'other')),
  storage_path TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signed_by_user_id UUID REFERENCES auth.users(id),
  signature_payload JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rink_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rink contracts: rink admin can manage"
  ON rink_contracts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rink_org_connections rc
      WHERE rc.id = rink_contracts.connection_id
        AND rc.rink_id IN (SELECT cr.entity_id::uuid FROM claims cr WHERE cr.claim_type = 'rink' AND cr.user_id = auth.uid()::text AND cr.status = 'approved')
    )
  );

CREATE POLICY "Rink contracts: requester can view"
  ON rink_contracts FOR SELECT
  USING (auth.uid() = created_by);

-- 11. Rink contract signatures (audit log for signed contracts)
CREATE TABLE rink_contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES rink_contracts(id) ON DELETE CASCADE,
  signatory_name TEXT NOT NULL,
  signatory_role TEXT NOT NULL,
  signatory_user_id UUID REFERENCES auth.users(id),
  signature_payload JSONB NOT NULL,
  document_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  consent_text TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rink_contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rink contract signatures: contract participants can view"
  ON rink_contract_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rink_contracts rc2
      JOIN rink_org_connections rc ON rc.id = rc2.connection_id
      WHERE rc2.id = rink_contract_signatures.contract_id
        AND (rc.created_by = auth.uid()
          OR rc.rink_id IN (SELECT cr.entity_id::uuid FROM claims cr WHERE cr.claim_type = 'rink' AND cr.user_id = auth.uid()::text AND cr.status = 'approved'))
    )
  );

CREATE POLICY "Rink contract signatures: authenticated can insert"
  ON rink_contract_signatures FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
