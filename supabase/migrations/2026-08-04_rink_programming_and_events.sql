-- 2026-08-04_rink_programming_and_events.sql
--
-- WS17 PR1 — Programming & Events Directory schema.
-- Adds 4 tables + 1 enum. Additive + idempotent.
--
-- Tables:
--   rink_programming   — recurring weekly programming (public_skate, learn_to_skate, open_hockey, etc.)
--   rink_events        — one-off events (camps, tournaments, tryouts, showcases)
--   event_divisions    — sub-groups within an event (U14 Boys, U16 Girls, etc.)
--   event_submissions  — public-submission queue (PR4 wires the form; PR1 just creates the table)
--
-- Decisions made with sensible defaults — see PR #89 description for the open design
-- questions and how to override them. Migration is additive + idempotent so any
-- decision can be reversed in a follow-up PR.
--
-- Owner dashboard is explicitly in scope per Arnel's 2026-08-04 directive.
-- RLS allows owner CRUD gated by rink claim status (via existing rinks.claimed_by_user_id).
-- Public read is filtered by status='published' + visibility='public'.
--
-- Rink page JSON-LD (SportsActivityLocation.availableActivity[] + event[]) is
-- extended in PR2, not here. PR1 ships the storage layer only.

-- =============================================================================
-- 1. Enum: activity types (recurring programming + events)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rink_activity_type') THEN
    CREATE TYPE public.rink_activity_type AS ENUM (
      'public_skate',
      'stick_and_puck',
      'learn_to_skate',
      'open_hockey',
      'pickup',
      'drop_in',
      'youth_league',
      'adult_league',
      'shinny',
      'rat_hockey',
      'broomball',
      'figure_skating',
      'tournament',
      'camp',
      'tryout',
      'showcase',
      'other'
    );
  END IF;
END $$;

-- =============================================================================
-- 2. rink_programming — recurring weekly programming
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rink_programming (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rink_id         UUID NOT NULL REFERENCES public.rinks(id) ON DELETE CASCADE,

  -- When this slot occurs each week. day_of_week: 0=Sun..6=Sat (matches JS Date.getDay()).
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL CHECK (end_time > start_time),

  -- What kind of activity + skill gating
  activity_type   public.rink_activity_type NOT NULL,
  skill_level     TEXT NOT NULL DEFAULT 'all'
                    CHECK (skill_level IN ('all','beginner','intermediate','advanced','elite')),
  gender          TEXT NOT NULL DEFAULT 'all'
                    CHECK (gender IN ('all','boys','girls','men','women','coed')),
  age_min         SMALLINT CHECK (age_min IS NULL OR age_min BETWEEN 0 AND 99),
  age_max         SMALLINT CHECK (age_max IS NULL OR age_max BETWEEN 0 AND 99),

  -- Pricing (cents to avoid float). NULL = free / not priced.
  price_cents     INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
  currency        CHAR(3) NOT NULL DEFAULT 'USD',

  -- Capacity
  capacity        INTEGER CHECK (capacity IS NULL OR capacity > 0),

  -- Description + rules
  description     TEXT,
  gear_rules      TEXT,

  -- Status
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','archived')),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Sanity: age_min <= age_max when both set
  CHECK (age_min IS NULL OR age_max IS NULL OR age_min <= age_max)
);

CREATE INDEX IF NOT EXISTS idx_rink_programming_rink
  ON public.rink_programming (rink_id, day_of_week)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_rink_programming_status
  ON public.rink_programming (status, updated_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.rink_programming_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rink_programming_updated_at ON public.rink_programming;
CREATE TRIGGER trg_rink_programming_updated_at
  BEFORE UPDATE ON public.rink_programming
  FOR EACH ROW EXECUTE FUNCTION public.rink_programming_set_updated_at();

-- =============================================================================
-- 3. rink_events — one-off events
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rink_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rink_id                 UUID NOT NULL REFERENCES public.rinks(id) ON DELETE CASCADE,
  slug                    TEXT NOT NULL,

  -- Core content
  title                   TEXT NOT NULL,
  subtitle                TEXT,
  description             TEXT,
  event_type              public.rink_activity_type NOT NULL,

  -- When
  starts_at               TIMESTAMPTZ NOT NULL,
  ends_at                 TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  timezone                TEXT NOT NULL DEFAULT 'America/New_York',

  -- Registration window
  registration_opens_at   TIMESTAMPTZ,
  registration_closes_at  TIMESTAMPTZ CHECK (
                              registration_closes_at IS NULL
                              OR registration_opens_at IS NULL
                              OR registration_closes_at >= registration_opens_at
                           ),

  -- Venue details (the rink is the parent, this is the specific rink room/address)
  venue_name              TEXT,
  address                 TEXT,

  -- Pricing
  price_cents             INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
  currency                CHAR(3) NOT NULL DEFAULT 'USD',
  early_bird_price_cents  INTEGER CHECK (
                              early_bird_price_cents IS NULL
                              OR price_cents IS NULL
                              OR early_bird_price_cents <= price_cents
                           ),
  early_bird_until        TIMESTAMPTZ,

  -- Capacity
  capacity                INTEGER CHECK (capacity IS NULL OR capacity > 0),
  spots_remaining         INTEGER CHECK (
                              spots_remaining IS NULL
                              OR capacity IS NULL
                              OR spots_remaining <= capacity
                           ),
  waitlist_enabled        BOOLEAN NOT NULL DEFAULT false,

  -- External registration handling
  registration_url        TEXT,
  registration_method     TEXT NOT NULL DEFAULT 'external'
                            CHECK (registration_method IN ('external','internal','email','phone','walk_in')),

  -- Hotel block (optional partner block)
  hotel_partner_url       TEXT,
  hotel_discount_code     TEXT,
  hotel_block_until       DATE,

  -- Status + visibility
  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','pending','published','cancelled','completed','archived')),
  visibility              TEXT NOT NULL DEFAULT 'public'
                            CHECK (visibility IN ('public','unlisted','private')),
  tags                    TEXT[] NOT NULL DEFAULT '{}',

  -- Audit
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Slug uniqueness scoped to (rink_id, starts_at). Same slug at a different
  -- start date = different event. Different rinks = different slugs.
  UNIQUE (rink_id, slug, starts_at)
);

CREATE INDEX IF NOT EXISTS idx_rink_events_rink_starts
  ON public.rink_events (rink_id, starts_at)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_rink_events_status_starts
  ON public.rink_events (status, starts_at)
  WHERE status IN ('published', 'completed');

CREATE INDEX IF NOT EXISTS idx_rink_events_slug
  ON public.rink_events (rink_id, slug);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.rink_events_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rink_events_updated_at ON public.rink_events;
CREATE TRIGGER trg_rink_events_updated_at
  BEFORE UPDATE ON public.rink_events
  FOR EACH ROW EXECUTE FUNCTION public.rink_events_set_updated_at();

-- =============================================================================
-- 4. event_divisions — sub-groups within an event
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.event_divisions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID NOT NULL REFERENCES public.rink_events(id) ON DELETE CASCADE,

  -- Identity
  name                TEXT NOT NULL,
  sort_order          INTEGER NOT NULL DEFAULT 0,

  -- Eligibility
  birth_year_min      SMALLINT CHECK (birth_year_min IS NULL OR birth_year_min BETWEEN 1900 AND 2100),
  birth_year_max      SMALLINT CHECK (birth_year_max IS NULL OR birth_year_max BETWEEN 1900 AND 2100),
  skill_level         TEXT NOT NULL DEFAULT 'all'
                        CHECK (skill_level IN ('all','beginner','intermediate','advanced','elite','aaa','aa','a','b','c')),
  gender              TEXT NOT NULL DEFAULT 'coed'
                        CHECK (gender IN ('boys','girls','men','women','coed','open')),

  -- Capacity
  capacity            INTEGER CHECK (capacity IS NULL OR capacity > 0),
  spots_remaining     INTEGER CHECK (
                          spots_remaining IS NULL
                          OR capacity IS NULL
                          OR spots_remaining <= capacity
                       ),

  -- Status
  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','closed','waitlist','cancelled')),

  -- Unique division name per event
  UNIQUE (event_id, name),

  -- Sanity: birth_year_min <= birth_year_max when both set
  CHECK (birth_year_min IS NULL OR birth_year_max IS NULL OR birth_year_min <= birth_year_max)
);

CREATE INDEX IF NOT EXISTS idx_event_divisions_event
  ON public.event_divisions (event_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_event_divisions_status
  ON public.event_divisions (status)
  WHERE status IN ('open', 'waitlist');

-- =============================================================================
-- 5. event_submissions — public-submission queue (PR4 wires the form)
-- =============================================================================
-- Created in PR1 so that future PRs have the table to reference. PR4 adds
-- the public form + owner approval flow + CSV import + EventConnect integration.
CREATE TABLE IF NOT EXISTS public.event_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Optional FK: if the submitter names a known rink, link to it.
  -- NULL if the submitter is proposing a new rink or is unsure.
  rink_id             UUID REFERENCES public.rinks(id) ON DELETE SET NULL,

  -- Submitter info
  submitter_user_id   TEXT REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  submitter_name      TEXT NOT NULL,
  submitter_email     TEXT NOT NULL,

  -- Proposed event content (mirrors rink_events without rink_id binding)
  proposed_title      TEXT NOT NULL,
  proposed_event_type public.rink_activity_type NOT NULL,
  proposed_starts_at  TIMESTAMPTZ NOT NULL,
  proposed_ends_at    TIMESTAMPTZ NOT NULL,
  proposed_timezone   TEXT NOT NULL DEFAULT 'America/New_York',
  proposed_address    TEXT,
  proposed_url        TEXT,

  -- Free-form notes from the submitter
  notes               TEXT,

  -- Status: pending review by rink owner or admin. PR4 wires the approval flow.
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected','spam','duplicate')),

  -- Resolution: when status moves to approved/rejected, who decided
  resolved_by_user_id TEXT REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,

  -- Source: how this submission arrived (public form, CSV import, EventConnect, etc.)
  source              TEXT NOT NULL DEFAULT 'public_form'
                        CHECK (source IN ('public_form','csv_import','event_connect','sport_ninja','admin','other')),

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Sanity: proposed_ends_at > proposed_starts_at
  CHECK (proposed_ends_at > proposed_starts_at)
);

CREATE INDEX IF NOT EXISTS idx_event_submissions_status
  ON public.event_submissions (status, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_event_submissions_rink
  ON public.event_submissions (rink_id, status)
  WHERE rink_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_submissions_submitter
  ON public.event_submissions (submitter_user_id, created_at DESC)
  WHERE submitter_user_id IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.event_submissions_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_submissions_updated_at ON public.event_submissions;
CREATE TRIGGER trg_event_submissions_updated_at
  BEFORE UPDATE ON public.event_submissions
  FOR EACH ROW EXECUTE FUNCTION public.event_submissions_set_updated_at();

-- =============================================================================
-- 6. RLS policies
-- =============================================================================
ALTER TABLE public.rink_programming ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rink_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_divisions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_submissions ENABLE ROW LEVEL SECURITY;

-- ---- rink_programming ----

DROP POLICY IF EXISTS "Public read published programming" ON public.rink_programming;
CREATE POLICY "Public read published programming"
  ON public.rink_programming FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Owner manage programming" ON public.rink_programming;
CREATE POLICY "Owner manage programming"
  ON public.rink_programming FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rinks r
      WHERE r.id = rink_programming.rink_id
        AND r.claimed_by_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rinks r
      WHERE r.id = rink_programming.rink_id
        AND r.claimed_by_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Admin manage programming" ON public.rink_programming;
CREATE POLICY "Admin manage programming"
  ON public.rink_programming FOR ALL
  USING (auth.jwt() ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'super_admin');

-- ---- rink_events ----

DROP POLICY IF EXISTS "Public read published events" ON public.rink_events;
CREATE POLICY "Public read published events"
  ON public.rink_events FOR SELECT
  USING (status = 'published' AND visibility = 'public');

DROP POLICY IF EXISTS "Owner manage events" ON public.rink_events;
CREATE POLICY "Owner manage events"
  ON public.rink_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rinks r
      WHERE r.id = rink_events.rink_id
        AND r.claimed_by_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rinks r
      WHERE r.id = rink_events.rink_id
        AND r.claimed_by_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Admin manage events" ON public.rink_events;
CREATE POLICY "Admin manage events"
  ON public.rink_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'super_admin');

-- ---- event_divisions ----

DROP POLICY IF EXISTS "Public read published event divisions" ON public.event_divisions;
CREATE POLICY "Public read published event divisions"
  ON public.event_divisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rink_events e
      WHERE e.id = event_divisions.event_id
        AND e.status = 'published'
        AND e.visibility = 'public'
    )
  );

DROP POLICY IF EXISTS "Owner manage event divisions" ON public.event_divisions;
CREATE POLICY "Owner manage event divisions"
  ON public.event_divisions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rink_events e
      JOIN public.rinks r ON r.id = e.rink_id
      WHERE e.id = event_divisions.event_id
        AND r.claimed_by_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rink_events e
      JOIN public.rinks r ON r.id = e.rink_id
      WHERE e.id = event_divisions.event_id
        AND r.claimed_by_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Admin manage event divisions" ON public.event_divisions;
CREATE POLICY "Admin manage event divisions"
  ON public.event_divisions FOR ALL
  USING (auth.jwt() ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'super_admin');

-- ---- event_submissions ----

DROP POLICY IF EXISTS "Submitter read own submissions" ON public.event_submissions;
CREATE POLICY "Submitter read own submissions"
  ON public.event_submissions FOR SELECT
  USING (submitter_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated submit event" ON public.event_submissions;
CREATE POLICY "Authenticated submit event"
  ON public.event_submissions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND submitter_user_id = auth.uid()::text
    AND submitter_email IS NOT NULL
  );

-- Owner of the linked rink can read submissions for their rink
DROP POLICY IF EXISTS "Owner read submissions for their rink" ON public.event_submissions;
CREATE POLICY "Owner read submissions for their rink"
  ON public.event_submissions FOR SELECT
  USING (
    rink_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.rinks r
      WHERE r.id = event_submissions.rink_id
        AND r.claimed_by_user_id = auth.uid()::text
    )
  );

-- Owner + admin can update status (resolve)
DROP POLICY IF EXISTS "Owner resolve submissions for their rink" ON public.event_submissions;
CREATE POLICY "Owner resolve submissions for their rink"
  ON public.event_submissions FOR UPDATE
  USING (
    rink_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.rinks r
      WHERE r.id = event_submissions.rink_id
        AND r.claimed_by_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    rink_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.rinks r
      WHERE r.id = event_submissions.rink_id
        AND r.claimed_by_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Admin manage event submissions" ON public.event_submissions;
CREATE POLICY "Admin manage event submissions"
  ON public.event_submissions FOR ALL
  USING (auth.jwt() ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'super_admin');

-- =============================================================================
-- 7. Migration verification
-- =============================================================================
DO $$
DECLARE
  prog_idx_count     INT;
  evt_idx_count      INT;
  div_idx_count      INT;
  sub_idx_count      INT;
  rls_policy_count   INT;
  enum_value_count   INT;
BEGIN
  SELECT COUNT(*) INTO prog_idx_count
    FROM pg_indexes WHERE tablename = 'rink_programming' AND schemaname = 'public';
  SELECT COUNT(*) INTO evt_idx_count
    FROM pg_indexes WHERE tablename = 'rink_events' AND schemaname = 'public';
  SELECT COUNT(*) INTO div_idx_count
    FROM pg_indexes WHERE tablename = 'event_divisions' AND schemaname = 'public';
  SELECT COUNT(*) INTO sub_idx_count
    FROM pg_indexes WHERE tablename = 'event_submissions' AND schemaname = 'public';
  SELECT COUNT(*) INTO rls_policy_count
    FROM pg_policies
    WHERE tablename IN ('rink_programming','rink_events','event_divisions','event_submissions')
      AND schemaname = 'public';
  SELECT COUNT(*) INTO enum_value_count
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'rink_activity_type';

  RAISE NOTICE 'WS17 PR1 applied:';
  RAISE NOTICE '  rink_programming:    % indexes', prog_idx_count;
  RAISE NOTICE '  rink_events:         % indexes', evt_idx_count;
  RAISE NOTICE '  event_divisions:     % indexes', div_idx_count;
  RAISE NOTICE '  event_submissions:   % indexes', sub_idx_count;
  RAISE NOTICE '  RLS policies (total across 4 tables): %', rls_policy_count;
  RAISE NOTICE '  rink_activity_type enum values: %', enum_value_count;
  RAISE NOTICE '  Expected: 2/4/2/3 indexes, 13 RLS policies (4+4+4+3 minus event_submissions overlap), 17 enum values';
END $$;