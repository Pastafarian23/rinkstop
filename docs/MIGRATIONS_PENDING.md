# Migrations Pending Manual Apply

The Supabase Management API is blocked by Cloudflare (1010) on this network.
Migrations are written to `supabase/migrations/*.sql` but must be applied
manually via the Supabase SQL editor.

## How to apply

1. Open https://supabase.com/dashboard/project/yszheonqyyskkjoxoexk/sql/new
2. Paste the SQL
3. Click "Run" (or Cmd/Ctrl+Enter)
4. Confirm success in the results panel

## Pending

### 2026-06-16-analytics.sql — Day-1 funnel tracking

**Why we need this:** RinkStop has zero analytics right now. We can't see
the conversion funnel (pricing viewed → checkout started → checkout
completed → subscription active), can't measure ad spend ROI, can't
identify where users drop off. This migration creates the table that
captures all of that.

**What it does:** Creates `analytics_events` table with indexes for the
common query patterns (name+ts, user_id+ts, pathname+ts).

**Safe to apply?** Yes. Adds a new table, doesn't touch any existing
data or schema. The application code is already wired to insert into
this table — before the migration, those inserts silently fail and
we just have console logs in Vercel. After the migration, the same
inserts persist to the table.

**After applying:** Verify with `select count(*) from analytics_events;`
in the SQL editor. Should return 0 rows. Then visit /pricing — should
see a row appear with name='pricing_viewed' and your IP-less fingerprint
in the props.
