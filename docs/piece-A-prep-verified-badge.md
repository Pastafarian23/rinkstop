# Piece A Preparation: Verified Badge Tied to Identity Verification

**Date:** 2026-06-24
**Branch:** `recovery/day6-rebuild` (currently at `7998efd`, ahead of main by 1 commit)
**Author:** KiloClaw
**Status:** DRAFT — awaiting Arnel's "go" before any code is changed

---

## 1. Scope statement

**What this piece IS:**

Tie the existing "✓ Verified" badge on `/directory/teams/[slug]` to **identity verification of the claimant**, not just the existence of an approved claim row. Currently the badge appears whenever a row in `claims` has `status='approved'` for the team. After piece A, the badge appears only when **both** are true:

1. There's an approved claim row for the team (today's behavior), AND
2. The claimant's `profiles.identity_verified_at` is set AND not expired.

**The badge label changes too.** Today the badge says "✓ Verified by [head_coach name]" (pulling from `team_members`). After piece A, the badge says "✓ Verified by [claimant name] ([their role on the team])" — pulling from the actual person who submitted the claim row, with their role from `team_members` if they're a team member, falling back to just their name if they're not.

**What this piece is NOT:**

- Not a change to the claim form (ClaimsForm.tsx stays untouched). That's piece B.
- Not a hub-entry CTA. That's piece C.
- Not a change to identity verification (Didit.me integration stays untouched).
- Not a change to the existing "Unclaimed" badge UX. Same wording, same link.
- Not an enforcement that the claimant must be identity-verified. The directory page just won't display "✓ Verified" for non-verified claimants. They can still claim, they just don't get the badge.
- Not a change to admin roles, head coach logic, or anything team_members-related beyond reading the claimant's existing role.

---

## 2. Affected file list (exact)

### Files to MODIFY
- `src/app/directory/teams/[slug]/page.tsx` — extend the existing claim query to JOIN profiles AND team_members (for the claimant's role). Pass new props `claimantIdentityVerified`, `claimantDisplayName`, `claimantRole` to PublicTeamProfile.
- `src/app/directory/teams/[slug]/PublicTeamProfile.tsx` — change ClaimBadge to display the claimant's name and role (when verified) instead of the head_coach's name. Falls back to head_coach's name if no claimant role found.

### Files to NOT touch (explicit non-list)
- `src/app/dashboard/claims/ClaimsForm.tsx` ❌ untouched (piece B)
- `src/app/dashboard/identity/page.tsx` ❌ untouched
- `src/lib/didit-scrubber.ts` ❌ untouched
- `src/components/ClaimedBy.tsx` ❌ untouched
- `src/components/ClaimThisListing.tsx` ❌ untouched
- `src/app/api/entities/[type]/[id]/claim/route.ts` ❌ untouched
- `src/app/api/identity/verify/start/route.ts` ❌ untouched
- `src/app/api/identity/verify/decision/route.ts` ❌ untouched
- All migrations ❌ untouched (no schema change)
- Any env vars, Clerk config, Stripe config, Vercel config ❌ untouched

If during implementation I realize I need to touch any of these, I STOP and re-ask Arnel.

---

## 3. Dependency check (verified against actual code)

| Question | Answer (verified) |
|---|---|
| Does the existing claim query use `supabaseAdmin`? | **Yes** — line 195 of `src/app/directory/teams/[slug]/page.tsx`. Service role bypasses RLS, so reading `profiles.identity_verified_at` is unrestricted. |
| Does `claims` table have a `user_id` column? | **Yes** — verified via PostgREST OpenAPI spec. `claims.user_id` is `text`. |
| Does `profiles` table have `identity_verified_at` and `identity_expires_at`? | **Yes** — verified earlier in this conversation. Both `timestamp with time zone`. |
| Does the existing `ClaimBadge` component conditionally render based on `claimed`? | **Yes** — `PublicTeamProfile.tsx` line 178. `if (claimed)` shows ✓ Verified, else shows 🏅 Unclaimed. By making `claimed` mean "verified claim" at the server level, no PublicTeamProfile change is needed. |
| Is the existing "verified by [admin name]" label pulling from the right source? | **No — needs fix.** It currently shows `admins[0].profiles.display_name` (head_coach from `team_members`). After piece A: it shows the **claimant's** name (from `claims.user_id → profiles`) with their **role on the team** (from `team_members.role`). This is a real change to PublicTeamProfile.tsx. |
| Are there any other places that check `claimed`? | **Yes** — `ClaimedBy.tsx` displays the claimant's name on the page. Let me verify it's still consistent. (I'll check during the audit step before commit.) |

---

## 4. The change (concrete diffs for both files)

### Change 4a (page.tsx): Extend the claim query

**Where:** the existing claim query in `src/app/directory/teams/[slug]/page.tsx`, around lines 195-202.

**BEFORE:**
```typescript
const { data: claimRow } = await supabaseAdmin
  .from('claims')
  .select('id, status, user_id')
  .eq('entity_id', team.id)
  .eq('claim_type', 'team')
  .eq('status', 'approved')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle<{ id: string; status: string; user_id: string }>();
```

**AFTER:**
```typescript
// Approved claim + identity verification of the claimant + claimant's role on this team.
// Per Arnel's decisions (2026-06-24 14:20, 14:32): "verified means a verified-identity
// user claimed this team" AND "the badge should show whoever it is claimed by, since
// they would have a profile with their role on team, or in organization."
//
// We pull three things in this query:
//   1. The claim row itself (existence + status)
//   2. The claimant's profile (for display name + identity verification)
//   3. The claimant's team_members row IF they're a member of THIS team (for their role)
//
// The role lookup is best-effort: a parent who claimed on behalf of their kid's team
// might not be in team_members themselves. In that case, the badge shows the claimant's
// name with no role label.
const { data: claimRow } = await supabaseAdmin
  .from('claims')
  .select(`
    id,
    status,
    user_id,
    profiles:user_id (
      display_name,
      username,
      identity_verified_at,
      identity_expires_at
    ),
    team_members:user_id!inner (
      role,
      team_id
    )
  `)
  .eq('entity_id', team.id)
  .eq('claim_type', 'team')
  .eq('status', 'approved')
  .eq('team_members.team_id', team.id)
  .is('team_members.left_at', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle<{
    id: string;
    status: string;
    user_id: string;
    profiles: {
      display_name: string | null;
      username: string | null;
      identity_verified_at: string | null;
      identity_expires_at: string | null;
    } | null;
    team_members: { role: string; team_id: string } | null;
  }>();

// Compute whether the claimant is identity-verified (verified AND not expired).
const now = new Date();
const claimantIdentityVerified = !!(
  claimRow?.profiles?.identity_verified_at &&
  claimRow.profiles.identity_expires_at &&
  new Date(claimRow.profiles.identity_expires_at) > now
);

// Per Arnel (2026-06-24 14:38): only admins can claim a team. Parents and players
// should not be able to. Piece B will enforce this on the claim form. Piece A,
// shipping first, must be defensive: if a claim exists but the claimant's role
// is NOT in the admin list, treat the claim as invalid. This guards against
// legacy data or any pre-piece-B edge case where a non-admin somehow got a
// claim row.
const claimantIsAdmin =
  !!claimRow?.team_members?.role &&
  ADMIN_ROLES.includes(claimRow.team_members.role as any);

// Verified-claim requires all three: claim row exists, claimant identity-verified,
// AND claimant is an admin on the team.
const isVerifiedClaim = !!(
  claimRow &&
  claimantIdentityVerified &&
  claimantIsAdmin
);

// Get claimant display name + role for the badge label.
const claimantDisplayName =
  claimRow?.profiles?.display_name ||
  claimRow?.profiles?.username ||
  null;
const claimantRole = claimantIsAdmin ? claimRow?.team_members?.role ?? null : null;
```

### Change 4b (page.tsx): Pass the new props

**Where:** the JSX where `<PublicTeamProfile>` is rendered (around line 252-264).

**BEFORE:**
```typescript
      claimed={!!claimRow}
      claimedByUserId={claimRow?.user_id ?? null}
```

**AFTER:**
```typescript
      claimed={isVerifiedClaim}
      claimedByUserId={claimRow?.user_id ?? null}
      claimantDisplayName={claimantDisplayName}
      claimantRole={claimantRole}
```

### Change 4c (PublicTeamProfile.tsx): Update ClaimBadge to use claimant's name and role

**Where:** the `ClaimBadge` component, around line 178-200. Change the prop signature and the rendered label.

**BEFORE:**
```tsx
function ClaimBadge({ claimed, admins, teamId, teamName }: { claimed: boolean; admins: AdminJoin[]; teamId: string; teamName: string }) {
  if (claimed) {
    const admin = admins[0];
    return (
      <div style={{ /* ... */ }}>
        ✓ Verified
        {admin?.profiles?.display_name && (
          <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>
            by {admin.profiles.display_name}
          </span>
        )}
      </div>
    );
  }
  // ...unclaimed branch unchanged
}
```

**AFTER:**
```tsx
function ClaimBadge({
  claimed,
  admins,
  teamId,
  teamName,
  claimantDisplayName,
  claimantRole,
}: {
  claimed: boolean;
  admins: AdminJoin[];
  teamId: string;
  teamName: string;
  claimantDisplayName?: string | null;
  claimantRole?: string | null;
}) {
  if (claimed) {
    // Per Arnel (2026-06-24 14:32): "the badge should show whoever it is claimed by,
    // since they would have a profile with their role on team, or in organization."
    // claimantDisplayName is only non-null when the claim is verified (admin role +
    // identity verified). Fall back to head_coach name only if claimantDisplayName
    // is missing (defensive — should not happen post-A).
    const name = claimantDisplayName ?? admins[0]?.profiles?.display_name;
    const roleLabel = claimantRole ? formatRoleLabel(claimantRole) : null;
    return (
      <div style={{ /* ... existing styles ... */ }}>
        ✓ Verified
        {name && (
          <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>
            by {name}{roleLabel ? ` (${roleLabel})` : ''}
          </span>
        )}
      </div>
    );
  }
  // ...unclaimed branch unchanged
}

function formatRoleLabel(role: string): string {
  // Admin roles only. Per Arnel (2026-06-24 14:38), only admins can claim a
  // team, so the badge will only ever display one of these. If a role doesn't
  // match (defensive — shouldn't happen), fall back to a capitalized version.
  const labels: Record<string, string> = {
    head_coach: 'Head Coach',
    assistant_coach: 'Assistant Coach',
    goalie_coach: 'Goalie Coach',
    skills_coach: 'Skills Coach',
    manager: 'Team Manager',
    team_staff: 'Team Staff',
    president: 'President',
    vice_president: 'Vice President',
    treasurer: 'Treasurer',
    secretary: 'Secretary',
    board_member: 'Board Member',
    safety_officer: 'Safety Officer',
  };
  return labels[role] ?? role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
}
```

### Change 4d (PublicTeamProfile.tsx): Destructure the new props in the parent

**Where:** the function signature, around line 236-247.

**BEFORE:**
```tsx
export default function PublicTeamProfile({
  team,
  news,
  results,
  upcoming,
  admins,
  claimed,
  seasonRecord,
  viewerIsAdmin,
  teamSlug,
}: Props) {
```

**AFTER:**
```tsx
export default function PublicTeamProfile({
  team,
  news,
  results,
  upcoming,
  admins,
  claimed,
  seasonRecord,
  viewerIsAdmin,
  viewerIsMember,
  isSignedIn,
  isActive,
  teamSlug,
  claimantDisplayName,
  claimantRole,
}: Props) {
```

---

## 5. Edge cases I want to flag explicitly

1. **Expired identity verification.** If the claimant verified their identity but it expired (`identity_expires_at < now()`), the badge shows "🏅 Unclaimed" even though there's a claim row. The team owner has to re-verify to keep the badge. This is the intended behavior.

2. **Claimant deleted their account.** If `claimRow.profiles` is null (the claimant was deleted), `claimantIdentityVerified` is false, badge shows "🏅 Unclaimed." This is the safe default.

3. **The team's actual admin (head_coach) is a different person from the claimant.** Possible scenario: the head coach is unverified, but a parent claimed the listing and is identity-verified. After piece A: the ✓ Verified badge shows "✓ Verified by [parent name] (Parent)" — the parent's name and their role from `team_members`. This is correct because the parent is the one who took responsibility for the listing. If the parent isn't in `team_members` (they're just a claim submitter), the badge falls back to "✓ Verified by [parent name]" with no role label.

**Per Arnel's correction (2026-06-24 14:38):** parents and players should NOT be able to claim a team. Only admins (coaches, board members, etc.) can claim. Piece B will enforce this on the claim form. Piece A, shipping first, needs a defensive role check: if a claim somehow exists with a non-admin claimant (legacy data or a loophole that exists today), piece A's badge should still NOT show "✓ Verified" — it should fall back to "🏅 Unclaimed." Verified-claim requires ALL THREE: claim exists, claimant is identity-verified, AND claimant's role is in the admin list. See Section 4 for the updated check.

4. **No claims at all today.** Currently 1 test team (`long`) is unclaimed with no claim row. After piece A: still shows "🏅 Unclaimed" with no behavior change. The empty array case is handled by `maybeSingle` returning null.

5. **Multiple claims.** The existing query uses `.order('created_at', {ascending: false}).limit(1)` — takes the most recent approved claim. If a previous claimant's verification expired and a new claimant is verified, the new claimant wins. Reasonable behavior.

6. **Non-admin claimant (parent/player) somehow has a claim row.** Per Arnel (2026-06-24 14:38), parents and players should never be able to claim a team. Piece B (separate, ships after A) will enforce this on the claim form. Until piece B ships, it's theoretically possible that a parent or player could have a claim row (either legacy data or some loophole in the current code). Piece A's role check (`claimantIsAdmin`) catches this: even if the parent is identity-verified, piece A shows "🏅 Unclaimed" because the role check fails. Belt-and-suspenders. After piece B ships, the role check is redundant (no non-admin claim can ever be created) but harmless.

---

## 6. Rollback plan

If anything breaks on production, the rollback is exactly two commands:

```
git revert <merge-commit-hash>
git push origin main
```

Vercel redeploys in ~30 seconds. Live site returns to the pre-piece-A state. No data is lost.

---

## 7. "Must-keep-working" audit checklist

Before merging to main, I MUST verify on the preview (or production-equivalent) that all of these still work:

| # | Feature | URL | Expected | How I verify |
|---|---|---|---|---|
| 1 | Login page | `/login` | 200 | `curl -sI` |
| 2 | Signup page | `/sign-up` | 200 | `curl -sI` |
| 3 | Home page | `/` | 200 | `curl -sI` |
| 4 | Dashboard (unauthenticated) | `/dashboard` | 307 → `/login` | `curl -sI` |
| 5 | Pricing page | `/pricing` | 200 | `curl -sI` |
| 6 | Directory home | `/directory` | 200 | `curl -sI` |
| 7 | Directory teams list | `/directory/teams` | 200 | `curl -sI` |
| 8 | Directory team (unclaimed) | `/directory/teams/long` | 200, still shows "🏅 Unclaimed" | `curl` + grep |
| 9 | Directory team (claimed, verified) | hypothetical | Would show "✓ Verified" — can't test until a verified user claims a team |
| 10 | Search | `/search` | 200 | `curl -sI` |
| 11 | Blog | `/blog` | 200 | `curl -sI` |
| 12 | Team dashboard | `/dashboard/team/long` | 200 + auth | `curl -sI` |
| 13 | Claim listing form | `/dashboard/claims?entity=team&id=...&name=...` | 200 | `curl -sI` |
| 14 | Identity verification page | `/dashboard/identity` | 200 + auth | `curl -sI` |

**Plus, post-deploy:**
- Visit `/directory/teams/long` in a browser. Must show "🏅 Unclaimed" with the existing Claim CTA.
- If you (Arnel, super_admin) want to test the verified state: claim team "long" via `/dashboard/claims`, then verify your identity at `/dashboard/identity`, then revisit `/directory/teams/long` and confirm "✓ Verified" appears. (This is end-to-end testing on production, not part of piece A's pre-deploy audit.)

---

## 8. Time estimate

- Implementation: 60-75 min (2 files: page.tsx query with nested JOINs + role check + PublicTeamProfile ClaimBadge update with role display + formatRoleLabel helper)
- Pre-deploy audit: 30 min (curl checks + reading the rendered HTML)
- Your review: 15-20 min
- Total: ~2 hours, can fit in one session

---

## 9. Status

**Awaiting "go" from Arnel.**

The recovery branch is at `7998efd` (Commit A applied). No code changes since. rinkstop.com is unchanged. The new code touches exactly 1 file (`page.tsx`), with 2 small changes (extend claim query, pass new prop).

I will not write any code, run any SQL, or modify any files until Arnel replies with one of:
- "Go" / "Proceed" / "Yes" — I show the actual diff before committing (per protocol)
- "Change X" — I revise the prep doc and reshow
- "Skip" / "No" — I stop, no code touched
- A question — I answer, no code touched

The preview is at https://rinkstop-platform-hp11pd6he-arnellarracas-4208s-projects.vercel.app — currently identical to production (Commit A is SQL-only and doesn't affect page rendering).

---

## 10. Pending decisions (carried over from earlier discussion)

These are NOT in scope for piece A but are flagged for future pieces:

- **Piece B** — Require identity verification before claim submission. Block claim if not verified. Separate piece, separate prep doc.
- **Piece C** — Hub-entry CTA logic on directory page. Now that "claimed" means "verified claim," piece C's CTA logic becomes correct. Will be designed after A and B ship.
