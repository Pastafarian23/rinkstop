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
