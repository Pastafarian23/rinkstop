# Tier 2 — Federation Verification Workflow

**Date:** 2026-07-23
**Author:** KiloClaw (proposed), Arnel-approved scope
**Status:** DRAFT — pre-implementation
**Related:** `passport-roadmap.md` §Tier 2, `passport-roadmap-STATUS.md`

---

## TL;DR

Build the **federation/license number submission + admin verification workflow** for players, coaches, and referees. Each persona submits their federation-issued ID for admin approval; admin reviews and approves/rejects; user can edit freely before submission, but once submitted the number is locked unless the user explicitly "withdraws" the submission to edit and resubmit.

The workflow is the same across personas. What differs is the source-of-truth column being replaced and where the UI lives.

---

## What's already on disk (verified 2026-07-23)

### Players
- ✅ `players.usa_hockey_number TEXT` — column exists (migration `2026-07-10_hockey_passport_v1.sql` line 339)
- ✅ `players.hockey_canada_number TEXT` — column exists
- ✅ `players.primary_position_category TEXT` — column exists
- ✅ `/dashboard/passport/federation` — self-serve form page (`FederationFormClient.tsx`, 203 lines)
- ✅ `PATCH /api/passport/federation` — saves numbers to `players.*` (114 lines, no submission state)

### Coaches
- ✅ `coach_profiles.license_number TEXT` — free-text, no submission state
- ✅ `coach_profiles.license_issuing_authority TEXT` — no FK to `federations`
- ✅ `coach_profiles.license_expires_at DATE` — expiry field exists but unused
- ✅ `coach_profiles.verification_status` — enum already includes `'federation_verified'`
- ❌ No coach-side UI to manage license number
- ❌ No admin queue entry for coach licenses

### Referees
- ✅ `referee_game_assignments`, `referee_attendance`, `referee_payments` tables exist (WS4 PR2, PR #44)
- ❌ No federation license column on any referee table
- ❌ No UI to manage referee credentials
- ❌ No admin queue entry for referee credentials

### Federations (directory)
- ✅ `federations` table — directory of federations (USA Hockey, Hockey Canada, etc.) — migration `2026-07-11_federation_org_hierarchy.sql`
- ✅ `organizations` table — with `federation_id` FK

### Universal gaps
- ❌ **`federation_registrations` table** — DOES NOT EXIST
- ❌ **Admin verification queue** — `/admin/` has no federation subroute
- ❌ **Public passport display of verification status** — partial, needs adapter update
- ❌ **Submission/approval state machine** — anyone can edit forever

---

## User flow (Arnel-defined, 2026-07-23 12:05 UTC, extended 12:36 UTC for coaches/referees)

The flow is identical across all three personas. What's different is the source-of-truth column and the UI page.

### Player flow
1. **Edit freely (unsubmitted)**
   - User can type/edit USA Hockey # and Hockey Canada # as much as they want before submitting
   - Number sits in `federation_registrations` as `submission_status='draft'`

2. **Submit for approval**
   - User clicks "Submit for verification"
   - Number is locked from editing
   - Status becomes `submission_status='pending'`
   - Appears in admin verification queue
   - Audit row: `submitted_at`, `submitted_by`

3. **Admin review**
   - Admin reviews at `/admin/federation-registrations`
   - Approves → `submission_status='approved'`, `verified_at`, `verified_by`
   - Rejects → `submission_status='rejected'`, `rejection_reason`, `verified_at`, `verified_by`

4. **Locked edit after submission**
   - User CANNOT edit the number while `pending` or `approved`
   - User CAN click "Withdraw submission" to reset to `draft` (then edit + resubmit)
   - Admin rejection also unlocks (status returns to `draft`, reason shown)

5. **Public passport display**
   - Public `/passport/[id]` shows federation badge
   - Badge states: unverified (gray), pending (amber), approved (green), rejected (red, clickable for reason)

### Coach flow
1. Coach navigates to `/dashboard/coach/credentials` (NEW page)
2. Edits `license_number` + selects `license_issuing_authority` from a dropdown of federations (was free-text, now FK)
3. Optionally sets `license_expires_at`
4. Submits → locks → admin verifies
5. Withdraw to edit + resubmit on rejection
6. Public coach profile shows federation-verified badge

### Referee flow
1. Referee navigates to `/dashboard/referee/credentials` (NEW page)
2. Federations relevant to referees: IIHF, USA Hockey Officiating, Hockey Canada Officiating, etc. Some countries have separate referee federations from player federations — need to track which federations offer referee certifications.
3. Submits → locks → admin verifies
4. Withdraw + edit + resubmit
5. Public referee profile shows badge

### Schema polymorphism strategy

Three options considered:

**Option A — One table per persona (`federation_registrations`, `coach_federation_registrations`, `referee_federation_registrations`)** — duplicated state machine, repeated migrations, but each table is persona-scoped and trivial to RLS.

**Option B — Single `federation_registrations` table with a polymorphic `subject_type` (`player` | `coach` | `referee`) + `subject_id` UUID** — one state machine, but FK constraints aren't enforceable across types, RLS policies get ugly fast.

**Option C — Single `federation_registrations` table with three nullable FK columns (`player_id`, `coach_id`, `referee_user_id`) + a CHECK that exactly one is set** — one state machine, RLS works via the FK columns, partial indexes per persona, single admin queue view.

**Recommendation: Option C.** Single state machine, clean RLS via per-persona FK columns, easy to query "all pending submissions" without type discrimination, one admin page handles all three. The check constraint enforces "exactly one subject" so the schema can't drift.

### `federation_registrations` table (Option C)

```sql
CREATE TABLE IF NOT EXISTS public.federation_registrations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federation_id        UUID NOT NULL REFERENCES public.federations(id) ON DELETE RESTRICT,
  registration_number  TEXT NOT NULL,
  submission_status    TEXT NOT NULL DEFAULT 'draft'
    CHECK (submission_status IN ('draft', 'pending', 'approved', 'rejected')),
  submitted_at         TIMESTAMPTZ,
  submitted_by         TEXT,                -- clerk user id
  verified_at          TIMESTAMPTZ,
  verified_by          TEXT,                -- admin clerk user id
  rejection_reason     TEXT,
  expires_at           DATE,                -- optional expiry (for license-renewable types)

  -- Polymorphic subject (exactly one must be set)
  player_id            UUID REFERENCES public.players(id) ON DELETE CASCADE,
  coach_id             UUID REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  referee_user_id      TEXT,                -- matches profiles.user_id (Clerk user id)

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Exactly one subject column must be set
  CHECK (
    (player_id IS NOT NULL)::int +
    (coach_id IS NOT NULL)::int +
    (referee_user_id IS NOT NULL)::int = 1
  )
);

-- One registration per (subject, federation)
CREATE UNIQUE INDEX uniq_player_federation
  ON public.federation_registrations (player_id, federation_id)
  WHERE player_id IS NOT NULL;

CREATE UNIQUE INDEX uniq_coach_federation
  ON public.federation_registrations (coach_id, federation_id)
  WHERE coach_id IS NOT NULL;

CREATE UNIQUE INDEX uniq_referee_federation
  ON public.federation_registrations (referee_user_id, federation_id)
  WHERE referee_user_id IS NOT NULL;

CREATE INDEX idx_federation_reg_status_pending
  ON public.federation_registrations (submission_status, submitted_at)
  WHERE submission_status = 'pending';

CREATE INDEX idx_federation_reg_player
  ON public.federation_registrations (player_id)
  WHERE player_id IS NOT NULL;
CREATE INDEX idx_federation_reg_coach
  ON public.federation_registrations (coach_id)
  WHERE coach_id IS NOT NULL;
CREATE INDEX idx_federation_reg_referee
  ON public.federation_registrations (referee_user_id)
  WHERE referee_user_id IS NOT NULL;

ALTER TABLE public.federation_registrations ENABLE ROW LEVEL SECURITY;

-- Subject can read their own (player)
CREATE POLICY "Owner read player federation_registrations"
  ON public.federation_registrations FOR SELECT
  USING (player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text));

-- Subject can read their own (coach)
CREATE POLICY "Owner read coach federation_registrations"
  ON public.federation_registrations FOR SELECT
  USING (coach_id IN (SELECT id FROM public.coach_profiles WHERE profile_id = auth.uid()::text));

-- Subject can read their own (referee)
CREATE POLICY "Owner read referee federation_registrations"
  ON public.federation_registrations FOR SELECT
  USING (referee_user_id = auth.uid()::text);

-- Admins can read all
CREATE POLICY "Admin read all federation_registrations"
  ON public.federation_registrations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text));

-- Owner can insert/update own DRAFT only (per persona)
CREATE POLICY "Player write draft federation_registrations"
  ON public.federation_registrations FOR INSERT
  WITH CHECK (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text)
    AND submission_status = 'draft'
  );

CREATE POLICY "Player update own draft federation_registrations"
  ON public.federation_registrations FOR UPDATE
  USING (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text)
    AND submission_status = 'draft'
  );

-- Similar for coach + referee (omitted for brevity; mirror the player policies)

-- Admins can update any (for approve/reject/withdraw)
CREATE POLICY "Admin update any federation_registrations"
  ON public.federation_registrations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text));
```

---

## Build order

### Step 1 — Schema (federation_registrations table — Option C polymorphic)

**New migration:** `supabase/migrations/2026-07-23_federation_registrations.sql`

Schema shown above in "Schema polymorphism strategy." Single table with three nullable FK columns + check constraint that exactly one is set.

**Federation directory expansion:** add referee-offering federations to the seed list. USA Hockey has separate coaching AND officiating programs under one federation. Some countries (e.g., Sweden) have a separate referee federation (Svenska Ishockeyförbundet's Domarkommitte). Track this in the `federations` table via a `category` column (`player`, `coach`, `referee`, or `all`) added in the same migration.

**Backfill:** for existing players with `usa_hockey_number` / `hockey_canada_number` set, create draft rows pointing to USA Hockey / Hockey Canada federation. Coaches with `license_number` + `license_issuing_authority` set get backfilled too (parse the free-text authority string → federation_id). Referees: nothing to backfill, they start fresh.

### Step 2 — UI changes per persona

**Player (`FederationFormClient.tsx`):**
- Add "Submit for verification" button next to each number
- Lock input when status != draft
- Add "Withdraw" button when status in (pending, rejected)
- Show status badge inline (Draft / Pending review / Approved / Rejected)
- Show rejection reason when rejected
- Show verified timestamp when approved

**Coach (`/dashboard/coach/credentials` — NEW page):**
- License number input
- Issuing authority: dropdown of federations (FK now, was free-text)
- Expiry date picker
- Submit / withdraw buttons
- Same status badges

**Referee (`/dashboard/referee/credentials` — NEW page):**
- Federation license number
- Federation dropdown (filtered to referee-offering federations if we add the category column)
- Submit / withdraw
- Same status badges

### Step 3 — API changes (per persona)

**Player (existing route, modify):**
- `PATCH /api/passport/federation` — now writes to `federation_registrations` (player_id branch)
- `POST /api/passport/federation/submit` — submit pending (new)
- `POST /api/passport/federation/withdraw` — withdraw (new)

**Coach (new routes):**
- `PATCH /api/coach/credentials` — write to `federation_registrations` (coach_id branch)
- `POST /api/coach/credentials/submit`
- `POST /api/coach/credentials/withdraw`

**Referee (new routes):**
- `PATCH /api/referee/credentials`
- `POST /api/referee/credentials/submit`
- `POST /api/referee/credentials/withdraw`

### Step 4 — Admin surface (`/admin/federation-registrations/page.tsx`)

- New page: list of all non-draft federation registrations
- **Filter by persona** (player / coach / referee) AND status (pending / approved / rejected)
- Show: subject name + link (player page / coach profile / referee profile), federation name + link, number, submitted_at, submitted_by, verified_at, verified_by, rejection_reason
- Approve / Reject buttons (with reason input modal)
- Audit log of decisions

### Step 5 — Public display

**Player passport (`src/lib/passport/04-adapter.ts`):**
- Surface `submission_status` for each federation registration
- Display badge: gray / amber / green / red
- Approved badges link to federation page

**Coach profile (public, when it ships):**
- Badge on `coach_profiles.verification_status`
- Set to `'federation_verified'` when approved

**Referee profile (public, when it ships):**
- Same pattern

### Step 6 — Deprecate legacy columns

- Drop `players.usa_hockey_number`, `players.hockey_canada_number` columns
- Convert `coach_profiles.license_issuing_authority` from TEXT to be a derived view (read from `federation_registrations` via coach_id join) — or leave for now, just stop writing to it
- Referee: nothing to drop

### Step 7 — Federation registry seeding

- Seed `federations` table with the full list of hockey federations worldwide:
  - IIHF (international body, all categories)
  - USA Hockey (player + coach + referee)
  - Hockey Canada (player + coach + referee)
  - Svenska Ishockeyförbundet (Sweden)
  - Finnish Ice Hockey Association
  - Czech Ice Hockey Association
  - German Ice Hockey Federation
  - Swiss Ice Hockey Federation
  - And ~40 more IIHF member federations
- Each gets `category` set to `'all'` (default) or specific categories if their programs are split

---

## Risks

- **Race condition on submission:** user clicks Submit twice. Mitigated by unique constraint per (subject, federation) and status check.
- **Admin user table:** need to verify `admin_users` exists and has the right shape. May need a separate migration if it doesn't.
- **Existing self-reported numbers:** players + coaches with numbers on legacy columns need backfill. Referees start fresh.
- **Re-verification cadence:** once approved, do numbers expire? Federation numbers typically renew annually. Out of scope for v1, but track as a follow-up. The `expires_at` column is in the schema for forward-compat.
- **Federation API verification:** per `passport-roadmap.md`, real API integration requires USA Hockey partnership (6+ months). v1 is admin-verified only.
- **Coach free-text authority parsing:** existing `license_issuing_authority` is free-text. Backfill script needs to handle "USA Hockey", "US Hockey", "USAH", "USA Hockey Inc." all mapping to the USA Hockey federation row. May need a fuzzy match or manual admin cleanup pass.
- **Referee federation ambiguity:** USA Hockey Officiating vs USA Hockey (player) — same parent organization, different certification programs. Need to decide if these are one federation row with two `category` values, or two rows.

---

## Open decisions for Arnel

1. **Auto-approve trusted sources?** Some users may have email-verified federation affiliation (e.g., they signed up with a `@usahockey.com` email). Auto-approve those, or still require admin touch? **Recommend:** still require admin touch in v1 — keep the human in the loop until we have signal.
2. **Number expiration.** Do approved registrations expire after 1 year? When expired, status returns to "pending" and user must re-submit. **Recommend:** v1 = no expiration, add later when we have data.
3. **Multiple numbers per federation.** Can a player have multiple USA Hockey # entries (e.g., for different seasons)? **Recommend:** v1 = one per federation per player. If they need to update, withdraw + resubmit.
4. **Public display of rejected registrations.** Should rejected badges show publicly, or only to owner? **Recommend:** show only to owner in v1. Public sees only approved/draft.

---

## Verification checklist (pre-PR)

- [ ] Migration applies cleanly to dev DB
- [ ] Existing players with `usa_hockey_number` set are backfilled into `federation_registrations` as `draft`
- [ ] Submit endpoint locks the row from owner edits
- [ ] Withdraw endpoint unlocks
- [ ] Admin approve/reject endpoints work + audit row written
- [ ] Public passport page shows correct badge for each status
- [ ] Search for `usa_hockey_number` and `hockey_canada_number` in `src/` returns 0 hits before column drop
- [ ] Rate limit on submit/withdraw (10/min, same as PATCH)
- [ ] Admin queue is gated by `admin_users` membership

---

## Step-by-step delivery plan

| Step | Scope | Est. files | Notes |
|---|---|---|---|
| 1 | Migration + RLS + federation seed | 1 new migration | Foundation |
| 2 | UI per persona | 1 modified (player) + 2 new (coach, referee) | Status badges + lock + withdraw |
| 3 | API per persona | 1 modified + 6 new endpoints | 2 per persona (submit + withdraw) |
| 4 | Admin queue page | 2 new files | List + decision UI |
| 5 | Public display per persona | 1 modified (passport adapter) + 2 new (coach + referee profile badges when those pages ship) | |
| 6 | Deprecate legacy columns | 1 new migration + read-site cleanup | After 1-5 ship |

**Suggested split:**
- **PR1 — Player flow:** Steps 1-3 (player branch only) + step 4 (admin queue supports all personas but only player rows land)
- **PR2 — Coach + Referee flow:** Steps 2-3 (coach + referee branches) + step 5 (their badges)
- **PR3 — Cleanup:** Step 6 (drop legacy columns)

Splitting PR1 to player-only keeps the diff reviewable (~600-800 lines) and lets the workflow validate end-to-end on the persona that has the most existing UI.

---

## Status update to apply

After PR1 ships, update `passport-roadmap-STATUS.md` Tier 2 row from 🟡 Partial → 🟢 Federations workflow live (admin verification pending).
