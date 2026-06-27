# Piece G Prep — Team Manager/Admin: Calendar, Attendance, Payments

**Status**: scope locked 2026-06-24 21:56 CDT after Arnel answered Q1–Q7 (msg #23809).

## Confirmed answers (locked)

**Q1. Calendar views**: month / week / day / agenda — **all four**. Filterable by team and event-kind. **NEW: ICS export + shareable URL + print-friendly view**.

**Q2. Attendance**: per-player status. Required: `present | absent`. Optional (coach adds if needed): `late`, `excused`.

**Q3. Tier gate**: all paid tiers get admin features. **NOTE**: the tier names I had in MEMORY.md (`Founding Fan`, `Verified`, `Elite`, `Family Plus`) are placeholders, NOT approved names. Arnel hasn't named the actual tiers yet. Treat `tier IN ('paid')` semantically — a user with any non-free Stripe subscription gets team_admin. Stripe customer metadata holds the canonical tier name; we don't hardcode it in code.

**Q4. Per-team subscription**: user's subscription grants access — NOT per-team. One subscription, multiple teams.

**Q5. Off-ice training**: just a type of practice. Use `event_kind='practice'` + new boolean `is_off_ice` column (or `location_note` containing "off-ice" tag). NOT a separate table.

**Q6. Practice plans on calendar**: optional. Calendar events exist standalone. Linking to `practice_plans.id` is a feature, not a dependency. Add a nullable `practice_plan_id` FK in G1 (optional FK), populate later.

**Q7. Phase 1 payment fields** (confirmed):
- `status`: `paid | pending | overdue | waived`
- `amount_due` (per player, in team currency)
- `due_date`
- `paid_at` (timestamp, null if pending)
- `paid_method`: `manual_cash | manual_bank | manual_other | stripe | paymongo` (nullable; only `manual_*` used in Phase 1)
- `notes`

## Existing infrastructure (audit findings, 2026-06-24)

**Already built** (no need to recreate):

1. **`team_events` table** (migration `2026-06-18_team_workspace.sql`, lines 111–140):
   - Fields: `id`, `team_id`, `rink_id`, `event_kind` (`practice|game|tournament|tryout|meeting|team_event`), `title`, `description`, `starts_at`, `ends_at`, `arrival_minutes`, `cost_per_player`, `currency`, `rsvp_required`, `rsvp_deadline`, `max_attendees`, `opposing_team`, `location_note`, `status` (`scheduled|cancelled|completed`), `created_by`
   - Constraints: time order check, status check
   - Indexes: team_id, team_id+time, rink_id+time, status

2. **`team_rsvps` table** (same migration, lines 145–160):
   - Fields: `id`, `event_id`, `user_id`, `response` (`yes|no|maybe`), `note`, `responded_at`, `updated_at`
   - Unique constraint on (event_id, user_id)
   - Indexes: event_id, user_id, event_id where response='yes'

3. **`payments` + `payment_records` tables** (migration `2026-06-20_team_payments.sql`):
   - `payments`: `id`, `team_id`, `title`, `description`, `amount_per_player`, `currency`, `convenience_fee_pct`, `due_date`, `status`, `recurrence` (NULL|weekly|biweekly|monthly), `parent_payment_id`, `sequence_number`, `created_at`
   - `payment_records`: `id`, `payment_id`, `player_id`, `status`, `amount_paid`, etc.
   - Recurring payments supported (already shipped)

4. **Existing payment pages**:
   - `/dashboard/team/[slug]/payments` — list page
   - `/dashboard/team/[slug]/payments/new` — create form
   - `/dashboard/team/[slug]/payments/[id]` — detail page
   - `/dashboard/payments` — global payments dashboard
   - `/dashboard/manage/team/[id]/payments` — admin variant

5. **Existing payment API**:
   - `/api/team/[slug]/payments` (GET, POST)
   - `/api/team/[slug]/payments/[id]/generate-next`
   - `/api/team/[slug]/payments/[id]/export`
   - `/api/team/[slug]/payments/[id]/bulk-mark-paid`
   - `/api/team/[slug]/payments/[id]/records` (CRUD)
   - `/api/team/[slug]/payments/[id]/records/[recordId]/create-checkout` (Stripe + PayMongo)
   - `/api/webhooks/paymongo` (PH webhook handler already wired)

6. **Schedule stub**: `/dashboard/schedule/page.tsx` — placeholder marked "Q3 2026" with feature list

**Missing UI** (the actual work for this piece):

1. **Team events CRUD** — no UI exists for the `team_events` table
2. **Calendar view** — no visual calendar surface exists
3. **Attendance tracking** — `team_rsvps` exists but no coach/manager UI to see/track
4. **Payment UX polish** — payments exist but tier-gating and admin views need polish
5. **Tier gate helper** — no shared function for "user has paid subscription"

## Piece breakdown (locked)

Splitting G1 into 3 sub-pieces for safer shipping. Total: 5 sub-pieces.

### G1a — Tier Gate Helper (small, ships first, unblocks G2/G3/G4)
- New file: `src/lib/tier-gate.ts`
- Function: `async function hasTeamAdminAccess(userId: string): Promise<{ allowed: boolean; reason: string; tier: string | null }>`
- Logic: reads Clerk user's `publicMetadata.tier` (or Stripe customer.subscription.status); checks if it's `free` (denied) vs anything else (allowed)
- One small API route as smoke test: `/api/team/[slug]/events` (returns 402 with `{ error: 'paid_tier_required', upgradeUrl: '/pricing' }` if blocked)
- **Files**:
  - `src/lib/tier-gate.ts` (new)
  - `src/app/api/team/[slug]/events/route.ts` (new, minimal GET that calls `hasTeamAdminAccess`)
- **Migration**: none
- **Ship**: 1 commit

### G1b — Team Events CRUD (no calendar view yet, list+detail+create+edit+delete)
- New migration: add `is_off_ice` BOOLEAN, `practice_plan_id` UUID (FK to `practice_plans.id`, nullable) to `team_events`
- Files:
  - `src/app/dashboard/team/[slug]/events/page.tsx` (new — list view, sorted by date, filter by event_kind)
  - `src/app/dashboard/team/[slug]/events/new/page.tsx` (new)
  - `src/app/dashboard/team/[slug]/events/[id]/page.tsx` (new — detail)
  - `src/app/dashboard/team/[slug]/events/[id]/edit/page.tsx` (new)
  - `src/components/team/EventForm.tsx` (new — shared create/edit form, tier-gated submit)
  - `src/app/api/team/[slug]/events/route.ts` (extend existing from G1a — POST creates)
  - `src/app/api/team/[slug]/events/[id]/route.ts` (new — GET, PATCH, DELETE)
- **Tier gate**: applied at API level on POST/PATCH/DELETE; GET allowed for any team member
- **Ship**: 1 commit

### G1c — Calendar Views + Export/Share/Print (the visual surface)
- Files:
  - `src/app/dashboard/team/[slug]/schedule/page.tsx` (new — replaces stub, default month view)
  - `src/components/team/TeamCalendar.tsx` (new — month/week/day/agenda toggle)
  - `src/components/team/EventBadge.tsx` (new — color-coded per event_kind)
  - `src/app/api/team/[slug]/events/ics/route.ts` (new — returns ICS file for Apple/Google/Outlook)
  - `src/app/dashboard/team/[slug]/schedule/share/[token]/page.tsx` (new — shareable public-readonly view)
  - `src/app/api/team/[slug]/events/share/route.ts` (new — POST generates share token, GET validates)
- Print: CSS @media print rules on the calendar view (no separate route needed)
- ICS export: standard VEVENT format, includes start/end/summary/location/description
- Share token: 32-char random, scoped to a team's published events, revocable
- **Tier gate**: applied on event CREATION (already gated by G1b); calendar viewing open to any team member
- **Ship**: 1 commit

### G2 — Attendance (RSVP + check-in)
- Migration: ALTER `team_rsvps` ADD COLUMN `attended` TEXT CHECK (`attended` IN ('present','absent','late','excused')), `attended_at` TIMESTAMPTZ, `attendance_note` TEXT, `marked_by` TEXT REFERENCES profiles(user_id)
- Files:
  - `src/app/dashboard/team/[slug]/events/[id]/attendance/page.tsx` (new — roster + status checkboxes)
  - `src/app/api/team/[slug]/events/[id]/rsvp/route.ts` (new — player self-RSVP yes/no/maybe)
  - `src/app/api/team/[slug]/events/[id]/attendance/route.ts` (new — coach bulk mark, single mark, list)
  - `src/components/team/AttendanceRoster.tsx` (new — check-in UI with per-row dropdown + bulk mark-all-present)
- Tier gate: coach/manager only (not player) for marking attendance; players can mark their own RSVP
- **Ship**: 2 commits (migration + UI/API in separate commits)

### G3 — Payment UX polish + Tier Gate Application
- Apply `hasTeamAdminAccess` to all `/api/team/[slug]/payments/*` mutation routes
- Polish existing `/dashboard/team/[slug]/payments/page.tsx`:
  - Phase 1 fields already exist in `payment_records` (verified in schema)
  - Add bulk-mark-paid UX: select all unpaid rows → "Mark paid" button → choose `paid_method` → submit
  - Add CSV export button (already wired via `/export` endpoint, just need button)
  - Status filter pills (All / Pending / Paid / Overdue / Waived)
  - Sortable columns
- Files:
  - `src/app/api/team/[slug]/payments/[id]/bulk-mark-paid/route.ts` (existing — verify tier gate + add `paid_method` support)
  - `src/app/dashboard/team/[slug]/payments/page.tsx` (existing — polish)
  - `src/components/payments/PaymentStatusPill.tsx` (new)
  - `src/components/payments/BulkMarkPaidModal.tsx` (new)
- **Tier gate**: POST/PATCH/DELETE on payment routes requires paid tier; GET allowed for any team member
- **Ship**: 2 commits

### G4 (later) — Stripe + PayMongo integration polish
- Verify existing `/create-checkout` endpoints work end-to-end
- Polish error paths, refund flow, receipt UI
- Add pay-method selector on payment records (Stripe / PayMongo / manual)
- Test webhook handlers with sandbox events

### G5 (deferred) — Off-ice training as a flag
- Implemented as part of G1b migration (`is_off_ice BOOLEAN` column)
- UI: checkbox on EventForm, badge on calendar event, filter pill

## Ship order (proposed)

1. **G1a** (tier gate) — must come first; unblocks everything
2. **G1b** (events CRUD) — provides data the calendar will show
3. **G1c** (calendar + export/share/print) — visual surface
4. **G2** (attendance) — coach check-in flow
5. **G3** (payments) — last, since payments touch existing routes
6. **G4** (Stripe/PayMongo) — later
7. **G5** — already in G1b (just `is_off_ice` flag)

Estimated: 5 commits per sub-piece = 25 commits total over multiple sessions. Each sub-piece gets its own prep doc + audit + ship cycle.

## Will NOT change (out of scope)

- Practice plans system (separate from calendar; calendar events can LINK to plans via FK in G1b)
- Player profile pages
- Public team pages
- Stripe dashboard / PayMongo account configuration (assumed already done by Arnel)
- Migration of `pract