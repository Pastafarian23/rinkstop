# WS17 PR4 — Rink Connections, Ice Marketplace & Staff Management

**Status:** Proposed (awaiting Arnel approval)
**Date:** 2026-08-25
**Prerequisites:** WS17 PR3b (just shipped)

---

## What we're building

A bidirectional communication and booking system between rink operators and their clients (teams, leagues, federations, coaches), plus internal rink staff and coaching management.

**Four core products:**
1. **Ice Marketplace** — rink admins list available ice time; teams/coaches browse and request
2. **Rink Connections** — threaded messaging for scheduling, contracts, payments
3. **Staff & Coach Management** — rink admins manage employees and contracted coaches, assign sessions
4. **Org Registry** — federation/league hierarchy so orgs can be discovered and invited into the network

**When a booking is approved:** rink admin can publish it as a public event → appears in the directory.

**Payments:** Phase 2 (see below). Phase 1 handles the full workflow through to approval; payment collection outside platform.

---

## Payment architecture note

- **Stripe** — primary global processor (Phase 2)
- **PayMongo / Maya** — Philippines-local (Phase 2+)
- **Future: regional processors** — per-market localization, all slot into the existing `PaymentProvider` interface in `lib/payments/index.ts`
- The `createCheckout` abstraction is already in place — Stripe provider added in Phase 2

---

## What exists vs. what we're building

### Already built (DO NOT DUPLICATE)
- `team_notifications` table + API — extend, not rebuild
- Player document e-signature system — reuse for rink contracts
- `/dashboard/messages` — user-to-user DMs, leave as-is
- `/dashboard/connections` — user-to-user connections, leave as-is
- `/dashboard/leads` — lead capture, leave as-is
- `lib/payments/index.ts` — `PaymentProvider` interface, abstraction ready

### We're building
- Rink staff + coach management
- Rink org registry (federation/league hierarchy)
- Rink connections (rink ↔ client relationships)
- Threaded messaging (rink-specific)
- Ice marketplace (listings, search, booking requests)
- Booking request workflow (pending → negotiating → approved/rejected)
- E-signature for rink contracts (extend existing signing)
- Rink notifications (extend `team_notifications`)

---

## Entity Model

### 1. `rink_employees` (employee + coach management)

Rink admins add employees and contracted coaches. Coaches get a schedule view. Particularly relevant for PH market (SM Ice Arena model) where coaches are employed directly by the rink.

```sql
CREATE TABLE rink_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),  -- null until coach claims this record
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
```

Coach schedules link via `rink_programming(staff_id)` and `rink_events(staff_id)` — add nullable `staff_id` column to both PR3a/PR3b tables via migration.

### 2. `federations` table already exists + `league_members` (org hierarchy)

```sql
CREATE TABLE federations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sport TEXT NOT NULL DEFAULT 'hockey',
  country TEXT,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
```

Note: full org dashboards for federations/leagues come later. PR4 adds the registry + membership.

### 3. `rink_org_connections`

```sql
CREATE TABLE rink_connections (
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
```

### 4. `rink_threads`

```sql
CREATE TABLE rink_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES rink_connections(id) ON DELETE CASCADE,
  thread_type TEXT NOT NULL CHECK (thread_type IN ('general', 'booking_request', 'contract_request', 'agreement', 'payment', 'dispute')),
  expires_at TIMESTAMPTZ,  -- 30 days from creation for contract threads; rink admin can extend
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5. `rink_messages`

```sql
CREATE TABLE rink_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES rink_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6. `ice_listings`

```sql
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
```

### 7. `booking_requests`

```sql
CREATE TABLE booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES rink_threads(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES ice_listings(id) ON DELETE SET NULL,
  connection_id UUID NOT NULL REFERENCES rink_connections(id) ON DELETE CASCADE,
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
```

### 8. `rink_contracts` + `rink_contract_signatures`

```sql
CREATE TABLE rink_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES rink_connections(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES rink_threads(id) ON DELETE SET NULL,
  booking_request_id UUID REFERENCES booking_requests(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('ice_time', 'rental_agreement', 'sponsorship', 'other')),
  storage_path TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'rejected', 'expired')),
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signed_by_user_id UUID REFERENCES auth.users(id),
  signature_payload JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
```

---

## Access Control

| Actor | Can |
|---|---|
| Rink admin (approved claim) | Manage staff, connections, threads, ice listings, booking requests, contracts |
| Coach (staff role) | View assigned programming slots + events |
| Team/league/federation/coach | Message rink via connection, submit booking requests, sign contracts |
| Authenticated user (any tier) | Browse public ice listings |
| Unauthenticated | Nothing |

---

## Dashboard Pages

### Rink admin
- `/dashboard/manage/rink/[id]/connections` — client connections
- `/dashboard/manage/rink/[id]/threads` — all threads
- `/dashboard/manage/rink/[id]/threads/[threadId]` — conversation + actions
- `/dashboard/manage/rink/[id]/ice-listings` — list/create/edit ice slots
- `/dashboard/manage/rink/[id]/contracts` — rink contracts
- `/dashboard/manage/rink/[id]/staff` — staff list + add/edit
- `/dashboard/manage/rink/[id]/staff/[staffId]` — staff profile

### Coach (staff role)
- `/dashboard/coach/schedule` — assigned programming slots + events

### Client (team/league/coach)
- `/dashboard/rink-connections` — their rink connections
- `/dashboard/rink-threads` — all threads across rinks
- `/dashboard/rink-threads/[threadId]` — conversation view
- `/dashboard/ice-marketplace` — browse public ice listings

### Public
- `/rink/[slug]` — "Ice & Availability" tab (public ice listings)
- `/ice-marketplace` — browse all public ice listings

---

## Notifications

Extend existing `team_notifications` table. New `kind` values:

| Event | Kind |
|---|---|
| New message in thread | `rink_message` |
| Booking request submitted | `booking_request_received` |
| Booking approved | `booking_approved` |
| Booking rejected | `booking_rejected` |
| Counter-offer sent | `booking_counter` |
| Contract sent | `contract_sent` |
| Contract signed | `contract_signed` |
| Ice listing available | `ice_listing_available` |
| Staff schedule updated | `staff_schedule_updated` |
| Coach session assigned | `coach_session_assigned` |

---

## E-Signature

Reuse existing `/api/team/[slug]/documents/[id]/sign/route.ts` (canvas SignaturePad + consent + SHA-256 + audit trail). Signing page at `/dashboard/rink-contracts/[contractId]/sign`. No new signature infrastructure needed.

---

## Build Order

**Phase 1 (this PR):**
1. Migrations: `rink_employees`, `federations`, `league_members`, `rink_org_connections`, `rink_threads`, `rink_messages`, `ice_listings`, `booking_requests`, `rink_contracts`, `rink_contract_signatures`
2. Add `staff_id` nullable column to `rink_programming` and `rink_events`
3. Rink staff API + dashboard (add/edit/remove staff)
4. Coach schedule view
5. Rink connections API
6. Threaded messaging API + dashboard pages
7. Ice listings API + dashboard pages
8. Booking request workflow (submit → negotiate → approve/reject)
9. Rink notifications (extend team_notifications)
10. E-signature for rink contracts
11. `/ice-marketplace` public page

**Phase 2 (future):**
- Stripe payment integration (add `stripe` provider to `lib/payments/index.ts`)
- Booking → Stripe checkout with platform fee split
- PayMongo/Maya for PH market
- Contract PDF upload for rink contracts
- Federation dashboard (invite leagues, see member network)
- Email notifications

---

## Open questions

1. ~~Platform fee~~ — **5%, exclusive of payment processing. RinkStop absorbs the $0.30 Stripe per-transaction fee. Example: $500 booking → rink receives $460.20 ($500 - $14.80 Stripe - $25.00 RinkStop).**
2. ~~Contract expiration~~ — **30 days, rink admin can extend.** Coach contract requests: new thread type `contract_request` — coach submits request through thread, rink admin sends formal contract, coach signs.
3. ~~Booking edits~~ — **editing allowed before approval.** After approval, booking is locked; a new request must be created for changes.
4. Coach compensation — **defer to user requirements.**
