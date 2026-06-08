# Connections & DMs — Spec for Review

**Status:** Awaiting Arnel's approval before building.
**Author:** KiloClaw
**Date:** 2026-06-08

---

## Goal

Add a user-to-user connection system to RinkStop that:
1. Gates DMs behind mutual opt-in (no spam)
2. Supports parents DMing coaches/scouts **on behalf of their kids** with the kid's profile as context
3. Works alongside the existing `favorites` table (user → entity), no breaking changes
4. Ships before we port the `/founding-member` page copy (so DMs are real, not aspirational)

---

## 1. New tables

### `connections` (user ↔ user, mutual)

```sql
CREATE TABLE connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low    TEXT NOT NULL,         -- alphabetically lower Clerk userId
  user_high   TEXT NOT NULL,         -- alphabetically higher Clerk userId
  initiated_by TEXT NOT NULL,        -- Clerk userId of who sent the request
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (user_low, user_high),
  CHECK (user_low <> user_high)
);

CREATE INDEX connections_user_low_idx   ON connections (user_low);
CREATE INDEX connections_user_high_idx  ON connections (user_high);
CREATE INDEX connections_status_idx     ON connections (status);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Users can see their own connection rows
CREATE POLICY "connections_select_own" ON connections
  FOR SELECT USING (
    user_low = (SELECT clerk_user_id FROM profiles WHERE id = auth.uid())::text
    OR user_high = (SELECT clerk_user_id FROM profiles WHERE id = auth.uid())::text
  );

-- Service role does everything
CREATE POLICY "connections_admin_all" ON connections
  FOR ALL USING (auth.role() = 'service_role');
```

**Why normalized (user_low, user_high):** Same connection is the same row regardless of who initiated. No duplicate rows. One unique constraint enforces it.

### `managed_profiles` (parent → kid's player profile)

```sql
CREATE TABLE managed_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id TEXT NOT NULL,         -- parent's Clerk userId
  profile_type    TEXT NOT NULL CHECK (profile_type IN ('player', 'team', 'league')),
  profile_id      UUID NOT NULL,         -- FK to players / teams / leagues
  relationship    TEXT NOT NULL DEFAULT 'parent'
                  CHECK (relationship IN ('parent', 'guardian', 'spouse', 'self')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (manager_user_id, profile_type, profile_id)
);

CREATE INDEX managed_profiles_manager_idx ON managed_profiles (manager_user_id);
CREATE INDEX managed_profiles_profile_idx ON managed_profiles (profile_type, profile_id);

ALTER TABLE managed_profiles ENABLE ROW LEVEL SECURITY;

-- Managers can see their own rows
CREATE POLICY "managed_profiles_select_own" ON managed_profiles
  FOR SELECT USING (manager_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "managed_profiles_admin_all" ON managed_profiles
  FOR ALL USING (auth.role() = 'service_role');
```

**Why not reuse `claims`:** Claims are pending/approved/rejected review items. "Parent manages kid's profile" is a permanent relationship, not a review item. Separate concept, separate table.

### `threads` (one DM conversation)

```sql
CREATE TABLE threads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id      UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  context_profile_type TEXT CHECK (context_profile_type IN ('player', 'team', 'league', 'rink', NULL)),
  context_profile_id   UUID,
  last_message_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, context_profile_type, context_profile_id)
);

CREATE INDEX threads_connection_idx ON threads (connection_id);
CREATE INDEX threads_last_message_idx ON threads (last_message_at DESC);

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
-- (select own: participants only — enforced in API layer using connection.user_low/user_high)
```

**Why per-context:** A parent could connect with a coach about Kid A, then start a separate thread about Kid B. Threads are scoped to (connection, context_profile).

**NULL context allowed:** DM about nothing specific. Just "hi, we connected."

### `messages`

```sql
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id   TEXT NOT NULL,             -- Clerk userId
  body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_thread_created_idx ON messages (thread_id, created_at DESC);
CREATE INDEX messages_unread_idx ON messages (thread_id) WHERE read_at IS NULL;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- (select own: participants only — enforced in API layer)
```

---

## 2. API routes

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/connections` | Send a connection request to another user | Verified+ required |
| `GET` | `/api/connections?status=` | List my connections (filter by pending/accepted/blocked) | Clerk |
| `POST` | `/api/connections/[id]/accept` | Accept a pending request | Recipient only |
| `POST` | `/api/connections/[id]/decline` | Decline a pending request | Recipient only |
| `POST` | `/api/connections/[id]/block` | Block a connection (auto-decline pending, kill accepted) | Either side |
| `DELETE` | `/api/connections/[id]` | Remove a connection (either side) | Either side |
| `GET` | `/api/threads` | List my DM threads (sorted by last_message_at DESC) | Verified+ |
| `POST` | `/api/threads` | Create a thread (or return existing) — body: `{ recipientId, contextProfileType?, contextProfileId? }` | Verified+ |
| `GET` | `/api/threads/[id]/messages?before=&limit=` | List messages in a thread (cursor pagination) | Thread participant only |
| `POST` | `/api/threads/[id]/messages` | Send a message in a thread | Thread participant only |
| `GET` | `/api/profiles/managed` | List profiles I manage (for parent context) | Clerk |
| `POST` | `/api/profiles/managed` | Add a managed profile (claim a kid's player profile as parent) | Verified+ |
| `DELETE` | `/api/profiles/managed/[id]` | Remove a managed profile | Manager only |

**Rate limits (consistent with existing pattern):**
- 30 req/min for read routes
- 10 req/min for connection actions
- 30 req/min for sending messages
- 5 req/10min for sending connection requests (tighter — anti-spam)

---

## 3. UI components

### Profile page (when viewing a user profile)
- **For non-connected users:** "Connect" button → POST `/api/connections`
- **For pending (I sent):** "Request pending" with "Cancel request" link
- **For pending (they sent):** "Accept" / "Decline" buttons
- **For accepted:** "Message" button → opens thread, optionally with context profile picker
- **For blocked:** No buttons. They see a "You're blocked" state on their own profile

### `/dashboard/connections`
- Three tabs: Pending (incoming), Pending (sent), Connections
- Each row: name, role, kid profile (if any), action buttons

### `/dashboard/messages` (the inbox)
- List of threads, sorted by last_message_at DESC
- Each row: other party's name + role, context profile badge (if any), last message preview, unread count, timestamp
- Click → `/dashboard/messages/[thread_id]`

### `/dashboard/messages/[thread_id]`
- Header: Other party name + role + context profile badge
- Message list: bubble UI, sender on right (mine), recipient on left (theirs), timestamps
- Composer at bottom: text area + send button
- If context profile is set, header shows: "Re: [Kid Name] ([Team Name], [Birth Year])"

### "On behalf of" picker (parent flow)
- When a parent with managed profiles clicks "Message" or starts a new thread, they get a small dropdown: "About: [Their own profile] | [Kid 1] | [Kid 2] | None"
- This sets the thread's `context_profile_type` / `context_profile_id`

### Notifications (existing system, just add types)
- `connection_request` — when someone requests to connect
- `connection_accepted` — when someone accepts
- `new_message` — when you get a new DM

---

## 4. Edge cases (decisions baked in)

| Case | Decision |
|---|---|
| User downgrades from Verified to Supporter | Can still **read** existing messages. Cannot **send** new ones (returns 403). Existing connections stay. |
| User downgrades to Free or cancels | Same as above. Read-only. |
| Blocked user tries to send a message | API returns 403. UI hides the composer. |
| Blocked user tries to send a connection request | API returns 403. Their button on the profile is hidden. |
| Connection exists, but one user is no longer Verified+ | Sender-side check on POST `/messages`. Recipient can still read. |
| Parent has 5 managed profiles, starts a thread with a coach | Pick one context profile at thread creation. Can start a second thread for a different kid. |
| Kid turns 18, wants their own account | Migration: copy `managed_profiles` row → new player-owned Clerk account, retire parent-managed. Out of scope for this build. |
| User reports a message | Existing support ticket system handles it. Add a "Report this message" link in the thread menu. |
| User reports a connection request | Same support ticket system. |
| Two users with the same name | Disambiguate by Clerk userId in the API. UI shows role + context profile to differentiate. |
| Rate limit hit on connection requests | Return 429 with Retry-After. UI shows "Slow down — try again in X minutes." |

---

## 5. What I'm NOT building in this round

- Real-time message delivery (no websockets, no SSE). Polling on inbox load is fine for v1.
- Typing indicators, read receipts beyond `read_at`, online status
- Group DMs (3+ participants)
- File/image attachments in messages
- End-to-end encryption (not needed for hockey parents)
- Mobile push notifications (web only for now)
- Message search

These can come later if usage justifies them.

---

## 6. Build order (after spec approval)

1. **Schema migrations** (3 new tables, indexes, RLS) — applied via Supabase Management API
2. **`/api/connections/*` routes** — POST, GET, accept, decline, block, delete
3. **`/api/threads/*` routes** — list, create, get messages, send message
4. **`/api/profiles/managed/*` routes** — list, add, remove
5. **`<ConnectButton />` component** — replaces SaveButton on user profile pages (SaveButton stays for entity pages like rinks/teams/players)
6. **`/dashboard/connections` page**
7. **`/dashboard/messages` page + `/dashboard/messages/[id]` thread view**
8. **"On behalf of" picker** — small component used in ConnectButton and DM composer
9. **Notifications** — extend existing notification system with 3 new types
10. **End-to-end test** — two real browser windows, parent account + coach account, full DM flow with context
11. **Port `/founding-member` page copy** — the 4-tier copy from the chat
12. **Smoke test on production** — verify Stripe checkout → webhook → profile tier → can DM flow

I'll do this in one go unless you want me to stop at any step.

---

## 7. Decisions (from Arnel, 2026-06-08)

1. **"I'm this player's parent" self-serve form** — only on youth hockey player profiles. **Youth = player has a `birth_year` AND `current_year − birth_year < 18`.** If `birth_year` is missing, the button is hidden (safer default). For 18+ players, the player claims their own profile — no parent involvement. Parent's name shows on the kid's profile as "Managed by [Parent Name]"; contact info is DM-only.
2. **`initiated_by` on the connection row** — single row, single field. No separate requests table for v1. *Decided by KiloClaw, not asked.*
3. **Free/Supporter invisible to messaging entirely.** Both sender and recipient must be Verified+. No exceptions. Sender-side check on `POST /messages` and `POST /threads` returns 403 otherwise. Read-only when downgraded.
4. **Polling, not websockets** — for v1. *Decided by KiloClaw, not asked.*

---

## 8. What to do when you approve

Status: **approved 2026-06-08**. Building now. Will report at each major checkpoint.
