# Piece D Preparation: Fix Didit API Auth Header

**Date:** 2026-06-24 17:30 CDT
**Branch:** `recovery/day6-rebuild` (currently at `67b7135`, ahead of main by 4 commits)
**Author:** KiloClaw
**Status:** DRAFT — awaiting Arnel's "go" before any code is changed
**Trigger:** Arnel clicked "Verify" at `/dashboard/identity` and got "Failed to start verification" (2026-06-24 16:25 CDT). Post-Piece-C, this is the next gate on the real-Didit-flow path.

---

## 1. Scope statement

**What this piece IS:**

Fix a 1-line bug in `src/lib/didit.ts` — the HTTP header used to authenticate against Didit's verification API.

**CURRENT (broken):**
```typescript
headers: {
  'Authorization': `Bearer ${apiKey}`,
  ...
}
```

**NEW (correct, per Didit docs):**
```typescript
headers: {
  'x-api-key': apiKey,
  ...
}
```

That's the entire change. No new files, no new endpoints, no new env vars, no new dependencies. One string replacement in one file.

**What this piece is NOT:**

- Not a refactor of the Didit client. The function shape, error handling, and call sites stay exactly the same.
- Not a webhook change. The webhook handler (`/api/webhooks/didit/route.ts`) uses a different header pattern (X-Signature-V2 for HMAC). That code is correct and stays untouched.
- Not a Didit SDK upgrade. No SDK exists for Node — we built a thin client ourselves.
- Not an env var rotation. The same `DIDIT_API_KEY` value is used; only the header it goes in changes.

---

## 2. Why this matters

Arnel needs to verify his identity to test the post-Piece-C gating. The verify button errors with "Failed to start verification" — that's the route's catch-all message (`server_error`), which means `createSession('user', ...)` threw, which means the HTTP request to Didit failed.

The cause: **the auth header is wrong.**

Per Didit's official docs at https://docs.didit.me/getting-started/api-authentication:

> The verification API does not use OAuth Bearer tokens. It uses a long-lived API key on the `x-api-key` header. Treat the key as a server-side secret — never ship it to a browser or mobile bundle.
>
> `401` on verification.didit.me: `x-api-key` header missing, malformed, or revoked

Our `src/lib/didit.ts` was written with `Authorization: Bearer ${apiKey}` from day one of the integration (commit `b7f29f9`, 2026-06-17). It's been wrong since launch. The integration was never successfully tested end-to-end — Arnel's verified flag was set via direct DB shortcut (revoked in Q1 earlier today), so the API path was never exercised against real Didit.

**Test of correctness:**
- Live test with `Authorization: Bearer placeholder` → 403
- Live test with `x-api-key: placeholder` → 403 (also, since key is invalid)
- Docs are explicit: use `x-api-key`. Real call with valid key + wrong header would return 401 (per docs).
- This is the only header Didit's verification API expects.

---

## 3. Affected file list (exact)

### Files to MODIFY
- `src/lib/didit.ts` — change ONE line in `diditFetch()` (line 89). Replaces `'Authorization': \`Bearer ${apiKey}\`` with `'x-api-key': apiKey`.

### Files to NOT touch (explicit non-list)
- `src/app/api/identity/verify/start/route.ts` ❌ untouched (calls createSession; same behavior, just a different header from inside)
- `src/app/api/identity/verify/decision/route.ts` ❌ untouched
- `src/app/api/webhooks/didit/route.ts` ❌ untouched (different code path — uses X-Signature-V2)
- `src/lib/didit-scrubber.ts` ❌ untouched
- `src/lib/didit-webhook-verify.ts` ❌ untouched
- All migrations ❌ untouched
- All env vars ❌ untouched (DIDIT_API_KEY value unchanged)

If during implementation I realize I need to touch any of these, I STOP and re-ask Arnel.

---

## 4. Dependency check (verified)

| Question | Answer (verified) |
|---|---|
| Is `DIDIT_API_KEY` set on Vercel? | Yes — targets production, preview, development (verified via `/v9/projects/.../env`). |
| Is `DIDIT_WORKFLOW_ID` set on Vercel? | Yes — same targets. |
| Does `diditFetch()` have any other callers that might break? | No — only `createSession()` and `getDecision()` use it. Both go to `verification.didit.me/v3/...`. Both need the new header. |
| Will this break existing verified users? | No — there are no real-verified users (Q1 revoke cleared all). Arnel will be the first real verified user after this fix. |
| Will this change the response shape? | No — only the request header changes. Didit's response (session_id, url, etc.) is the same. |

---

## 5. Rollback plan

```
git revert <merge-commit-hash>
git push origin main
```

Vercel redeploys in ~30 seconds. Live site returns to the broken-header state. The verify button goes back to erroring, but nothing else breaks.

---

## 6. "Must-keep-working" audit checklist

| # | Feature | URL | Expected |
|---|---|---|---|
| 1 | Login | `/login` | 200 |
| 2 | Signup | `/sign-up` | 200 |
| 3 | Home | `/` | 200 |
| 4 | Dashboard | `/dashboard` | 307 → /login (unauth) |
| 5 | Pricing | `/pricing` | 200 |
| 6 | Directory | `/directory` | 200 |
| 7 | Directory teams | `/directory/teams` | 200 |
| 8 | Long team | `/directory/teams/long` | 200, 🏅 Unclaimed |
| 9 | Search | `/search` | 200 |
| 10 | Blog | `/blog` | 200 |
| 11 | Profile (Arnel) | `/profile/arnel` | 200, no shield (still revoked) |
| 12 | Claim listing | `/claim-your-listing` | 200 |
| 13 | Add listing | `/add-listing` | 200 |
| 14 | Identity page | `/dashboard/identity` | 200, shows "Not verified" status |
| 15 | Cost calculator | `/tools/hockey-cost-calculator` | 200 |
| 16 | FAQ | `/faq` | 200 |

**Plus, post-deploy, the FUNCTIONAL test:**
- Arnel clicks "Verify identity" at `/dashboard/identity` while logged in
- The button now returns a Didit URL (or a clearer error if Didit still rejects)
- A real `didit_sessions` row gets created with `status='not_started'` and a `session_id` from Didit
- Arnel completes the flow → Didit calls our webhook → `profiles.didit_session_id` is populated → `isIdentityVerified()` returns `true` → gates reopen

**I CANNOT do step 16 myself** — it requires Arnel's Clerk session, his ID document, and his face. I can verify the API call shape works (no error message), but only Arnel can complete the full flow.

---

## 7. Time estimate

- 1-line edit: ~30 seconds
- next build: ~30 seconds
- Smoke test 15 URLs: ~30 seconds
- Push + Vercel deploy: ~90 seconds
- Arnel's full verify flow: ~5 minutes (his time)

Total: ~3 minutes of my time, ~5 min of Arnel's time.

---

## 8. Status

**Awaiting "go" from Arnel.**

I will not write any code, run any SQL, or modify any files until Arnel replies with one of:
- "Go" / "Proceed" / "Yes" — I start the diff
- "Change X" — I revise the prep doc and reshow
- "Skip" / "No" — I stop, no code touched
- A question — I answer, no code touched

---

## 9. Separately: the visibility concern

Arnel also raised that the verify-identity CTA isn't prominent enough in the dashboard. **This is a separate piece** (could be Piece E) — same protocol, separate prep doc. Not bundled with this bug fix.

Possible scope of Piece E:
- Surface verify-identity CTA at the top of `/dashboard` for unverified users (regardless of role)
- Show verify-identity CTA in the Coach card (from Piece B's prep doc)
- Add it to the top nav for unverified users (badges/menu items)

Holding this until Piece D ships + Arnel confirms verify flow works.

---

## 10. Pending decisions (carried over)

- **Piece B** (dashboard coach disconnect) — on hold behind Piece D + verify flow
- **Piece E** (verify-identity visibility) — new piece Arnel raised 2026-06-24 16:25 CDT
- **Tier restructure (Option C)** — still pending Arnel's confirmation of pricing
- **Org/club work, Seasons work** — separate pieces, deferred
