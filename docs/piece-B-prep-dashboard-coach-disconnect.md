# Piece B Preparation: Connect Coach Role to Coached Teams on Dashboard

**Date:** 2026-06-24 14:15 CDT
**Branch:** `recovery/day6-rebuild` (currently at `ea26637`, ahead of main by 2 commits)
**Author:** KiloClaw
**Status:** DRAFT — awaiting Arnel's "go" before any code is changed
**Trigger:** Arnel reported the "Coach" card and "MY TEAMS" section feel disconnected (2026-06-24 13:55 CDT)

---

## 1. Scope statement

**What this piece IS:**

Fix two related UX problems on `/dashboard`:

**Problem A — Coach card shows "You haven't claimed a team yet" even when user IS a coach of a team.**
The Coach account-type card uses `loadDashboardTypeData.ts`'s coach query, which counts rows in `team_owners`. That table does NOT exist (PostgREST returns PGRST205). So the count is always 0. But Arnel IS a head_coach in `team_members` for the Long team. The Coach card is reading the wrong source.

Fix: change the coach query to count from `team_members` where the user has any role in ADMIN_ROLES (head_coach, assistant_coach, manager, etc.). This matches what the user sees in the "MY TEAMS" section.

**Problem B — No CTA to verify identity on the dashboard.**
Even though Arnel IS identity-verified, OTHER users (the 99% case) are not. The dashboard has no surface that says "Verify your identity to unlock features." A prominent banner CTA pointing to `/dashboard/identity` solves this. Show it ONLY when `identity_verified_at` is null or expired.

**What this piece is NOT:**

- Not a new dashboard layout or redesign. The current card-based structure stays.
- Not a change to the "MY TEAMS" section — it works correctly.
- Not a new team-claim flow. The existing `/dashboard/claims` page stays untouched.
- Not a change to identity verification itself (`/dashboard/identity` page untouched).
- Not a change to TypeSectionCard or AccountTypeBadges components.
- Not a tier restructure, not a pricing change.

---

## 2. Affected file list (exact)

### Files to MODIFY
- `src/components/dashboard/dashboardTypeData.ts` — change coach query from `team_owners` to `team_members`. Add identity_verified status to the data shape so the Coach card can render the CTA.
- `src/components/dashboard/TypeSectionCard.tsx` — render an identity verification CTA in the Coach card when the user has teams but is unverified.

### Files to NOT touch (explicit non-list)
- `src/app/dashboard/page.tsx` ❌ untouched (the parent page already passes `profile` data correctly; no change needed)
- `src/components/dashboard/InboxCard.tsx` ❌ untouched
- `src/components/dashboard/dashboardInboxData.ts` ❌ untouched
- `src/components/dashboard/dashboardTypes.ts` ❌ untouched
- `src/components/AccountTypeBadges.tsx` ❌ untouched
- `src/components/AccountTypePicker.tsx` ❌ untouched
- `src/components/TierBadge.tsx` ❌ untouched
- `src/app/dashboard/claims/page.tsx` ❌ untouched (claim flow is separate)
- `src/app/dashboard/identity/page.tsx` ❌ untouched
- `src/app/dashboard/team/[slug]/page.tsx` ❌ untouched
- `src/app/directory/teams/[slug]/page.tsx` ❌ untouched (Piece A is separate)
- All migrations ❌ untouched
- Any env vars ❌ untouched

If during implementation I realize I need to touch any of these, I STOP and re-ask Arnel.

---

## 3. Dependency check (verified against actual code, 2026-06-24 14:18)

| Question | Answer (verified) |
|---|---|
| Does `team_owners` table exist? | **No** — PostgREST returns PGRST205 "Could not find the table 'public.team_owners'". Confirmed via `curl https://...rest/v1/team_owners?select=id&limit=5`. |
| Does `team_members` table have what we need? | **Yes** — has `user_id`, `team_id`, `role`, `left_at`. Querying `role IN (admin_roles)` AND `left_at IS NULL` returns active coached teams. |
| Does `profiles` have identity_verified status? | **Yes** — `identity_verified_at`, `identity_expires_at` columns. Verified for Arnel: `identity_verified_at=2026-06-18...`, expires `2028-06-18`. |
| Is `profile` passed from `/dashboard/page.tsx` to `<TypeSectionCard>`? | **No** — currently only `data={typeData}` is passed. Need to also pass `isVerified` flag so the card knows whether to show the CTA. |
| Does the Coach card already render conditional empty state? | **Yes** — `cfg.empty` branch renders when `data.coach.teamsManaged === 0`. We can repurpose this for the CTA. |
| Will changing the coach query affect any other dashboard section? | **No** — only `data.coach` changes. Other types untouched. |

---

## 4. Rollback plan

If anything breaks on production, the rollback is exactly one command:

```
git revert <merge-commit-hash>
git push origin main
```

Vercel redeploys in ~30 seconds. Live site returns to pre-piece-B state. No data is lost.

---

## 5. "Must-keep-working" audit checklist

Before merging to main, I MUST verify that all of these still work:

| # | Feature | URL | Expected |
|---|---|---|---|
| 1 | Login page | `/login` | 200 |
| 2 | Signup page | `/sign-up` | 200 |
| 3 | Home page | `/` | 200 |
| 4 | Dashboard (unauth) | `/dashboard` | 307 → `/login` |
| 5 | Pricing page | `/pricing` | 200 |
| 6 | Directory home | `/directory` | 200 |
| 7 | Directory teams list | `/directory/teams` | 200 |
| 8 | Directory team | `/directory/teams/long` | 200, "🏅 Unclaimed" still shows |
| 9 | Directory team (verified admin) | hypothetical claimed team | "✓ Verified by [name] ([role])" |
| 10 | Search | `/search` | 200 |
| 11 | Blog | `/blog` | 200 |
| 12 | Claims page | `/dashboard/claims` | 200 + auth |
| 13 | Identity page | `/dashboard/identity` | 200 + auth |
| 14 | Team dashboard | `/dashboard/team/long` | 200 + auth |

**Plus, post-deploy for the dashboard fix itself:**
- Dashboard `/dashboard` for Arnel: Coach card should now show "Coaching 1 team" (not "haven't claimed a team yet")
- Dashboard MY TEAMS: should still show Long correctly (no regression)
- Identity CTA: should NOT show for Arnel (he's already verified)
- For an UNVERIFIED coach: should show "Verify your identity →" CTA linking to `/dashboard/identity`

---

## 6. The change (concrete)

### Change 6a — Fix coach count query (dashboardTypeData.ts)

**Where:** the COACH block in `loadDashboardTypeData`, lines 73-83.

**BEFORE:**
```typescript
try {
  const { count } = await supabaseAdmin
    .from('team_owners')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  data.coach.teamsManaged = count || 0;
  data.coach.loaded = true;
} catch { /* team_owners may not exist — keep loaded=false */ }
```

**AFTER:**
```typescript
// Per Arnel (2026-06-24 13:55): the Coach card should reflect the user's
// actual coaching relationships, which live in `team_members` (role IN
// admin roles, left_at IS NULL). `team_owners` doesn't exist on this DB.
try {
  const { count } = await supabaseAdmin
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('left_at', null)
    .in('role', [
      'head_coach', 'assistant_coach', 'goalie_coach', 'skills_coach',
      'manager', 'team_staff',
      'president', 'vice_president', 'secretary', 'treasurer',
      'board_member', 'safety_officer',
    ]);
  data.coach.teamsManaged = count || 0;
  data.coach.loaded = true;
} catch { /* keep loaded=false */ }
```

### Change 6b — Pass identity-verified status to TypeSectionCard

**Where:** `src/app/dashboard/page.tsx`, the `<TypeSectionCard>` props.

**BEFORE:**
```typescript
<TypeSectionCard
  key={t}
  type={t}
  primary={primary}
  data={typeData}
  username={profile?.username ?? null}
/>
```

**AFTER:**
```typescript
<TypeSectionCard
  key={t}
  type={t}
  primary={primary}
  data={typeData}
  username={profile?.username ?? null}
  identityVerified={!!profile?.identity_verified_at && (!profile?.identity_expires_at || new Date(profile.identity_expires_at) > new Date())}
/>
```

### Change 6c — Add identity CTA to Coach card (TypeSectionCard.tsx)

**Where:** the Coach case in `getConfig()`, plus the component's destructuring.

**BEFORE:**
```typescript
case 'coach':
  return {
    headline: data.coach.loaded
      ? data.coach.teamsManaged === 0
        ? "You haven't claimed a team yet"
        : `Coaching ${data.coach.teamsManaged} ${data.coach.teamsManaged === 1 ? 'team' : 'teams'}`
      : 'Your coaching role',
    cta: [
      { href: '/directory/teams', label: 'Find your team', icon: '🏒' },
      { href: '/dashboard/claims', label: 'Claim a team', icon: '✅' },
    ],
    empty: data.coach.loaded && data.coach.teamsManaged === 0
      ? { message: 'Claim the team you coach to manage roster, schedule, and incoming parent messages.', cta: { href: '/directory/teams', label: 'Browse teams →' } }
      : null,
  };
```

**AFTER:**
```typescript
case 'coach': {
  const coachingTeams = data.coach.teamsManaged;
  const hasClaimedIdentity = (identityVerified ?? false);
  return {
    headline: data.coach.loaded
      ? coachingTeams === 0
        ? "You haven't claimed a team yet"
        : `Coaching ${coachingTeams} ${coachingTeams === 1 ? 'team' : 'teams'}`
      : 'Your coaching role',
    cta: [
      { href: '/directory/teams', label: 'Find your team', icon: '🏒' },
      { href: '/dashboard/claims', label: 'Claim a team', icon: '✅' },
    ],
    // Per Arnel (2026-06-24 13:55): users who coach teams but aren't
    // identity-verified should see a CTA pointing them to /dashboard/identity.
    // Verified users see a regular CTA (or no CTA if they have teams).
    empty: data.coach.loaded && coachingTeams > 0 && !hasClaimedIdentity
      ? { message: 'Verify your identity to unlock team management features (roster, scheduling, parent messages).', cta: { href: '/dashboard/identity', label: 'Verify identity →' } }
      : (data.coach.loaded && coachingTeams === 0
          ? { message: 'Claim the team you coach to manage roster, schedule, and incoming parent messages.', cta: { href: '/directory/teams', label: 'Browse teams →' } }
          : null),
  };
}
```

### Change 6d — Add `identityVerified` prop to TypeSectionCard

**Where:** `src/components/dashboard/TypeSectionCard.tsx`, Props interface.

**BEFORE:**
```typescript
interface TypeSectionCardProps {
  type: AccountType;
  primary: AccountType | null;
  data: TypeSectionData;
  username: string | null;
}
```

**AFTER:**
```typescript
interface TypeSectionCardProps {
  type: AccountType;
  primary: AccountType | null;
  data: TypeSectionData;
  username: string | null;
  identityVerified?: boolean;
}
```

And the destructuring in `TypeSectionCard`:
```typescript
export default function TypeSectionCard({ type, primary, data, username, identityVerified }: TypeSectionCardProps) {
```

---

## 7. Edge cases I want to flag explicitly

1. **User is verified AND coaches teams** → Coach card shows "Coaching N teams", no empty CTA. Standard CTAs (Find team, Claim team) shown. Clean.

2. **User is NOT verified but coaches a team** → Coach card shows "Coaching N teams", identity verification CTA shown. Empty state message: "Verify your identity to unlock team management features (roster, scheduling, parent messages)." CTA: "Verify identity →" → /dashboard/identity.

3. **User is verified AND coaches NO teams** → Coach card shows "You haven't claimed a team yet" (or "Coaching 0 teams"), existing browse teams CTA. No identity CTA (they're already verified, no point nagging).

4. **User is NOT verified AND coaches NO teams** → Coach card shows "You haven't claimed a team yet", existing browse teams CTA. NO identity CTA in this case because they have no teams to manage (don't push identity verification on people who haven't engaged yet).

5. **Identity verification expired** → `identityVerified` is false → CTA shows. Correct behavior.

6. **User has coach AND other types** → Only Coach card gets the CTA. Other type cards (player, parent, etc.) are untouched. Isolation rule respected.

---

## 8. Time estimate

- Change 6a: 5 min (replace one query)
- Change 6b: 2 min (add one prop)
- Change 6c: 5 min (modify getConfig for coach case)
- Change 6d: 2 min (add prop to interface)
- Total implementation: ~15 min
- Pre-deploy audit: 10 min (build + 14 URLs)
- Arnel review: ~5 min
- Total: ~30 min

---

## 9. Status

**Awaiting "go" from Arnel.**

Production is at `ea26637` (Piece A shipped). The recovery branch has both commits. No code changes for Piece B yet.

I will not write any code, run any SQL, or modify any files until Arnel replies with one of:
- "Go" / "Proceed" / "Yes" — I start the diff
- "Change X" — I revise the prep doc and reshow
- "Skip" / "No" — I stop, no code touched
- A question — I answer, no code touched

---

## 10. Pending decisions (carried over)

These are NOT in scope for piece B but are flagged for future pieces:

- **Piece C** — Hub-entry CTA logic on directory page (the entry point that links from public team page to private hub, gated on claim/verification).
- **Identity verification prompt placement** — Should it also appear on the public-facing team page? On the directory home? Out of scope for piece B; only the dashboard Coach card gets it.
- **Identity verification expiration handling** — When verification expires, should we email the user? Auto-revoke claims? Out of scope.
