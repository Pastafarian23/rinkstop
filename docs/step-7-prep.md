# Step 7 — Per-Workspace Status Indicators on Hub Cards — PREP

## Scope (1 sentence)
The 3 workspace cards on `/dashboard` (Personal / Organization / Business) each show a one-line status summary + an empty-state CTA when the user has unlocked the workspace but has nothing in it yet.

## Why this is its own step (not folded into Step 4)
- Step 4 (Hub): 3 cards. Each says "Open Workspace →". Generic. No status.
- Step 5 (Switcher): Persistent switcher in header.
- Step 6 (Nav): Sub-nav reflects active workspace.
- **Step 7 (Status): Hub cards show what you'll find when you click in.** Closes the loop on "User clicks Open → empty page → confused" → "User sees 'No teams yet — claim your first' on the card → knows what to expect."

## What exists today (don't redo)
- `src/components/dashboard/TypeSectionCard.tsx` — already has per-account-type empty states (when user has coach role but 0 teams, etc.). Step 7 is at the WORKSPACE level, not the account-type level.
- `src/app/dashboard/page.tsx` — has the "PICK YOUR HOCKEY ROLE" global empty state for `types.length === 0`.
- `src/components/dashboard/dashboardTypeData.ts` — `loadDashboardTypeData()` returns `TypeSectionData` with all the counts we need.

## Behavior target

### Personal card (active workspace)
- If user has player/parent/scout/fan account types AND any of them have non-zero counts → "✓ Active — N items tracked"
- Otherwise (or no relevant types) → "👤 Set up your profile to get the most out of Personal" + CTA "Open Personal →"

### Organization card
- If user has coach/team_admin/referee/league_admin AND any of {coach.teamsManaged, team_admin.teamCount, league_admin.leagueCount} > 0 → "✓ N teams · M leagues"
- Otherwise (or no relevant types) → "🏒 Claim your first team to get started" + CTA "Browse teams →" → /directory/teams

### Business card
- If user has business/rink_operator AND {business.listings, rink_operator.rinkCount} > 0 → "✓ N listings live"
- Otherwise (or no relevant types) → "🏟️ Create your first listing" + CTA "Add a listing →" → /dashboard/listings

### Locked workspaces (per Step 4)
- If the workspace requires account types the user doesn't have → existing locked card with 🔒 + "Choose role" CTA. No change.

### Tier-gated workspaces (per Step 4)
- If the workspace is unlocked but tier is below minTier → existing tier-locked card with "Upgrade to [tier]" CTA. No change.

## Affected files
- `src/app/dashboard/page.tsx`
  - Pass `typeData` (already loaded) to `WorkspaceHub` component
  - In `WorkspaceHub`, compute per-workspace status from `typeData`
  - Render status line + inline CTA on each card
- No new components, no new data fetches (data already loaded)

## Must-keep-working (audit checklist, run before ship)
- [ ] All 3 workspace cards still render
- [ ] Locked cards (missing account type) still show 🔒 + "Choose role" CTA
- [ ] Tier-gated cards (unlocked but below minTier) still show "Upgrade" CTA
- [ ] Card click still navigates to workspace's primaryHref
- [ ] Status text doesn't wrap to multiple lines on mobile (320px width)
- [ ] No new env vars, no new data fetches
- [ ] /admin/* still 307
- [ ] /api/health still 200
- [ ] /pricing still 200
- [ ] Per-account-type section cards (TypeSectionCard) unchanged
- [ ] Global "PICK YOUR HOCKEY ROLE" empty state for types.length === 0 unchanged

## Decision needed before code: status text format

- **Option 1: Icon + sentence** — "🏒 You have 2 teams. Add another →" (icon + headline + secondary CTA)
- **Option 2: Just a one-liner** — "2 teams managed" (minimal, sits below the existing description)
- **Option 3: Replace description with status** — "Manage 2 teams and 1 league" replaces the generic "Teams, players, coaches, officials, registrations, finance."

**My recommendation: Option 2.** The existing card description is useful context ("Teams, players, coaches, officials, registrations, finance."). Replacing it would lose that. Adding a one-liner status + CTA below is additive and matches the Step 5 / Step 6 additive pattern.

## What this step does NOT do
- Does not add per-account-type empty states (TypeSectionCard already has them).
- Does not change the global "PICK YOUR HOCKEY ROLE" empty state.
- Does not change the workspace switcher.
- Does not change tier gates or unlock logic.
- Does not require a Supabase migration.
- Does not require a Stripe change.
- Does not require a Clerk change.

## Estimate
~30-45 min. Pure UI work, no data fetches, no new components.

## Step ordering note

After this ships, the remaining workspace work is:
- Step 8: remove the role-based quick-action grid on the hub page (the 3 cards ARE the grid now). Trivial cleanup.
- Cleanup: delete TABS_BY_ROLE / DEFAULT_TABS / FREE_TIER_ONLY_KEYS from RoleAwareTabBar.tsx.
- DRY: extract `tierAtLeastLocal` to `src/lib/tier.ts`.

## File to update with status when shipped
`memory/2026-07-03.md` (or a new day file) with commit SHA + verified checks.
