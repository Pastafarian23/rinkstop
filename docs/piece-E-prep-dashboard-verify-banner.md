# Piece E Preparation: Dashboard Verify-Identity Banner

**Date:** 2026-06-24 18:15 CDT
**Branch:** `recovery/day6-rebuild` (currently at `fa897df`, ahead of main by 6 commits)
**Author:** KiloClaw
**Status:** DRAFT — awaiting Arnel's "go" before any code is changed
**Trigger:** Arnel reported the verify-identity CTA wasn't prominent enough in the dashboard (2026-06-24 16:25 CDT); only visible in the menu, doesn't stand out.

---

## 1. Scope statement

**What this piece IS:**

Add a single prominent banner to the top of `/dashboard` (above the welcome card, above the profile completeness card) that appears ONLY when the user is NOT identity-verified. The banner shows:

1. A clear headline: "Verify your identity to unlock team management features"
2. A 1-sentence explainer: which features are gated (roster, scheduling, parent messages, claiming teams, verified badge)
3. A prominent CTA button: "Verify identity →" linking to `/dashboard/identity`
4. A dismiss option (sets a session-local flag; reappears on next visit — we don't have a "don't show again" persistence yet, defer that)

The banner uses the **hardened `isIdentityVerified()` helper** (added in Piece C) so it can be trusted. Same source of truth as the ✓ Verified badge and the team-creation gate.

**What this piece is NOT:**

- Not a redesign of `/dashboard`. The welcome card, profile completeness card, inbox, role sections, and MY TEAMS section all stay exactly where they are. The banner is purely additive at the top.
- Not a global banner (e.g., on every page). Just `/dashboard` for now. Other surfaces can be added in a separate piece if Arnel wants.
- Not a "don't show again" feature. Session-only dismiss for now. Persistent dismiss can be a future piece (would need a profiles.dismissed_verify_banner_at column or similar).
- Not a change to the verify flow itself. `/dashboard/identity` stays untouched.
- Not a piece-B merge. The Coach card CTA from Piece B's prep doc is separate; this banner is at the top, not inside the Coach card. Both can coexist.
- Not a migration. No schema change.

---

## 2. Why this matters

Per Arnel (2026-06-24 16:25 CDT):
> "It should also be more prominent in dashboard to verify identity to unlock benefits or wording like that. Right now I can only see verification in menu, but it doesn't stand out."

Current state:
- Verify link is in the menu (probably under Account or Profile menu)
- No surface in the dashboard
- 99% of users won't complete identity verification without a clear "why" and a prominent "how"

The dashboard is the most-visited surface for a logged-in user. Adding a banner here means: every time the user logs in and looks at their dashboard, they see the unlock CTA. This matches the protocol's pattern of surfacing high-leverage actions in the user's natural workflow.

---

## 3. Affected file list (exact)

### Files to MODIFY
- `src/app/dashboard/page.tsx` — add the banner at the top of the JSX (above the welcome card). Add `isVerified` computation using `isIdentityVerified(userId)`. Add dismiss state.

### Files to NOT touch (explicit non-list)
- `src/components/ClaimedBy.tsx` ❌ untouched (Piece C already shipped)
- `src/lib/identity-verified.ts` ❌ untouched (helper already exists from Piece C)
- `src/components/dashboard/TypeSectionCard.tsx` ❌ untouched (Piece B's CTA is separate work)
- `src/components/dashboard/dashboardTypeData.ts` ❌ untouched (Piece B will change this; not part of Piece E)
- `src/app/dashboard/identity/page.tsx` ❌ untouched (the destination page)
- All migrations, env vars, other files ❌ untouched

If during implementation I realize I need to touch any of these, I STOP and re-ask Arnel.

---

## 4. The change (concrete)

### Change 4a — Compute `isVerified` in `renderDashboard()`

**Where:** After `loadDashboardTypeData()` call in `renderDashboard`.

**ADD:**
```typescript
// Piece E: Check if user is identity-verified (using the hardened helper
// from Piece C, which requires a real approved didit_sessions row).
// Drives the verify-identity banner at the top of the dashboard.
const isIdentityVerifiedForUser = await isIdentityVerified(userId);
```

### Change 4b — Add the banner to the JSX

**Where:** At the top of the return JSX in `renderDashboard`, before the welcome card.

**ADD:**
```tsx
{/* Piece E: Verify-identity banner. Only shows for users who haven't
    completed the real Didit flow. Uses the hardened helper from Piece C.
    Dismissal is session-only (re-shows on next page load). */}
{!isIdentityVerifiedForUser && (
  <div
    role="region"
    aria-label="Verify your identity"
    style={{
      background: 'linear-gradient(135deg, rgba(255,184,28,0.12) 0%, rgba(200,16,46,0.08) 100%)',
      border: '1px solid rgba(255,184,28,0.35)',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      flexWrap: 'wrap',
    }}
  >
    <div style={{ fontSize: '1.75rem', flexShrink: 0 }} aria-hidden="true">🛡️</div>
    <div style={{ flex: 1, minWidth: 240 }}>
      <h2
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.15rem',
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 0.25rem',
        }}
      >
        VERIFY YOUR IDENTITY TO UNLOCK TEAM MANAGEMENT
      </h2>
      <p
        style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.85rem',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Coaches and managers need verified identity to manage teams, claim
        rosters, and message parents. Takes ~2 minutes with a government ID.
      </p>
    </div>
    <Link
      href="/dashboard/identity"
      style={{
        padding: '0.65rem 1.25rem',
        background: '#FFB81C',
        color: '#0a0a0a',
        borderRadius: 6,
        textDecoration: 'none',
        fontSize: '0.9rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      Verify identity →
    </Link>
  </div>
)}
```

No import changes needed (Link is already imported at the top of the file).

---

## 5. Dependency check (verified)

| Question | Answer (verified) |
|---|---|
| Does `isIdentityVerified()` exist? | Yes — `src/lib/identity-verified.ts`, added in Piece C. |
| Does it work for the dashboard use case? | Yes — takes a `userId: string`, returns `Promise<boolean>`. |
| Will the banner interfere with other dashboard cards? | No — it's purely additive at the top. No existing cards move, hide, or change behavior. |
| Will it show for super_admins (like Arnel)? | Right now YES (he's revoked). After he re-verifies, the banner goes away. Correct. |
| Will it show for users who can't verify (free tier)? | Yes — the banner CTA leads to `/dashboard/identity` which has its own tier gate (Starter+). We could add a tier check here but that conflates two pieces; the destination page already shows the tier-required error. |

---

## 6. Rollback plan

```
git revert <merge-commit-hash>
git push origin main
```

Vercel redeploys in ~30 seconds. Banner disappears, dashboard returns to pre-Piece-E layout. No data corruption.

---

## 7. "Must-keep-working" audit checklist

Same 16-URL smoke test as before. Plus the FUNCTIONAL check:

| User state | Expected banner state |
|---|---|
| Arnel (currently revoked) | Banner shown — "Verify your identity to unlock team management" |
| Arnel after completing real Didit flow | Banner hidden (hardened helper returns true) |
| Any user who SQL UPDATEs `profiles.identity_verified_at` directly | Banner still shown (defense in depth — no matching `didit_sessions` row) |
| Logged-out user hitting `/dashboard` | 307 redirect to `/login` (existing behavior, unchanged) |

**Plus, post-deploy:**
- All other dashboard sections (welcome, profile completeness, inbox, role cards, MY TEAMS) unchanged in placement and behavior
- The 4 cards that may have stacked before (welcome, completeness, inbox, roles) still stack in the same order

---

## 8. Time estimate

- 1 file: `src/app/dashboard/page.tsx` (~25 lines added)
- Build: ~30 sec
- Smoke test: ~30 sec
- Push + Vercel deploy: ~90 sec
- Arnel's visual check + verified shield reappears after his real Didit flow: ~5 min

Total: ~3 min of my time.

---

## 9. Status

**Awaiting "go" from Arnel.**

The Didit integration is now working end-to-end (auth header fixed in Piece D, response field mapping fixed in Piece D2, hardening added in Piece C, Q1 revoke done). The verify flow just successfully opened the Didit portal for Arnel at 17:14 CDT.

I will not write any code, run any SQL, or modify any files until Arnel replies with one of:
- "Go" / "Proceed" / "Yes" — I start the diff
- "Change X" — I revise the prep doc and reshow
- "Skip" / "No" — I stop, no code touched
- A question — I answer, no code touched

---

## 10. Pending pieces (after Piece E)

- **Piece B** (dashboard coach disconnect — original session goal): prep doc already written at `docs/piece-B-prep-dashboard-coach-disconnect.md`. On hold behind Arnel completing real Didit flow + Piece E.
- **Org/club work** (separate pieces, deferred)
- **Seasons work** (separate piece, deferred)
