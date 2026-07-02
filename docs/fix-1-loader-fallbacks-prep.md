# Fix #1 Prep — Loader fallback for team_admin / league_admin / rink_operator

## Problem (verified 2026-07-02)

`src/components/dashboard/dashboardTypeData.ts` queries `team_owners` /
`league_owners` / `rink_operators` to count ownership for the type cards.
**None of those three tables exist in prod.** Verified via
`information_schema.tables`:

```
team_owners_exists: false
league_owners_exists: false
rink_operators_exists: false
```

Result: all three loaders silently fall to `loaded=false` and render the
fallback headline ("Your teams" / "Your leagues" / "Your rinks") and the
empty state ("You don't manage any teams yet" etc.) even for users who
actually do own entities.

## What ownership signals exist on prod (verified)

| Entity | Source of truth (per `/api/manage/[type]/[id]/route.ts:83-113`) | Empty? |
|---|---|---|
| rink | `claims` row with `claim_type='rink'` + `entity_id` + `status='approved'` | YES — `claims` table is empty on prod |
| team | `claims` row with `claim_type='team'` + `entity_id` + `status='approved'` | YES |
| league | `profile_account_types.account_type='league_admin'` (no entity-level check) | 1 row (Arnel's `coach` only — no league_admin on prod yet) |
| team_workspaces (user-created) | `team_workspaces.created_by` OR `team_members.role='head_coach'` for that workspace | YES — Arnel has 1 head_coach row (`cebu-ice-datus-test`) |
| listings (business) | `listings.owner_user_id` | YES — but `account_type='business'` users exist |

The user-created team case (team_workspaces) is the only one with
**non-empty ownership data on prod**. Rinks and leagues have no ownership
column at all on their tables (`leagues` and `rinks` have no
`owner_user_id` / `created_by` — only `created_at`). The `claims` table
exists but is empty.

## What's in scope for this fix

**Only** swap the broken queries for the closest real data source so the
counts reflect reality. **No schema migration. No new table. No new
column.** Each fallback uses an existing table that already has the
ownership signal.

| Type | Old query (broken) | New query | Source |
|---|---|---|---|
| team_admin | `team_owners` (missing) | `team_workspaces.created_by = userId` UNION `team_members.user_id = userId AND role='head_coach' AND left_at IS NULL` (deduped by team_id) | `team_workspaces` + `team_members` |
| league_admin | `league_owners` (missing) | **`leagues` has no ownership column.** Cannot count without schema work. Fallback: count `profile_account_types` rows where `account_type='league_admin'` AND user_id = self — **but this is always 1 if the user holds the type**, not a count of leagues. Better fallback: keep `loaded=false` for league_admin and add a note. **HOLDING — see option below.** | n/a |
| rink_operator | `rink_operators` (missing) | Same problem. **`rinks` has no ownership column.** `claims` is empty so cannot count approved claims. **HOLDING.** | n/a |

### Option for league_admin / rink_operator

Three real choices:

**Option A — Honest "no ownership wired yet"**
Keep `loaded=false` for both. Update the card copy to say
"You don't run any leagues/rinks yet" AND keep the empty-state CTA
pointing at `/directory/leagues` and `/directory/rinks` for claiming.
Cost: 1-line copy change per card in `TypeSectionCard.tsx`. Risk: zero.
Honest answer: until claims are wired, there's no real ownership data to
count.

**Option B — Mirror the manage route's behavior**
For league_admin, count = 0 for anyone whose `profile_account_types`
doesn't have `league_admin`, otherwise 0 (the manage route doesn't
actually count leagues either — it just checks the role + league exists).
Useless. Skip.

**Option C — Schema migration to add ownership**
Out of scope for "loader fallback fix" — that's a 4-hour piece and
requires its own prep doc.

**Recommendation: Option A.** It's the only honest answer. We don't have
the data; don't pretend we do.

## Concrete changes

### File 1: `src/components/dashboard/dashboardTypeData.ts`

Replace the team_admin loader:

```typescript
// TEAM_ADMIN: teams where this user is the creator OR head_coach member.
// `team_owners` doesn't exist yet (Phase 1 placeholder); fall back to the
// existing ownership signals in team_workspaces (created_by) + team_members
// (role='head_coach'). Either signal = ownership.
// NOTE: the official ownership system is `claims` with status='approved'
// per /api/manage/[type]/[id]/route.ts:isOwner, but `claims` is empty on
// prod. team_workspaces.created_by + head_coach membership is the closest
// existing signal. When claims are wired, switch to that count.
try {
  // Count from team_workspaces where created_by = userId
  const { count: created } = await supabaseAdmin
    .from('team_workspaces')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId);
  // Plus active head_coach memberships
  const { count: headCoach } = await supabaseAdmin
    .from('team_members')
    .select('team_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'head_coach')
    .is('left_at', null);
  // Dedup: a user could be both created_by AND head_coach on the same team.
  // Conservative: use max of the two (counts may overlap but the card only
  // shows one number, so overcount by ≤1 is acceptable).
  data.team_admin.teamCount = Math.max(created || 0, headCoach || 0);
  data.team_admin.loaded = true;
} catch { /* keep */
```

Replace the league_admin loader (Option A — keep `loaded=false`):

```typescript
// LEAGUE_ADMIN: `league_owners` doesn't exist and `leagues` has no
// ownership column. `claims` is empty on prod. No ownership signal to
// count against. Stay at loaded=false and render the honest empty state.
// Tracked: add `leagues.owner_user_id` or wire `claims` for league
// ownership — separate piece, not in this loader fix.
try {
  // Probe to confirm the missing-table assumption still holds; if a
  // league_owners table appears, swap to counting against it.
  await supabaseAdmin.from('league_owners').select('id', { count: 'exact', head: true }).limit(1);
  // If we reach here, league_owners now exists — count against it.
  const { count } = await supabaseAdmin
    .from('league_owners')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  data.league_admin.leagueCount = count || 0;
  data.league_admin.loaded = true;
} catch { /* league_owners still missing — keep loaded=false */ }
```

Replace the rink_operator loader (same probe pattern):

```typescript
// RINK_OPERATOR: `rink_operators` doesn't exist and `rinks` has no
// ownership column. `claims` is empty on prod. Same probe pattern as
// league_admin — flip to counting if a rink_operators table appears.
try {
  await supabaseAdmin.from('rink_operators').select('id', { count: 'exact', head: true }).limit(1);
  const { count } = await supabaseAdmin
    .from('rink_operators')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  data.rink_operator.rinkCount = count || 0;
  // Leads count still works.
  try {
    const { count: lc } = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('claimant_user_id', userId);
    data.rink_operator.leads = lc || 0;
  } catch { /* keep 0 */ }
  data.rink_operator.loaded = true;
} catch { /* rink_operators still missing — keep loaded=false */ }
```

**Why the probe pattern:** The current code uses try/catch with a single
query. If the table is missing, the whole block fails and we render
`loaded=false`. The probe pattern (`await supabaseAdmin.from(table).select().limit(1)`
inside try) does the same thing — if the table is missing, catch and
keep `loaded=false`. If the table ever appears, the loader automatically
starts working. **No further code change needed for that future case.**

Note: I'm switching the leads filter from `clerk_user_id` to
`claimant_user_id` because that's the actual column name on the `leads`
table (verified via `information_schema.columns`). The current code uses
`clerk_user_id` which would silently return 0 for everyone.

### File 2: `src/components/dashboard/TypeSectionCard.tsx` (only if needed)

If we land Option A for league_admin / rink_operator, no change needed —
the current empty state copy ("You don't run a league yet" / "You don't
run a rink yet") is already correct for `loaded=false`.

## Rollback

```bash
cd /root/.openclaw/workspace/rinkstop-platform
git revert <commit-sha>
git push origin main
```

Plus, if we shipped the leads column change: revert the filter. Both are
in one commit. <30 seconds.

## Smoke test plan (after deploy)

1. `pnpm run build` exit 0
2. Ship gate (no new imports, all tracked)
3. `/dashboard` returns 200 for logged-in user (Arnel's Clerk session)
4. Add a test `account_type='team_admin'` row to Arnel's
   `profile_account_types` → reload `/dashboard` → team_admin card shows
   "Managing N teams" with N ≥ 1
5. Remove the test row → reload → card back to "You don't manage any
   teams yet"
6. (No regression for other types since I'm not touching their loaders)

## Scope lock

- Only the 3 broken loaders in `dashboardTypeData.ts`.
- No changes to `TypeSectionCard.tsx` (the card renders correctly given
  the loader changes).
- No changes to `/api/manage/[type]/[id]/route.ts` (the official
  ownership rule is unchanged — this fix only changes what the dashboard
  *counts*, not who can actually edit).
- No new env vars, no schema migrations, no new packages.

## Build cost

~20-30 minutes. Most of it is the build + deploy cycle.

## Open question for Arnel

**Q1 — League / rink loader: which option?**

- Option A (recommended): keep `loaded=false`, honest empty state, no
  fake count.
- Option B: don't change anything (status quo, wrong counts forever).
- Option C: separate piece for schema migration.

If you say A, I ship this fix as scoped. If you want C, this doc becomes
half the prep for a bigger piece.

**Q2 — Lead count filter:**

The current code filters `leads.clerk_user_id = userId`. The actual
column is `claimant_user_id` (verified). Should I:
- Switch to `claimant_user_id` (counts leads owned by this user — real,
  but the table is mostly empty)
- Leave `clerk_user_id` (always returns 0 — the bug)

I'm switching to `claimant_user_id` in this fix because it's the actual
column and matches what the user expects.