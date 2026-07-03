# Step 4 Prep: /dashboard hub → Workspace Hub

**Arnel directive (2026-07-02 21:32 CDT):** "Fix option A for cancelation bug. Then move onto step 4."

**Per the 2026-06-24 Implementation + Audit Protocol:** No code touches /dashboard/page.tsx until this prep doc is approved.

## Scope (one file)

**Affected file:** `src/app/dashboard/page.tsx` (766 lines, 10 sections)

**What changes:** Replace the 10-section landing with a 3-card workspace hub.

**What does NOT change:**
- All `/dashboard/*` subpage URLs stay the same
- All permissions checks (`tierAtLeast`, `hasTeamAdminAccess`, `getUserTier`) stay the same
- All account types still work the same way
- Admin stays on `/admin/*`, untouched
- The catch-all safety net for `renderDashboard()` errors stays

## Section → Workspace mapping

| Current section (in /dashboard/page.tsx) | Lines (approx) | Moves to |
|-----------------------------------------|---------------|----------|
| Username banner + TierBadge header | 252-330 | Stays on hub as global header |
| Account type badges row | 332-370 | Stays on hub |
| `Choose your roles` CTA (no types yet) | 372-525 | Stays on hub as empty-state card |
| `YOUR HOCKEY ROLES` section (TypeSectionCard grid) | 527-560 | Personal workspace card (preview) |
| `MANAGE YOUR ROLES & LINKED RECORDS` CTA | 562-620 | Personal workspace card → /dashboard/roles |
| `MY TEAMS` section (private team workspaces) | 622-680 | Organization workspace card (preview) |
| InboxCard (top-of-page summary) | varies | Stays on hub (shared module) |
| `MY RINKS / BUSINESSES` section (Day 4 listings) | 680-720 | Business workspace card (preview) |
| Other role-specific sections | varies | Mapped per registry |

## 3 workspace cards on the hub

### Card 1: Personal
- **Audience:** All logged-in users (every account type)
- **Min tier:** Free
- **What it shows:**
  - Header: "Personal Workspace" + Icon
  - Subtitle: "Your profile, identity, payments, and connections"
  - Available subpages (preview list):
    - `/dashboard/profile` — your profile
    - `/dashboard/identity` — identity verification
    - `/dashboard/family` — Family Hub (gated)
    - `/dashboard/payments` — your payments
    - `/dashboard/inbox` — your messages
    - `/dashboard/connections` — your connections
    - `/dashboard/settings` — account settings
  - CTA: "Open Personal Workspace →" → links to `/dashboard/profile` (or first available page)

### Card 2: Organization
- **Audience:** Users with `coach`, `team_admin`, `referee`, or `league_admin` account types
- **Min tier:** Club Starter (for team management)
- **What it shows:**
  - If user has the right account type + tier: full preview + CTA
  - If user has the account type but no tier: 🔒 lock + "Upgrade to Club Starter →" CTA
  - If user has no relevant account type: 🔒 lock + "Choose Organization roles →" CTA → `/dashboard/roles`

### Card 3: Business
- **Audience:** Users with `rink_operator` or `business` account types
- **Min tier:** Business Listing
- **What it shows:**
  - Same lock pattern as Organization

## Locked-item UX (per Arnel's constraint)

> "Never hide locked features — show with 🔒 + upgrade CTA instead"

Locked cards:
- Show the card with reduced opacity (e.g., 70%)
- Show 🔒 icon next to the title
- Replace "Open" CTA with "Upgrade to [tier] →" linking to `/pricing?tier=<required_tier>`
- Subpages list still renders but each link shows 🔒 instead of being a hyperlink
- Click on locked link → bounce to /pricing?tier=<required_tier>

## Must-keep-working audit checklist

Before commit, verify these all still work:

| Check | How to verify |
|-------|---------------|
| Logged-in free user sees hub with 3 cards | `curl /dashboard` after auth → grep for "Personal", "Organization", "Business" |
| Logged-in free user CAN click into /dashboard/profile, /dashboard/settings | Manual click test |
| Logged-in free user CANNOT access locked subpages | Manual click test on locked link → bounces to /pricing |
| Logged-in user with all 3 workspace account types sees all 3 unlocked | Manual test with multi-hat identity |
| TypeSectionCard grid still works | Subpage renders, not the hub |
| InboxCard still renders | Hub renders, not subpage |
| UsernameBanner still works | Hub renders |
| AccountTypePicker (in /dashboard/roles) untouched | /dashboard/roles renders same as before |
| Catch-all error safety net still active | Test by hitting /dashboard while broken upstream |
| /api/admin/revenue unaffected | Admin route is untouched |
| /pricing unaffected | Pricing page is untouched |

## Rollback plan

Single-file change. If anything goes wrong:

```bash
git revert <commit-sha> --no-edit
git push origin main
```

Vercel auto-redeploys. Reverts take ~30 seconds. No schema change. No env var change. No data migration. Pure frontend reorganization.

## What this does NOT touch

- `/dashboard/team/*` subpages (Step 5/6)
- `/dashboard/manage/*` subpages (Step 5/6)
- `/dashboard/bookings` shared module conversion (Step 8)
- `/dashboard/payments` shared module conversion (Step 8)
- Workspace Switcher header dropdown (Step 5)
- switchRole → switchWorkspace (Step 7)
- /admin/* pages
- Any API route
- Any DB schema
- Any env vars

## Estimated time

- Implementation: 30-45 minutes (single file, well-bounded)
- Audit: 15 minutes (must-keep-working checklist)
- Build + smoke test: 10 minutes

**Total: ~1 hour.**

## Risks

| Risk | Mitigation |
|------|------------|
| Some /dashboard/* subpage depends on data loaded on the hub | Hub only loads header-level data; subpages are self-contained |
| Locked UX confuses users | Locked cards show full structure, just with 🔒 icon and upgrade CTA — same UI as locked badges elsewhere on the site |
| Account-type fetch fails | Existing safety net + "if not loaded" fallback shows hub with all 3 cards locked + CTA to /dashboard/roles |
| Hub shows empty for new user | Empty-state CTA already in current code (lines 372-525) — preserved as top-of-page card |

## Awaiting Arnel

Two questions:

1. **Approve this prep doc?** If yes, I implement + ship within ~1 hour.
2. **What should the locked-card opacity be?** Options: 50% (very clear "locked"), 70% (subtle hint, matches Arnel's "show with 🔒" pattern), or 100% with just the 🔒 icon and lock CTA. I'd recommend **70%** — clearly distinguishable from active cards but still shows full content.

If you don't reply, I default to 70% opacity and ship.