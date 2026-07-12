# Step 6 — Per-Workspace Nav Config — PREP

## Scope (1 sentence)
Each workspace (Personal / Organization / Business) gets its own sub-nav: the sidebar/menu on `/dashboard/*` shows only the subpages that belong to the active workspace, ordered by frequency-of-use within that workspace.

## Why this is its own step (not folded into Step 4 or 5)
- Step 4 (Hub): Entry point — 3 big cards on `/dashboard`.
- Step 5 (Switcher): Persistent switcher in header so the user can move between workspaces at any time.
- Step 6 (Nav): When you're INSIDE a workspace, the nav around you should reflect that workspace. Today the left rail / top nav still shows the old global per-role tabs even after you switch to Organization. That's the inconsistency this step fixes.

## What's already in place (don't redo)
- `src/lib/dashboard/workspaces.ts` — registry of all 3 workspaces, with `subpages[]` per workspace, `minTier` gating, `requiredAccountTypes` for unlock.
- `src/lib/dashboard/switchWorkspace.ts` — `getActiveWorkspace()`, `switchWorkspace()`, `migrateActiveRoleToWorkspace()`.
- `src/components/UserMenu.tsx` — workspace switcher section (added in Step 5).
- `src/components/MobileMenu.tsx` — workspace switcher pills (added in Step 5).
- `src/app/dashboard/layout.tsx` — passes `currentTier` as `userTier` to UserMenu.

## Affected files
- `src/app/dashboard/layout.tsx` — read `activeWorkspace` from localStorage on server (cookies? no — currently localStorage only) → pass to children
- `src/components/RoleAwareTabBar.tsx` — accept `activeWorkspace` prop; filter TABS_BY_ROLE by workspace membership; OR rebuild as workspace-driven not role-driven
- `src/components/MobileBottomTabBar.tsx` — same
- `src/components/DashboardNav.tsx` (if it exists) — left rail
- `src/app/dashboard/page.tsx` — if it currently renders role-based quick actions, swap to workspace-based
- `src/components/UserMenu.tsx` — no change (Step 5 already done)
- `src/components/MobileMenu.tsx` — minor: the existing subpage list inside the menu should also filter by workspace

## Behavior target
- User on `rinkstop_active_workspace = 'personal'` → tabs/links show only Personal subpages: Profile, Identity, Family, Favorites, Inbox, Connections, Subscription, Settings, Support, Roles.
- User switches to `'organization'` (now on `/dashboard/team`) → tabs/links swap to: My Teams, Create Team, Coach Feed, Practice Plans (gated), Schedule, Referee Games.
- User switches to `'business'` → tabs/links swap to: My Listings, Leads, Reviews.
- Within each workspace, the link to the workspace hub (`/dashboard` with cards) is shown so user can return to hub.

## Must-keep-working (audit checklist, run before ship)
- [ ] Workspace switcher still appears in UserMenu.tsx (Step 5) and MobileMenu.tsx
- [ ] All 3 workspace hub cards still render on `/dashboard` (Step 4)
- [ ] Migration from `rinkstop_active_role` to `rinkstop_active_workspace` still runs on first mount
- [ ] Active workspace: ✓ + disabled button still shown
- [ ] Workspaces with no matching account type still hidden
- [ ] User with only Personal workspace still sees "You only have one workspace — Personal" collapse
- [ ] All existing /dashboard/* subpages still resolve 200
- [ ] /admin/* still 307 (untouched)
- [ ] /api/health still 200
- [ ] /pricing deep-link (`?tier=X`) still works
- [ ] RoleAwareTabBar's 11 per-role tab sets (Coach Feed, Learn, My Kid(s), Compare, Games, Reports, Payments, Compliance, Standings, Bookings, Directory) are NOT lost — they should still drive the per-role tab experience when in a workspace that has no subpage config, OR we explicitly retire them and document the change.

## Decision needed before code: tab strategy
- **Option A — Workspace-driven, role retired:** Tabs come from `WORKSPACES[active].subpages`. The 11 per-role tab sets in `TABS_BY_ROLE` are no longer used. Pro: single source of truth. Con: behavior change for power users who relied on role-specific tabs (e.g. coach's "Inbox" vs scout's "Watchlist").
- **Option B — Workspace narrows, role still picks within:** When in a workspace, filter role tabs to those whose href falls under `workspace.subpages[].href`. Keep role-specific naming. Pro: no behavior change for existing users. Con: dual source of truth (workspaces.ts + TABS_BY_ROLE), drift risk.
- **Option C — Workspace wins for the menu, role stays for the bottom tab bar:** Sidebar uses workspace.subpages; mobile bottom tabs keep role-based (they were designed for the 4-tab Capacitor WebView pattern). Pro: mobile experience unchanged. Con: divergent patterns on different surfaces.

**My recommendation: Option A.** The 11 per-role tab sets were designed before the workspace model existed. Now that the registry has subpages, the registry should be the source. If a user misses a specific role-tab label, the workspace's subpages should be renamed to match. Document the breaking change in the commit message.

## Rollback plan
- One commit. Revert: `git revert <commit-sha>` + `git push origin main`. Vercel redeploys the previous commit in ~30s.
- The Step 5 deploy hook (`trigger-49c1f5d`, id `hqTIPgkXbO`) is available for the same manual-trigger workaround if the auto-deploy webhook lags again.

## What this step does NOT do
- Does not add new subpages (registry already lists 19 across 3 workspaces).
- Does not change tier gates.
- Does not change the workspace hub page.
- Does not change the workspace switcher.
- Does not change the homepage, /pricing, /directory, or any public surface.
- Does not require a Supabase migration.
- Does not require a Stripe change.
- Does not require a Clerk change.

## Estimate
~45-90 min once option A/B/C is approved. Build is fast; the work is mostly the filter logic + a smoke test pass on each role.

## Step ordering note
After this ships, the remaining workspace work is small:
- Step 7 (TBD): empty states per workspace (when user has no teams / no listings, what does the workspace look like?)
- Step 8 (TBD): per-workspace quick-action grid on the hub page itself (current /dashboard has both cards and a quick-action grid; we should remove the grid since the cards ARE the grid now).

## File to update with status when shipped
`memory/2026-07-03.md` (or a new day file) with commit SHA + verified checks.
