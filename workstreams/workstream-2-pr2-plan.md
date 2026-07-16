# Workstream 2 — PR2 Plan (Identity → Story → Actions)

**Date:** 2026-07-16
**Author:** Arnel (priority order) + KiloClaw (scope detail)
**Status:** Approved direction, ready to begin

---

## Philosophy (Arnel-flagged)

> The first time someone lands on the Passport dashboard should feel like they've received something valuable — not like another account settings page.

Build the experience so users **believe in the Passport**, not so they see a list of widgets. Order work by emotional impact, not by technical convenience.

**Sequence:** identity first → story second → actions third. This minimizes rework because the visual hierarchy is established before polishing secondary states.

---

## Priority Order (do not reorder without Arnel approval)

### Priority 1 — Passport Card (HIGHEST PRIORITY, flagship)

**Why first:** This is the emotional centerpiece. It's the "wallet card" of the entire platform. Must immediately communicate three things:
- "This is my Hockey Passport."
- "This is my permanent identity."
- "This belongs to me."

**Fields:**
- Passport ID (copyable — tap to copy, with confirmation toast)
- QR code (stable endpoint at `/api/internal/passport/qr/[passportId]` or similar — not a 3rd-party dependency)
- Verification level (Self → GPS → QR → Coach → Org → League → Federation → Platform ladder)
- Passport status (Pending / Active / Verified / Expired / Suspended / Deleted)
- Member since / Passport issued date
- Current roles (Player, Parent, Coach, Official, Org admin, etc.)
- Share Passport button (PR3 wiring — disable with "Coming soon" until then)
- View Public Passport button (disabled until PR3 ships)

**Design constraints:**
- Server-safe render (no client hooks) to match WS2 PR1 architecture
- Identity Resolver is the sole identity entry point
- Match existing dashboard aesthetic: `#041E42` navy, `rgba(255,255,255,...)` text, Bebas Neue for headers

---

### Priority 2 — Passport Overview ("dashboard at a glance")

Once the user understands who they are, explain what their Passport contains.

**Fields:**
- Current identity summary
- Verification progress (which levels completed, which pending)
- Number of teams
- Timeline events count
- Achievements count
- Stamps count (0 if none — but this is where Priority 6 empty-state polish applies)
- Family members linked
- Organizations connected

---

### Priority 3 — Timeline Preview (where the story begins)

Show the five most recent events. Examples: Passport activation, profile claimed, team joined, verification completed, coach evaluation.

**Empty state copy (Priority 6 territory but the *primary* empty state lives here):**

> "Every hockey journey begins with a single step. Your timeline will automatically grow as you participate in hockey."

The empty state reinforces the vision instead of showing an empty table. It already answers the three empty-state questions (why empty / why care / what next) at the most-visible spot, setting the tone for the rest.

---

### Priority 4 — Quick Actions

Only after users understand their Passport should we ask them to do things.

**Suggested actions:**
- Claim your profile
- Verify your identity
- Join a team
- Link a child
- Add your first achievement
- Explore nearby rinks
- Order a physical passport (Coming Soon placeholder)

These should become context-aware over time (e.g., if no player profile linked, "Claim your profile" surfaces first).

---

### Priority 5 — Progress & Milestones (retention engine)

Display:
- Verification progress
- Explorer progress (WS4 milestone ladder)
- Passport completeness (% — derived from defined fields)
- Next recommended action

**Example copy:**

> **Passport Completeness: 38%**
>
> Complete these next:
> - Verify identity
> - Claim player profile
> - Join your first team

Gives a sense of progress without feeling like a checklist.

---

### Priority 6 — Empty States (LAST, polish layer)

Once every section exists, make every empty state feel encouraging.

**Rule:** No section ever says "No data."

Every empty state must answer three questions:
1. Why is this empty?
2. Why should I care?
3. What should I do next?

**Work pattern:** Walk through every widget created in Priorities 1-5 and rewrite every empty-state string + add the next-action affordance where it makes sense.

---

## Build Order Constraints (do not violate)

1. **Feature-flag protection** — all new code behind `PASSPORT_DASHBOARD` (PR2 work) and `PASSPORT_PUBLIC_LOOKUP` (PR3 work when it lands). Default off in Vercel.
2. **Backward compatibility** — preserve all legacy passport editor routes (`/dashboard/passport/team-history/new`, `/stats/new`, `/federation`). PR2 must insert above the legacy editor, not replace it.
3. **Identity Resolver is the sole identity abstraction** — no direct `passports` / `passport_events` / `passport_links` queries from UI components. All reads through `passportService`.
4. **Server-safe components** — match WS2 PR1 pattern (no client hooks unless interactivity requires it; minimal new client components).
5. **No new CSS framework** — inline `React.CSSProperties` only.

## Scope Split

PR2 priorities 1-3 ship together as PR2 (one PR, one commit chain).
PR2 priority 4 (Quick Actions) may land as a follow-up commit on the same branch — depends on context-aware logic complexity.
PR2 priority 5 (Progress) likely waits for WS4 milestone data — track as deferred if WS4 not ready.
PR2 priority 6 (Empty States) is the polish pass that closes PR2.

If priorities 1-3 + 4 + 6 are too much for one PR, split at the natural seam: PR2 = Card + Overview + Timeline, PR2.5 = Quick Actions + Empty States polish. Coordinate with Arnel before splitting.

## Verification Checklist (apply before declaring PR2 done)

Build & type:
- [ ] `tsc --noEmit` — 0 errors
- [ ] `pnpm vitest --run` — all tests pass
- [ ] `pnpm build` — exit 0

Feature-flag behavior:
- [ ] `PASSPORT_DASHBOARD=false` — page renders byte-identical to current prod
- [ ] `PASSPORT_DASHBOARD=true`, no Passport — legacy editor (no dashboard sections)
- [ ] `PASSPORT_DASHBOARD=true`, pending Passport — activation flow fires
- [ ] `PASSPORT_DASHBOARD=true`, active Passport — full dashboard renders

Sub-route preservation:
- [ ] `/dashboard/passport/team-history/new` resolves
- [ ] `/dashboard/passport/stats/new` resolves
- [ ] `/dashboard/passport/federation` resolves
- [ ] OnboardingChecklist links resolve
- [ ] FAQ references resolve

Cross-feature regression:
- [ ] No regressions in `/dashboard`, `/dashboard/listings`, `/dashboard/identity`, `/dashboard/family`
- [ ] No regressions in `/directory`, `/claim-your-listing`
- [ ] Auth redirect: `/dashboard/passport` → `/login?redirect_url=...`

User experience (manual verification required):
- [ ] First impression: feels like a permanent identity, not an account settings page
- [ ] Card section: copy works, QR renders, status/verification/roles visible
- [ ] Overview section: identity summary + counts feel coherent
- [ ] Timeline section: 5 most recent events OR encouraging empty state
- [ ] Quick actions: context-aware ordering works
- [ ] Empty states: every widget answers "why empty / why care / what next"

Constitution compliance:
- [ ] All access through Identity Resolver / Passport Service
- [ ] Feature flags gate all new code
- [ ] No existing functionality removed
- [ ] One-piece-at-a-time
- [ ] Existing sub-routes and external references unchanged

## Decision Authority

This priority order is **Arnel-flagged**. Do not reorder without explicit Arnel approval.
The Priority 6 empty-state principle ("No section says 'No data'") is also Arnel-flagged — applies to every empty state we write, including ones in Priorities 1-5.
