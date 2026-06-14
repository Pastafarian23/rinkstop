# RinkStop Dashboard Plan

**Goal:** Functional, bug-free dashboards for every profile type. Users can manage their listings, DM, follow, save, and otherwise use the site normally — so we can market the site as a real product.

**Profile types (final, user-approved 2026-06-13):**
1. `player` — plays the game
2. `parent` — parent of a player (manages a kid's profile)
3. `coach` — runs a team
4. `scout` — evaluates players
5. `referee` — officiates games (umbrella for referees + linesmen)
6. `rink_operator` — owns/manages a rink
7. `league_admin` — runs a league
8. `team_admin` — manages a team
9. `business` — pro shop, sharpening, camps, etc.
10. `fan` — follows hockey

**Locked for v1.** New types can be added in v2 by inserting into the `account_type_enum` (see schema below) — no schema migration needed for the table itself.

**Multi-type pricing decision (user-approved 2026-06-13):** Multi-type is **free for all tiers**, including Free. Any user can check as many types as apply. Rationale: hockey culture is multi-role by default (coaches played, parents coach, refs also play), and gating the most common real-world combinations hurts the network effect. Identity/personal roles are free; transactional/business power (claims, leads, analytics) is paid.

Note: existing `AccountTypePicker` uses 8 types with `rink`/`team`/`league`. This plan renames them to `rink_operator`/`team_admin`/`league_admin` and adds `parent` + `referee`. The display labels in the picker will be the friendly form; the stored DB value is the snake_case enum.

**Multi-type accounts (user requirement 2026-06-13):**
A user can hold more than one type. Examples:
- parent + adult player (plays in a beer league AND has a kid in youth hockey)
- coach + player (plays in one league, coaches in another)
- coach + ref (coaches youth, refs adult league)
- scout + coach + ref (works at multiple levels)

**Schema for multi-type:**
Replace the single `account_type` column with a join table. The `account_type_enum` Postgres enum stays — what changes is that no single value is stored on `profiles`. Instead, a row in `profile_account_types` declares each type the user holds.

```sql
CREATE TYPE account_type_enum AS ENUM (
  'player', 'parent', 'coach', 'scout', 'referee',
  'rink_operator', 'league_admin', 'team_admin', 'business', 'fan'
);

CREATE TABLE profile_account_types (
  user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  account_type account_type_enum NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,  -- the "headline" type shown next to display name
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, account_type)
);
```

Rules:
- A user must have at least one row in `profile_account_types`
- A user may have at most one row with `is_primary = true`
- New enum values can be added later via `ALTER TYPE account_type_enum ADD VALUE '...'` — no data migration
- `is_primary` is what the picker defaults to and what shows in the user-card on profile pages
- All dashboard sections are visible if the user holds the matching type (e.g. a parent+player sees both "Linked players" and "Your profile views")
- Calendar use case (deferred, but designed for): a user with multiple types will eventually want one calendar that shows player games + coached practices + officiated assignments. The data layer keeps `user_id` separate from type, so adding a `calendar_events(user_id, event_type, ...)` table later is straightforward.

**Migration cost from current state:**
- The current `profiles.account_type` column gets renamed to `_deprecated_account_type` and dropped after the migration window
- A backfill inserts one row per existing user into `profile_account_types`, mapping the old value to `(account_type, is_primary=true)`

---

## Current State (verified 2026-06-13)

**Code in place (line counts from src/):**
- Dashboard layout + Clerk auth guard
- Profile (edit form 124 lines)
- Subscription / Stripe (233+115 lines)
- Claims (399+32 — rink/team/player)
- Messages / DM UI (182+240 — but `conversations` table missing)
- Reviews UI (135 lines)
- Favorites UI (138 lines)
- Leads (239 lines — business lead capture)
- Connections (167 lines)
- Support (288 lines)

**Database state (verified by direct query 2026-06-13):**
- `profiles`: 2 rows (Arnel + 1 other)
- `claims`: 0 rows
- `favorites`: 0 rows
- `messages`: 0 rows
- `connections`: 0 rows
- `messages`: 0 rows

**Tables missing (blockers for "follow / dm / manage listings" features):**
- `follows` — required for follow button on player/team/rink/league profiles
- `conversations` — required for DM system; UI exists in `/dashboard/messages` but queries a non-existent table
- `conversation_participants` — required for DM system
- `listings` — required for user-managed listing CRUD
- `reviews` — only `rink_reviews` exists; reviews of teams/players/leagues have nowhere to go

---

## Phase 0 — Data Layer (BLOCKING, do first)

Until this is done, every "bug" we find in the dashboard will be a 404 from a missing table, not a real bug.

### 0.1 — Migrate to multi-type `account_type`
- Create the `account_type_enum` Postgres enum with all 10 values (`player | parent | coach | scout | referee | rink_operator | league_admin | team_admin | business | fan`)
- Create `profile_account_types` join table (see schema above)
- Backfill: for each row in `profiles.account_type` (the old column), insert one row into `profile_account_types` with `is_primary = true`
- Rename old `profiles.account_type` column to `_deprecated_account_type` (kept for 30 days, then dropped)
- Migration file: `supabase/migrations/2026-06-13-multi-account-type.sql`
- Verify: `SELECT * FROM profile_account_types;` shows expected rows, `is_primary` rules enforced
- Update `AccountTypePicker`:
  - All 10 options, multi-select (checkboxes, not radio buttons)
  - "Make primary" radio per selected option
  - "Save" persists the full set
  - "Saved. Your dashboard will personalize." stays as the success message

### 0.2 — Create `follows` table
```
follows (
  id uuid PK,
  follower_user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  followee_type text NOT NULL CHECK (followee_type IN ('player', 'team', 'rink', 'league', 'user')),
  followee_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (follower_user_id, followee_type, followee_id)
)
```
- RLS: follower can insert/delete their own rows; everyone can SELECT
- Index: (follower_user_id), (followee_type, followee_id)
- Required for: follow button on `/u/[userId]`, `/directory/teams/[id]`, `/directory/rinks/[id]`, `/directory/leagues/[id]`, `/directory/players/[id]`

### 0.3 — Create `conversations` + `conversation_participants` + extend `messages`
```
conversations (
  id uuid PK,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  context_profile_type text NULL,  -- 'player' | 'team' | 'rink' | 'league' (the listing the thread is about)
  context_profile_id uuid NULL
)
conversation_participants (
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL,  -- Clerk user id
  last_read_at timestamptz NULL,
  PRIMARY KEY (conversation_id, user_id)
)
```
- `messages` already exists, may need a `conversation_id` column to replace current schema (verify)
- RLS: a user can SELECT/INSERT only into conversations they're a participant of
- Required for: `/dashboard/messages`, `/dashboard/messages/[threadId]`

### 0.4 — Create `listings` table
```
listings (
  id uuid PK,
  owner_user_id text NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('rink', 'team', 'league', 'business')),
  claimed_entity_id uuid NULL,  -- FK to rinks/teams/leagues if claimed
  business_name text NULL,       -- only for listing_type='business' (not in directory)
  hours jsonb NULL,
  photos text[] NULL,
  contact_email text NULL,
  contact_phone text NULL,
  website text NULL,
  description text NULL,
  created_at timestamptz,
  updated_at timestamptz
)
```
- RLS: owner can do everything on their rows; everyone can SELECT published ones
- Required for: business users who aren't tied to a directory entry (pro shop, sharpening service, camp)

### 0.5 — Unify reviews
- `rink_reviews` exists. Either:
  - Rename to `reviews` with `entity_type`/`entity_id` columns, or
  - Add `team_reviews`, `player_reviews`, `league_reviews` as parallel tables
- Decision: rename to `reviews` with `entity_type` + `entity_id`. Migration preserves existing data.
- Required for: review UI on team/player/league pages

### 0.6 — Verify schema before moving on
- Run a SELECT against each new table with the service role key
- Confirm all RLS policies are enabled (`SELECT * FROM pg_policies WHERE schemaname='public'`)
- Confirm all FKs resolve

---

## Phase 1 — Profile Type Personalization

After 0.x is done, make the dashboard actually adapt to the account type.

**Status (2026-06-14):** Phase 1 shipped via PR #14 (squash-merged to main, Vercel production deploy READY). Verification: tsc clean, pnpm build green, 5/5 DB end-to-end checks, /api/account-type returns new shape `{types, primary}` on live site. All four sub-tasks (1.1, 1.2, 1.3, 1.4) done.

### 1.1 — Update `AccountTypePicker` for multi-select
- Add `parent` + `referee` options
- Rename labels: `rink → Rink Operator`, `team → Team Admin`, `league → League Admin`
- Switch from radio buttons to checkboxes (user can hold multiple types)
- Add a "primary" radio that's required once any type is selected
- API change: `POST /api/account-type` now takes an array `{ types: ['parent', 'player'], primary: 'player' }` instead of a single value
- `GET /api/account-type` returns `{ types: [...], primary: '...' }`
- The component is no longer a "picker" — it's a profile-type manager. Rename component to `AccountTypesManager` when convenient.

### 1.2 — Dashboard home (`/dashboard`) is type-aware (multi-type aware)
- A user with multiple types sees the union of sections for all their types, grouped by type
- **player:** "Your profile views this week" + "Edit player profile" + "Claim a record" (for stats line)
- **parent:** "Linked players" + "Add a player" + "Manage kid's profile"
- **coach:** "Your team" + "Roster management" + "Practice schedule"
- **scout:** "Watchlist" + "Players followed" + "Reports"
- **referee:** "Officiated games" + "Report a game" (score + incidents) + "Certifications" + "Availability"
- **rink_operator:** "Your rink" + "Hours & photos" + "Leads inbox"
- **league_admin:** "Your league" + "Standings" + "Team registration"
- **team_admin:** "Your team" + "Roster" + "Schedule"
- **business:** "Your listing" + "Leads inbox" + "Photos"
- **fan:** "Players you follow" + "Teams you follow" + "Rinks near you"
- **Everyone:** "Messages"
- Sections for the user's `is_primary` type appear at the top
- Empty state per section: icon + one-line explanation + CTA

### 1.3 — Type-based feature gating (multi-type, all free)
- **Selecting a type is free for all tiers** (no upsell on multi-select).
- Nav items shown if user holds the type:
  - "Manage listing" → rink_operator / league_admin / team_admin / business
  - "Edit player profile" → player
  - "Linked players" → parent
  - "Watchlist" → coach / scout
  - "Officiating" → referee
- Everyone sees: Messages, Profile, Subscription
- **No upsell for "add another type"** — checkboxes are open to all users.
- The Supporter/Verified/Pro upsell lives on the *transactional* features within a type (e.g. "claim another rink" once you hit the cap, "see full leads inbox" past the free limit, "export your calendar" — see "Future upsell candidates" below). Adding a type to your account never triggers a paywall.
- **Future upsell candidates (not in this plan, but worth noting):**
  - Second business listing on the same account (rink operator with 2 rinks)
  - Verified identity badges (per-type: a "Verified Coach" checkmark vs a generic "Verified")
  - Custom URL slug (e.g. `/u/arnel` instead of `/u/uuid`)
  - Calendar export / data export (multi-type users with 3 role-personalities would want this most)

### 1.4 — Empty states for every type
- Every dashboard section with no data must show: icon + one-line explanation + primary CTA
- "You haven't followed any players yet" + "Browse players →"
- Not blank pages.

---

## Phase 2 — Listings Management

Rink operators, league admins, team admins, and business users need to actually edit their listing.

**Status (2026-06-14):** Phase 2 (business scope) shipped via PR #15 (squash-merged to main, Vercel production READY). 8 files, +1184 lines.

- `/dashboard/listings` page: list + empty state + new/edit/delete UI
- `/api/listings` + `/api/listings/[id]` CRUD (owner-scoped, service role)
- `/api/listings/photos` upload (server-mediated, 5MB jpeg/png/webp)
- `/api/listings/photos/delete` for remove + reorder
- `listing-photos` storage bucket: public read, 5MB max
- Nav shows "Listings" tab only for users with `business` account type

**Rink/league/team-admin scope deferred** — those are 2.1/2.2/2.3. They edit the existing rinks/teams/leagues rows (separate tables, different write path). Business is the first new listing type because Phase 1's empty state pointed at `/dashboard/listings`. Rink/league/team-admin claim editing is already live via the `ClaimThisListing` CTA + Claims system.

**Status (2026-06-14, update):** Phase 2.5 + 2.1-2.3 shipped via PR #16 (squash-merged, Vercel production READY). 11 files, +1609 lines.

- `/businesses` + `/businesses/[id]` public directory (list + detail)
- `/api/manage/[type]/[id]` PATCH with field allowlist + per-field validation (rink/team/league)
- `/dashboard/manage/{rink|team|league}/[id]` edit pages
- `/dashboard/claims/page.tsx` rewritten to show existing claims (was just the submit form); each approved claim has a Manage button
- Top-nav Explore: added Businesses; top-nav About: added List Your Business shortcut

**Known limitations:**
- League ownership is gated by `account_type='league_admin'` only — no `league_claims` table today. When that table is added, swap the `isOwner` branch in `/api/manage/[type]/[id]/route.ts` to a claim check (same pattern as rink/team).
- `managed_relationships` table referenced by Phase 1's `dashboardTypeData` doesn't exist; the data loader catches the missing table and degrades gracefully (counts fall back to 0, sections show empty states).

### 2.1 — Rink operator
- Edit: name, address, hours (per day of week), phone, website, photos (upload to Supabase storage), amenities (checkboxes: parking, pro shop, food, skate rental, lessons, leagues)
- See incoming leads (`leads` table exists)
- Reply to leads via the existing DM system

### 2.2 — League admin
- Edit: league name, season dates, divisions, registration link
- See registered teams (or note if not tracked yet)

### 2.3 — Team admin
- Edit: team name, level (youth/adult/pro), home rink, season record
- Add/remove players (within a roster cap by tier)

### 2.4 — Business
- Create a `listings` row with `listing_type='business'`
- Edit: name, category, location, photos, contact info
- These don't appear in `/directory/[type]` — they appear in `/businesses` (new page) or as a section on the home page

### 2.5 — Photo upload
- Supabase storage bucket: `listing-photos`, public read, owner write
- Component: drag-drop multi-image uploader with reorder, max 8 photos, max 5MB each

---

## Phase 3 — Social Features (follow / save / dm)

### 3.1 — Follow
- Follow button on: player profile, team profile, rink profile, league profile, user profile
- API: `POST /api/follow` { target_type, target_id } → upsert into `follows`
- API: `DELETE /api/follow` → remove
- UI: count on profile pages ("247 followers"), follower's "Following" list on `/dashboard/profile`
- Notifications: deferred to a later phase (would need `notifications` table)

### 3.2 — Save / Favorites
- The `favorites` table exists with 0 rows. UI exists at `/dashboard/favorites`.
- Add: heart button on rink/team/player/league detail pages
- `/dashboard/favorites` should show saved items with type filter and a "remove" action

### 3.3 — DM
- Wire `/dashboard/messages` to the new `conversations` table
- "Message" button on every profile page (player, team, rink, league, user)
- Thread list: most recent first, unread count badge
- Thread view: messages, send box, real-time refresh (poll every 5s, defer WebSocket for later)
- Block list: deferred to later phase (would need `blocks` table)

**Status (2026-06-14):** Phase 3 shipped via PR #17 (squash-merged to main, Vercel production READY). 17 files, +1196/-131.

- `/api/follow` GET/POST/DELETE — rate-limited, idempotent upsert, returns follower count
- `/api/favorites` extended to support `league` + `business` (migration: `favorites_favorite_type_check` updated)
- `src/components/SocialActions.tsx` — client component combining follow + save + message in one toolbar; optimistic toggles, server count reconciliation, sign-in redirect for unauthenticated users
- `src/lib/ownership.ts` — `getEntityOwner()` + `getFollowersCount()` helpers used by every detail page
- `src/app/dashboard/favorites/page.tsx` rewritten as a thin server loader + client shell with type filter pills + remove buttons
- `src/app/dashboard/favorites/FavoritesClient.tsx` — client component (new)
- `src/app/dashboard/profile/FollowingList.tsx` — "Following" section on the dashboard profile
- `/directory/{rinks,teams,players,leagues}`: SocialActions wired into each detail page (Follow + Save on all; Message on rink/team/player)
- `/u/[userId]`: Follow button added next to the existing ConnectButton

**Known follow-ups:**
- "Message" requires an accepted connection. On rink/team/player/league, the user sees the connection-required error after tapping Message. Adding a "Send connection request" path on the same button is a UX improvement, deferred.
- League ownership has no claim path today. SocialActions on `/directory/leagues/[id]` only renders Follow + Save (no Message).
- Real-time updates (WebSocket) deferred — existing 5s poll in the messages thread is unchanged.

---

## Phase 4 — Polish / Bug Hunt

This is the "make sure it works" phase. After 0–3 are done:

### 4.1 — Per-type test pass
- Create 9 test accounts (one per type) using Clerk
- Walk through every dashboard page for each type
- Screenshot anything broken
- File each bug as a separate issue

### 4.2 — Mobile pass
- Test all dashboard pages on phone viewport (Chrome devtools)
- Bottom-nav or hamburger? Current layout uses sidebar — verify it collapses correctly

### 4.3 — Auth edge cases
- Sign out from inside a dashboard page — does it redirect cleanly?
- Session expired mid-edit — what happens?
- Two devices, two sessions — same user sees same data?

### 4.4 — Permissions pass
- Log in as a `free`-tier user, try to access Pro-only features — should be blocked, not broken
- Try to view another user's `/dashboard/*` URL — should redirect

### 4.5 — Performance
- Dashboard page load < 2s on 3G
- Favorites list < 1s for 100 items
- DM thread loads < 1s for 50 messages

---

## What I will NOT do in this plan (and why)

- **Real-time anything** — polling is fine for v1. WebSockets, websub, Supabase realtime channels — later.
- **Push notifications / email digests** — needs SendGrid/Resend + a job runner. Defer.
- **Verification badges / KYC** — would need Stripe Identity or a third-party KYC. Defer.
- **Multi-language** — the picker is English-only. Add later.
- **Mobile app** — web responsive is enough for marketing.

---

## How to track this

- This file is the source of truth.
- When a phase is done, I update the file with a ✅ and the date, and post a one-line summary in the C-Suite group.
- New bugs found during Phase 4 get added as items under 4.x.

Last updated: 2026-06-13
