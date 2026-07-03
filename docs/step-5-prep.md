# Step 5 Prep: Workspace Switcher in Header

**Arnel directive (2026-07-03 02:17 CDT):** "Looks good, continue to step 5"

**Per the 2026-06-24 Implementation + Audit Protocol:** No code touches the dashboard header until this prep doc is approved.

## Goal

Add a workspace switcher to the dashboard header that lets the user pick which workspace (Personal / Organization / Business) they're focused on. Today the header has a role-switcher inside `UserMenu.tsx` that switches between individual account types (player, coach, etc.). Step 5 swaps that for a workspace-level switcher.

## What's wrong with the current role-switcher

`UserMenu.tsx:58` has a `switchRole(role)` function that:
- Writes the role to `localStorage.rinkstop_active_role`
- Reloads the page
- `MobileMenu.tsx:49` and `RoleAwareTabBar.tsx:131` re-read it on next render

**The problem this caused:** "role" is conflated with "workspace." A user with `coach` + `team_admin` + `referee` account types gets a switcher with 3 buttons, all of which map to the same "Organization" workspace. Clicking any of them does roughly the same thing. So the switcher is confusing and doesn't add value.

**Step 5 fixes this** by collapsing the switcher to workspaces (3 max), which IS a meaningful unit of UI grouping.

## Scope

**Affected files (3):**
- `src/components/UserMenu.tsx` — replace "Switch role" section with "Switch workspace" section
- `src/components/MobileMenu.tsx` — same replacement (mobile equivalent)
- `src/components/RoleAwareTabBar.tsx` — update to read workspace instead of role from localStorage

**NOT affected:**
- `TeamSwitcher.tsx` (separate component for team-level switching, untouched)
- `DashboardNav.tsx` (this is rendered context-aware but stays the same shape)
- The `/dashboard/page.tsx` hub from Step 4 (workspaces live in their own config)
- All `/dashboard/*` subpages (none of them read `active_role` directly — they read `useUser()` + DB queries)

## What "Switch workspace" actually does

Reuses the same localStorage + reload pattern as the old `switchRole`:

1. User clicks "Switch to Organization Workspace" in the menu
2. JS writes `localStorage.setItem('rinkstop_active_workspace', 'organization')`
3. Page reloads
4. On re-render, `UserMenu`, `MobileMenu`, `RoleAwareTabBar` read the new value
5. Active workspace is highlighted in the switcher
6. RoleAwareTabBar uses it to filter which tab-bar items render (e.g. when on Organization, show team-management tabs)

**No server-side state.** localStorage only. Pattern matches what exists today.

## What the new switcher UI looks like

Inside the UserMenu popover, where the current "Switch role" section is:

```
┌─────────────────────────────────────┐
│  Switch workspace                    │
├─────────────────────────────────────┤
│  👤 Personal              ✓ Active   │
│  🏒 Organization                     │
│  🏟️ Business                         │
└─────────────────────────────────────┘
```

- 3 buttons max (one per workspace)
- Workspaces the user doesn't have access to (no matching account type) are **hidden** — NOT shown as locked. Reasoning: if a user doesn't have a coach/team_admin/etc. account type, showing them an Organization workspace they can't use is noise. The hub on `/dashboard` already shows it as locked; the switcher is for switching between what you have.
- If user has only Personal (no other account types), the section header says "You only have one workspace" and the section collapses to a single disabled checkmark for Personal
- Active workspace shows ✓ + disabled button

## localStorage key

- Old: `rinkstop_active_role`
- New: `rinkstop_active_workspace`

The old key stays in localStorage but is no longer read by code (cleanup in a separate task if needed). Migration: if `rinkstop_active_role` exists and maps to a workspace, derive the new workspace value on first load.

## Account type → workspace mapping (single source of truth)

Already lives in `src/lib/dashboard/workspaces.ts` from Step 4 (`WORKSPACES` array + `getWorkspaceAccess()`). Reuse it here.

| Account type | Workspace |
|--------------|-----------|
| player, parent, scout, fan | Personal |
| coach, team_admin, referee, league_admin | Organization |
| rink_operator, business | Business |

## RoleAwareTabBar behavior changes

Today: tab bar shows different items based on `activeRole`. A coach sees coach-tabs; a team_admin sees team_admin-tabs; etc.

After Step 5: tab bar shows different items based on `activeWorkspace`. All Organization roles see the same tab bar (because they're in the same workspace). This is the simplification — accounts that previously had subtly different tab bars now share one.

**Wait — this might lose functionality.** Need to audit. If a coach-only tab is materially different from a team_admin-only tab, the workspace switcher would lose that distinction. Let me check this carefully before I commit to it.

## Risk assessment

| Risk | Mitigation |
|------|------------|
| RoleAwareTabBar loses differentiation between coach / team_admin / referee / league_admin | Audit first — read `RoleAwareTabBar.tsx` and confirm whether the per-role differences matter. If they do, keep the old `active_role` switcher AND add the new `active_workspace` switcher in parallel (UserMenu shows both sections). |
| Hidden workspaces confuse users who have Organization account type but it's hidden | Hub already shows the locked workspace on `/dashboard`. Switcher is "between what I have." |
| Page reload feels old-school (Next.js App Router prefers soft navigation) | Match the existing pattern. Soft-nav exploration is out of scope. |
| Mobile menu breaks | MobileMenu is parallel to UserMenu, copy the same change. |

## Audit pre-implementation

Before I write the code, I will:
1. Read `RoleAwareTabBar.tsx` end to end and document whether coach-vs-team-admin-vs-referee have materially different tab bars
2. If yes: split into two switchers (legacy role + new workspace) for one release cycle, then remove the legacy one
3. If no: replace the role switcher entirely with the workspace switcher

## Must-keep-working audit checklist

After ship:

| Check | How to verify |
|-------|---------------|
| UserMenu renders with switcher section | Manual click test on logged-in user |
| Clicking a workspace writes localStorage + reloads | Browser DevTools network tab on click |
| After reload, the chosen workspace is highlighted | Visual check |
| MobileMenu has the same switcher | Mobile viewport test |
| RoleAwareTabBar still works | Visual check on /dashboard |
| `/admin/*` route untouched | curl /admin/* → 307 (same as before) |
| `/dashboard/page.tsx` hub from Step 4 still works | Visual check |
| All subpage URLs still work | curl 19 subpage URLs → 307 each |

## Rollback plan

```bash
git revert <commit-sha> --no-edit
git push origin main
```

3-file revert. Pure frontend. No schema, no env vars, no API. Reverts in ~30 seconds.

## Estimated time

- Audit RoleAwareTabBar for per-role differences: 15 minutes
- Implementation (UserMenu + MobileMenu + RoleAwareTabBar): 30-45 minutes
- Manual testing: 15 minutes

**Total: ~1 hour.**

## Awaiting Arnel

Two questions:

1. **Approve this prep doc?** If yes, I implement + ship within ~1 hour.

2. **Single switcher (workspace only) vs two parallel switchers (legacy role + workspace)?**
   - **Single** — simpler, but loses any per-role tab-bar differentiation
   - **Two parallel** — keeps legacy role switcher for one release cycle, then remove it. Safer but more UI surface area.

I'd recommend **two parallel** for this release, **then** remove legacy in a follow-up. Reason: I haven't audited RoleAwareTabBar yet, and removing the legacy switcher without that audit could break tab-bar functionality for coaches/team_admins/referees.

If you don't reply, I default to **two parallel** and ship per the prep doc scope.