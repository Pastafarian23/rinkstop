# Piece #1 Preparation: Team Hub Entry Point on Directory Page

**Date:** 2026-06-24 (revised)
**Branch:** `recovery/day6-rebuild` (currently at `7998efd`, ahead of main by 1 commit)
**Author:** KiloClaw
**Status:** DRAFT — awaiting Arnel's "go" before any code is changed
**Revision history:** v1 was a permission-gated team profile page (rejected by Arnel 2026-06-24 13:02). v2 is this document, based on Arnel's correction: "a single directory listing for the team that is public facing. Then there can be a subpage that leads to team/organization hub."

---

## 1. Scope statement

**What this piece IS:**

Add a "Team hub" entry point on the existing public-facing team page at `/directory/teams/[slug]`. The CTA appears only when:
1. The team is **claimed and active** (i.e., has a hub to link to).
2. The viewer is either:
   - Not signed in → shows "Sign in to access team hub" button
   - Signed in but NOT a member of the team → shows "Request to join the team" or "View hub preview" (depending on team policy)
   - Signed in AND a member of the team → shows "Go to team hub" button linking to `/dashboard/team/[slug]`

The existing admin CTAs ("Post a result", "Add to schedule", "Post news") already work for admins. This piece adds the **equivalent entry point for non-admins** (parents, players, signed-out visitors).

**What this piece is NOT:**

- Not a new URL. The team page stays at `/directory/teams/[slug]`. No `/teams/[slug]` page is added (Day 6's reverted idea).
- Not a visibility/permission toggle on team data. The directory stays global-by-default (every active team is publicly listed). Visibility is shown as a label, never as a gate.
- Not an orgs/clubs feature.
- Not a seasons feature.
- Not a tier restructure.
- Not a pricing change.

---

## 2. Affected file list (exact)

### Files to MODIFY
- `src/app/directory/teams/[slug]/PublicTeamProfile.tsx` — add the new hub-entry CTA section, conditionally rendered

### Files to NOT touch (explicit non-list)
- `src/app/directory/teams/[slug]/page.tsx` — server page stays as-is (it already computes `claimed`, `viewerIsAdmin`, viewer membership). Will pass new prop to PublicTeamProfile if needed.
- `src/components/ClaimThisListing.tsx` ❌ untouched
- `src/components/ClaimParentButton.tsx` ❌ untouched
- `src/components/ConnectButton.tsx` ❌ untouched
- `src/components/FoundersClubPopup.tsx` ❌ untouched
- `src/components/UpgradeNudgePopup.tsx` ❌ untouched
- `src/app/dashboard/team/[slug]/page.tsx` ❌ untouched (the hub itself stays as-is)
- `src/app/api/team/[slug]/route.ts` ❌ untouched (no API change needed; the page reads data server-side)
- `src/app/dashboard/team/[slug]/settings/TeamSettingsForm.tsx` ❌ untouched (no visibility toggle added)

If during implementation I realize I need to touch any of these, I STOP and re-ask Arnel.

---

## 3. Dependency check (verified against actual code, 2026-06-24)

| Question | Answer (verified) |
|---|---|
| Does `/directory/teams/[slug]` already compute `claimed`? | **Yes** — `page.tsx` queries `claims` table for `claim_type='team', status='approved'`. Passes as `claimed={!!claimRow}`. |
| Does the page already compute viewer membership? | **Yes** — `viewerIsAdmin` is computed from Clerk `userId` + `team_members.role`. But it only checks ADMIN_ROLES, not "any member." Need to extend to also compute `viewerIsMember` (any role, including `player`, `parent`). |
| Does the page already check `is_active`? | **Yes** — `team_workspaces.is_active=true` filter is applied at line 77 and 131. |
| Does the page already render the hub URL for admins? | **Yes** — admin CTAs link to `/dashboard/team/${teamSlug}` ("Post a result", "Add to schedule", "Post news"). |
| Does the page currently link to `/dashboard/team/[slug]` for non-admins? | **No.** That's the gap this piece fills. |
| Is there a Clerk redirect config issue I need to be aware of? | Probably. The "Sign in to access team hub" CTA needs Clerk's `forceRedirectUrl` or `fallbackRedirectUrl` to send the user back to `/directory/teams/[slug]` after sign-in. Need to check Clerk middleware config. |

---

## 4. Rollback plan

If anything breaks on production, the rollback is exactly two commands:

```
git revert <merge-commit-hash>
git push origin main
```

Vercel redeploys in ~30 seconds. Live site returns to `f6c2562` (current state). Preview branch keeps the change for me to investigate.

The recovery branch can be deleted with no production impact:

```
git branch -D recovery/day6-rebuild
git push origin --delete recovery/day6-rebuild
```

If the build fails (Vercel can't compile), there's nothing to revert on main because main was never touched.

---

## 5. "Must-keep-working" audit checklist

Before merging to main, I MUST verify on the preview that all of these still work. I will report the results to Arnel before asking "ship?"

| # | Feature | URL | Expected |
|---|---|---|---|
| 1 | Login page | `/login` | 200 |
| 2 | Signup page | `/sign-up` | 200 |
| 3 | Home page | `/` | 200 |
| 4 | Dashboard (unauthenticated) | `/dashboard` | 307 → `/login` |
| 5 | Pricing page | `/pricing` | 200 |
| 6 | Directory home | `/directory` | 200 |
| 7 | Directory teams list | `/directory/teams` | 200 |
| 8 | Directory team — unclaimed | `/directory/teams/long` | 200, shows "Claim this team" badge (no hub CTA, because no hub yet) |
| 9 | Directory team — NHL | `/directory/teams/bruins` | 200 (or 404 — depends on data) |
| 10 | Search | `/search` | 200 |
| 11 | Blog | `/blog` | 200 |
| 12 | Team dashboard | `/dashboard/team/long` | 200 + auth |
| 13 | Team settings | `/dashboard/team/long/settings` | 200 + auth |
| 14 | New team form | `/dashboard/team/new` | 200 + auth |
| 15 | Claim listing page | `/claim-your-listing` | 200 |
| 16 | Add listing page | `/add-listing` | 200 |

**Plus, I will verify on the preview (or via curl+DB if Clerk auth doesn't work in preview):**
- For a claimed team, a logged-out visitor sees the "Sign in to access team hub" CTA
- For a claimed team, a logged-in non-member sees the appropriate secondary CTA
- For a claimed team, a logged-in admin sees the existing admin CTAs plus the new "Go to team hub" button (or just one of them, depending on placement decision)
- For an unclaimed team, no hub CTA appears (matches Arnel's refinement)

---

## 6. The 2 commits, in order

Each commit is its own audit cycle. Each goes on `recovery/day6-rebuild`. After each, Vercel auto-rebuilds the preview.

### Commit A (already applied): Reserved-slug guard

This commit is already live (`7998efd`). Verified working.

### Commit B: Hub entry CTA on directory page

**Files:** 1 modified (`src/app/directory/teams/[slug]/PublicTeamProfile.tsx`)
**Code shape:** Add a new section near the existing ClaimBadge/ShareButton row. Conditional rendering:
- `claimed && is_active` → show CTA section
- `!signedIn` → "Sign in to access team hub" (button → Clerk sign-in with redirect back to current page)
- `signedIn && !viewerIsMember` → "Request to join" or "Sign in to join" (depends on team join policy, which is a separate consideration)
- `signedIn && viewerIsMember` → "Go to team hub" button → `/dashboard/team/${teamSlug}`

**Server-side data:** Pass two new props from `page.tsx` to `PublicTeamProfile`:
- `viewerIsMember: boolean` (any role, including player/parent — extends existing viewer check)
- `isSignedIn: boolean` (from Clerk `auth()`)

**No new API routes. No new database columns. No new tables.**

**Preview audit:**
- Visit `/directory/teams/long` (currently unclaimed) — must NOT show hub CTA.
- Visit a hypothetical claimed team — must show the right CTA based on viewer state.
- All 16 must-keep-working features still return expected status codes.

**Risk:** Low-medium. This is a UI change to a high-traffic page. The directory team page is one of the most-viewed pages on RinkStop. Mitigations:
- The CTA is positioned alongside the existing Claim badge / Share button, in a familiar location.
- All CTA labels go through the standard existing styling.
- The page still renders even if the new CTA component fails — the existing ClaimBadge and admin CTAs are independent.

---

## 7. What I will NOT do during this piece

- ❌ Touch `main` branch
- ❌ Push to `origin/main`
- ❌ Trigger a Vercel production deploy
- ❌ Apply any SQL migration that isn't in `supabase/migrations/`
- ❌ Touch Clerk, Stripe, or Vercel env vars
- ❌ Touch any of the 9 "not-touched" files listed in Section 2
- ❌ Add new dependencies to package.json
- ❌ Modify any pricing-related code
- ❌ Modify any tier-related code
- ❌ Add the orgs/clubs/seasons features
- ❌ Add a `/teams/[slug]` page (Day 6's rejected idea)
- ❌ Add a `visibility` permission toggle

---

## 8. Time estimate

- Commit B: 60-90 min (UI component + 2 new server-side props + audit)
- Plus 10-15 min for me to show you the diff before commit
- Plus 15-20 min for you to review the diff + click around on the preview

Total: ~2 hours of my time, ~30 min of your time, spread across the session.

---

## 9. Status

**Awaiting "go" from Arnel.**

The recovery branch is at `7998efd` (Commit A applied). The original Day 6 code is NOT being restored. The new design matches your "global directory + private hub" architecture.

I will not write any code, run any SQL, or modify any files until Arnel replies with one of:
- "Go" / "Proceed" / "Yes" — I start Commit B's diff
- "Change X" — I revise the prep doc and reshow
- "Skip" / "No" — I stop, no code touched
- A question — I answer, no code touched

The preview is at https://rinkstop-platform-hp11pd6he-arnellarracas-4208s-projects.vercel.app — currently identical to production (Commit A is SQL-only).
