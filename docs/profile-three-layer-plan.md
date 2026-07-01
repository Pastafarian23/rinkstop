# 3-Layer Profile Model — Build Plan

## Goal

A user has ONE account. From that account they can wear MULTIPLE hats
(player, coach, referee) and steward MULTIPLE real-world records
(their own player record, their kid's player record, the teams they coach,
the leagues they admin). Their public profile at `/profile/[username]`
shows all hats and all stewarded records in one place.

## What is already built (verified 2026-07-01)

### Schema
- `profile_account_types` (migration `2026-06-13-multi-account-type.sql`)
  — rows of `(user_id, account_type, is_primary)` with `account_type_enum`
  covering 13 values: `team, league, player, coach, scout, referee,
  rink_operator, league_admin, team_admin, business, fan, parent`.
  CASCADE delete on `profiles.user_id`.
- `managed_profiles` (migration `2026-06-18_team_workspace.sql`)
  — `(id, manager_user_id, profile_type, profile_id, relationship, …)`.
  `profile_type` ∈ `{player, team, league}`. `relationship` ∈
  `{self, parent, guardian, spouse, head_coach, …}`.
  Has `parent_consent_*` columns for minors.
- `players`, `teams`, `leagues` tables all exist (used by
  `/api/profiles/managed` hydration).

### API
- `POST/GET /api/account-type` — replace user's full account-type set,
  set primary. Uses canonical-user-id fallback.
- `POST/GET/DELETE /api/profiles/managed[/:id]` — CRUD on managed
  records. Gated by tier (`roster+` for player-stewardship,
  `pro+` for team/league). Player-stewardship only allows youth
  (`birth_date` < 18 years ago).
- `GET /api/profiles/managed?userId=X` — public read of someone
  else's stewarded records.
- `GET /api/my-teams` — team_workspaces membership + role.
- `GET /api/staff/[role]` — directory listing (NHL import, not relevant).

### UI
- `/profile/[slug]` (312 lines) — already renders:
  - `<AccountTypeBadges types primary />` in header
  - "Connected profiles" section rendering `managed[]` as cards linking to
    `/directory/{type}s/{profile_id}` (note: `/players/[id]` does not
    exist yet — these links currently land on the index with a filter)
- `/components/AccountTypePicker.tsx` — multi-select with primary toggle,
  calls `/api/account-type`. Already mounted on `/dashboard/page.tsx`
  (lines 517, 583).
- `/components/AccountTypeBadges.tsx` — read-only display.
- `/components/RoleAwareTabBar.tsx` — mobile tab bar that picks tabs
  per primary account_type. Multi-role users get a "Switch role" entry
  in the avatar menu (active role stored client-side).
- `/dashboard/layout.tsx` — reads account_types for nav (lines 132–146)
  + owner-email canonical fallback.

### Partial features (already exist, may need polish)
- `/dashboard/family/page.tsx` — tier-gated listing of managed profiles
  where `relationship ∈ {parent, guardian}`.
- `/dashboard/manage/league/[id]/page.tsx` — edit a league, gated by
  `league_admin` account_type.

## What needs to be built (this PR sequence)

Per 2026-06-25 deploy rule: small, one-piece commits on `main`. Each
commit gets its own ship-gate (build + grep-verify imports resolve).

### Piece 1 — `/profile/[slug]` polish (display only, no new logic)

Surface the data more clearly:

1.1. **Promote the account-type badges above the bio** as a "Roles" hero
     section. Currently they're tiny pills next to the tier pill —
     easy to miss. Show them as a labelled row of larger badges.

1.2. **Section the "Connected profiles" by relationship tier**:
     - "Records I steward" — `relationship = 'self'` → the user owns
       (their own player record, their own team record, etc.).
     - "Teams I run" — `relationship ∈ {head_coach, owner, manager}`.
     - "Leagues I admin" — `relationship ∈ {league_admin, …}`.
     - "Family I manage" — `relationship ∈ {parent, guardian, spouse}`.

1.3. **Fix the broken link path AND the broken join.** The current
     query is `managed_profiles → profile:profiles(*)` which joins to
     the manager's own `profiles` row, not to the linked
     `players`/`teams`/`leagues` row. As a result every "Connected
     profiles" card shows the manager's own display name. Replace
     with three separate queries (one per `profile_type`) hydrated
     into a `{name, slug, headshot_url|logo_url}` shape, matching
     what `/api/profiles/managed/route.ts` already does correctly.
     Link target: `/players/[id]` for players (Piece 2), `/teams/[id]`
     for teams, `/leagues/[id]` for leagues (check those exist).

1.4. **Empty-state UX.** When a user has no account_types set, the
     header should show a friendly "Add your roles →" link to
     `/dashboard` (where the AccountTypePicker lives). When
     `managed[]` is empty, hide the "Connected profiles" section
     entirely (already the current behavior).

> **Note added 2026-07-01:** Item 1.3 is bigger than a UI polish
> because the current join is broken (manager's own profile row is
> returned in place of the linked player/team/league). Without fixing
> it, sections 1.1, 1.2, 1.4 are visible cosmetic on top of wrong
> data. The fix uses the same hydration pattern that already works in
> `/api/profiles/managed/route.ts`.

### Piece 2 — `/players/[id]` player detail page

The single largest gap. Right now managed_profiles rendering a player
card links to `/directory/players/{id}` which is the index filtered by
`?playerId={id}` — works but ugly.

2.1. **Create `src/app/players/[id]/page.tsx`** as a server component
     that fetches one row from `players` by id. ~80 lines.
     - Show: name, headshot, position, jersey, dob, nationality,
       current team (join `teams`), stats (if any career stats
       table).
     - `generateMetadata()` for OG tags.
     - `notFound()` if missing.

2.2. **Update the managed-profile link** in `/profile/[slug]` to point
     at `/players/[id]` instead of `/directory/players/[id]`. One-line
     change.

2.3. **Owner gating.** If the player record is for a youth (under 18)
     AND the viewer is not the steward, blur non-public fields
     (birth_date, contact). For now: just hide birth_date for everyone
     who is not the steward or an admin. ~10 lines.

2.4. **Canonical user_id** for any edit-link rendering. The
     `/players/[id]/page.tsx` should fetch the player's `managed_profile`
     for the current viewer; if `relationship = 'self'`, render an
     "Edit this player record" link to `/dashboard/manage/player/[id]`.

### Piece 3 — `/dashboard/roles` page (replace inline AccountTypePicker)

Currently the AccountTypePicker is rendered inline on the dashboard
home at lines 517 and 583 — it's duplicated and hard to find. Move it
to its own dedicated page.

3.1. **Create `src/app/dashboard/roles/page.tsx`** as a server
     component that loads the current user's account types and
     managed profiles, then renders two panels:
     - "Your roles" — the existing `AccountTypePicker`.
     - "Linked records" — a new component (Piece 3.2).

3.2. **Create `src/components/LinkedRecordsManager.tsx`** — client
     component that lists the user's managed profiles, grouped by
     `profile_type`, with "Add" / "Remove" buttons. Calls
     `/api/profiles/managed` for GET + POST + DELETE.
     - Player add: search-by-name picker (calls new search endpoint
       in Piece 3.3). Relationship defaults to `self` for own record,
       `parent` otherwise.
     - Team add: search-by-name picker. Relationship is fixed at
       `head_coach` (later: dropdown for full role set).
     - League add: search-by-name picker. Relationship fixed at
       `league_admin`.

3.3. **Create `GET /api/search/[type]/route.ts`** — search-by-name
     across `players`, `teams`, `leagues`. Cheap, server-side, with
     rate limiting. ~50 lines.

3.4. **Add nav link** to `/dashboard/roles` from the dashboard
     sidebar (only for signed-in users). One-line change in
     `dashboard/layout.tsx`.

3.5. **Remove the duplicate inline** `<AccountTypePicker />` mounts
     from `dashboard/page.tsx` lines 517 and 583. Replace with a
     single "Manage roles & records" link card pointing to
     `/dashboard/roles`.

### Piece 4 — Verify `RoleAwareTabBar` for multi-role cases

The tab bar picks tabs based on `primary` role. For users who are
both `player` AND `coach`, we want to make sure:
- The primary determines the default tabs.
- The "Switch role" entry in the avatar menu lets them switch
  active role client-side.
- When they switch, the tab bar re-renders with the new role's tabs.

4.1. **Test all 13 enum values.** Walk through each value's tabs and
     confirm:
     - The route exists OR there's a stub at `/dashboard/_stubs/`.
     - The `match` predicate correctly highlights when the user is on
       that page.

4.2. **Multi-role edge case.** If primary=`player`, secondary=`coach`,
     switching to "coach" should swap the tabs. Verify localStorage
     persistence (the design says active role is read client-side from
     localStorage; if not present, fall back to primary).

4.3. **Stub routes.** The code references `/dashboard/manage/team/_stub/payments`
     and `/dashboard/manage/team/_stub/compliance`. These are
     placeholders. Either build them as real pages or remove them
     from the tab config.

### Piece 5 — "Edit a stewarded record" pages

For each `profile_type`, build the corresponding edit page that the
managed profile link points to.

5.1. **`/dashboard/manage/player/[id]`** — exists? check.
     Lets the user edit the player record they steward.

5.2. **`/dashboard/manage/team/[id]`** — exists? check.
     Lets the user edit the team record they steward.

5.3. **`/dashboard/manage/league/[id]`** — already exists.
     No work needed here unless we find a bug during 5.1/5.2.

## Files that will be touched

(I will verify each path exists before editing.)

- `src/app/profile/[slug]/page.tsx` — Pieces 1.1, 1.2, 1.3, 1.4
- `src/app/players/[id]/page.tsx` — NEW, Piece 2.1
- `src/app/players/[id]/not-found.tsx` — NEW, ~10 lines
- `src/app/dashboard/roles/page.tsx` — NEW, Piece 3.1
- `src/components/LinkedRecordsManager.tsx` — NEW, Piece 3.2
- `src/app/api/search/[type]/route.ts` — NEW, Piece 3.3
- `src/app/dashboard/page.tsx` — Pieces 3.5 (remove inline picker)
- `src/app/dashboard/layout.tsx` — Piece 3.4 (nav link)
- `src/components/RoleAwareTabBar.tsx` — Piece 4 audit + fixes

## Files that must NOT change

Per "Everything working must be preserved":

- `src/app/dashboard/page.tsx` data-loading (lines 235–260) — only
  remove the UI mount, NOT the data fetch (other code reads `types`).
- `src/app/api/account-type/route.ts` — already correct, don't touch.
- `src/app/api/profiles/managed/route.ts` — already correct, don't touch.
- `src/lib/admin-auth.ts` — canonical user_id helper, don't touch.
- `src/components/AccountTypePicker.tsx` — already correct, just move it.
- The 9 existing `/dashboard/team/*`, `/dashboard/manage/*`, etc. pages.

## Verification checklist (per the 2026-06-24 ship gate)

For each piece commit:

1. `pnpm run build` exits 0
2. For every staged file: every import resolves to a file TRACKED in git
   at HEAD (the verification script in `TOOLS.md`)
3. `git diff --cached --name-only` matches the planned scope
4. Smoke tests on production after deploy:
   - `/profile/[existing-slug]` still loads, still shows account_types + managed
   - `/dashboard/roles` loads, picker still works, save still works
   - `/players/[some-id]` loads, notFound() works for missing
   - Multi-role: switch role in mobile tab bar, tabs re-render

## Rollback plan

Per 2026-06-25: `git revert <merge-commit> + git push origin main`.
Vercel redeploys the previous commit in ~30 seconds.

If Piece 2 (`/players/[id]`) breaks production: revert just that
commit. Pieces 1, 3, 4, 5 are independent and can ship separately.