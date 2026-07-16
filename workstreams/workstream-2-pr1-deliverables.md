# Workstream 2 — PR 1 Deliverables (Dashboard + Activation + Timeline)

> Scope: PR 1 only. Phase 2A (Dashboard), 2B (Activation), 2C (Card), 2D (Timeline Preview). Public Passport (Phase 2E) is deferred to PR 2 per Arnel's recommendation.

---

## 1. Passport Dashboard

**Route:** `/dashboard/passport`
**Flag:** `PASSPORT_DASHBOARD` (default `false`)
**Implementation:** Additive — existing Passport Management editor preserved byte-for-byte below the new section. When the flag is off, the page renders identically to its pre-Workstream-2 state.

The dashboard, when active, surfaces in this order:
1. **Header:** "Your Hockey Passport" + tagline "One identity. Every team. Every rink. Every season."
2. **Passport Card** (display only)
3. **Timeline Preview** (read-only, last 5 events)
4. **Next Steps** (context-aware navigation links)
5. **Manage Passport** (renamed header for the existing editor — same content below)

---

## 2. Activation Flow (Phase 2B)

**Trigger:** First visit to `/dashboard/passport` with `PASSPORT_DASHBOARD=true` AND user has a `pending` Passport.
**Action:** Server component calls `passportService.activatePassport(userId)` before rendering. Appends `PASSPORT_ACTIVATED` event to `passport_events`.
**Idempotent:** Re-visits with `active` Passport are no-ops.
**Silent on failure:** Activation errors are logged server-side but don't block the page render.

---

## 3. Passport Card (Phase 2C)

**File:** `src/components/passport/PassportCard.tsx`
**Displays:** Passport ID, Status, Verification Level, Issue Date, Member Since, Passport Holder Name, Profile Photo (from Clerk), Current Roles.
**Placeholder:** Share button is disabled with tooltip "Public Passport sharing ships in a future release" — wires up to PR 2's public lookup.
**Read-only:** No editing surface. No state.

---

## 4. Timeline Preview (Phase 2D)

**File:** `src/components/passport/PassportTimeline.tsx`
**Source:** Last 5 events from `passport_events` for the user's Passport, newest first.
**Display:** Icon + title + timestamp per event. Lock icon indicates "private to you" (public visibility ships in PR 2).
**Empty state:** "No events yet" placeholder per spec.
**Read-only:** No create/edit/delete UI.

---

## 5. Component Inventory

| Component | Path | Type | Purpose |
|-----------|------|------|---------|
| `PassportCard` | `src/components/passport/PassportCard.tsx` | Server-safe (no client hooks) | Display Passport identity |
| `PassportTimeline` | `src/components/passport/PassportTimeline.tsx` | Server-safe | Read-only event timeline |
| `PassportNextSteps` | `src/components/passport/PassportNextSteps.tsx` | Server-safe (renders Links only) | Context-aware nav links |
| `/dashboard/passport/page.tsx` | (modified, additive only) | Server component | Hub page |

No new client components. No new CSS. All inline `React.CSSProperties` matching the existing dashboard's aesthetic (`#041E42` navy, `rgba(255,255,255,...)` text, Bebas Neue for headers).

---

## 6. API Usage Inventory

All Passport data access flows through the existing service layer. **No direct queries to `passports`, `passport_events`, or `passport_links` from UI components.**

| Call | From | Purpose |
|------|------|---------|
| `passportService.getDashboardState(userId)` | `src/app/dashboard/passport/page.tsx` | Composed read: unified view + passport + recent events |
| `passportService.activatePassport(userId)` | `src/app/dashboard/passport/page.tsx` | Auto-activate pending Passport on first dashboard visit |

Both calls go through the public service surface re-exported from `@/lib/passport`. The Identity Resolver is composed inside the service per the Workstream 1 architecture; the page calls one method per requirement, no direct table access.

**No new internal API routes were added.** The existing `/api/internal/passport/*` routes from Workstream 1 remain available for future webhook/cron use but are not exercised by PR 1's UI.

---

## 7. Regression Report

**Touched files (4):**
- `src/app/dashboard/passport/page.tsx` — additive insertion of `passportDashboardSection` JSX fragment + state-fetch helpers
- `src/lib/passport/07-passport-service.ts` — added `getDashboardState()` method (new export, no changes to existing methods)
- `src/components/passport/PassportCard.tsx` — NEW
- `src/components/passport/PassportTimeline.tsx` — NEW
- `src/components/passport/PassportNextSteps.tsx` — NEW

**Files explicitly NOT touched (verified via grep):**
- `src/app/dashboard/passport/team-history/new/*` — unchanged
- `src/app/dashboard/passport/stats/new/*` — unchanged
- `src/app/dashboard/passport/federation/*` — unchanged
- `src/components/PassportCompletenessBadge.tsx` — unchanged
- `src/components/OnboardingChecklist.tsx` — unchanged (still references the 3 sub-routes by URL)
- `src/app/faq/page.tsx` — unchanged (still describes `/dashboard/passport/team-history/new` etc.)
- `src/app/profile/[slug]/passport/HockeyStatsSection.tsx` — unchanged
- `src/app/profile/[slug]/passport/FederationSection.tsx` — unchanged
- `src/app/profile/[slug]/passport/HockeyCareerSection.tsx` — unchanged

**Backward compatibility:**
- All sub-route URLs preserved
- All FAQ references still resolve
- All public-profile edit links still resolve
- All OnboardingChecklist entries still resolve
- When `PASSPORT_DASHBOARD=false` (default), the page renders byte-for-byte identical to before

**Architectural compliance:**
- ✅ No changes to: organizations, businesses, leagues, teams, messaging, payments, subscriptions, directory, search, reviews, analytics
- ✅ No changes to existing dashboard architecture
- ✅ No refactor of existing code (additive insertions only)
- ✅ No new CSS framework
- ✅ No duplicate components
- ✅ Identity Resolver is the sole identity entry point (composed inside `getDashboardState`)
- ✅ All Passport code gated by feature flags; default behavior unchanged when flags off

---

## 8. Screenshots

**Not generated.** The page requires authentication (Clerk) and live data (a user with a Passport). Capture requires:
1. A test user with a Passport record in `public.passports`
2. Authentication cookies / session

Both are available in a deployed environment with `PASSPORT_DASHBOARD=true` set. I can capture screenshots in a follow-up session after Vercel env update + manual login.

**For PR review:** enable the flag in Vercel production env, sign in as a test user with a Passport, hit `/dashboard/passport`. Three states to capture:
- Flag off, no Passport: legacy editor (unchanged)
- Flag on, pending Passport: dashboard + auto-activate transition
- Flag on, active Passport: full dashboard with timeline events

---

## 9. Testing Checklist

**Build & type:**
- [x] `npx tsc --noEmit` — 0 errors
- [x] `pnpm build` — exit 0
- [x] `pnpm vitest --run` — 22/22 tests pass

**Feature flag behavior:**
- [ ] `PASSPORT_DASHBOARD=false` (default): page renders as legacy editor, no new sections appear
- [ ] `PASSPORT_DASHBOARD=true`, user has no Passport: page renders legacy editor (no dashboard section)
- [ ] `PASSPORT_DASHBOARD=true`, user has pending Passport: dashboard renders + activation event appended + timeline shows both PASSPORT_ISSUED and PASSPORT_ACTIVATED
- [ ] `PASSPORT_DASHBOARD=true`, user has active Passport: dashboard renders + timeline shows existing events (no new event appended)

**Sub-route preservation:**
- [ ] `/dashboard/passport/team-history/new` still resolves and functions
- [ ] `/dashboard/passport/stats/new` still resolves and functions
- [ ] `/dashboard/passport/federation` still resolves and functions
- [ ] OnboardingChecklist links still resolve
- [ ] Public profile edit links still resolve

**Cross-feature:**
- [ ] No regressions in `/dashboard`, `/dashboard/listings`, `/dashboard/identity`, `/dashboard/family`
- [ ] No regressions in `/directory`, `/directory/teams`, `/directory/players`
- [ ] No regressions in `/claim-your-listing`

**Auth:**
- [ ] Unauthenticated request to `/dashboard/passport` redirects to `/login?redirect_url=/dashboard/passport` (unchanged)

**Visual:**
- [ ] Header "Your Hockey Passport" + tagline renders
- [ ] Passport Card displays all 6 fields when Passport exists
- [ ] Timeline renders event list (or empty state)
- [ ] Next Steps shows pending links and completed (collapsed)
- [ ] "Manage Passport" header appears below the new sections
- [ ] Existing editor cards (career history, stats, federation, endorsements) render unchanged

**Activation flow:**
- [ ] First dashboard visit with pending Passport: status changes to active, PASSPORT_ACTIVATED event appended
- [ ] Second visit with active Passport: no-op, no duplicate event
- [ ] Activation failure: dashboard still renders, error logged server-side

---

## 10. Documentation

**Workstream Constitution compliance:**
- ✅ All access through Identity Resolver / Passport Service
- ✅ Feature flags gate all new code
- ✅ No existing functionality removed
- ✅ One-piece-at-a-time: PR 1 ships 2A-2D only
- ✅ Existing sub-routes and external references unchanged

**Flag to enable in production:**
```
PASSPORT_DASHBOARD=true
```

The new sections become visible to users with Passports. Users without Passports see only the existing editor. The flag can be reverted instantly without code change.

**Out of scope (per spec):**
- PR 2: Public Passport `/p/[passportId]` + privacy enforcement
- Workstreams 3+: Resume, stamps, travel map, rewards, AI summaries
- Any non-Passport refactoring

---

## File-by-file diff summary

**`src/lib/passport/07-passport-service.ts`** — +47 lines
- Added `getDashboardState(internalUserId, eventLimit?)` method
- Added `PassportDashboardState` interface export
- All existing methods unchanged

**`src/app/dashboard/passport/page.tsx`** — +97 lines
- Added 3 component imports + passport imports
- Added dashboard state fetch + activation flow (server-side)
- Added `passportDashboardSection` JSX fragment computed inline
- Inserted `{passportDashboardSection}` at top of existing editor main div
- **No changes to existing JSX paths** — both branches (with-player and without-player) preserved

**`src/components/passport/PassportCard.tsx`** — new (6.1 KB)
**`src/components/passport/PassportTimeline.tsx`** — new (3.7 KB)
**`src/components/passport/PassportNextSteps.tsx`** — new (3.9 KB)

**Total: 5 files changed, 4 created, ~14 KB added.**