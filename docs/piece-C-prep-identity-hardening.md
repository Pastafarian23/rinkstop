# Piece C Preparation: Hardened Identity Verification Check

**Date:** 2026-06-24 16:10 CDT
**Branch:** `recovery/day6-rebuild` (currently at `868746c`, ahead of main by 3 commits)
**Author:** KiloClaw
**Status:** DRAFT — awaiting Arnel's "go" before any code is changed
**Trigger:** Arnel's profile had `identity_verified_at` set via dev DB shortcut, not real Didit flow (2026-06-24 15:57 CDT). Both accounts revoked 2026-06-24 16:02 CDT.

---

## 1. Scope statement

**What this piece IS:**

Create a single server-side helper that returns `isIdentityVerified(userId): Promise<boolean>` — and which only returns `true` if **all three** conditions hold:

1. `profiles.identity_verified_at` is set and not expired (`identity_expires_at > now()`)
2. `profiles.didit_session_id` is set (NOT NULL)
3. A row exists in `didit_sessions` matching that `didit_session_id`, with `status='approved'`

Replace the 9 inline `!!profile?.identity_verified_at` checks across the codebase with calls to this helper. Add a short comment at each call site pointing to the helper so the pattern is discoverable.

**What this piece is NOT:**

- Not a change to the Didit integration itself (`/api/identity/verify/*`, `/api/webhooks/didit/*` stay untouched — they still set the flag correctly).
- Not a revocation tool or a re-verification flow. The revoke that happened today (2026-06-24 16:02) is a one-off DB write; no app code needed.
- Not a new migration. No schema changes.
- Not a UI change. The ✓ Verified badge, the dashboard CTA, the `/dashboard/team/new` gate — they all behave the same; they just consult a stricter helper now.
- Not a change to `/dashboard/identity` page itself. It already shows accurate status.

---

## 2. Why this matters

Today, **any user who can UPDATE the `profiles` table can self-verify.** The dev shortcut that set Arnel's `identity_verified_at` directly in the DB is the same power an attacker would have if they got SQL access via the Supabase dashboard or a leaked service-role key. The ✓ Verified badge, the team-creation gate, and the dashboard CTA all trust the bare flag.

After this piece, the bare flag becomes insufficient — a real approved `didit_sessions` row is also required. The only way to get one is to actually complete the Didit flow (or to forge a row via direct SQL, which would require writing to both `profiles` AND `didit_sessions`, a more obvious attack).

---

## 3. Affected file list (exact)

### Files to ADD
- `src/lib/identity-verified.ts` (NEW) — exports `isIdentityVerified(userId): Promise<boolean>`. ~40 lines.

### Files to MODIFY (replace inline checks with helper call)
1. `src/components/ClaimedBy.tsx` (line 50) — `!!data.identity_verified_at` → use new helper or accept verified flag from prop
2. `src/app/directory/teams/[slug]/page.tsx` (line 266) — `claimantIdentityVerified` computation → use new helper
3. `src/app/dashboard/team/new/page.tsx` (line 20) — `isVerified` computation → use new helper
4. `src/app/join/[code]/page.tsx` (line 51) — `!!profile?.identity_verified_at` → use new helper
5. `src/app/profile/[slug]/page.tsx` (line 168) — `verifiedAt` assignment → only show badge if helper returns true
6. `src/app/api/identity/verify/start/route.ts` (line 73) — re-verification skip-check → use new helper
7. `src/app/api/entities/[type]/[id]/claim/route.ts` (line 87) — identity check on claim submission → use new helper

### Files to NOT touch (explicit non-list)
- `src/app/api/identity/verify/decision/route.ts` ❌ untouched (writes the flag correctly; uses its own session row already)
- `src/app/api/webhooks/didit/route.ts` ❌ untouched (writes the flag correctly from webhook)
- `src/app/api/identity/status/route.ts` ❌ untouched (returns raw status to client; client decides what to show)
- `src/app/dashboard/identity/page.tsx` ❌ untouched (shows user their own status; intentionally mirrors DB)
- `src/app/dashboard/page.tsx` ❌ untouched (Piece B will handle this; we don't want to scope-creep)
- All migrations ❌ untouched
- Any env vars ❌ untouched

If during implementation I realize I need to touch any of these, I STOP and re-ask Arnel.

---

## 4. The helper (concrete)

```typescript
// src/lib/identity-verified.ts

import { supabaseAdmin } from '@/lib/supabase';

/**
 * Returns true only if the user has a real, current, Didit-approved
 * identity verification. This is the SOLE source of truth for whether
 * a user is "verified" anywhere in the codebase.
 *
 * Requires all three:
 *   1. profiles.identity_verified_at is set and not expired
 *   2. profiles.didit_session_id is set (not NULL)
 *   3. didit_sessions row exists with that id and status='approved'
 *
 * Returns false (fail-closed) if any query fails or any condition fails.
 *
 * Why this exists: profiles.identity_verified_at alone is not a trust
 * signal. It can be set by direct SQL UPDATE, which is the same power
 * an attacker would have if they got the service-role key. Requiring
 * a matching approved didit_sessions row means the only way to be
 * "verified" is to actually complete the Didit flow.
 */
export async function isIdentityVerified(userId: string): Promise<boolean> {
  if (!userId) return false;

  // Step 1+2: read profiles.identity_verified_at, identity_expires_at, didit_session_id
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('identity_verified_at, identity_expires_at, didit_session_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileErr || !profile) return false;
  if (!profile.identity_verified_at) return false;
  if (!profile.identity_expires_at) return false;
  if (new Date(profile.identity_expires_at) <= new Date()) return false;
  if (!profile.didit_session_id) return false;

  // Step 3: verify the didit_sessions row exists and is approved
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('didit_sessions')
    .select('status')
    .eq('id', profile.didit_session_id)
    .maybeSingle();

  if (sessionErr || !session) return false;
  if (session.status !== 'approved') return false;

  return true;
}
```

---

## 5. Per-call-site change pattern

Each of the 7 inline checks above becomes one of:

### Server Component (preferred — call helper directly)

```typescript
// before:
const isVerified = !!profile?.identity_verified_at && (!profile?.identity_expires_at || new Date(profile.identity_expires_at) > new Date());

// after:
import { isIdentityVerified } from '@/lib/identity-verified';
const isVerified = await isIdentityVerified(userId);
```

### API Route (same)

```typescript
// before:
if (profile?.identity_verified_at) { ... }

// after:
import { isIdentityVerified } from '@/lib/identity-verified';
if (await isIdentityVerified(userId)) { ... }
```

### Client Component (ClaimedBy.tsx — different)

`ClaimedBy.tsx` is `'use client'`, so it can't call `supabaseAdmin` directly. Two options:
- (A) Accept `verified: boolean` as a prop, computed by parent server component using the helper. Cleaner; matches RSC pattern.
- (B) Add a `/api/identity/verified` GET endpoint that calls the helper. More flexible but more surface.

**Recommendation: Option A.** Keeps ClaimedBy.tsx free of API calls; the server already has the data; one less endpoint to maintain.

---

## 6. Dependency check (verified)

| Question | Answer (verified) |
|---|---|
| Does `supabaseAdmin` exist and work? | Yes — `@/lib/supabase`, used everywhere. |
| Does `didit_sessions` have a `status` column with value `'approved'`? | Yes — verified by `src/app/api/identity/verify/decision/route.ts` line 96 (`newStatus === 'approved'`) and `src/app/api/webhooks/didit/route.ts`. |
| Does `profiles.didit_session_id` FK to `didit_sessions.id`? | Yes — `UUID` column on both sides, populated by `decision/route.ts` line 184 and webhook. |
| Will replacing the gate break `/dashboard/team/new` for Arnel right now? | **Yes, intentionally** — he's no longer verified (revoked 2026-06-24 16:02). When he re-verifies via Didit, the gate passes again. This is the desired behavior. |

---

## 7. Rollback plan

```
git revert <merge-commit-hash>
git push origin main
```

Vercel redeploys in ~30 seconds. Live site returns to pre-piece-C state (the looser gate). No data is lost — the revocation stands either way.

---

## 8. "Must-keep-working" audit checklist

| # | Feature | URL | Expected |
|---|---|---|---|
| 1 | Login page | `/login` | 200 |
| 2 | Signup page | `/sign-up` | 200 |
| 3 | Home page | `/` | 200 |
| 4 | Dashboard (unauth) | `/dashboard` | 307 → `/login` |
| 5 | Pricing | `/pricing` | 200 |
| 6 | Directory | `/directory` | 200 |
| 7 | Directory teams | `/directory/teams` | 200 |
| 8 | Long team page | `/directory/teams/long` | 200, "🏅 Unclaimed" (no claim exists; verification state irrelevant) |
| 9 | Search | `/search` | 200 |
| 10 | Blog | `/blog` | 200 |
| 11 | Profile page (yours) | `/profile/arnel` | 200, NO verified shield (you're not verified anymore) |
| 12 | Profile page (others) | `/profile/anyone-not-verified` | 200, NO verified shield |
| 13 | `/dashboard/team/new` (you, post-revoke) | — | Shows identity gate (you must verify before creating a team) |
| 14 | `/dashboard/identity` (you) | — | Shows "Not verified" status |
| 15 | `/join/[code]` (any code, you) | — | Should still error or redirect appropriately |

**Plus, post-deploy, after Arnel re-verifies via Didit:**
- All the gates that were previously passing should pass again (verified shield, team-new, dashboard coach card)
- A `didit_sessions` row should exist for Arnel with `status='approved'`
- `profiles.didit_session_id` should be set to that row's id

---

## 9. Time estimate

- `src/lib/identity-verified.ts` (new file): 5 min
- 6 server-side call-site swaps: ~15 min total
- `ClaimedBy.tsx` prop change: ~5 min
- Build + audit: ~10 min
- Arnel re-verifies via Didit after deploy to confirm the gate passes again: ~5 min

Total: ~40 min implementation, ~10 min of your time.

---

## 10. Status

**Awaiting "go" from Arnel.**

Q1 (revoke) is already done — your and `user_test_player_1`'s verification flags are null. No other users were affected. The `didit_sessions` table is empty (no sessions ever existed). When you re-verify via Didit after this piece ships, a real session row will be created and the gate will pass.

I will not write any code, run any SQL, or modify any files until Arnel replies with one of:
- "Go" / "Proceed" / "Yes" — I start the diff
- "Change X" — I revise the prep doc and reshow
- "Skip" / "No" — I stop, no code touched
- A question — I answer, no code touched

---

## 11. Order of operations (the actual sequence Arnel should expect)

1. **Piece C ships** — hardening helper + 7 call-site swaps. Deploy to main.
2. **Arnel re-verifies via Didit** at `/dashboard/identity`. Real session row created; `profiles.didit_session_id` populated. The verify shield reappears on `/profile/arnel`. The team-creation gate passes again. The (still pending) dashboard CTA hides for you.
3. **Piece B ships** — dashboard coach disconnect. Now safely uses the same hardened source as Piece A. For OTHER unverified users who coach, the CTA shows. For you (verified), no CTA.
