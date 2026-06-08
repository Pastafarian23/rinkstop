-- 2026-06-08 — Connections & DMs
-- Adds: connections (user ↔ user, mutual), managed_profiles (parent → kid's player profile),
-- threads (one DM conversation, optionally scoped to a context profile), messages.

-- ============================================================================
-- connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low      TEXT NOT NULL,
  user_high     TEXT NOT NULL,
  initiated_by  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at   TIMESTAMPTZ,
  CONSTRAINT connections_no_self CHECK (user_low <> user_high),
  CONSTRAINT connections_unique_pair UNIQUE (user_low, user_high)
);

CREATE INDEX IF NOT EXISTS connections_user_low_idx  ON connections (user_low);
CREATE INDEX IF NOT EXISTS connections_user_high_idx ON connections (user_high);
CREATE INDEX IF NOT EXISTS connections_status_idx    ON connections (status);
CREATE INDEX IF NOT EXISTS connections_initiated_idx ON connections (initiated_by);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connections_select_own" ON connections;
CREATE POLICY "connections_select_own" ON connections
  FOR SELECT USING (
    (auth.uid()::text = user_low) OR (auth.uid()::text = user_high)
  );

DROP POLICY IF EXISTS "connections_insert_self" ON connections;
CREATE POLICY "connections_insert_self" ON connections
  FOR INSERT WITH CHECK (
    (auth.uid()::text = initiated_by)
    AND ((auth.uid()::text = user_low) OR (auth.uid()::text = user_high))
  );

DROP POLICY IF EXISTS "connections_update_participant" ON connections;
CREATE POLICY "connections_update_participant" ON connections
  FOR UPDATE USING (
    (auth.uid()::text = user_low) OR (auth.uid()::text = user_high)
  );

DROP POLICY IF EXISTS "connections_delete_participant" ON connections;
CREATE POLICY "connections_delete_participant" ON connections
  FOR DELETE USING (
    (auth.uid()::text = user_low) OR (auth.uid()::text = user_high)
  );

-- ============================================================================
-- managed_profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS managed_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id  TEXT NOT NULL,
  profile_type     TEXT NOT NULL CHECK (profile_type IN ('player', 'team', 'league')),
  profile_id       UUID NOT NULL,
  relationship     TEXT NOT NULL DEFAULT 'parent'
                   CHECK (relationship IN ('parent', 'guardian', 'spouse', 'self')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT managed_profiles_unique UNIQUE (manager_user_id, profile_type, profile_id)
);

CREATE INDEX IF NOT EXISTS managed_profiles_manager_idx ON managed_profiles (manager_user_id);
CREATE INDEX IF NOT EXISTS managed_profiles_profile_idx ON managed_profiles (profile_type, profile_id);

ALTER TABLE managed_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "managed_profiles_select_own" ON managed_profiles;
CREATE POLICY "managed_profiles_select_own" ON managed_profiles
  FOR SELECT USING (manager_user_id = (auth.uid()::text));

DROP POLICY IF EXISTS "managed_profiles_public_profile_read" ON managed_profiles;
CREATE POLICY "managed_profiles_public_profile_read" ON managed_profiles
  FOR SELECT USING (true);  -- Anyone can see who manages a profile (so the kid's page can render "Managed by X")

DROP POLICY IF EXISTS "managed_profiles_insert_self" ON managed_profiles;
CREATE POLICY "managed_profiles_insert_self" ON managed_profiles
  FOR INSERT WITH CHECK (manager_user_id = (auth.uid()::text));

DROP POLICY IF EXISTS "managed_profiles_delete_own" ON managed_profiles;
CREATE POLICY "managed_profiles_delete_own" ON managed_profiles
  FOR DELETE USING (manager_user_id = (auth.uid()::text));

-- ============================================================================
-- threads
-- ============================================================================
CREATE TABLE IF NOT EXISTS threads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id        UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  context_profile_type TEXT CHECK (context_profile_type IN ('player', 'team', 'league', 'rink', NULL)),
  context_profile_id   UUID,
  last_message_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT threads_unique UNIQUE (connection_id, context_profile_type, context_profile_id)
);

CREATE INDEX IF NOT EXISTS threads_connection_idx    ON threads (connection_id);
CREATE INDEX IF NOT EXISTS threads_last_message_idx ON threads (last_message_at DESC);

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

-- RLS for threads/messages: enforce participant check via the connection row.
-- We'll add explicit policies after we can test the participant predicate pattern.
-- For now, allow service_role only and rely on API-layer auth.

DROP POLICY IF EXISTS "threads_service_all" ON threads;
CREATE POLICY "threads_service_all" ON threads
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id  TEXT NOT NULL,
  body       TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_thread_created_idx ON messages (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_unread_idx          ON messages (thread_id) WHERE read_at IS NULL;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_service_all" ON messages;
CREATE POLICY "messages_service_all" ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Helper: a SQL function to fetch the connection row for two users (in either order)
-- Used by the API layer to gate writes. Doesn't expose anything to clients.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_connection_between(u_a TEXT, u_b TEXT)
RETURNS SETOF connections
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM connections
  WHERE (user_low = LEAST(u_a, u_b) AND user_high = GREATEST(u_a, u_b))
  LIMIT 1;
$$;

-- ============================================================================
-- Helper: derive "youth" check for a player.
-- Returns true if the player is under 18 (has a birth_date and is less than 18 years ago).
-- ============================================================================
CREATE OR REPLACE FUNCTION is_youth_player(player_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT birth_date > (CURRENT_DATE - INTERVAL '18 years')
     FROM players WHERE id = player_uuid),
    FALSE
  );
$$;
