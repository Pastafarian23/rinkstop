# Piece D2 Preparation: Fix Didit Response Field Mapping

**Date:** 2026-06-24 17:55 CDT
**Branch:** `recovery/day6-rebuild` (currently at `3d84f9a`, ahead of main by 5 commits)
**Author:** KiloClaw
**Status:** DRAFT — awaiting Arnel's "go" before any code is changed
**Trigger:** Arnel clicked Verify after Piece D shipped, got "Failed to record session" (2026-06-24 16:58 CDT). Different error than Piece D's "Failed to start verification" — root cause is different.

---

## 1. Scope statement

**What this piece IS:**

Fix a field-name bug in our Didit response handling. Didit's v3 `/v3/session/` response uses `session_id`, but our code reads `id`. The INSERT into `didit_sessions` passes `undefined` to the NOT NULL `session_id` column → constraint violation → 500.

**Changes** (4 sites, all in 2 files):

1. `src/lib/didit.ts` line 33 — `DiditSession` interface: rename `id: string` → `session_id: string` (matches actual Didit v3 response). Also add `session_token: string`, `session_number: number`, `session_kind: string` for completeness (per docs).

2. `src/app/api/identity/verify/start/route.ts` line 104 — `session_id: diditSession.id` → `session_id: diditSession.session_id`.

3. `src/app/api/identity/verify/start/route.ts` line 126 (analytics event) — same rename.

4. `src/app/api/identity/verify/start/route.ts` line 134 (response to client) — same rename.

**What this piece is NOT:**

- Not a refactor of `diditFetch()` or other Didit functions.
- Not a change to the Didit API call shape (request body still correct).
- Not a change to the webhook handler (`/api/webhooks/didit/route.ts` already uses `session_id` correctly).
- Not a change to the decision route (uses `getDecision(sessionId)` which already maps correctly).
- Not a new error message. The existing "Failed to record session" message is preserved; the underlying INSERT now succeeds.

---

## 2. Why this matters

Per Didit v3 docs (https://docs.didit.me/sessions-api/create-session), the create-session response shape is:

```json
{
  "session_id": "11111111-2222-3333-4444-555555555555",
  "session_number": 1234,
  "vendor_data": "your_internal_user_id_123",
  "status": "Not Started",
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "callback": "https://yourapp.com/didit/webhook/handler",
  "url": "https://verify.didit.me/session/abcdef123456",
  "session_token": "...",  // short-lived, embedded in hosted URL
  "session_kind": "user"
}
```

Our `DiditSession` interface (src/lib/didit.ts:32-41) declares `id: string`. That field does not exist in Didit's v3 response. So `diditSession.id` is `undefined` after the API call returns.

Three places consume it (`src/app/api/identity/verify/start/route.ts`):
- Line 104: `session_id: diditSession.id` → INSERT into `didit_sessions.session_id` with value `undefined` → `null` (PostgREST default) → `NOT NULL` constraint violation → INSERT fails.
- Line 126: analytics tracking prop `session_id: diditSession.id` → would log `undefined` as session_id.
- Line 134: response to client `session_id: diditSession.id` → client iframe would get `undefined` and fail to open.

Line 134 is a latent bug — it would only surface if line 104 didn't fail first. Once 104 is fixed, 134 will start mattering.

**Tested root cause**: I confirmed via direct Supabase REST insert (with valid FK + matching schema) that the INSERT itself works when given proper values. The route fails because of the field-mapping bug, not because of a DB issue.

---

## 3. Affected file list (exact)

### Files to MODIFY
- `src/lib/didit.ts` (1 type definition, ~10 lines)
- `src/app/api/identity/verify/start/route.ts` (3 field references)

### Files to NOT touch (explicit non-list)
- `src/app/api/identity/verify/decision/route.ts` ❌ untouched (uses `getDecision()` which has correct `session_id` mapping)
- `src/app/api/webhooks/didit/route.ts` ❌ untouched (uses webhook payload, not create-session response)
- `src/lib/didit-scrubber.ts` ❌ untouched
- `src/lib/didit-webhook-verify.ts` ❌ untouched
- All migrations, all env vars ❌ untouched

If during implementation I realize I need to touch any of these, I STOP and re-ask Arnel.

---

## 4. Dependency check (verified)

| Question | Answer (verified) |
|---|---|
| Does the `didit_sessions` table accept a UUID `session_id`? | Yes — `session_id UUID NOT NULL UNIQUE`. Verified via direct REST insert (test succeeded with HTTP 201). |
| Does `didit_sessions.user_id` FK to `profiles.user_id`? | Yes — verified working via direct insert. |
| Does the service role bypass RLS for INSERT? | Yes — `deny_anon_didit_sessions` + `deny_authenticated_didit_sessions` policies block anon/authenticated; service role is exempt. |
| Will the rename break `getDecision()`? | No — `getDecision()` uses its own `sessionId` parameter, not `diditSession.id`. The `DiditDecision` interface already has `session_id`. |

---

## 5. Rollback plan

```
git revert <merge-commit-hash>
git push origin main
```

Vercel redeploys in ~30 seconds. The route returns to the "Failed to record session" error. No data corruption (the failed INSERT doesn't partially write).

---

## 6. "Must-keep-working" audit checklist

| # | Feature | URL | Expected |
|---|---|---|---|
| 1-16 | (Same 16 URLs as Piece D) | — | 200 |
| 17 | `/api/identity/status` (anon) | — | 401 |
| 18 | `/api/identity/verify/start` (anon POST) | — | 401 |

**Plus, post-deploy, the FUNCTIONAL test (Arnel runs)**:
- Click Verify at `/dashboard/identity`
- Frontend POSTs to `/api/identity/verify/start`
- Route calls `createSession('user', ...)` → Didit returns 201 with session_id
- Route INSERTs into `didit_sessions` with valid `session_id` → row created with status='not_started'
- Route returns `{ url, session_id, status: 'not_started' }` to client
- Frontend opens Didit iframe at the URL
- User completes ID + liveness check
- Didit calls webhook → `profiles.didit_session_id` populated
- `isIdentityVerified()` returns true → gates reopen

**I CANNOT do the full flow** — same as Piece D. Arnel runs it.

---

## 7. Time estimate

- 2 file edits, ~5 line changes total
- Build: ~30 sec
- Smoke test: ~30 sec
- Push + Vercel deploy: ~90 sec
- Arnel's verify flow: ~5 min

Total: ~3 min of my time, ~5 min of Arnel's.

---

## 8. Status

**Awaiting "go" from Arnel.**

The Piece E (visibility banner) prep doc I mentioned earlier is still in queue. This bug fix (D2) takes priority because Arnel needs the verify flow to actually work before visibility matters.

After D2 ships and Arnel confirms verify works:
- Piece E (dashboard verify banner) prep doc
- Piece B (dashboard coach disconnect) prep doc — original goal, on hold

---

## 9. Combined bug history (so far in this session)

1. **Q1 (revoke)**: profiles.identity_verified_at was set via direct DB shortcut on Arnel + test_player_1. Revoked.
2. **Piece C (harden)**: Added `isIdentityVerified()` helper. Bare flag no longer trusted.
3. **Piece D (auth header)**: Didit client sent `Authorization: Bearer`, should send `x-api-key`. Fixed.
4. **Piece D2 (this piece)**: Didit client response mapped `.id` instead of `.session_id`. About to fix.

The pattern: each fix surfaced the next bug. This is what happens when you wire up a real integration that's been dev-shortcutted. Each layer needs its own audit. We're working through them one at a time, safely.
