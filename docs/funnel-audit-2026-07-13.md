# Visitor → Paid Funnel Audit — 2026-07-13

## Scope
Walk every CTA from a visitor landing on a public RinkStop page through to a paid Stripe subscription, identify holes, propose fixes.

## Flow map (already shipped)
```
[visitor]
   ↓
/directory/[country]/[state]/[city]  ← Play 2 SEO pages (1,059 city URLs in sitemap)
   ↓
/ice-rinks/[id]  ← public rink page renders "Claim this listing"
   ↓
/claim-your-listing  ← search + claim flow
   ↓
/dashboard/claims  ← claim form (logged-in users)
   ↓
"Upgrade to claim this" → /pricing?tier=X
   ↓
/pricing  ← 11 tiers, deep-link works
   ↓
   ├ Free tier → /sign-up
   ├ Contact tier → /partner
   └ Paid tier → POST /api/tier/upgrade → Stripe checkout URL → Stripe hosted page
   ↓
Stripe success → /dashboard/welcome?tier=X&session_id=Y
   ↓
Stripe webhook → /api/webhooks/stripe → profiles.tier set, status active
   ↓
[DASHBOARD] /dashboard — now showing the paid tier's claims + features
```

## Leaks found

### LEAK #1 — /sign-up drops the redirect intent
**Severity:** High — affects any visitor who clicks "Sign up" instead of "Login" mid-claim
**Location:** `src/app/sign-up/[[...sign-up]]/page.tsx:11-13`
**Problem:** `forceRedirectUrl="/dashboard"` is hardcoded. `/login` correctly honors `?redirect_url=` but `/sign-up` doesn't read the query param at all. A visitor on `/ice-rinks/abc-123` clicks "Claim this listing" → sent to `/login?redirect_url=/dashboard/claims?entity=rink&id=abc-123...` (correct) → they click "Sign up instead" link in the Clerk UI → routed to `/sign-up` with NO redirect param → land on `/dashboard` → have to find the rink again → many drop off.
**Fix:** Mirror the /login handler — read `?redirect_url=` from searchParams, validate via `isValidRedirectPath`, pass through to Clerk.

### LEAK #2 — Legacy tier slug in CTAs (tier=pro)
**Severity:** Medium — broken deep-links cause silent no-op (no card highlighted)
**Location:** `src/components/ClaimThisListing.tsx:124` and line 30
**Problem:** Code references `/pricing?tier=pro` (legacy tier name from pre-2026-06-17 model). Current entry-tier identity slug is `verified_identity`. The pricing page reads `?tier=cluster_pro` etc. but `?tier=pro` silently falls through with no highlight — the user sees all 11 cards as if they hadn't clicked a CTA.
**Fix:** Replace `?tier=pro` references with `?tier=verified_identity` (or `business_listing` for business). Audit `?tier=` everywhere for other legacy slugs (roster, supporter, premium, business_premium).

### LEAK #3 — Hard-coded redirect "/dashboard" on sign-up forces user to find their work again
(Same root cause as LEAK #1, but worth tracking separately because the fix is the same patch.)

### LEAK #4 — Analytics events may be firing but unread
**Severity:** Low — operational visibility issue
**Location:** `src/lib/analytics.ts` writes to `analytics_events` table via service role
**Problem:** No admin views to read this. Not actually a leak in conversion — it's just a missed opportunity to see where users drop off in real-time.
**Fix:** Add a quick `/dashboard/admin/funnel` page that shows `pricing_viewed → checkout_started → checkout_completed → subscription_active` counts in last 7 days. Low-effort visibility tool.

### LEAK #5 — Welcome page reroutes may not detect subscription state correctly
**Severity:** Medium — affects the moment of conversion (Stripe redirect lands here)
**Location:** `src/app/dashboard/welcome/page.tsx` — needs verification
**Problem:** Stripe sends user to `/dashboard/welcome?tier=X&session_id=Y` AFTER success. The webhook fires to update the DB. There's a race: the user might land on /welcome BEFORE the webhook completes → page may show "Welcome to Free!" instead of "Welcome to Verified Identity!"
**Fix:** Implement a fallback in /dashboard/welcome that polls the DB or re-reads the stripe session for the user. Or: make the welcome page idempotent by re-querying profile.tier on every render and rendering the matched tier card regardless of the URL param.

### LEAK #6 — /dashboard/team pages — captain-side may not include "add admin" path
**Severity:** Low — feature gap, not leak
**Location:** `src/app/dashboard/team/[slug]/page.tsx`
**Problem:** A team_admin-type user can manage roster but cannot invite another team_admin (only player invites currently). Limits clubs from setting up multi-admin teams.
**Fix:** Add invite-existing-user-as-team-admin flow. Out of scope for v1 launch path but flag for future.

## Funnel pieces that ARE working
- /pricing page renders all 11 tiers with deep-link support
- Stripe checkout session creation is solid (downgrade guard, customer reuse, success/cancel URLs)
- /dashboard/welcome has tier-specific NEXT_STEPS copy and NEXT_TIER upsell
- /claim-your-listing does redirect-after-login correctly via /login?redirect_url=...
- All public pricing CTAs route through /api/tier/upgrade with rate limiting + analytics
- Stripe webhook handler at /api/webhooks/stripe exists

## Fix priority for v1 launch
1. LEAK #1 / LEAK #3: /sign-up redirect handling — **critical, fast fix**
2. LEAK #2: legacy tier slug replacement — **critical, fast fix**
3. LEAK #5: /dashboard/welcome race condition — **important, investigate**
4. LEAK #4: admin funnel view — **nice to have, 1-hour build**
5. LEAK #6: team_admin invites — **post-launch**

## Sources checked
- /api/tier/upgrade/route.ts — Stripe checkout creation logic
- /pricing/PricingContent.tsx — tier cards + checkout handler
- /dashboard/welcome/page.tsx — next steps per tier
- /claim-your-listing/page.tsx — search + claim CTA
- /components/ClaimThisListing.tsx — claim-on-rink-page CTA
- /sign-up/[[...sign-up]]/page.tsx — sign-up flow
- /login/[[...login]]/page.tsx — login flow (correctly handles redirect_url)
- /lib/analytics.ts — analytics event capture
- /middleware.ts — auth middleware
