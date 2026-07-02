# Dashboard → Workspace Mapping (Audit Pass)

**Status:** Decisions resolved (2026-07-02). Awaiting Step 0 (pricing fix) before any code changes.
**Scope:** Read-only inventory. No code changes. Source = current `main` at `0371ee7`.
**Goal:** Single source of truth for which workspace every dashboard page belongs to, plus the design principles that drive the refactor.

---

## 1. Workspaces

5 workspaces (4 user-facing + 1 internal). Admin kept on separate `/admin` route per Arnel directive.

| # | Workspace | Audience (account types) | Existing pages that move here |
|---|-----------|--------------------------|-------------------------------|
| 1 | **Personal** | player, parent, scout, fan + every verified identity | `/dashboard` (hub), `/dashboard/profile`, `/dashboard/identity`, `/dashboard/family`, `/dashboard/favorites`, `/dashboard/payments`, `/dashboard/subscription`, `/dashboard/inbox`, `/dashboard/messages`, `/dashboard/connections`, `/dashboard/settings`, `/dashboard/welcome`, `/dashboard/support`, `/dashboard/roles`, `/dashboard/compare`, `/dashboard/bookings` (Personal context: "My bookings") |
| 2 | **Organization** | coach, team_admin, referee, league_admin + anyone who runs/manages teams/orgs/federations | `/dashboard/team/*`, `/dashboard/team/new`, `/dashboard/coach-feed`, `/dashboard/plans/*`, `/dashboard/schedule`, `/dashboard/referee/games`, `/dashboard/manage/league/*` |
| 3 | **Business** | rink_operator, business | `/dashboard/manage/rink/*`, `/dashboard/listings`, `/dashboard/leads`, `/dashboard/reviews`, `/dashboard/bookings` (Business context: "Customer bookings" + booking management) |
| — | **Admin** | super_admin only (Arnel via OWNER_EMAILS bypass) | Stays on `/admin/*` route. NOT mounted under `/dashboard`. No changes to admin chrome. |

**Naming change (Arnel directive 2026-07-02):** "Team Workspace" was renamed to "Organization Workspace" because a team is an entity *inside* an organization, not a workspace itself. Organization contains: Teams, Players, Coaches, Officials, Registrations, Finance. The Organization workspace will eventually expose sub-contexts (current team, current season) per the "Context > navigation" principle (see §7 below).

**Account-type → workspace mapping (re-confirmed):**

- `player` → Personal
- `parent` → Personal
- `scout` → Personal
- `fan` → Personal
- `coach` → Organization
- `team_admin` → Organization
- `referee` → Organization
- `league_admin` → Organization
- `rink_operator` → Business (rink operator = business listing owner)
- `business` → Business

### Ambiguous pages (resolved 2026-07-02, Arnel directive)

| Page | Workspace | Context behavior | Min tier | Shared? |
|------|-----------|------------------|----------|---------|
| `/dashboard/compare` | Personal | n/a (single context) | Verified Identity | No |
| `/dashboard/bookings` | Personal + Business | Personal context: "My bookings / Upcoming / Ice reservations / Lessons / Camps". Business context: "Business calendar / Incoming bookings / Booking management / Availability" | Verified Identity (Personal) / Business Listing (Business) | Yes |
| `/dashboard/team` (list view) | Organization | n/a | Club Starter | No |
| `/dashboard/team/new` | Organization | n/a | Club Starter | No |
| `/dashboard/payments` | Personal + Organization | Personal context: "My payments". Organization context: "Organization payments" | Verified Identity (Personal) / Club Starter (Organization) | Yes |

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
- **Locked items: visible-with-lock-icon** (Arnel directive 2026-07-02). Rationale: users discover features; upsells happen naturally; nav stays consistent. Items the user doesn't have access to render with 🔒 + "Upgrade to <tier>" CTA. Click → upsell page or `/pricing`. **Enterprise SaaS convention.**

**Locked-item copy examples (from Arnel):**
- Family Hub 🔒 — Upgrade to Identity Plus
- Analytics 🔒 — Available with Club Pro
- Featured Listing 🔒 — Upgrade Business

---

## 5. What this audit did NOT cover (out of scope for Step 1)

- Reading the actual body of each ambiguous page (`/dashboard/compare`, `/dashboard/bookings`, etc.) to confirm workspace. Step 2 work.
- Counting permission check calls per page (already mapped above for the 30+ pages; full count ~25 calls across 13 pages).
- The pricing bug fix in `tier-gate.ts` / `connections.ts` / `listingTier.ts`. **This blocks Step 2** until Arnel picks (a), (b), or (c) on pricing question.
- Any actual code. This is a doc-only deliverable.

---

## 6. Decisions resolved (Arnel directives 2026-07-02)

1. **Workspace assignments for ambiguous pages** — resolved (see §1 table for `/compare`, `/bookings`, `/team`, `/team/new`).
2. **Locked items: visible-with-lock-icon + upgrade CTA.** Enterprise SaaS convention. Users discover features; upsells happen naturally.
3. **Admin stays on `/admin`** — confirmed.
4. **`/dashboard` becomes the workspace hub** — confirmed.

**Plus three new directives from Arnel (2026-07-02):**

5. **Pricing fix (option a)** — fix `tier-gate.ts`, `connections.ts`, `listingTier.ts` FIRST, before any dashboard code. Foundation work.
6. **Workspace Registry** — create a canonical registry (one row per page) with Route / Workspace / Required Permission / Min Tier / Shared?. Single source of truth. See §8.
7. **Every page belongs to ONE workspace. Never duplicate pages.** Pages receive Workspace Context (Personal vs Business vs Organization) and adapt the data source. Same component, different query. See §7.

**Plus naming + design-principle directives:**

8. **"Team Workspace" renamed to "Organization Workspace"** — a team is an entity *inside* an organization, not a workspace. Organization contains Teams, Players, Coaches, Officials, Registrations, Finance.
9. **Design principle: Context > Navigation.** Every page knows its current Workspace, Organization, Team, Season — and auto-filters.

---

## 7. Context > Navigation (Arnel design principle)

> Every page should always know: Current Workspace / Current Organization / Current Team / Current Season. Now every page automatically filters correctly. No additional navigation needed.

**Implementation:** every page reads context from URL params + cookies + DB-derived defaults:

| Context key | Source | Used by |
|-------------|--------|---------|
| `currentWorkspaceId` | URL param `?w=personal\|organization\|business` OR Workspace Switcher cookie | All pages |
| `currentOrgId` | URL param `?org=<uuid>` OR user's primary org claim | Team pages, payments, members |
| `currentTeamId` | URL param `?team=<slug>` OR active team from TeamSwitcher | Events, schedule, roster |
| `currentSeasonId` | URL param `?season=<year>` OR `team_events.season` default | Schedule, stats |

Pages that need org/team context (e.g. `/dashboard/team/[slug]/events`) already take the slug from the URL — they ALSO read the workspace cookie to confirm the user has access. Pages that are workspace-agnostic (e.g. `/dashboard/profile`) ignore context.

**Shared module rule (the canonical example):** `/dashboard/bookings` is one page, one component, one URL. Its data-fetching hook branches on `currentWorkspaceId` at the top of the component:
- Personal → user's own bookings (`bookings` where `user_id = me`)
- Business → business's incoming bookings (`bookings` where `business_id = me`)

No duplicate pages. Same UI shell, different query.

---

## 8. Workspace Registry

Canonical source of truth for where every page lives. Drives: Workspace Switcher rendering, bottom nav config generation, nav-level permission checks, future AI-assisted development.

| Route | Workspace | Context-dependent? | Required permission | Min tier | Shared? |
|-------|-----------|---------------------|----------------------|----------|---------|
| `/dashboard` | (hub) | yes | none | Free | hub |
| `/dashboard/profile` | Personal | no | none | Free | No |
| `/dashboard/identity` | Personal | no | `tierAtLeastSameTrack(tier, 'verified_identity')` | Verified Identity | No |
| `/dashboard/family` | Personal | no | `tierAtLeastSameTrack(tier, 'identity_plus')` | Identity Plus | No |
| `/dashboard/favorites` | Personal | no | none | Free | No |
| `/dashboard/payments` | Personal + Organization | yes | Verified Identity (P) / Club Starter (O) | Verified Identity / Club Starter | Yes |
| `/dashboard/subscription` | Personal | no | none | Free | No |
| `/dashboard/inbox` | Personal | no | none | Free | No |
| `/dashboard/messages` | Personal | no | none | Free | No |
| `/dashboard/connections` | Personal | no | DM-tier gate | Identity Plus or Business Listing | No |
| `/dashboard/settings` | Personal | no | none | Free | No |
| `/dashboard/welcome` | Personal | no | none | Free | No |
| `/dashboard/support` | Personal | no | none | Free | No |
| `/dashboard/roles` | Personal | no | none | Free | No |
| `/dashboard/compare` | Personal | no | none | Verified Identity | No |
| `/dashboard/bookings` | Personal + Business | yes | Verified Identity (P) / Business Listing (B) | Verified Identity / Business Listing | Yes |
| `/dashboard/claims` | Personal | no | none | Free | No |
| `/dashboard/team` | Organization | no | any team-claim | Club Starter | No |
| `/dashboard/team/new` | Organization | no | none (creation flow) | Club Starter | No |
| `/dashboard/team/[slug]` | Organization | no | team member | Club Starter | No |
| `/dashboard/team/[slug]/events` | Organization | no | `hasTeamAdminAccess` | Club Pro (admin features) | No |
| `/dashboard/team/[slug]/events/new` | Organization | no | `hasTeamAdminAccess` | Club Pro | No |
| `/dashboard/team/[slug]/events/[id]` | Organization | no | `hasTeamAdminAccess` | Club Pro | No |
| `/dashboard/team/[slug]/events/[id]/edit` | Organization | no | `hasTeamAdminAccess` | Club Pro | No |
| `/dashboard/team/[slug]/admin` | Organization | no | `hasTeamAdminAccess` | Club Pro | No |
| `/dashboard/team/[slug]/documents` | Organization | no | team member | Club Starter | No |
| `/dashboard/team/[slug]/payments` | Organization | no | `hasTeamAdminAccess` | Club Pro | No |
| `/dashboard/team/[slug]/payments/new` | Organization | no | `hasTeamAdminAccess` | Club Pro | No |
| `/dashboard/team/[slug]/payments/[id]` | Organization | no | `hasTeamAdminAccess` | Club Pro | No |
| `/dashboard/team/[slug]/schedule` | Organization | no | team member | Club Starter | No |
| `/dashboard/team/[slug]/settings` | Organization | no | `hasTeamAdminAccess` | Club Pro | No |
| `/dashboard/coach-feed` | Organization | no | coach OR team member | Free (read) / Club Starter (post) | No |
| `/dashboard/plans` | Organization | no | coach | Club Starter | No |
| `/dashboard/plans/new` | Organization | no | coach | Club Starter | No |
| `/dashboard/plans/[slug]` | Organization | no | coach | Club Starter | No |
| `/dashboard/plans/[slug]/edit` | Organization | no | coach | Club Starter | No |
| `/dashboard/schedule` | Organization | no | team member | Club Starter | No |
| `/dashboard/referee/games` | Organization | no | referee | Free (stub Q4 2026) | No |
| `/dashboard/manage/league/[id]` | Organization | no | `account_type = 'league_admin'` | League | No |
| `/dashboard/manage/team/[id]` | Organization | no | team member | Club Starter | No |
| `/dashboard/manage/team/[id]/compliance` | Organization | no | `hasTeamAdminAccess` | Club Pro | No |
| `/dashboard/manage/team/[id]/payments` | Organization | no | `hasTeamAdminAccess` | Club Pro | No |
| `/dashboard/manage/rink/[id]` | Business | no | rink_operator OR business | Business Listing | No |
| `/dashboard/listings` | Business | no | business OR rink_operator | Business Listing | No |
| `/dashboard/leads` | Business | no | business OR rink_operator | Business Listing | No |
| `/dashboard/reviews` | Business | no | business OR rink_operator | Business Listing | No |
| `/admin/*` | (separate route) | n/a | `requireSuperAdmin()` OR OWNER_EMAILS bypass | n/a | admin |

**Registry notes:**
- "Min tier" reflects the new tier names from `src/lib/pricing.ts` (post-2026-07-02 brief). Old tier references in code (`pro`, `roster_plus`, etc.) are the bug fixed in Step 0 (pricing fix).
- "Shared?" = yes if the same page renders for multiple workspaces with context-dependent data.
- Routes not yet listed here will be added to the registry on first commit.

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

**Last updated:** 2026-07-02 (after Arnel directives — registry + Organization rename + Context > Navigation principle added)