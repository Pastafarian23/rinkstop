# Piece G1b Prep — Team Events CRUD

## Scope

Wire up the existing `team_events` table with full UI (list/detail/create/edit/delete), add the missing schema columns (`is_off_ice`, `practice_plan_id`), and provide an API for create/update/delete.

**G1b is intentionally UI-heavy but API-light** because the `team_events` schema is already in place. We are NOT rebuilding the schema — only adding two nullable columns and exposing what's there.

## Migration (new)

**File**: `supabase/migrations/2026-06-26_team_events_off_ice_and_plan_link.sql`

Two additive, nullable columns. No NOT NULL, no CHECK constraint changes (existing constraints stay intact).

```sql
-- 1. Off-ice flag (per Q5: just a type of practice, not a new entity)
ALTER TABLE team_events
  ADD COLUMN IF NOT EXISTS is_off_ice BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Optional practice plan link (per Q6: optional, not required)
ALTER TABLE team_events
  ADD COLUMN IF NOT EXISTS practice_plan_id UUID
    REFERENCES practice_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_team_events_plan
  ON team_events(practice_plan_id) WHERE practice_plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_events_off_ice
  ON team_events(is_off_ice) WHERE is_off_ice = TRUE;
```

**Why safe:**
- Both columns are nullable (or have a safe default) — no existing row gets a NOT NULL violation
- `practice_plan_id` uses `ON DELETE SET NULL` — if a plan is deleted, events don't break
- Indexes are partial (only on non-null / TRUE rows) — small footprint
- No CHECK constraint changes
- No RLS changes — existing policies still apply
- Reversible: `ALTER TABLE team_events DROP COLUMN IF EXISTS is_off_ice;` etc.

## Files to create

### API

1. **`src/app/api/team/[slug]/events/route.ts`** (extend existing G1a GET handler)
   - `GET`: list all events for the team (currently returns `[]`; G1b adds the query)
   - `POST`: create new event — **tier-gated** (paid tier required)
   - Both return JSON
   - Membership check: any team member can read; only paid-tier members can write

2. **`src/app/api/team/[slug]/events/[id]/route.ts`** (new)
   - `GET`: single event detail (any team member)
   - `PATCH`: update event — **tier-gated**
   - `DELETE`: delete event — **tier-gated**
   - Author check: only `created_by` user OR team_admin role can PATCH/DELETE

### Pages (UI)

3. **`src/app/dashboard/team/[slug]/events/page.tsx`** (new — list view)
   - Server component, queries `team_events` for the team
   - Sorts by `starts_at DESC` (upcoming first)
   - Filters by `event_kind` (chips at top)
   - "New event" CTA button (visible only to paid-tier members)
   - Each row: title, kind badge, start time, location note, RSVP count
   - Empty state: "No events yet. Create the first one."
   - Dark theme (matches Piece F pattern)

4. **`src/app/dashboard/team/[slug]/events/new/page.tsx`** (new — create form)
   - Server component shell, client component form inside
   - Fields: title, description, event_kind, starts_at, ends_at, rink_id (dropdown of team's rinks), arrival_minutes, opposing_team (game only), location_note, is_off_ice checkbox, practice_plan_id (optional dropdown), rsvp_required, rsvp_deadline, max_attendees, cost_per_player, currency
   - Tier-gate UI: if free tier, show upgrade CTA instead of form
   - On submit: POST to `/api/team/[slug]/events` → redirect to detail page
   - Dark theme

5. **`src/app/dashboard/team/[slug]/events/[id]/page.tsx`** (new — detail)
   - Server component, queries single event + RSVP count
   - Shows: title, kind, full description, start/end, arrival, rink, RSVP details, cost, status
   - Edit / Delete buttons (paid tier only, only if user created it or has admin role)
   - RSVP section (links to G2 in next session)
   - Dark theme

6. **`src/app/dashboard/team/[slug]/events/[id]/edit/page.tsx`** (new — edit form)
   - Same form as `/new`, prefilled
   - PATCH on submit → redirect to detail page
   - Tier-gated

### Components

7. **`src/components/team/EventForm.tsx`** (new — shared client form)
   - Used by `/new` and `/[id]/edit`
   - All fields above
   - Uses `useTransition` for optimistic UX
   - Dark theme tokens

8. **`src/components/team/EventKindBadge.tsx`** (new — small chip)
   - Color-coded by `event_kind`
   - practice: gold | game: red | tournament: purple | tryout: teal | meeting: blue | team_event: neutral

9. **`src/components/team/EventListItem.tsx`** (new — single row)
   - Used in list view
   - Title, kind badge, time, location note

## Files NOT changed in G1b

- `team_events` table data — only additive columns, no row changes
- `team_rsvps` table — touched in G2
- `payments` / `payment_records` — touched in G3
- Existing payment routes — tier gate applied in G3
- `/dashboard/schedule/page.tsx` — replaced by G1c's calendar surface
- Other dashboard pages

## Tier gate placement

Helper imported from `src/lib/tier-gate.ts` (shipped in G1a).

- `GET` endpoints: any team member (any tier, even free) — viewing a team's events is a baseline team-member right
- `POST` / `PATCH` / `DELETE`: `hasTeamAdminAccess(userId).allowed === true` — paid tier required

UI mirrors the API:
- Free-tier users see events but no "New event" / "Edit" / "Delete" buttons
- Free-tier users clicking a hidden deep link to `/new` see an upgrade CTA instead of the form

## Must-keep-working (audit checklist)

After G1b ships:
1. ✅ Existing `/dashboard/plans` pages still load (Piece F work untouched)
2. ✅ Existing `/dashboard/team/[slug]` page still loads (root team page)
3. ✅ Existing `/dashboard/team/[slug]/payments` still works
4. ✅ Identity verification gate (Piece C) still works
5. ✅ Coach card shows "Coaching 1 team" (Piece B fix preserved)
6. ✅ Didit integration still works (Piece D/D2)
7. ✅ Verify-identity banner still appears for revoked users (Piece E)
8. ✅ Existing team_events rows (if any) still readable via the new API
9. ✅ No 500s on `/dashboard`, `/dashboard/plans`, `/dashboard/team/*`
10. ✅ Migration runs cleanly on live DB (idempotent — `IF NOT EXISTS`)

## Out of scope (deferred to G1c/G2/G3)

- Calendar views (month/week/day/agenda) — G1c
- ICS export, share token, print CSS — G1c
- RSVP self-service for players — G2
- Attendance coach check-in UI — G2
- Bulk mark-paid, payment tier gate, CSV export polish — G3

## Rollback plan

If G1b breaks anything:
1. `git revert <G1b-commit-sha>` + `git push origin main` → reverts in ~30s
2. Migration rollback: `ALTER TABLE team_events DROP COLUMN IF EXISTS is_off_ice, practice_plan_id; DROP INDEX IF EXISTS idx_team_events_plan, idx_team_events_off_ice;`
3. Vercel auto-deploys the revert

## Ship plan

1. Write this prep doc (DONE)
2. Show Arnel, ask "go"
3. Ship in order:
   - Commit 1: migration file
   - Commit 2: API routes (GET, POST, PATCH, DELETE)
   - Commit 3: pages (list, new, detail, edit)
   - Commit 4: shared components (EventForm, EventKindBadge, EventListItem)
4. Audit each commit before next
5. Final audit: type-check + curl smoke test + visit each page
6. Log to `memory/2026-06-24.md`