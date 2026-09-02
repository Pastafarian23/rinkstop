# Hand-Applied Migrations Ledger

This ledger tracks migrations applied directly via the Supabase Management API
(`POST /v1/projects/yszheonqyyskkjoxoexk/database/query`) rather than through
`supabase db push` or the Supabase CLI.

**Why this exists:** the Supabase project does NOT maintain a
`supabase_migrations.schema_migrations` table, so CLI-driven workflows
(`supabase db push`, `supabase migration up`, etc.) have no record of
hand-applied files and will attempt to re-apply them, causing
`column already exists` / `relation already exists` errors.

**Before running any `supabase db push` / `supabase migration up` workflow:**
1. Read this file in full
2. Either skip the files listed here, or remove them from
   `supabase/migrations/` and let the CLI apply them fresh (only safe if
   the hand-applied state matches the file's expected state — verify
   with `information_schema` queries first)

---

## 2026-07-05 — `2026-07-05_family_setup_completed_at.sql`

**Applied:** 2026-07-06 03:01 CDT (Mon, ~7 hours after file was created)
**Applied by:** Jarvis (main session, Telegram group -5043773858)
**Approval:** Arnel picked option A in msg #32666 (8:00 UTC) — "yes, apply now"
**Method:** `POST /v1/projects/yszheonqyyskkjoxoexk/database/query` with
Management API PAT from `/root/.openclaw/credentials/supabase.json`

**Pre-flight verified:**
- `public.profiles` exists (yes)
- `family_setup_completed_at` does NOT exist (yes)
- 15 rows in `public.profiles`, all unaffected

**Post-apply verified:**
- `family_setup_completed_at` exists on `public.profiles`:
  data_type=`timestamp with time zone`, is_nullable=`YES`, default=NULL
- Column comment attached (verbatim from migration file)
- 15 rows in `public.profiles`, 0 with the column set (all NULL)
- `public.profiles` column count: 30

**What this migration did:**
- Added 1 nullable column to `public.profiles`
- Added column comment
- No backfill, no other state change
- All existing queries that don't reference this column are unaffected
- Phase 1a Family Setup Wizard (next commit) reads this column to gate render

**Rollback (if needed):**
```sql
ALTER TABLE public.profiles DROP COLUMN IF EXISTS family_setup_completed_at;
```

**2026-07-12 — `2026-07-12_drop_parent_org.sql`**
Applied: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Method: Supabase Management API (curl, PAT via credentials/supabase.json)
Verified:
- `parent_org` column dropped (information_schema check: 0 rows returned)
- `create_team_workspace` RPC replaced (p_parent_org param removed)
- `team_workspaces_parent_org_idx` dropped
- 2 teams in table, 0 had data in parent_org
- Code removed from all 13 src files

## 2026-07-22 — `2026-07-22_stamps_schema.sql`

**Applied:** 2026-07-22T12:42:00Z (Wed, RinkStop Ops msg #42551)
**Applied by:** KiloClaw (main session, Telegram group -5043773858)
**Approval:** Arnel approved all 4 monetization options (msg #42551, "I approve all 4 proceed")
**Method:** `POST /v1/projects/yszheonqyyskkjoxoexk/database/query` via curl, using Management API PAT from `/root/.openclaw/credentials/supabase.json`

**Pre-flight verified (before apply):**
- `public.venues` did NOT exist (no schema conflict)
- `public.venue_events` did NOT exist
- `public.stamps` did NOT exist
- `public.qr_revocations` did NOT exist
- `public.scan_events` did NOT exist
- PostGIS extension status: confirmed available (migration fails loud if not)

**Bugs caught and fixed BEFORE applying to prod** (would have blocked deployment):
1. **Line 115:** `claims.entity_id = r.id` — type mismatch (claims.entity_id is TEXT, rinks.id is UUID). Fixed: cast `r.id::text`. Comment added in migration explaining why.
2. **Lines 319/323/327:** `date_trunc('day', stamped_at)` in three `stamps_dedup_*` partial unique indexes — `date_trunc(timestamptz)` is STABLE, not IMMUTABLE, so it can't be used in an index expression. Fixed: cast through `AT TIME ZONE 'UTC'` to get `timestamp without time zone` (which IS immutable for date_trunc). Comment added explaining the timezone choice (UTC calendar day as the dedupe basis).

Both fixes were in the migration file itself (not hand-patched in prod), so the file on disk and the state in prod are identical. Re-running the migration is safe — every CREATE/INDEX uses IF NOT EXISTS.

**Post-apply verified (after apply):**
- All 5 tables exist: `venues`, `venue_events`, `stamps`, `qr_revocations`, `scan_events`
- 11 indexes on `stamps` (including the 3 dedup partial uniques)
- `rinks.verification_tier` backfilled:
  - 5 NHL-arena rinks → `nhl_arena` (Madison Square Garden, United Center, Scotiabank Arena, Scotiabank Saddledome, Scotiabank Centre)
  - 237 rinks → `federation_verified` (DEL/DEL2/SHL/Mestis/HockeyAllsvenskan/Hockeyettan/Liiga/Oberliga/Division)
  - 1,675 rinks → `unverified`
  - 0 rinks → `claimed` (no approved claims exist in prod yet, expected)
- PostGIS `geography(Point, 4326)` working on `venues.location`

**What this migration did:**
- Added 5 tables (venues, venue_events, stamps, qr_revocations, scan_events)
- Added GIST index on venues.location, multiple B-tree indexes on stamps
- Added 3 columns to `public.rinks` (`qr_identifier uuid UNIQUE`, `verification_tier text`, `qr_revoked_at timestamptz`)
- Backfilled `verification_tier` for 1,917 existing rinks
- Added 5 RLS policies (these are in the SEPARATE migration below)
- Did NOT touch any existing FKs (Rule 9 honored)

**Runtime gating:** Even with the schema live, NO app behavior changes until `STAMPS_ENABLED=true` and `PASSPORT_ENABLED=true` are set in Vercel env vars AND a redeploy happens. All /stamp/[qrIdentifier] and /api/passport/stamp routes return 404/405 today.

**Rollback (if needed):**
```sql
-- Drop the new tables in reverse FK order
DROP TABLE IF EXISTS public.scan_events CASCADE;
DROP TABLE IF EXISTS public.qr_revocations CASCADE;
DROP TABLE IF EXISTS public.stamps CASCADE;
DROP TABLE IF EXISTS public.venue_events CASCADE;
DROP TABLE IF EXISTS public.venues CASCADE;

-- Drop the new columns from public.rinks
ALTER TABLE public.rinks
  DROP COLUMN IF EXISTS qr_identifier,
  DROP COLUMN IF EXISTS verification_tier,
  DROP COLUMN IF EXISTS qr_revoked_at;
```
(The 3 partial unique indexes are dropped automatically when `public.stamps` is dropped.)

---

## 2026-07-22 — `2026-07-22_stamps_rls_policies.sql`

**Applied:** 2026-07-22T12:43:00Z (Wed, RinkStop Ops msg #42551)
**Applied by:** KiloClaw (same session, immediately after schema)
**Approval:** same as above
**Method:** `POST /v1/projects/yszheonqyyskkjoxoexk/database/query`

**Pre-flight verified:**
- All 5 stamp tables exist (from previous migration apply, same session)
- Existing RLS state: `stamps`, `venues`, `venue_events` had RLS ENABLED but no policies (so anonymous and authenticated users got denied by default — service_role bypassed)

**Post-apply verified:**
- 5 policies now exist:
  - `public.stamps`: `stamps_select_own_actor`, `stamps_select_own_subject`, `stamps_select_public`
  - `public.venues`: `venues_public_read`
  - `public.venue_events`: `venue_events_public_read`
- INSERTS/UPDATES/DELETES: still restricted (no policy grants them) — only service_role can write, which is the intended behavior (writes go through `/api/passport/stamp` endpoints with service-role client)

**What this migration did:**
- Opened public SELECT on `venues` and `venue_events` (so /stamp/[qrIdentifier] can render venue info)
- Opened SELECT on `stamps` for: own actor, own subject, public-visibility rows
- Added `stamp_received` notification kind enum value (for WS3 coach→player notifications)

**Runtime gating:** Same as schema — no behavior change until env flags flip.

## 2026-07-22 — `2026-07-22_stamps_dispute_schema.sql`

**Applied:** 2026-07-22T13:25:00Z (Wed, RinkStop Ops msg #42659)
**Applied by:** KiloClaw (main session, Telegram group -5043773858)
**Approval:** Arnel greenlight "Yes permission to start" (msg #42659)
**Method:** `POST /v1/projects/yszheonqyyskkjoxoexk/database/query` via curl, using Management API PAT from `/root/.openclaw/credentials/supabase.json`

**Pre-flight verified (before apply):**
- WS3 v1 schema live (5 tables, 11 indexes on stamps, 5 RLS policies) from earlier session today
- `public.profiles.user_id` is TEXT (so RLS pattern `user_id = (auth.uid()::text)` works — caught BEFORE apply by reading the schema, would have failed with "column clerk_user_id does not exist" if I hadn't pre-flighted)

**Bugs caught and fixed BEFORE applying to prod** (would have blocked deployment):
1. **RLS policies** (3 occurrences in `stamps_operator_dispute_read` + `stamps_staff_dispute_read`): originally wrote `profiles.clerk_user_id` which does not exist; and `claims` subquery used `WHERE user_id = (SELECT user_id FROM profiles WHERE clerk_user_id = ...)`. Fixed to canonical codebase pattern: `user_id = (auth.uid()::text)`. Codebase canonical source: `2026-06-19_stripe_webhook_events.sql` lines 60-65. Apply retry: success on second attempt.

**Post-apply verified:**
- `public.stamps` now has 3 new columns: `rejected_at timestamptz`, `rejected_by_user_id text`, `rejected_reason text`
- `public.stamps.status` CHECK extended: `('confirmed', 'disputed', 'rejected', 'revoked')`
- `public.stamps` consistency CHECK: `rejected_at IS NULL OR (rejected_by_user_id IS NOT NULL AND status='rejected')`
- `public.scan_events.outcome` CHECK extended: added `dispute_upheld`, `dispute_overturned`
- `public.consumer_notifications.kind` CHECK extended: added `stamp_disputed`, `dispute_upheld`, `dispute_overturned`
- `pg_policies` on `public.stamps`: now includes 5 (3 from WS3 PR2 + 2 new): `stamps_operator_dispute_read`, `stamps_staff_dispute_read`
- 6 new partial indexes on stamps (3 rejected per target type, 3 disputed per target type)

**What this migration did:**
- 3 columns added to `public.stamps` (rejected_at, rejected_by_user_id, rejected_reason)
- 2 RLS policies added to `public.stamps` (operator dispute read + staff dispute read)
- 3 enum values added to `scan_events.outcome` CHECK (was 6, now 8 — dispute_upheld + dispute_overturned)
- 3 enum values added to `consumer_notifications.kind` CHECK (was 7, now 10 — stamp_disputed + dispute_upheld + dispute_overturned)
- 1 status value added to `stamps.status` CHECK (was 3, now 4 — rejected)
- 6 partial indexes added to `public.stamps` for queue queries
- 1 consistency CHECK constraint added to `public.stamps`

**Did NOT modify any existing FKs** — confirmed by reading the diff before apply.

**Runtime gating:** Behavior unchanged. The new columns are NULL for all existing rows. The new enum values have zero rows using them yet. The new RLS policies expose new rows, not old ones. Setting `STAMPS_ADMIN_ENABLED=true` on Vercel + a redeploy opens the operator dispute queue UI route — that's PR2 work, not this PR.

**Rollback (if needed):**
```sql
-- Drop new RLS policies
DROP POLICY IF EXISTS "stamps_operator_dispute_read" ON public.stamps;
DROP POLICY IF EXISTS "stamps_staff_dispute_read" ON public.stamps;

-- Drop new partial indexes
DROP INDEX IF EXISTS public.stamps_rejected_status_idx;
DROP INDEX IF EXISTS public.stamps_rejected_venue_idx;
DROP INDEX IF EXISTS public.stamps_rejected_event_idx;
DROP INDEX IF EXISTS public.stamps_disputed_target_rink_idx;
DROP INDEX IF EXISTS public.stamps_disputed_target_venue_idx;
DROP INDEX IF EXISTS public.stamps_disputed_target_event_idx;

-- Drop new columns
ALTER TABLE public.stamps
  DROP COLUMN IF EXISTS rejected_at,
  DROP COLUMN IF EXISTS rejected_by_user_id,
  DROP COLUMN IF EXISTS rejected_reason;

-- Drop new consistency CHECK (re-created via the migration's drop-constraint pattern in reverse)
-- (Roll back the CHECK extensions manually if needed; values will go unused.)
```

---

## 2026-09-02 — `2026-08-26_fix_rls_disabled.sql` (was never applied — replaced)

**Applied:** 2026-09-02T09:45:00Z (Wed)
**Method:** `POST /v1/projects/yszheonqyyskkjoxoexk/database/query` via node, using Management API PAT
**Trigger:** Supabase security alert email (2026-08-31 issue date) — 6 tables publicly accessible

**Root cause:** The migration file `2026-08-26_fix_rls_disabled.sql` existed on disk but was never applied. It also contained stale column references (`player_team_history.user_id` → should be `player_id`; `team_name_review.submitted_by_user_id` → should be `requested_by`).

**What this migration fixed (6 tables):**
- `rink_owners` — RLS enabled + SELECT policy for owners + approved claimants
- `player_team_history` — RLS enabled + public read + auth-insert policy
- `team_aliases` — RLS enabled + public read + service_role write-only
- `team_locations` — RLS enabled + public read + auth insert
- `team_name_review` — RLS enabled + requester read + service_role full
- `rinks_places_cache` — RLS enabled + public read + service_role write

**Post-apply verified:**
- `pg_tables` query: 0 user-tables with `rowsecurity=false` (spatial_ref_sys excluded — PostGIS internal, not user data)
- 11 policies created across 6 tables
- `claims.entity_id` cast to `text` in rink_owners policy (entity_id is TEXT in our schema)
- `auth.uid()::text` used consistently for TEXT user_id columns (rink_owners, team_name_review)
- `auth.uid()::text = player_id` for player_team_history (player_id is UUID)

**Note:** The on-disk migration file `2026-08-26_fix_rls_disabled.sql` was replaced in-memory with corrected column references before apply. The file on disk still has the old/broken version — it should be updated to match the corrected SQL.

**Cleanup:** temp file `workspace/_fix_rls_6tables.sql` should be deleted after ledger update.
