# WS17 PR4 — Rink Communication & Booking System

## Context

WS17 PR3b (events CRUD) just shipped. The next piece is the private communication layer between rink operators and their clients (teams, leagues, federations, coaches).

**What exists today:**
- Rink claims system (`claims` table) — approved claims connect rink owners to their rinks
- PayMongo payment provider with payment splitting capability (contract pending for live keys)
- Rink profile pages with contact info
- Rink owner dashboard (programming + events CRUD)

**What doesn't exist:**
- Any way for a team, league, federation, or coach to initiate a conversation with a rink owner through RinkStop
- Any way for rink owners to broadcast available ice time / list slots in a marketplace
- Any agreement or payment workflow that ties a booking to a contract

---

## Core Concept

**Rink Connections** — a bidirectional messaging and booking system between rink admins and their clients (teams, leagues, federations, coaches).

Two modes:
1. **Direct message** — general communication about scheduling, ice time, payments, agreements
2. **Booking request** — a structured request for specific ice time slots; can be approved/negotiated/rejected; when approved, can become a public event or practice listing

---

## Entity Model

### Existing entities
- `rinks` — the rink listing
- `claims` — who owns/controls a rink (`claim_type='rink'`, `status='approved'`)
- `rink_programming` — recurring weekly schedule slots (WS17 PR3a)
- `rink_events` — one-off events (WS17 PR3b)

### New entities

**`connection_parties`** — registers an organization/team/league/federation/coach on RinkStop so they can interact with rinks.

```sql
CREATE TABLE connection_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL CHECK (party_type IN ('team', 'league', 'federation', 'coach')),
  organization_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  logo_url TEXT,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, party_type)
);
```

**`rink_connections`** — a relationship between a rink and a client organization. Created when a team first reaches out to a rink or vice versa.

```sql
CREATE TABLE rink_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES connection_parties(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('rink_admin', 'team_admin', 'league_admin', 'federation_admin', 'coach')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rink_id, party_id)
);
```

**`rink_threads`** — a conversation thread between a rink and a client.

```sql
CREATE TABLE rink_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES rink_connections(id) ON DELETE CASCADE,
  thread_type TEXT NOT NULL CHECK (thread_type IN ('general', 'booking_request', 'agreement', 'payment', 'dispute')),
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`rink_messages`** — individual messages within a thread.

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

**`ice_listings`** — rink admin lists available ice time slots (marketplace).

```sql
CREATE TABLE ice_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  requested_price_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  age_group TEXT,
  skill_level TEXT,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('practice', 'game', 'tournament', 'camp', 'clinic', 'other')),
  visibility TEXT NOT NULL DEFAULT 'network' CHECK (visibility IN ('network', 'connections_only', 'public')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending', 'booked', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`booking_requests`** — structured request for specific ice time, tied to an ice_listing or standalone.

```sql
CREATE TABLE booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES rink_threads(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES ice_listings(id) ON DELETE SET NULL,
  rink_id UUID NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,
  requesting_party_id UUID NOT NULL REFERENCES connection_parties(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'negotiating', 'approved', 'rejected', 'cancelled')),
  requested_price_cents INTEGER,
  counter_price_cents INTEGER,
  requested_start TIMESTAMPTZ NOT NULL,
  requested_end TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## User Flows

### Flow 1 — Rink admin lists available ice (marketplace)
1. Rink admin goes to `/dashboard/manage/rink/[id]/ice-listings`
2. Fills form: date/time, duration, price (optional), age group, skill level, slot type
3. Sets visibility: network-wide, connections-only, or public
4. Saves → slot appears in relevant searches / is notified to connected parties

### Flow 2 — Team/coach contacts rink about ice time
1. Team admin navigates to rink profile page
2. Clicks "Request Ice Time" button
3. Fills out: what they need (date, time, duration), how many players, level, budget (optional)
4. Attaches any relevant files (team roster, insurance cert)
5. Submits → creates a `rink_thread` (type=`booking_request`) + `booking_request` + notification to rink admin
6. Rink admin responds in-thread, can counter-offer on price/time
7. Both parties agree → status becomes `approved`
8. When approved: option to publish as a public event ( rink_events row created) or keep private

### Flow 3 — Rink admin reaches out to a team directly
1. Rink admin goes to `/dashboard/manage/rink/[id]/connections`
2. Searches for a team/league/coach by name (must have a `connection_party` record)
3. Sends a message or booking request
4. Same thread model as Flow 2

### Flow 4 — General communication
- Any connected party can send a general message about contracts, payments, etc.
- Thread type = `general`, `agreement`, or `payment`
- Not tied to a specific time slot

---

## Access Control

| Actor | Can |
|---|---|
| Rink admin (approved claim) | Manage their rink's threads, messages, ice listings; respond to booking requests; initiate contact with any connection_party |
| Team/league/federation/coach admin | Message any rink they've connected with; submit booking requests; manage their own connection_party profile |
| Unauthenticated user | Browse public ice listings only |
| Free user | Can create a connection_party record; limited to 1 active connection |
| Starter+ | Full connection management |

---

## Dashboard Pages

### Rink admin side
- `/dashboard/manage/rink/[id]/connections` — list of all client connections, their status, last activity
- `/dashboard/manage/rink/[id]/threads` — all threads grouped by status (open/resolved)
- `/dashboard/manage/rink/[id]/threads/[threadId]` — full conversation view + reply box + action buttons (approve booking, counter, close)
- `/dashboard/manage/rink/[id]/ice-listings` — list of available/booked slots
- `/dashboard/manage/rink/[id]/ice-listings/new` — create ice listing form
- `/dashboard/manage/rink/[id]/ice-listings/[listingId]/edit` — edit/cancel listing

### Team/league/coach side
- `/dashboard/connections` — their connections to rinks
- `/dashboard/threads` — all threads across all rink connections
- `/dashboard/threads/[threadId]` — conversation view + reply
- `/dashboard/ice-marketplace` — browse public ice listings from any rink

---

## API Routes (new)

```
# Rink admin
GET/POST   /api/rink-connections/connections?rinkId=
GET/PATCH  /api/rink-connections/connections/[connectionId]
GET/POST   /api/rink-connections/threads?rinkId=
GET/PATCH  /api/rink-connections/threads/[threadId]
GET/POST   /api/rink-connections/messages?threadId=
PATCH       /api/rink-connections/messages/[messageId]/read
GET/POST   /api/rink-connections/ice-listings?rinkId=
GET/PATCH   /api/rink-connections/ice-listings/[listingId]
POST        /api/rink-connections/booking-requests
PATCH       /api/rink-connections/booking-requests/[requestId]
POST        /api/rink-connections/booking-requests/[requestId]/approve
POST        /api/rink-connections/booking-requests/[requestId]/reject

# Client side
GET/POST   /api/rink-connections/client/connections
GET/POST   /api/rink-connections/client/threads
GET/POST   /api/rink-connections/client/messages
GET        /api/rink-connections/client/ice-marketplace
POST        /api/rink-connections/client/booking-requests
```

---

## Public surfaces

- `/rink/[slug]` — "Ice & Availability" tab showing public ice listings for that rink (if visibility=public)
- `/ice-marketplace` — browse all public ice listings, filterable by location/date/age group/skill level
- When a booking is approved and the rink admin checks "publish as event" → creates a `rink_events` row that appears in the directory

---

## Notifications (stretch, not MVP)

- Email or in-app notification when a new message arrives
- Notification when a booking request is approved/rejected
- Optional SMS for urgent threads (future)

---

## Payment integration (future, after PayMongo contract is signed)

- Booking request approval triggers a PayMongo payment link
- Payment split goes to rink owner minus platform fee
- Receipt sent to both parties

---

## What this does NOT include (out of scope)

- Public submission of events (dropped per Arnel's feedback)
- EventConnect / SportNinja integration
- In-app video calling
- Calendar sync (Google Calendar, etc.)
- Automated reminders

---

## Open questions for Arnel

1. Should ice listings be visible to everyone (public) or only to teams logged into RinkStop?
2. Should there be a "network" concept — e.g., a league can see all its member teams' rinks?
3. When a booking is approved and published as an event — who can edit/cancel it? Both parties?
4. Is there a need for a formal contract document (PDF upload/download), or is the thread conversation itself sufficient?
5. What's the billing model — does RinkStop take a fee on bookings, or is this free for now to grow the network?
