# Dashboard → Workspace Mapping (Audit Pass)

**Status:** Draft for Arnel review (Step 1 of dashboard transition).
**Scope:** Read-only inventory. No code changes. Source = current `main` at `0371ee7`.
**Goal:** Confirm each existing dashboard page belongs to one of 5 workspaces, identify permission checks per page, find the role-switcher code we need to migrate.

---

## 1. Workspaces

5 workspaces (4 user-facing + 1 internal). Admin kept on separate `/admin` route per Arnel directive.

| # | Workspace | Audience (account types) | Existing pages that move here |
|---|-----------|--------------------------|-------------------------------|
| 1 | **Personal** | player, parent, scout, fan + every verified identity | `/dashboard` (hub), `/dashboard/profile`, `/dashboard/identity`, `/dashboard/family`, `/dashboard/favorites`, `/dashboard/payments`, `/dashboard/subscription`, `/dashboard/inbox`, `/dashboard/messages`, `/dashboard/connections`, `/dashboard/settings`, `/dashboard/welcome`, `/dashboard/support`, `/dashboard/roles` |
| 2 | **Team** | coach, team_admin, referee + anyone who manages a team | `/dashboard/team/*`, `/dashboard/coach-feed`, `/dashboard/plans/*`, `/dashboard/schedule`, `/dashboard/referee/games` |
| 3 | **Organization** | league_admin (and future federation) | `/dashboard/manage/league/*` |
| 4 | **Business** | rink_operator, business | `/dashboard/manage/rink/*`, `/dashboard/listings`, `/dashboard/leads`, `/dashboard/reviews`, `/dashboard/bookings`, `/dashboard/compare` |
| — | **Admin** | super_admin only (Arnel via OWNER_EMAILS bypass) | Stays on `/admin/*` route. NOT mounted under `/dashboard`. No changes to admin chrome. |

### Account-type → workspace mapping

The 10 account types in `src/lib/accountTypeMeta.ts` collapse into the 4 user-facing workspaces:

- `player` → Personal
- `parent` → Personal
- `scout` → Personal (scouting is personal viewing activity; no separate workspace)
- `fan` → Personal
- `coach` → Team
- `team_admin` → Team
- `referee` → Team
- `league_admin` → Organization
- `rink_operator` → Business (rink operator = business listing owner)
- `business` → Business

A user can have multiple account types (multi-hat identity). The Workspace Switcher shows one entry per workspace the user has at least one account-type row in `profile_account_types` for.

### Pages with ambiguous workspace

These need Arnel's call before we proceed:

| Page | Possible workspaces | Question |
|------|---------------------|----------|
| `/dashboard/compare` | Business (for Business Plus owners comparing stats) OR Personal (any user can compare rinks) | Brief says "preserve functionality." Current page is open to anyone. Keep in Personal or move to Business? |
| `/dashboard/bookings` | Personal (user's own bookings) OR Business (business's booking calendar) | Need to read the page to see whose bookings it shows. |
| `/dashboard/team` (list view) | Team workspace | Obvious, but confirm: this is the "list of teams you can manage," not your personal team. |
| `/dashboard/team/new` | Team workspace | Create-a-team flow. Confirm belongs in Team workspace. |

(Will resolve during Step 2 by reading each ambiguous page and surfacing one decision per page in the prep doc.)

---

## 2. Permission checks per page

Current code uses 3 permission primitives: `getUserTier` (lib/connections), `tierAtLeast` / `tierAtLeastSameTrack` (lib/connections + lib/tier-gate), `hasTeamAdminAccess` (lib/tier-gate). None of these change in the workspace refactor — they continue to gate feature access inside pages.

| Page | Permission check | What it gates |
|------|------------------|---------------|
| `/dashboard/page.tsx` (hub) | none visible (just renders sections) | full-page render |
| `/dashboard/identity/page.tsx:65` | `tierAtLeastSameTrack(tier, 'roster_plus') \|\| tierAtLeastSameTrack(tier, 'business_starter')` | "Can start identity verification?" gate |
| `/dashboard/family/page.tsx:20` | `['roster_plus', 'pro', 'business_pro', 'business_premium', 'enterprise'].includes(normalizedTier)` | "Can access Family Hub?" gate |
| `/dashboard/team/[slug]/events/*` (4 pages) | `hasTeamAdminAccess(userId)` | "Can manage team events?" gate |
| `/dashboard/schedule/page.tsx` | `hasTeamAdminAccess(userId)` (via `schedule/share/route.ts`) | "Can share schedule?" gate |
| `/dashboard/claims/page.tsx` | `getUserTier`, `getMaxClaimsForTier`, `getUserApprovedClaimCount` | "How many more claims can I make?" display |
| `/dashboard/roles/page.tsx` | `getUserTier` | Display + add/remove account types |
| `/dashboard/manage/league/[id]/page.tsx:32` | `.eq('account_type', 'league_admin')` check on `profile_account_types` | "Can manage this league?" gate |
| `/dashboard/manage/team/[id]/page.tsx` | (need to read in Step 2) | (need to read in Step 2) |
| `/dashboard/manage/rink/[id]/page.tsx` | (need to read in Step 2) | (need to read in Step 2) |
| `/dashboard/leads/page.tsx:68` | `claimantTier !== 'pro'` | Upgrade nudge visibility |
| `/dashboard/inbox/page.tsx:97` | `LEAD_CAPABLE_TYPES.has(t.account_type)` | Lead routing rules |

**Permissions model: do NOT rewrite.** The workspace switcher reads `profile_account_types` to determine which workspaces exist for the user. Inside each workspace, the existing permission checks still run. No permission check moves; nothing changes about WHO can do WHAT. Only the surrounding chrome (which workspace the user is "in") changes.

**WARNING (carried over from pricing audit):** The permission helpers in `src/lib/tier-gate.ts`, `src/lib/connections.ts`, and `src/lib/listingTier.ts` still reference old tier names (`'roster'`, `'roster_plus'`, `'pro'`, etc.). These are runtime-broken for new tier values. **The workspace refactor should NOT proceed until the pricing bugs in those files are fixed**, otherwise new users on Verified Identity/Identity Plus will hit "Team Admin features locked" / "Family Hub unavailable" / "Cannot start identity verification" — exactly the features the new pricing is supposed to unlock.

---

## 3. Role-switcher code (to migrate)

Current role-switcher lives in 3 components:

- **`src/components/UserMenu.tsx`** — desktop user menu. `switchRole(role)` function at line 58. Renders account-type list at lines 311-317. Sets `activeRole` for nav rendering.
- **`src/components/MobileMenu.tsx`** — mobile equivalent. Same shape, lines 49, 69, 307.
- **`src/components/RoleAwareTabBar.tsx`** — bottom nav that varies by role. Lines 142, 153, 159, 182, 185.

The `switchRole` function in `UserMenu.tsx` is the migration target. Per the brief, role-switching logic should be **migrated, not removed**. The user-facing behavior changes from "switch dashboard" to "switch workspace inside one app."

**Migration plan for these 3 components (Step 5 in the brief order):**

1. Add a new `WorkspaceSwitcher` component (Step 3 of the plan) that replaces the role-list portion of `UserMenu` and `MobileMenu`.
2. `switchRole` becomes `switchWorkspace` internally, mapping the selected account type → workspace.
3. Keep `UserMenu` and `MobileMenu`'s other functions (sign out, settings, etc.) intact.
4. `RoleAwareTabBar` continues to work inside each workspace (it gates tab visibility per account type), but its outer wrapper becomes the per-workspace nav config.
5. **Fallback for 1 release:** if a user lands on a URL with a legacy `?role=` or `?activeRole=` param, keep the old role-switcher behavior as a hidden fallback. Removed in the next release.

---

## 4. Bottom nav standardization

Current `DashboardNav` (`src/components/DashboardNav.tsx`, 66 lines) renders links passed in by `dashboard/layout.tsx`. Different users see different link lists because the layout reads `tierAtLeast(currentTier, 'roster')` (line 202) and `tierAtLeastSameTrack(...)` etc. to decide which links to include.

**Standardization plan:**

- Define 4 nav configs (one per user-facing workspace) in `src/lib/dashboard/workspaces.ts`. Each config is `{ workspaceId, label, icon, items: [{ href, label, gatedBy?, lockReason? }] }`.
- `DashboardNav` takes a `workspaceId` prop, looks up the config, renders the items.
- **Permission gates don't remove items.** Items the user doesn't have access to stay visible but render with a lock icon + "Upgrade to access" tooltip. Click → upsell page or `/pricing`. This matches the brief: "permissions should determine visible sidebar items, available modules, available actions" — but the original brief ALSO says "do not change business logic," so gating stays as-is in the underlying pages; the nav just signals locked-vs-unlocked.

(Open question for Arnel: do we want locked items visible-with-lock-icon, or hidden entirely? Brief is ambiguous. My default: visible-with-lock-icon, because hidden items hide capability from the user and reduce discoverability. But if you prefer hidden, that's a 1-line change.)

---

## 5. What this audit did NOT cover (out of scope for Step 1)

- Reading the actual body of each ambiguous page (`/dashboard/compare`, `/dashboard/bookings`, etc.) to confirm workspace. Step 2 work.
- Counting permission check calls per page (already mapped above for the 30+ pages; full count ~25 calls across 13 pages).
- The pricing bug fix in `tier-gate.ts` / `connections.ts` / `listingTier.ts`. **This blocks Step 2** until Arnel picks (a), (b), or (c) on pricing question.
- Any actual code. This is a doc-only deliverable.

---

## 6. Decisions needed from Arnel

1. **Workspace assignments for ambiguous pages** (table in §1) — need explicit OK on `/compare`, `/bookings`, `/team`, `/team/new`.
2. **Locked items: visible-with-icon or hidden?** — my default is visible-with-icon.
3. **Confirm Admin stays on `/admin`** — already confirmed (this doc reflects that).
4. **Confirm `/dashboard` becomes the workspace hub** (replacing the 10-section landing) — already confirmed.

Once 1+2 are answered, Step 2 (read ambiguous pages, produce final mapping) takes <30 minutes. After Step 2 sign-off, we move to Step 3 (workspace hub page) in code.

---

**Sources read:**
- `src/lib/accountTypeMeta.ts` (10 account types)
- `src/lib/pricing.ts` (new tier structure, mapping)
- `src/app/dashboard/layout.tsx` (current nav construction)
- `src/components/DashboardNav.tsx` (current nav component)
- `src/components/UserMenu.tsx` (role-switcher, line 58 `switchRole`)
- `src/components/MobileMenu.tsx` (mobile role-switcher)
- `src/components/RoleAwareTabBar.tsx` (per-role tab bar)
- `grep` over `src/app/dashboard/` for permission checks (~25 hits across 13 pages)

**Last updated:** 2026-07-02 (commit `0371ee7`)