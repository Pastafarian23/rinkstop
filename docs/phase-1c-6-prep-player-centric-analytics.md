# Phase 1c-6 — Player-Centric Analytics (Adult + Family)

**Status:** DRAFT (awaiting Arnel approval before implementation)
**Author:** KiloClaw
**Date:** 2026-07-08
**Parent pieces:** 1c-4 (commit `8284ba7`), 1c-5 (commit `1c710d5`)
**Source of truth:** Arnel msg #35677 — "It seems to be family centric, but that isn't always the case. We have to account for self-managed profiles by players of age, and adult players as well. I don't want the dashboard to indicate family features if it's not applicable"
Follow-up: "All profiles should apply to user" (msg #35686)

---

## 0. Why this piece

Pieces 1c-4 and 1c-5 shipped analytics only on `/dashboard/family`, with framing and data paths tuned for a parent viewing their kid:
- The page shell is titled "Family Hub"
- The component copy says "linked players"
- The team-memberships count uses `team_members.parent_user_id = manager_user_id` (only correct for minors enrolled by a parent)
- The query gating via `managed_profiles` assumes a parent-child link

For an **adult self-managing their own profile** — or for a player managing their own profile who happens to be a minor but not enrolled via a parent — none of this applies. The 1c-5 analytics surface is invisible to them because they can't reach `/dashboard/family`.

Per Arnel: "All profiles should apply to user." Every player should have access to their analytics regardless of who manages them.

This piece makes analytics player-centric rather than family-centric. The component, API, and route should be the same regardless of whether the viewer is a parent or the player themselves.

---

## 1. What this piece does

### 1a. New route `/dashboard/analytics/[playerId]`

- Single route works for both viewing modes:
  - Parent viewing their kid: parent has `managed_profiles` row with `profile_id = [playerId]`
  - Adult self-viewing: their own `players.id = [playerId]` and their Clerk `userId` resolves to the player owner
  - Player self-viewing (minor but no parent link): less common but support it via a `players.user_id = currentUserId()` match
- Page title: "{firstName} {lastName}" — no "Family Hub" framing
- Tier gate: Identity Plus+ (unchanged)
- Ownership gate: viewer is either (a) the player themselves OR (b) manages the player via `managed_profiles`

### 1b. Extract `PlayerAnalyticsClient` from `/dashboard/family`

- Currently the component lives at `src/components/player-analytics/PlayerAnalyticsClient.tsx` and is rendered inside `src/app/dashboard/family/page.tsx`
- Move it (or refactor to a server-fed wrapper) so it works on the new `/dashboard/analytics/[playerId]` route too
- Keep the same component shape (player picker, stats, milestones, RinkStop history cards) — these are already player-centric in their data

### 1c. Refactor the API to be player-centric

The current `/api/player/[id]/stats/season-trends` route uses `managed_profiles` for ownership + `team_members.parent_user_id` for memberships. Both break for self-managed adults.

**Ownership check becomes:**
```ts
const isManaged = await supabaseAdmin
  .from('managed_profiles')
  .select('id')
  .eq('manager_user_id', userId)
  .eq('profile_id', id)
  .maybeSingle();
const isSelf = await supabaseAdmin
  .from('players')
  .select('id')
  .eq('id', id)
  .eq('user_id', userId)  // players.user_id links to Clerk user
  .maybeSingle();
if (!isManaged && !isSelf) return 403;
```

**Team memberships query becomes:**
```ts
// Either the player is enrolled as a minor by this parent
// OR the player is themselves this user
team_members: isMinorLinkage
  ? supabaseAdmin
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('is_minor', true)
      .eq('parent_user_id', userId)
      .is('left_at', null)
  : supabaseAdmin
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('left_at', null)
```

The decision between `parent_user_id` and `user_id` is automatic based on whether the player is a managed minor or self-managed adult.

### 1d. Remove (or downscope) the analytics card from `/dashboard/family`

Options:
- **Remove entirely**: the family page is for parent-y stuff, analytics get their own route. Cleanest separation.
- **Keep as a navigation link**: "View {childName}'s analytics →" pointing at the new route. Lets parents get there from the family surface they already use.

Arnel's instruction "I don't want the dashboard to indicate family features if it's not applicable" suggests **remove + add nav link**. Parents still see the link, but the framing is "go to {child}'s analytics" not "your family analytics."

### Does NOT do (deferred)
- Separate `/dashboard/analytics` listing page (showing all your viewable players in one place) — v2
- Comparing two players side-by-side — v2
- Public analytics pages (`/players/[slug]/analytics`) — separate discussion
- Coach / team-admin view of their players' analytics — separate piece

---

## 2. Schema

No new tables. Reads from same sources as 1c-4/1c-5:
- `players` (now using `players.user_id` for self-link)
- `managed_profiles`
- `team_members` (now branching on minor vs self)
- `highlightly_career_stats`
- `player_achievements`
- `player_documents`

---

## 3. Pre-implementation checks (live verification)

Before writing the queries, verify against live code:

**(a) Does `players.user_id` exist as a Clerk-user link?**
Need to check `players` table columns. The family-page already does `.from('players').select('id, first_name, last_name, slug, headshot_url')`. Need to add `user_id`.

**(b) Is `players.user_id` populated for self-managed players?**
The CEO's account (`arnellarracas@gmail.com`) probably has a player row — does it have `user_id` set?

**(c) Does `PlayerAnalyticsClient` have any family-specific copy beyond what I can change?**
Re-read the component. If the framing is clean, just the wrapper changes. If there's deeper family-only copy (e.g. "your child's analytics"), needs more rework.

**(d) Where do we link FROM on the family page?**
Decide between option 1 (remove entirely) and option 2 (link to new route). Need Arnel's call.

---

## 4. Tier gate

Unchanged. Identity Plus+ OR Business Listing+.

---

## 5. Edge cases

- Player exists but is not managed by the viewer AND is not the viewer's own player: 403
- Player exists and IS the viewer's own player (self-managed adult): 200, queries use `user_id` linkage
- Player exists and IS managed by the viewer (parent-kid): 200, queries use `parent_user_id` linkage
- Player doesn't exist: 404
- Player exists but has no highlightly data AND no RinkStop history: shows the three cards all in their "0 — add your first one →" state. Same UX as 1c-5.
- Self-managed minor with no parent link: edge case. The `isSelf` check (players.user_id = currentUserId) handles it.

---

## 6. Rollback

- Delete `/dashboard/analytics/[playerId]/page.tsx`
- Revert API route changes
- Revert family page (remove the navigation link if added)
- Component itself doesn't need to change if it's already player-centric
- One-command rollback: `git revert <commit>`

---

## 7. Verification checklist (pre-ship)

- [ ] `pnpm build` exit 0
- [ ] Self-managed adult: API returns 200 with their own data
- [ ] Parent-of-kid: API returns 200 with kid's data (existing 1c-5 path)
- [ ] Other parent's kid: API returns 403
- [ ] Random user's player: API returns 403
- [ ] `/dashboard/analytics/[playerId]` renders without layout shift for an adult self-viewer
- [ ] No family copy leaks into the analytics surface ("Family Hub", "your child's", etc.)
- [ ] `/dashboard/family` either no longer shows the analytics card, OR shows it as a navigation link (per Arnel's call)
- [ ] No `eval`, no `dangerouslySetInnerHTML`, no `innerHTML` writes
- [ ] No new third-party deps

---

## 8. Out of scope reminder

Corrections flow (Stage B from the earlier conversation) is a separate piece with its own prep doc. Do not bundle. The Ship Gate rule still applies.

The "profiles should apply to user" principle established here carries forward: corrections should also work for self-managed adult players, not just parent-managed kids. That's a Stage B design constraint, not a Stage B implementation blocker — the corrections table is entity_type + entity_id, which already abstracts away from user-vs-family.

---

## 9. Estimated work

- Pre-implementation checks (§3a/3b/3c): 0.5 day
- API refactor (ownership + team_members branching): 0.5 day
- New route `/dashboard/analytics/[playerId]`: 0.5 day
- Family page update (remove or link): 0.25 day
- Smoke tests + build gate + commit: 0.5 day

**Total: ~2.25 days.** Ship as one commit.

---

## 10. Open question for Arnel

§1d: **Remove the analytics card from `/dashboard/family` entirely, OR keep a navigation link to the new route?**

If "remove entirely": the family page becomes purely parent-y stuff (linked kids, schedule, payments, docs, achievements — already there). Parents who want analytics click into a kid's profile or use a future listing page.

If "keep nav link": each managed kid in the family page gets a "View analytics →" link next to their name. Parents stay one tap away from analytics.

My recommendation: **navigation link**, low-risk, doesn't break existing flows. Parents today reach analytics by scrolling to the bottom of the family page; tomorrow they reach it via a click. Minimal disruption.