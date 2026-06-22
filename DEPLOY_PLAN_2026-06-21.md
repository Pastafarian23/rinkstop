# Deploy Plan — 2026-06-21 Inbox/Haptics/Loading Work

**Status:** Code written + audited. NOT committed, NOT pushed, NOT live.
**Blocker:** Telegram exec approvals not configured (gateway-protected config). Cannot run `git`, `tsc`, or `vercel` from current session.
**Recovery:** When exec comes back, run the steps below in order.

---

## Files modified (5 total)

| File | Change | Lines (approx) |
|------|--------|----------------|
| `src/app/dashboard/inbox/page.tsx` | NEW — unified inbox (DMs + listing inquiries) | ~370 |
| `src/app/dashboard/loading.tsx` | NEW — Suspense fallback with BrandSpinner | ~15 |
| `src/app/dashboard/messages/page.tsx` | EDITED — replaced `<p>Loading…</p>` with BrandSpinner | ~3 |
| `src/components/RoleAwareTabBar.tsx` | EDITED — Inbox tab → /dashboard/inbox, haptic + tap-pressed | ~30 |
| `src/app/globals.css` | EDITED — added `.mob-tab-pressed` | ~4 |

## Files created earlier today (already shipped live)

| File | Status |
|------|--------|
| `src/app/dashboard/team/page.tsx` | SHIPPED (commit `19fbf34`) |
| `src/app/dashboard/page.tsx` (with super_admin gate) | SHIPPED (commit `1e0f5c1`) |
| `src/components/BrandSpinner.tsx` | SHIPPED (commit ??, standalone component) |
| `src/app/dashboard/leads/page.tsx` (claim CTA + pricing + share) | SHIPPED (commit `9918bae`) |

---

## Recovery sequence — run when exec comes back

### Step 1: Verify the working tree
```bash
cd /root/.openclaw/workspace/rinkstop-platform
git status --short
git diff --stat
```

**Expected:**
- Modified: `src/app/dashboard/messages/page.tsx`, `src/components/RoleAwareTabBar.tsx`, `src/app/globals.css`
- New: `src/app/dashboard/inbox/page.tsx`, `src/app/dashboard/loading.tsx`

If anything else shows up — STOP. Investigate before committing.

### Step 2: Typecheck
```bash
npx tsc --noEmit
```

**Expected:** No errors. If errors appear, fix them BEFORE committing. The audit caught two bugs already (sender_user_id → sender_id; haptic double-fire), so typecheck should pass.

### Step 3: Show Arnel what's changing
Paste the `git status --short` and `git diff --stat` output into RinkStop Ops. Wait for explicit "commit + push" approval.

### Step 4: Commit + push
```bash
git add src/app/dashboard/inbox/page.tsx \
        src/app/dashboard/loading.tsx \
        src/app/dashboard/messages/page.tsx \
        src/components/RoleAwareTabBar.tsx \
        src/app/globals.css

git commit -m "feat(dashboard): unified inbox (DMs + leads) + tab bar haptic feedback

- New /dashboard/inbox route: shows DMs (from connections/threads/messages)
  AND listing inquiries (from leads) for users with lead-capable roles
  (coach, team_admin, league_admin, rink_operator, business)
- Bottom-nav Inbox tabs (parent/coach/team_admin/league_admin/rink_operator/business)
  route to /dashboard/inbox; normal users fall through to /dashboard/messages
- BrandSpinner wired into /dashboard loading.tsx Suspense fallback and the
  messages page loading state
- RoleAwareTabBar adds onTouchStart haptic feedback (Capacitor Haptics +
  navigator.vibrate fallback) and an instant pressed-state visual

Audited against existing patterns:
- leads query matches /dashboard/leads exactly (claimant_user_id,
  source IN listing_inquiry_*) — verified by reading both pages
- account-types query matches /dashboard/layout.tsx pattern
- threads/connections join matches /api/threads route logic"

git push origin main
```

### Step 5: Verify Vercel deploy
```bash
# Option A — vercel CLI
vercel ls --token $(cat /root/.openclaw/credentials/vercel.json | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Option B — direct URL check (faster)
curl -sI https://rinkstop-platform.vercel.app/dashboard/inbox | head -1
curl -sI https://rinkstop.com/dashboard/inbox | head -1
```

**Expected:** `HTTP/2 200` (or `HTTP/2 401` — that's correct, the route exists, just redirects unauth users). If 404, the deploy failed — investigate.

### Step 6: Report back to Arnel
Reply in RinkStop Ops with:
- Commit hash
- Deploy ID
- File list
- Test instructions ("Tap Inbox on the bottom nav — you should see DMs and (if applicable) listing inquiries")

---

## What's intentionally NOT in this commit

These are related but separate; do NOT bundle them in:

- Tier rename cleanup (already shipped 2026-06-17)
- Didit.me KYC (not building now per design doc)
- Cold-outreach email (Play 1, parked)
- Cost calculator (already shipped)

---

## Tests after deploy

1. **Parent role** — open app, tap Inbox → should land on `/dashboard/inbox`, show messages section, NOT show listing inquiries (parent doesn't have lead capability)
2. **Rink operator / team admin role** — same flow, should also show listing inquiries section if claimant_user_id has rows in `leads` table
3. **Tap any tab** — should feel a brief vibration on Android (Capacitor WebView) and on iOS (Capacitor)
4. **Dashboard route transitions** — should show BrandSpinner with "Loading your RinkStop dashboard…" text instead of bare "Loading…"

---

## If typecheck fails

Most likely culprits (in order of probability):

1. **`TierBadge` import path** — my code uses `@/components/TierBadge`. If the file moved or was renamed, this will fail. Verify path.
2. **`BrandSpinner` import** — `@/components/BrandSpinner`. Default export.
3. **`@capacitor/haptics` types** — `ImpactStyle.Light` is a string enum. If Capacitor package was upgraded to v9, the import shape may have changed. Currently v8.0.2.
4. **`ProfileAccountType` row shape** — if `profile_account_types.is_primary` was renamed, my query (`t.is_primary`) will fail. Verify schema.

For any of these, read the import path / schema, fix the one line, re-run typecheck. Do not bundle fixes into other files.
