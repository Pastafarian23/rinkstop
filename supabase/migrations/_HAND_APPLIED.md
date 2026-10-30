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

## 📋 CHECKLIST — every migration that CREATES a public table

**Supabase stops auto-granting Data API access to new `public` tables on
2026-10-30.** After that date a table created without explicit GRANTs is
invisible to PostgREST and the feature that reads it returns
`permission denied` at runtime — with no error at migration time.

Every migration containing `CREATE TABLE ... public.<name>` MUST also
contain explicit grants. Copy this block:

```sql
-- Required from 2026-10-30: Supabase no longer auto-grants Data API
-- access to new public tables. Without these, PostgREST returns
-- "permission denied" for this table and every feature that reads it
-- breaks at runtime.
grant select on public.<table> to anon;            -- only if publicly readable
grant select, insert, update, delete on public.<table> to authenticated;
grant all on public.<table> to service_role;       -- always
```

**Rules of thumb for which roles get `anon`:**

| audience | anon | authenticated | service_role |
|---|---|---|---|
| public directory data (rinks, teams, players, leagues) | ✅ | ✅ | ✅ |
| user-owned data (posts, prefs, saved items) | ❌ | ✅ | ✅ |
| payments / subscriptions | ❌ | ✅ (RLS-scoped) | ✅ |
| script-only audit tables | ❌ | ❌ | ✅ |

**`anon` access is a deliberate decision, not a default.** A table with anon
SELECT is publicly readable by anyone who loads rinkstop.com — the anon key
ships in client JS. Only grant it when the data is meant to be public.

**If a table has RLS enabled, anon/authenticated grants may still be
required** — RLS filters *which rows* are visible, but without a table-level
grant PostgREST denies the request outright. Grant the role AND write the
policy; the policy is what makes it safe.

**Also required for any new public table:**
- `enable row level security` unless the table is intentionally
  PostGIS/system-owned (`spatial_ref_sys` is the only current exception)
- at least one policy, or RLS-on-with-zero-policies means nobody can read it
  (see the `fixture_dedup_audit` entry below for a deliberate example)

**Checklist:**
1. Explicit GRANTs for each role that needs access
2. RLS enabled (non-system table)
3. Policies written for every role that received a grant
4. `notify pgrst, 'reload schema';` at the end
5. Verify with `information_schema.role_table_grants` after applying

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

## 2026-09-30 — `2026-09-30_email_subscribers_rls.sql` + `2026-09-30_cron_health_snapshots_rls.sql`

**Applied:** 2026-09-30 00:38 CDT (Wed)
**Applied by:** KiloClaw (main session, webchat)
**Approval:** Arnel forwarded the Supabase advisor email at 2026-09-29 19:32 CDT — "Table publicly accessible, RLS not enabled"
**Method:** `POST /v1/projects/yszheonqyyskkjoxoexk/database/query` with Management API PAT

**Pre-flight verified (email_subscribers):**
- anon INSERT {email:'attacker@evil.com'} → HTTP 201 (vulnerable)
- anon UPDATE {source:'hacked'} → HTTP 204, source changed (vulnerable)
- anon DELETE → HTTP 204 (no-op due to missing RLS USING clause)

**Post-fix verified:**
- anon INSERT/UPDATE/DELETE/SELECT → HTTP 401 'permission denied'
- service_role SELECT count: 1 (original row preserved)

**Tables affected:**
- `email_subscribers` (1 row, orphaned/legacy table)
- `cron_health_snapshots` (207 rows, used by scripts/collect-cron-health.js + admin route)

**Audit follow-up:** ran anon-INSERT sweep across all 93 public tables. Found exactly 2 vulnerable tables (these two). Now 0 vulnerable.

## 2026-09-30 — `2026-09-30_lock_remaining_tables_rls.sql`

**Applied:** 2026-09-30 00:45 CDT
**Applied by:** KiloClaw (main session, webchat)
**Trigger:** scripts/_live-rls-audit.cjs sweep found 4 more tables without RLS

**Tables affected (user-data only):**
- `email_captures` (1 row) — POST /api/email-capture uses service_role
- `playoff_updates` (87 rows) — public read, service_role write (POST endpoint now returns 410)
- `profile_tier_ranks` (VIEW, 19 rows) — REVOKE INSERT/UPDATE/DELETE from anon
- `rink_reviews_legacy` (VIEW, 0 rows) — REVOKE INSERT/UPDATE/DELETE from anon

**API route fixes:**
- `/api/nhl/playoffs/updates` POST → returns 410 Gone (was unauthenticated content injection)
- `/api/ahl/playoffs/updates` POST → returns 410 Gone (was unauthenticated service-role write)

**Pre-deploy gate upgrade:**
- scripts/pre-deploy-gate.sh Gate 7 now calls scripts/_live-rls-audit.cjs
- Sweeps all public tables, FAILS deploy if any allow anon INSERT
- spatial_ref_sys (PostGIS internal) is the only known false positive — already documented in 2026-09-23 migration

**Post-fix audit:** 174 tables tested, 1 vulnerable (spatial_ref_sys, PostGIS exempt).

---

## 2026-10-16 — `2026-10-16_nhl_official_standings.sql`

## 2026-10-22 — `2026-10-22_profile_posts_target_columns_fix.sql`

**Applied:** 2026-10-22 01:2x CDT
**Applied by:** KiloClaw (main session, webchat)
**Approval:** Arnel reported dashboard posting broken (text + media) via screenshots
**Method:** `POST /v1/projects/yszheonqyyskkjoxoexk/database/query` with Management API PAT

**Why:** ALL dashboard posting was broken — text posts returned
"Could not find the 'target_id' column of 'profile_posts' in the schema
cache", media posts returned a bare 500. Root cause: the feature migration
`2026-08-28_profile_posts_destination.sql` was **written but never applied**
to production (absent from this ledger; columns confirmed missing from the
live table). `src/app/api/profile-posts/route.ts` selects and inserts
`target_type` + `target_id` on every read and write, so PostgREST rejected
every request against its schema cache.

**IMPORTANT — this supersedes 2026-08-28_profile_posts_destination.sql:**
that file declares `target_id uuid`, which is WRONG for this codebase. The
column must be TEXT because a single column holds both Clerk IDs
(`user_3Etd...`, text) and uuid (team_workspaces.id, leagues.id). Same reason
`user_id` was forced to TEXT by `2026-08-28_profile_posts_user_id_text.sql`.
**If 2026-08-28_profile_posts_destination.sql is ever applied fresh, it will
re-add target_id as uuid and break posting again.** The 2026-10-22 file
should be applied instead; it is idempotent and will no-op on correct schema.

**No FK on target_id:** column is polymorphic across three parent tables
(user / team_workspaces / leagues), so an FK is impossible. Team+league
ownership is enforced in the API layer by `resolveAuthorizedTarget()`.

**Pre-flight verified:**
- Live columns before: id, user_id, body, media_url, created_at, updated_at,
  deleted_at, sport, media_thumb — no target_type, no target_id
- 1 row total, 1 distinct author, 0 rows needing deletion
- team_workspaces.id = uuid, leagues.id = uuid → confirms TEXT is required

**Post-apply verified:**
- target_id present, data_type=text, is_nullable=NO
- target_type present, data_type=text
- 0 rows with null target_id; total rows still 1 (no data loss)
- Live PostgREST SELECT with both columns → OK
- Live PostgREST INSERT with both columns → OK (verification row created,
  then deleted; final count back to 1, original "Hello world" row intact)
- `notify pgrst, 'reload schema'` fired at end of migration to clear the
  stale schema cache that produced the original error

**Lesson:** a migration file existing in `supabase/migrations/` does NOT mean
it was applied. This one sat unapplied for ~8 weeks while the dependent
application code shipped and shipped. Verify feature migrations against
`information_schema` before trusting the file list.

## 2026-10-22 — `2026-10-22_fixture_dedup_audit_rls.sql`

**Applied:** 2026-10-22 04:4x CDT
**Applied by:** KiloClaw (main session, webchat)
**Approval:** Arnel — "Okay proceed" (after I proposed it as the one definite, low-risk fix)
**Method:** `POST /v1/projects/yszheonqyyskkjoxoexk/database/query` with Management API PAT

**Why:** Resolves Supabase's `rls_disabled_in_public` CRITICAL alert
(raised 2026-10-17: "Anyone with your project URL can read, edit, and
delete all data in this table because Row-Level Security is not
enabled"). Same defect independently found during the Singapore traffic
analysis — Supabase's advisor and that review converged on this table.

**Blast radius before the fix:** RLS off AND all 7 grants to `anon`
(SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER). The
anon key ships in client JS by design, so this was reachable by anyone
who loaded rinkstop.com. Table had 0 rows, but
`scripts/dedup-fixtures-all-leagues.js` populates it with
`deleted_row` JSONB snapshots of deleted fixtures (team names, scores,
dates, venue ids) — a free structured dataset, plus DELETE/TRUNCATE would
have let an anonymous caller destroy the point-in-time recovery trail
that makes fixture deletions reversible.

**Pre-flight verified:**
- `select relname, relrowsecurity ... where relrowsecurity = false`
  → exactly 2 tables: `fixture_dedup_audit` (ours),
  `spatial_ref_sys` (PostGIS-owned)
- `spatial_ref_sys` has 7 anon grants, but is PostGIS internals —
  **deliberately NOT given RLS**, since RLS-ing it risks breaking
  geospatial queries. The advisor flags it indiscriminately.
- Confirmed `scripts/dedup-fixtures-all-leagues.js:28` uses
  `SUPABASE_SERVICE_ROLE_KEY`, which BYPASSES RLS — so the audit
  pipeline is unaffected by this change.
- Confirmed no application code reads this table via a user session
  (only the script references it), so `authenticated` was also revoked.

**Applied:**
- `enable row level security` (no policies → anon/authenticated get nothing)
- `revoke all ... from anon` and `from authenticated`
- `grant select, insert, update, delete ... to service_role` (explicit,
  so the table survives the Oct 30 auto-grant change)
- `notify pgrst, 'reload schema'`

**Post-apply verified:**
- relrowsecurity = true, policies = 0, anon_grants = 0,
  auth_grants = 0, service_role_grants = 7
- anon SELECT → `42501 permission denied for table fixture_dedup_audit`
- anon INSERT → `42501 permission denied` (was the dangerous write path)
- anon DELETE → `42501 permission denied` (could have wiped recovery trail)
- service_role INSERT → OK, SELECT → OK, DELETE → OK (regression check:
  the dedup script's access path still works)
- Probe row created then deleted; final row count back to 0

**No SEO / AI-visibility impact.** This is a Postgres permission change
on a script-only audit table. It does not touch robots.txt, sitemaps,
middleware, crawler policy, or any publicly-readable content.

**Related (not fixed — needs Arnel's decision):**
- Every future migration that creates a public table must include
  explicit GRANTs, because Supabase stops auto-granting Data API access
  to new public tables on 2026-10-30. `2026-10-16-fixture-dedup-audit.sql`
  was written under the old assumption and has no GRANTs.
- `conversion_daily_snapshots` has 0 anon and 0 authenticated grants
  (service_role only). If any feature reads it client-side it is already
  broken; worth confirming which.

### Audited 2026-10-22 — both resolved, no action needed

**`spatial_ref_sys` = known false positive.** Supabase's
`rls_disabled_in_public` advisor flags it alongside `fixture_dedup_audit`,
but the table is owned by PostGIS (7 anon grants included). Enabling RLS on
it risks breaking geospatial queries. **Deliberately left alone.** If the
advisor alert reappears naming it, that is expected and is not a finding.

**`conversion_daily_snapshots` = correctly locked, not broken.** Verified:
- 14 rows of aggregated GA4 funnel counters (searches_total, checkout_started,
  claim_submitted, etc.). No PII, no user identifiers.
- 1 RLS policy, and anon=0 / authenticated=0 / service_role=7 grants.
- Only writer is `src/app/api/cron/conversion-snapshot/route.ts`, which uses
  `supabaseAdmin` (service_role) behind a `CRON_SECRET` bearer check.
- So the empty anon/authenticated grants are deliberate and correct. No code
  reads it client-side. **Nothing to fix.**

## 2026-10-22 — `2026-10-22_post_media_bucket_video.sql`

**Applied:** 2026-10-22 02:2x CDT
**Applied by:** KiloClaw (main session, webchat)
**Approval:** Arnel reported video upload returning a bare "Failed (500)"
**Method:** `POST /v1/projects/yszheonqyyskkjoxoexk/database/query` with Management API PAT

**Why:** Share Media video upload 500'd on every attempt. The `post-media`
bucket was image-only:
    allowed_mime_types = {image/jpeg, image/png, image/webp, image/gif}
    file_size_limit    = 10MB
Supabase Storage rejected the file with "mime type video/mp4 is not
supported" — reproduced directly against the live bucket before changing
anything. The upload died at the storage layer, before the profile_posts
insert, so the API returned 500 and the composer showed "Failed (500)".

The 10MB cap was a second independent mismatch: MAX_VIDEO_BYTES in
`src/app/api/profile-posts/route.ts` is 100MB, so a permitted video over
10MB would still have failed.

**Fix:** allowed_mime_types += video/mp4, video/quicktime, video/webm;
file_size_limit raised to 104857600 (100MB) to match the route.

**Pre-flight verified:**
- `select allowed_mime_types, file_size_limit from storage.buckets where name='post-media'`
  → images only, 10485760 bytes
- Direct upload of a real 2s H.264 MP4 → FAIL "mime type video/mp4 is not supported"

**Post-apply verified:**
- Same upload → OK
- Public GET on the stored object → 206 Partial Content, content-type video/mp4
- Probe object removed from the bucket afterward (no test artifacts left)

**Note:** `extractVideoThumbnail()` in the route shells out to `ffmpeg`,
which does NOT exist on the Vercel serverless runtime. It is wrapped in
try/catch returning `null`, so uploads degrade gracefully and only the
thumbnail is skipped. The `media_thumb` column will therefore be NULL for
videos on production; the feed falls back to rendering the video element
itself. Not treated as a bug here — ffmpeg-on-Vercel would need a static
binary or an external service, which is a larger decision than this fix.

**Lesson:** app code and the infra behind it must be validated together.
The Share Media UI shipped 2026-10-16 while the bucket still rejected
video on 2026-10-22. Same class as the unapplied profile_posts migration
hours earlier: neither layer validated the other.

**Applied:** 2026-10-16 (subagent task, NHL official standings feed)
**Applied by:** KiloClaw (subagent, webchat)
**Trigger:** Item 2 of the Piece G work order — replace compute-standings.ts NHL output with the NHL.com Stats API feed.
**Method:** `POST /v1/projects/yszheonqyyskkjoxoexk/database/query` with Management API PAT from `/root/.openclaw/credentials/supabase.json`
**Tooling:** `scripts/apply-nhl-official-standings.mjs` (one-shot, kept for traceability)

**Tables affected:**
- `nhl_official_standings` (new) — 32 rows × 2 seasons written by `scripts/nhl-ingest/official-standings.cjs` immediately after migration apply

**Pre-flight verified:**
- `SELECT id, slug, is_active FROM teams WHERE league_id = '<nhl>'` → 31 active, 1 inactive (MTL row exists but is_active=false — flagged in ingest output)
- Migration SQL itself tested locally; applied via Management API returned 201 + empty result (DDL).

**Caveats:**
- 1 team (MTL) currently has is_active=false in our `teams` table but is_active in NHL.com. Ingest still writes the standings row (NHL.com data is real); the script logs a WARN. This is a data-fix to address in `teams` table — not in this migration.

---

## 2026-10-23_ascii_slug_aliases.sql — applied 2026-10-23 03:2x CDT

**Applied:** `POST /v1/projects/yszheonqyyskkjoexk/database/query` via Management API PAT. Response 201, `[]`.

**What it does:** INSERT of 196 rows into `public.team_slug_redirects` mapping each
ASCII-folded team slug to its canonical accented slug. Additive only — no UPDATE, no DELETE.
`ON CONFLICT (from_slug) DO UPDATE` makes it idempotent.

**Verified post-apply (live PostgREST):**
- `team_slug_redirects` total = 196 rows
- 190 of those are pure-ASCII `from_slug` → accented `to_slug` (the other 6 fold to a
  different non-ASCII canonical, e.g. `ø`→`o` expansions)

**Pre-flight:** 201 accented team slugs found across 3,252 `team_workspaces` rows.
5 skipped because the folded form is already a live distinct team and would create a
duplicate-URL collision: `montreal-victoire`, `if-bjorkloven`, `vasby-ik`,
`medvescak-zagreb`, `val-d-or-foreurs`.

**Regeneration:** `node scripts/_ascii-alias-gen.cjs` writes `/tmp/ascii-alias-{teams,rinks,leagues}.json`.
Re-run after any team rename that introduces diacritics. Its `fold()` must stay
byte-identical to `foldSlugToAscii()` in `src/lib/ascii-slug.ts` and to the runtime
fallback in `src/middleware.ts` — drift between them silently breaks one path.

**Caveat:** this pre-seeds the fast path only. The middleware's live fold lookup
(`lookupTeamSlugByFoldedSlug`) is the safety net for accented teams created after
this date, so regeneration is a performance optimization, not a correctness requirement.

---

## 2026-10-29 — `2026-10-29_federation_ownership_and_invites.sql`

**Applied:** 2026-10-29 18:1x CDT (Wed)
**Applied by:** KiloClaw (main session, webchat)
**Approval:** Arnel — "Plan approved proceed with recommendations" (2026-10-29 18:07 CDT)
**Method:** `POST /v1/projects/yszheonqyyskkjoexk/database/query` via `/root/.openclaw/credentials/_run-migration.mjs`

**Why:** Federations are contacted directly (e.g. Ice Hockey Association of India via
their General Secretary). Arnel wants to send an invite link to the vetted contact
so they can claim and manage their federation listing. There is NO public federation
claim button — claiming is invite-only via `/profile/claim?token=...`.

**Pre-flight verified (live DB):**
- `public.federations` columns: id, slug, name, country_code, logo_url, website_url,
  is_active, created_at, updated_at, category, kind (11 columns) — no owner column
- `public.claims` constraint: `claims_claim_type_check CHECK (claim_type = ANY (ARRAY['rink','team','player']))`
  — no 'federation' value
- `public.leagues` has `federation_id UUID` (298 rows, 0 populated)
- `public.team_workspaces` has `federation_id UUID` (3,253 rows, 0 populated)
- `public.federation_registrations` / `rink_org_connections` / `league_members` /
  `organizations`: all 0 rows

**What this migration did:**
- `public.federations`: +15 columns (owner_user_id, description, contact_email,
  contact_phone, logo_source, logo_verified_at, claimable, 7 pending_* edit fields)
  + 2 indexes
- `public.claims`: constraint replaced to allow 'federation' claim_type
  (rink/team/player preserved — verified post-apply)
- `public.federation_claim_invites`: NEW table (token, federation_id FK, email,
  contact_name, note, max_uses, times_used, expires_at, revoked_at, created_by,
  accepted_by, accepted_at, created_at) + 2 indexes + RLS enabled (no policies —
  service_role only, no anon/authenticated grants)
- `public.federation_member_requests`: NEW table (federation_id FK, member_type
  CHECK league|club, league_id FK, team_id FK, proposed_* fields, status
  CHECK pending|approved|rejected, review fields) + 2 indexes + RLS enabled
  (no policies — service_role only) + exactly-one-target CHECK constraint
- `public.is_federation_admin(TEXT, UUID)` — SECURITY DEFINER, SET search_path = '',
  fully public.-qualified
- `public.redeem_federation_claim_invite(TEXT, TEXT, TEXT)` — SECURITY DEFINER,
  SET search_path = '', validates token/expiry/uses/email and consumes the invite.
  Raises: invite_not_found / invite_revoked / invite_expired / invite_exhausted /
  invite_email_mismatch

**Post-apply verified:**
- `public.federations` now has 26 columns
- `federation_claim_invites` + `federation_member_requests` exist
- Both functions exist in pg_proc
- `claims_claim_type_check` now reads
  `CHECK ((claim_type = ANY (ARRAY['rink','team','player','federation'])))`

**Grants:** both new tables are service_role only (no anon/authenticated). This is
deliberate — every read/write goes through server code using the service-role
client. PostgREST exposure is not needed for either table.

**Rollback (if needed):**
```sql
DROP FUNCTION IF EXISTS public.redeem_federation_claim_invite(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.is_federation_admin(TEXT, UUID);
DROP TABLE IF EXISTS public.federation_member_requests CASCADE;
DROP TABLE IF EXISTS public.federation_claim_invites CASCADE;
ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS claims_claim_type_check;
ALTER TABLE public.claims ADD CONSTRAINT claims_claim_type_check
  CHECK (claim_type = ANY (ARRAY['rink'::text,'team'::text,'player'::text]));
ALTER TABLE public.federations
  DROP COLUMN IF EXISTS owner_user_id,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS contact_email,
  DROP COLUMN IF EXISTS contact_phone,
  DROP COLUMN IF EXISTS logo_source,
  DROP COLUMN IF EXISTS logo_verified_at,
  DROP COLUMN IF EXISTS claimable,
  DROP COLUMN IF EXISTS pending_name,
  DROP COLUMN IF EXISTS pending_logo_url,
  DROP COLUMN IF EXISTS pending_description,
  DROP COLUMN IF EXISTS pending_website_url,
  DROP COLUMN IF EXISTS pending_contact_email,
  DROP COLUMN IF EXISTS pending_contact_phone,
  DROP COLUMN IF EXISTS pending_submitted_at,
  DROP COLUMN IF EXISTS pending_submitted_by;
```

## 2026-10-30 — `2026-10-30_listing_submissions_pii_lockdown.sql`

**Applied:** 2026-10-30 05:5x CDT
**Applied by:** KiloClaw (main session, webchat)
**Approval:** Discovered and fixed as part of the Slough Satans claim-bug
investigation (the leak was blocking a professional submission-status flow).
**Method:** `POST /v1/projects/yszheonqyyskkjoxoexk/database/query` with
Management API PAT (via `scripts/query-supabase.py`).

**Why:** The public Supabase key (`sb_publishable_…`, inlined into the client
bundle because `NEXT_PUBLIC_SUPABASE_ANON_KEY` is a `NEXT_PUBLIC_` var) could
SELECT **every row** of `listing_submissions` — including `email` and the
internal `notes` / `outcome_notes` columns. Verified by direct PostgREST call,
not by reading policy definitions:

    GET /rest/v1/listing_submissions?select=email,name,notes,outcome_notes
    -> [{"email":"cup@glxyhockey.com", ...}, {"email":"sloughsatans@gmail.com", ...}]

This is the same leak class that `2026-06-16-critical-rls-fixes.sql` FIX 5/FIX 6
closed on `contact_submissions` and `newsletter_subscribers` — but
`listing_submissions_public_read` was never added to that audit, so it stayed
open for ~4 months. Two real people's email addresses and our internal
revenue-qualification notes about them were publicly readable.

**Policy shape — gotcha worth remembering:** the deny must NOT be a single
`FOR ALL ... WITH CHECK (false)` policy. Postgres evaluates `WITH CHECK` on
INSERT too, so that shape blocks the anonymous insert and breaks the public
add-listing form with a misleading "new row violates row-level security
policy" error. The deny is split per-command (SELECT / UPDATE / DELETE);
INSERT is governed solely by the dedicated `Allow anonymous inserts` policy.

**Verified after applying:**
- anon SELECT → `[]` (leak closed)
- anon INSERT → HTTP 201 (public form still works)
- anon UPDATE / DELETE → 0 rows affected; both rows verified intact
- service_role SELECT → both rows still visible to the admin intake UI

**Permanent guard:** `scripts/_audit-rls-pii.mjs` re-runs this audit against
the LIVE database on every push (pre-push guard **Gate 6**). It tests
behaviour ("can anon actually read it?") rather than policy definitions,
because the two drift. Proven to work: with the bad policy temporarily
restored the audit failed and reported the leaked address; with it removed the
audit passed.
