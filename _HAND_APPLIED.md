# Hand-applied migrations

Migrations in this file were applied to the live database **manually** (via the
Supabase Management API `POST /v1/projects/{ref}/database/query`, using
`/root/.openclaw/credentials/_run-migration.mjs`), outside the normal deploy
path. They are committed to `supabase/migrations/` as well, but a fresh
`db push` would fail on the ones already applied — so they are listed here.

**Do not re-apply these.** Each is idempotent anyway (every write is
`ON CONFLICT (slug) DO UPDATE` or a guarded `UPDATE`), but re-running is
unnecessary.

| Date (UTC) | Migration | What it did |
|---|---|---|
| 2026-11-06 | `2026-11-06_fix_team_count_canonical.sql` | Rewrote `get_directory_stats()` to count `team_workspaces` (active + public) instead of the legacy `teams` table; switched `newest_teams`/`recent_teams` to `team_workspaces`. Canonical team count became **2,643**. |
| 2026-11-06 | `2026-11-06_backfill_missing_team_workspaces.sql` | Inserted the 10 missing `team_workspaces` rows for teams that existed only in `teams` (krefeld-pinguine, hv71, malmo-redhawks, vaxjo-lakers, skelleftea-aik, trois-rivieres-lions, new-mexico-goatheads, trenton-ironhawks, hamilton-hammers, usa-hockey-ntdp), preserving original UUIDs so fixtures/claims/external refs keep resolving. |
| 2026-11-06 | `2026-11-06_fix_fixtures_audit_trigger.sql` | Made all three `fixtures` integrity triggers `SECURITY DEFINER` with `SET search_path TO ''` and `public.`-qualified audit writes. Before: any rejection surfaced as `relation "fixtures_audit" does not exist` and no audit row was written. |
| 2026-11-06 | `2026-11-06_fix_false_zero_zero_completed_fixtures.sql` | Corrected **2,286** fixtures falsely marked `completed` with 0-0 scores (2,226 were future games). Future games → `scheduled` with NULL scores; past games keep `completed` with NULL scores. The downgrade trigger is disabled inside the same transaction and re-enabled immediately. |
| 2026-11-06 | `2026-11-06_mark_pro_arena_rinks_unclaimable.sql` | Marked the **32 NHL team home arenas** `rinks.claimable = false` so the public rink pages stop showing a claim CTA on franchise venues. Independent rinks (including Slough Ice Arena) keep theirs. |
| 2026-11-06 | `2026-11-06_keep_team_federation_contacts_internal.sql` | Federation + team `contact_email`/`contact_phone` made **internal**: table-level SELECT revoked from anon/authenticated and re-granted per non-sensitive column (a column-level REVOKE alone does not work — the table ACL carries a table-level SELECT grant). Data kept for internal marketing; public rendering removed from the team profile and federation page. |
| 2026-11-06 | `2026-11-06_publish_india_team_inventory.sql` | Published the Ice Hockey Association of India's inventory from the General Secretary: 1 new league (`india-first-league`), 13 clubs linked to the IHA federation and that league, the existing India league + national team linked to the federation, `federation_url` set on all 5 `national_teams` rows, and an honest federation description. The truncated state/UT list and the Pune + Shimla rinks were deliberately NOT published (insufficient data). |

## How to apply by hand

```bash
cd /root/.openclaw/workspace/rinkstop-platform
node /root/.openclaw/credentials/_run-migration.mjs supabase/migrations/<file>.sql
# → Project: yszheonqyyskkjoxoexk
# → Status: 201
```
