# Identity & Business Verification (2026-06-17)

> **Status:** Design (no code yet). Awaiting green light to begin Phase 1.
> **Owner:** KiloClaw (planning + build) / Arnel (Stripe Connect when Phase 3 lands)
> **Vendor:** Didit.me (Path C — confirmed 2026-06-17 16:51 CDT)

## Why we're doing this

Three goals, in order:

1. **Give Pro+ users a verified identity badge** (optional, opt-in, free to them) — trust signal in the directory
2. **Let business accounts verify they're a real business** — required for marketplace v2 (Stripe Connect receiving party)
3. **Position RinkStop to take a marketplace fee compliantly** — pre-stages the KYB + KYC data Stripe Connect will require

This is opt-in for v1. Required only when marketplace v2 launches, with the same data reused — no re-collection at the moment of payment.

## Vendor: Didit.me

**Why Didit (Path C):**

| Comparison | Didit | Stripe Identity | OpenCorporates |
|---|---|---|---|
| Full person KYC | **$0.33** | $1.50 (US) | — |
| Full business KYB | **$2.00** | — | $0.0027/call (commercial min $2,800/yr) |
| Free tier | 500/mo | 50 total | 200/mo + share-alike (not viable) |
| MCP integration | ✅ 40+ tools | ❌ | ❌ |
| Coverage | 220 countries, 14K docs | US/EU only | 200M+ companies |
| Bundle pricing | ✅ (AML + ID + liveness + face match) | ❌ | ❌ |

**Decision:** All Didit (Path C). Cheapest per check, broadest coverage, free tier absorbs year-1 volume, MCP-friendly for agent-driven setup.

**Phase 3 carve-out (post-v1):** When marketplace v2 launches and we onboard receiving parties to Stripe Connect, Stripe's bundled KYC ($0 incremental) handles receiving-party onboarding. We still use Didit for our optional "Verified by RinkStop" marketing badge. Both can coexist — Didit for badge, Stripe for receiving-party KYC.

## Cost ceiling (worst case, 100% verify rate)

| Active Pro+ users | KYB users | Didit cost/month |
|---|---|---|
| 50 | 5 | $0 (free tier) |
| 200 | 20 | $0 (free tier) |
| 600 | 60 | $15 |
| 2,000 | 200 | $560 |
| 10,000 | 1,000 | $4,490 |

**Realistic year 1 cost: $0.** The free tier absorbs up to 500 verifications per month, which is more than we project for the year.

## Phasing

### Phase 1 — Opt-in ID badge for Pro+ users (5-7 days, $0)

#### DB schema

```sql
-- New column on profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identity_verification_method TEXT;
  -- values: 'didit_passport' | 'didit_id_card' | 'didit_selfie_only' | null
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS didit_session_id UUID;

-- New table: didit_sessions
CREATE TABLE didit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  session_id UUID NOT NULL UNIQUE,             -- Didit's session_id
  session_kind TEXT NOT NULL,                  -- 'user' | 'business'
  workflow_id UUID NOT NULL,                   -- Didit's workflow_id
  status TEXT NOT NULL,                        -- 'not_started' | 'in_progress' | 'approved' | 'declined' | 'in_review'
  decision JSONB,                              -- full V3 decision payload
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cost_cents INTEGER,                          -- Didit's reported cost (for accounting)
  -- webhook dedupe
  event_ids TEXT[] DEFAULT '{}'                -- Didit reuses event_id on retries
);
CREATE INDEX didit_sessions_user_id_idx ON didit_sessions (user_id);
CREATE INDEX didit_sessions_status_idx ON didit_sessions (status);
```

#### API routes

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/identity/verify/start` | POST | Create Didit session, return hosted URL | Clerk (user) |
| `/api/identity/verify/decision` | GET | Re-fetch decision via `GET /v3/session/{id}/decision/` | Clerk (user) |
| `/api/webhooks/didit` | POST | Receive webhook events (X-Signature-V2 HMAC) | Didit IP + signature |
| `/api/identity/status` | GET | Return user's current verification state | Clerk (user) |

#### Files to create/modify

```
src/lib/didit.ts                          [new]  - SDK client + helper functions
src/lib/didit-webhook-verify.ts           [new]  - HMAC-SHA256 X-Signature-V2 verifier
src/lib/pricing.ts                        [mod]  - add isIdentityVerified() helper
src/lib/listingTier.ts                    [mod]  - add tierAtLeastPro() if needed
src/app/dashboard/identity/page.tsx       [new]  - main UX page
src/app/dashboard/identity/IdentityClient.tsx  [new]  - the actual UI
src/app/api/identity/verify/start/route.ts    [new]
src/app/api/identity/verify/decision/route.ts [new]
src/app/api/identity/status/route.ts          [new]
src/app/api/webhooks/didit/route.ts            [new]
src/app/dashboard/layout.tsx              [mod]  - add "Identity" nav item
src/app/dashboard/welcome/page.tsx        [mod]  - show "Verify identity" prompt if Pro+ and unverified
src/app/profile/[slug]/page.tsx           [mod]  - small "Identity verified" line if flag set
supabase/migrations/2026-06-17_didit_identity.sql  [new]
```

#### Webhook flow

```
1. User clicks "Start verification" on /dashboard/identity
2. POST /api/identity/verify/start
   - Server: check tierAtLeast(tier, 'pro')
   - Server: POST https://verification.didit.me/v3/session/ with { workflow_id, vendor_data: clerkUserId, callback: 'https://rinkstop.com/dashboard/identity?session=<id>', callback_method: 'both' }
   - Server: insert didit_sessions row
   - Server: return { url: '<didit_url>', session_id: '<didit_session_id>' }
3. Client: window.location.href = url (or iframe)
4. User completes ID + selfie on Didit
5. Didit redirects to our callback URL with ?verificationSessionId=<id>&status=Approved
   - Note: status in URL is untrusted UI hint, used for spinner/polling only
6. Didit POSTs webhook to /api/webhooks/didit with X-Signature-V2
   - Server: verify HMAC-SHA256, dedupe on event_id
   - Server: parse session_id, lookup our didit_sessions row
   - Server: if status == 'approved', set profiles.identity_verified_at = now()
   - Server: respond 200 within 5s (Didit retries on slower)
7. Client: poll /api/identity/status until identity_verified_at set
8. UI: "Verified by RinkStop" badge appears
```

#### What it does NOT do (intentional v1)

- ❌ Does NOT gate any current feature on verification
- ❌ Does NOT display "Verified" badge on public profiles (no FOMO gaming, no "show off your ID" culture)
- ❌ Does NOT collect SSN/EIN — just a government photo ID + selfie match
- ❌ Does NOT auto-approve claims (verification is badge-only, not a claim-skip)

### Phase 2 — Opt-in business verification (3-4 days, $0)

#### DB schema

```sql
CREATE TABLE business_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,        -- 'llc' | 'inc' | 'sole_prop' | 'non_profit' | 'partnership' | 'other'
  jurisdiction TEXT NOT NULL,       -- 'US-DE', 'US-CA', 'PH-CEBU', etc. (ISO 3166-2)
  registration_number TEXT,         -- optional, if user provides
  didit_session_id UUID REFERENCES didit_sessions(id),
  aml_status TEXT,                  -- 'clear' | 'flagged' | 'pending'
  ubo_extracted JSONB,              -- ultimate beneficial owners, free from Didit
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX business_registrations_user_id_idx ON business_registrations (user_id);
```

#### Claim flow integration

When a user claims a rink:
1. They can optionally link a `business_registrations` row
2. If they have one with `verified_at` set, the claim auto-approves at "Pro" level trust (skip manual review)
3. Otherwise, claim goes through normal review

#### Files to create/modify

```
src/app/dashboard/identity/business/page.tsx    [new]  - business KYB flow
src/app/api/business/verify/start/route.ts       [new]
src/app/api/business/verify/decision/route.ts    [new]
src/app/api/business/list/route.ts               [new]  - for claim flow lookup
src/app/claim-your-listing/[id]/page.tsx         [mod]  - add "Link business" option
supabase/migrations/2026-06-17_business_kyb.sql  [new]
```

#### Public profile badge

- New "Verified Business" badge on `/profile/[slug]` if user has a verified business + person
- Distinct visual from "Verified Person" badge
- Includes entity name + jurisdiction

### Phase 3 — Marketplace v2 with Stripe Connect (post-v1, 2-3 weeks)

**This is post-v1.** Triggers when we graduate the ice-slot marketplace from messaging-only to paid bookings.

1. RinkStop becomes a Stripe Connect platform (Express accounts for sellers)
2. Receiving parties (rink operators) must have:
   - `is_identity_verified = TRUE` (from Phase 1)
   - `business_registrations` row with `verified_at` set (from Phase 2)
3. Stripe Connect onboarding enforces its own KYC; we layer ours on top for the marketplace trust signal
4. RinkStop charges a 5% fee (per `ice-slot-marketplace-v1.md`'s industry-standard placeholder)
5. Stripe files 1099-Ks automatically for sellers crossing $600/yr

**Stripe Connect does NOT replace Didit.** Didit is for the optional "Verified by RinkStop" badge. Stripe Connect does its own KYC/KYB for receiving parties as part of onboarding. Both coexist; the user only pays for the badge (Didit), not the receiving-party KYC (Stripe bundles it for free).

## Migration order (when build starts)

1. **Add Vercel env vars** (no user-facing changes): `DIDIT_API_KEY`, `DIDIT_WORKFLOW_KYC_ID`, `DIDIT_WEBHOOK_SECRET`
2. **DB migration** (additive, no breaking): `2026-06-17_didit_identity.sql`
3. **SDK + lib helpers** (server-side only, no UI): `src/lib/didit.ts`, `src/lib/didit-webhook-verify.ts`
4. **API routes** (server-side, can be tested with curl): `start`, `decision`, `webhook`, `status`
5. **Webhooks** (test with Didit sandbox): webhook destination created in Didit console, HMAC verified
6. **Dashboard page** (UI, gated to Pro+): `/dashboard/identity`
7. **Profile + welcome** (light touch): badge + prompt

**Total Phase 1 time estimate:** 5-7 days, including Didit sandbox testing, webhook signature verification, and end-to-end flow testing.

## Open questions for Arnel

1. **What tier to gate verification on?** Plan says Pro+ (any paid tier). Alternative: any tier including Free (more data, less revenue impact, but more abuse risk).
2. **White-label or Didit-branded?** Didit supports white-label hosted flow. White-label costs more per check (?). Confirm whether hosted page can show "RinkStop" branding.
3. **Data retention.** Plan keeps `decision JSONB` for audit. Alternative: store only the high-level fields, drop the rest after 90 days. (Stripe Connect would still need the audit trail for compliance disputes.)
4. **Re-verification cadence.** Plan says re-verify on demand (user clicks). Alternative: re-verify every 2 years (industry standard for KYC). Need to know before we ship.

## Risks

| Risk | Mitigation |
|---|---|
| Didit API rate limits hit free tier | 500/mo is plenty for year 1; switch to paid if needed (estimated $0-30/yr) |
| Webhook signature implementation bug | Use Didit's canonical X-Signature-V2 sample code (verified in docs); test against sandbox |
| Verification creates user expectation of "premium treatment" | Badge is opt-in, no other features gated on it; copy on `/dashboard/identity` sets expectations |
| Phase 3 changes Didit's role | Decide now: Didit is for the badge, Stripe is for marketplace receiving-party KYC. No conflict. |
| Country coverage gaps (PH, MX) | Didit covers 220 countries including PH. Verify list before shipping Phase 1. |

## What I'm NOT doing yet

- ❌ Building any code (waiting for Arnel's green light)
- ❌ Creating a Didit account (need Arnel's call on data residency / ToS review)
- ❌ Adding verification badges to marketing copy (will follow after Phase 1 ships)
- ❌ Phase 2/3 work (depends on Phase 1 outcome)
- ❌ OpenCorporates evaluation (rejected — $2,800/yr min for commercial use is non-starter)

## What I CAN do without code

- Map the existing profile code to the changes needed (DONE in this doc)
- Sketch the `/dashboard/identity` page wireframe (DONE in this doc)
- Estimate Phase 1 build time: **5-7 days** (3 days for API + DB + webhook, 2 days for UI, 1 day for testing, 1 day buffer)
- Write the SDK wrapper that I can drop in when we start building
- Set up Didit sandbox account (if Arnel signs up; or I do with Arnel's approval)
