# Identity & Business Verification (2026-06-17)

> **Status:** Design LOCKED (no code yet). Awaiting green light to begin Phase 1.
> **Owner:** KiloClaw (planning + build) / Arnel (Stripe Connect when Phase 3 lands)
> **Vendor:** Didit.me (Path C — confirmed 2026-06-17 16:51 CDT)
>
> **Locked decisions (Arnel, 2026-06-17 16:55 CDT):**
> 1. **Tier gate:** Pro+ (`tierAtLeast(tier, 'pro')` — $59.99/yr and up)
> 2. **Branding:** Didit-hosted page stays as `didit.me` (no white-label; revisit if Didit imposes a prohibitive cost — to be confirmed at signup)
> 3. **Data retention:** Full retention, no purge. Audit trail is permanent.
> 4. **Re-verification cadence:** Every 2 years. Cron job flags expired verifications and prompts user to re-verify.

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
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identity_verification_method TEXT
  CHECK (identity_verification_method IS NULL OR
         identity_verification_method IN ('didit_passport', 'didit_id_card', 'didit_selfie_only'));
  -- CHECK constraint prevents typos in code (e.g. 'didit_paspport') from silently failing badge logic.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS didit_session_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identity_expires_at TIMESTAMPTZ;
  -- = identity_verified_at + interval '2 years'. Cron flags expired rows as
  -- 'expired' (via the profile_identity_status view) and prompts re-verify.
  -- On successful re-verify, this is bumped +2y from the new verification date.

-- New table: didit_sessions
CREATE TABLE didit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  session_id UUID NOT NULL UNIQUE,             -- Didit's session_id
  session_kind TEXT NOT NULL CHECK (session_kind IN ('user', 'business')),
  workflow_id UUID NOT NULL,                   -- Didit's workflow_id
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'approved', 'declined', 'in_review', 'abandoned', 'resubmitted'))
  decision JSONB,                              -- full V3 decision payload
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cost_cents INTEGER,                          -- Didit's reported cost (for accounting)
  -- webhook dedupe
  event_ids TEXT[] DEFAULT '{}'                -- Didit reuses event_id on retries
);
CREATE INDEX didit_sessions_user_id_idx ON didit_sessions (user_id);
CREATE INDEX didit_sessions_status_idx ON didit_sessions (status);

-- Helper view: identity status (single source of truth for UI + cron checks)
-- A verification is considered "active" if identity_verified_at is set
-- AND identity_expires_at > now().
CREATE OR REPLACE VIEW profile_identity_status AS
SELECT
  user_id,
  identity_verified_at,
  identity_expires_at,
  identity_verification_method,
  CASE
    WHEN identity_verified_at IS NULL THEN 'never_verified'
    WHEN identity_expires_at > now() THEN 'active'
    WHEN identity_verified_at IS NOT NULL AND identity_expires_at <= now() THEN 'expired'
    ELSE 'never_verified'
  END AS status,
  CASE
    WHEN identity_expires_at IS NOT NULL THEN
      EXTRACT(DAYS FROM (identity_expires_at - now()))::int
    ELSE NULL
  END AS days_until_expiry
FROM profiles;

-- Cron-friendly index: find expired / soon-to-expire verifications fast
CREATE INDEX profiles_identity_expires_idx
  ON profiles (identity_expires_at)
  WHERE identity_verified_at IS NOT NULL;
```

#### Data retention & PII handling (added during 2026-06-17 audit)

The Didit `decision` JSONB contains PII (document_number, personal_number, full_name, email_address, phone_address, birth_date, address, portrait_image URL, signature_image URL, chip_data). Storing this permanently creates GDPR Article 17 / CCPA deletion issues, especially the biometric portrait_image (GDPR Article 9 special category data).

**Decision: scrub PII on insert. Store only non-PII audit fields.**

**Fields we KEEP in `didit_sessions.decision` JSONB:**
- `status` (Approved/Declined/In Review)
- `id_verifications[].document_type` (Passport, Identity Card — category, not specific)
- `id_verifications[].issuing_country` (3-letter country code)
- `liveness_checks[].status`, `liveness_checks[].method` (PASSIVE, ACTIVE_3D)
- `liveness_checks[].score` (e.g. 95.4 — numeric, not biometric)
- `face_matches[].status`, `face_matches[].score` (numeric, not biometric)
- `aml_screenings[].status` (clear/flagged)
- `cost_cents` (from Didit's billing metadata)
- `features[]` (which checks were run)

**Fields we DROP (PII):**
- `id_verifications[].document_number` ❌
- `id_verifications[].personal_number` ❌
- `id_verifications[].full_name` ❌
- `id_verifications[].email_address` ❌
- `id_verifications[].phone_number` ❌
- `id_verifications[].birth_date` ❌
- `id_verifications[].address` ❌
- `id_verifications[].portrait_image` ❌ (presigned URL, also biometric)
- `id_verifications[].signature_image` ❌
- `id_verifications[].chip_data` ❌ (full PII dump)
- `id_verifications[].authenticity` ❌ (contains certificate serial)
- `id_verifications[].certificate_summary` ❌ (certificate details)

**GDPR Article 17 handling:** user can request deletion. We null out our scrubbed `didit_sessions.decision` JSONB (set to `{}`) and null out `profiles.identity_verified_at`. We do NOT ask Didit to delete (the original still lives in their system per their retention policy — that's their problem, not ours). The badge disappears. The user re-verifies if they want it back.

**Why not store the scrubbed fields as separate columns?** Schema churn. If Didit adds a new field to `id_verifications[]` that we want to keep, we don't have to do a migration. JSONB is flexible; we just update the scrubber.

**Scrubber implementation:** a `src/lib/didit-scrubber.ts` module with a `scrubDecision(decision: any): ScrubbedDecision` function. Unit-tested with sample Didit payloads. Called from `/api/webhooks/didit` BEFORE the `UPDATE didit_sessions SET decision = ...` write.

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
src/lib/connections.ts                    [use]  - tierAtLeast() and getUserTier() already exist; reuse from @/lib/connections
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
scripts/cron-check-identity-expiry.mjs    [new]  - daily 09:00 UTC, prompts re-verify
```

#### Phase 1 constraints (locked)

- **Tier gate:** `tierAtLeast(tier, 'pro')` (Pro $59.99/yr, Premium $299/yr, Enterprise by contact). Starter ($19.99) and Free are not eligible.
- **Branding:** `didit.me` (Didit-hosted page). No white-label config.
- **Retention:** Full retention of **non-PII** audit fields (status, document_type, country, features, cost_cents, timestamps). The raw `decision JSONB` from Didit is scrubbed of PII before insert (we drop: document_number, personal_number, full_name, email_address, phone_number, birth_date, address, portrait_image URL, signature_image URL). The unsanitized original lives in Didit's system, not ours. GDPR Article 17 deletion requests are honored by nulling our scrubbed audit row, not by asking Didit to delete. **CCPA / GDPR legal basis:** legitimate interest (compliance with marketplace v2 KYC/KYB requirements, regulatory record-keeping). No biometric data (portrait_image) is stored on our side — only the Didit-side reference ID. See "Data retention & PII handling" section below for full implementation.
- **Re-verify cadence:** 2 years. `identity_expires_at = identity_verified_at + interval '2 years'`. Cron prompts user at T-30, T-7, T-1 days before expiry, and at T+0 (expired) blocks new claims / message sends until re-verified.

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
6. Didit POSTs webhook to /api/webhooks/didit with X-Signature-V2 + X-Timestamp + X-Event-Id
   - Server: validate `abs(now - X-Timestamp) < 300s` (replay protection)
   - Server: re-serialize parsed JSON with sorted keys + Unicode-preserved compact JSON, then HMAC-SHA256 with DIDIT_WEBHOOK_SECRET, timingSafeEqual against X-Signature-V2
   - Server: dedupe on event_id (insert into webhook_events on success, check before processing; Didit reuses event_id on retries)
   - Server: parse session_id, lookup our didit_sessions row
   - Server: scrub PII from decision (drop document_number, personal_number, full_name, email_address, phone_number, birth_date, address, portrait_image URL, signature_image URL — keep status, document_type, country, features, cost_cents, liveness_score, face_match_score, aml_status)
   - Server: if status == 'approved', set profiles.identity_verified_at = now() and identity_expires_at = now() + interval '2 years'
   - Server: if DB update fails, throw to trigger Didit retry (do NOT return 200)
   - Server: respond 200 within 5s on success (Didit retries on slower or non-2xx)
7. Client: poll /api/identity/status until identity_verified_at set
8. UI: "Verified by RinkStop" badge appears
```

#### What it does NOT do (intentional v1)

- ❌ Does NOT gate any current feature on verification
- ❌ Does NOT collect SSN/EIN — just a government photo ID + selfie match
- ❌ Does NOT auto-approve claims (verification is badge-only, not a claim-skip)
- ❌ Does NOT make verification required for any tier (always opt-in, never blocks sign-in)

**Note on public profile badge:** The /profile/[slug] page does show "Identity verified" if the user opted in and the verification is active. This was confirmed during audit — the original "no public display" bullet was the v1 plan, but the locked decisions and the files-to-modify list both show the badge on the public profile. This is intentional. Re-verification every 2 years means the badge can disappear if the user doesn't re-verify, which is the natural reason to keep it visible.

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

1. **Add Vercel env vars** (no user-facing changes): `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID` (single KYC workflow for Phase 1), `DIDIT_WEBHOOK_SECRET`
2. **DB migration** (additive, no breaking): `2026-06-17_didit_identity.sql`
3. **SDK + lib helpers** (server-side only, no UI): `src/lib/didit.ts`, `src/lib/didit-webhook-verify.ts`
4. **API routes** (server-side, can be tested with curl): `start`, `decision`, `webhook`, `status`. The `webhook` handler scrubs PII from the decision JSONB before insert (see Data retention section).
5. **Webhooks** (test with Didit sandbox): webhook destination created in Didit console, X-Signature-V2 + X-Timestamp verified (canonical JSON algorithm, not raw bytes)
6. **Dashboard page** (UI, gated to Pro+): `/dashboard/identity`
7. **Profile + welcome** (light touch): badge + prompt
8. **Cron job** (daily at 09:00 UTC): `scripts/cron-check-identity-expiry.mjs` — finds verifications expiring within 30 days, sends in-app notification banner prompt for re-verify

**Total Phase 1 time estimate:** 5-7 days, including Didit sandbox testing, webhook signature verification, and end-to-end flow testing. **Plus 1 day for the cron job (day 7).** Total: 6-8 days.

## Open questions for Arnel

**All four open questions resolved 2026-06-17 16:55 CDT.**

| # | Question | Decision | Effect |
|---|---|---|---|
| 1 | Tier gate? | **Pro+** (`tierAtLeast(tier, 'pro')`) | Starter and Free are not eligible. |
| 2 | White-label? | **No** (use Didit-hosted) | `didit.me` URL stays. Revisit if Didit imposes a cost increase. |
| 3 | Data retention? | **Full retention of non-PII audit fields, scrub PII on insert** | Audit trail is permanent for the non-PII fields. Raw decision JSONB is scrubbed of PII before insert (see Data retention section). Full retention of scrubbed data only. |
| 4 | Re-verify cadence? | **2 years** | `identity_expires_at = identity_verified_at + interval '2 years'`. Cron prompts re-verify at T-30, T-7, T-1 days, and T+0 (expired). |

**No outstanding decisions. Ready to build when Arnel says ship.**

## Risks

| Risk | Mitigation |
|---|---|
| Didit API rate limits hit free tier | 500/mo is plenty for year 1; switch to paid if needed (estimated $0-30/yr) |
| Webhook signature implementation bug | Use Didit's canonical X-Signature-V2 sample code (verified in docs); test against sandbox |
| Verification creates user expectation of "premium treatment" | Badge is opt-in, no other features gated on it; copy on `/dashboard/identity` sets expectations |
| Phase 3 changes Didit's role | Decide now: Didit is for the badge, Stripe is for marketplace receiving-party KYC. No conflict. |
| Country coverage gaps (PH, MX) | Didit covers 220 countries including PH. Verify list before shipping Phase 1. |
| GDPR Article 17 deletion request | Scrubber drops PII on insert. Deletion request: null the scrubbed `decision` JSONB + `identity_verified_at`. Badge disappears. User can re-verify. |
| Biometric data (portrait_image) leak | We do not store portrait_image URL. Reference to Didit's stored image is dropped on insert. |
| Didit webhook replay attack | X-Timestamp header rejected if `abs(now - ts) > 300s`. |
| Didit webhook signature false-positive on re-encoded body | X-Signature-V2 is over canonical JSON (sorted keys, compact, Unicode preserved), not raw bytes. Survives Next.js middleware re-encoding. |
| DB CHECK constraint missing on tier-method column | Added CHECK constraint to `identity_verification_method` and `didit_sessions.status` + `session_kind`. |
| TierAtLeast duplicate in 2nd module | Reuses existing `tierAtLeast()` and `getUserTier()` from `src/lib/connections.ts`. No new helper. |
| Doc self-contradiction (badge NOT on profile vs. badge IS on profile) | "What it does NOT do" list updated. Profile badge is the intended UX. |
| Webhook re-throw on DB failure not documented | Doc now says: throw to trigger Didit retry on DB failure, do NOT return 200. |

## What I'm NOT doing yet

- ❌ Building any code (waiting for Arnel's green light)
- ❌ Creating a Didit account (need Arnel's call on data residency / ToS review)
- ❌ Adding verification badges to marketing copy (will follow after Phase 1 ships)
- ❌ Phase 2/3 work (depends on Phase 1 outcome)
- ❌ OpenCorporates evaluation (rejected — $2,800/yr min for commercial use is non-starter)

## What I CAN do without code (still)

- Map the existing profile code to the changes needed (DONE in this doc)
- Sketch the `/dashboard/identity` page wireframe (DONE in this doc)
- Estimate Phase 1 build time: **5-7 days + 1 day for cron = 6-8 days total**
- Write the SDK wrapper that I can drop in when we start building
- Set up Didit sandbox account (if Arnel signs up; or I do with Arnel's approval)
- Estimate hosting cost for full retention: 100 verified users = ~50MB JSONB total. 1,000 users = ~500MB. Supabase free tier covers 500MB. **Full retention cost: $0 until 1,000+ verified users.**

## Didit account state (verified 2026-06-17 17:13 UTC)

**API key:** live and authenticated against `https://verification.didit.me/v3/workflows/`. HTTP 200, 3 workflows returned.

**Existing workflows (all `status: draft`, none `published`):**

| workflow_id | label | type | features | max price | is_default |
|---|---|---|---|---|---|
| `92721743-26e8-4d7e-9db2-c4c48c5bec08` | Biometric Authentication | biometric_authentication | LIVENESS + FACE_MATCH + IP_ANALYSIS | $0.13 | no |
| `e953ec7d-226a-41c1-8ee8-64eb1c008152` | KYC + AML | kyc | OCR + LIVENESS + FACE_MATCH + AML + IP_ANALYSIS | $0.65 | no |
| `016971f7-2a4a-47ba-9201-24a1a9d25d47` | Free KYC | kyc | OCR + LIVENESS + FACE_MATCH + IP_ANALYSIS | $0.33 | **yes** |

**Naming clarification:** "Free KYC" is the label on the workflow, NOT a free verification. The $0.33 max is the per-check price (with $0.00 min — IP analysis is sometimes free). The label reflects the default configuration that ships with new Didit applications.

**White-label status:** `is_white_label_enabled: false` on all 3. No extra cost concern (matches Arnel's decision).

**For Phase 1:** we use the "Free KYC" default workflow `016971f7-2a4a-47ba-9201-24a1a9d25d47` (KYC: OCR + LIVENESS + FACE_MATCH + IP_ANALYSIS, $0.33 max per check). This matches the design's stated $0.33/verification cost.

**For Phase 2 (business KYB):** use the "KYC + AML" workflow `e953ec7d-226a-41c1-8ee8-64eb1c008152` (KYC + AML, $0.65 max per check). Note: this includes AML screening, which is required for marketplace v2 receiving parties. The "Biometric Authentication" workflow is for re-verification only (no document scan) — not used in Phase 1 or 2.

**All 3 workflows need to be `published` before any session can be created against them.** This is a blocker that requires Arnel (or me with his permission) to:
1. Log into the Didit Business Console at https://business.didit.me
2. For each workflow, click "Publish"
3. Confirm the price threshold and other settings

**Webhook destinations:** 0 exist. Need to create `POST /v3/webhook/destinations/` with:
- `url`: `https://rinkstop.com/api/webhooks/didit`
- `subscribed_events`: `["session.completed"]` (and others as we discover them)
- Returns `secret_shared_key` in response — this goes into Vercel env as `DIDIT_WEBHOOK_SECRET`

**Key handling security note:** the API key was sent over Telegram (chat channel, not encrypted at rest in the client). **Recommend rotating the key after Phase 1 ships** since the live key is in the chat log. Will note in MEMORY.md.

**Sandbox vs production:** the key returns real prices ($0.33, $0.65) and real workflow IDs, not test fixtures. **This is the live key, not sandbox.** Sandbox applications have different key prefixes and `sandbox` in the workflow URLs. We are running against production data — the first real verification will be charged to Arnel's Didit account.



## User flow audit — visibility of identity verification (2026-06-17 18:30 UTC)

**Arnel pushed back hard: "I want you to run through the user flow and experience and make sure verification is optimized, and the option is visible to users."**

**Audit result: zero surface currently promotes or links to identity verification.** A Pro+ user would have to:
1. Know verification exists (it doesn't appear anywhere on the site)
2. Know it gives them an additional "Identity verified" badge (no mention)
3. Know the URL `/dashboard/identity` (it doesn't exist yet)
4. Know the tier gate is Pro+ (no mention on pricing or subscription)

**The two checkmarks are different things — a naming/source-of-truth issue:**

| Badge | Source | Tier required | What it proves |
|---|---|---|---|
| `VerifiedCheckmark` (teal #14B8A6) | `profiles.tier IN ('pro','premium','enterprise')` | Pro+ | User paid for Pro+ |
| `IdentityVerified` (NEW) | `profiles.identity_verified_at IS NOT NULL AND identity_expires_at > now()` | Pro+ opt-in | User verified their government ID with Didit |

**The teal checkmark is already a strong social signal** (used in `ClaimedBy.tsx`, profile page, welcome page). The identity badge should be a **differentiated visual** to avoid confusing the two. My proposal: **a small "ID" pill or shield icon**, not another checkmark. Maybe a navy/blue checkmark with "ID" or "ID Verified" tooltip, sitting next to the teal tier checkmark.

### Promotion surfaces (the 12 places to add visibility)

**Tier gate = Pro+.** Free/Starter users should see "Identity verification is a Pro feature" but the button should be disabled with an upsell link to /pricing.

#### 1. Dashboard nav (global, always visible)
Add `/dashboard/identity` to `DashboardNav`. **Only show for Pro+ users** (tier-gated link in `src/app/dashboard/layout.tsx`). Position: after `Subscription` so it doesn't compete with the primary nav. Label: **"Verification"** (clearer than "Identity" which could mean Clerk's user identity).

#### 2. Dashboard overview tile (post-login landing)
`/dashboard` page should have a "Get verified" tile for Pro+ users who haven't verified yet. For already-verified users: "Identity verified" status with "View details" link. For expired users: red "Re-verify now" CTA.

#### 3. /dashboard/welcome next-steps (post-Stripe-checkout)
The `NEXT_STEPS` map for `pro` and `premium` tiers should include identity verification as a follow-up action. Place it as the **#1 next step for Pro** (above "verified checkmark is now live") because identity verification is a stronger trust signal than the tier-based one.

#### 4. /dashboard/subscription "What's next for your tier" panel
Currently the subscription page just shows the Stripe manage-subscription form. Add a "Get the most from your Pro" panel below it that links to:
- Claim a listing
- Verify your identity
- Set up your public profile

#### 5. /pricing comparison table
Add an "Identity verification" row to the pricing comparison table. **Show as "—" for free/starter, "✓" for pro/premium/enterprise**. This is the FIRST place users will see the feature exists. Could be the conversion lever for free → pro.

#### 6. Pricing page FAQ
Add a FAQ entry: "What is identity verification?" explaining the government ID + selfie, 500/month free, opt-in only, re-verify every 2 years, badge appears on profile.

#### 7. /pricing "What you get with Pro" (pro tier detail panel)
The pro tier's tagline + features list should mention identity verification explicitly. Current copy: *"Pro is the identity play for orgs. It tells the people you DM that you are who you say you are — and gives you up to 5 claims, business profile, and DMs."* Replace "identity" with "ID-verified" and link to the FAQ.

#### 8. Public profile page (badge appears here)
Already designed — `IdentityVerified` component next to `VerifiedCheckmark`. Will show as a small navy "ID" shield. On hover: "Identity verified by RinkStop with government ID + selfie match. Last verified {date}, expires {date}."

#### 9. /dashboard/messages thread header (sender's verification status)
When viewing a DM thread, the OTHER person's name should show their identity-verified badge if they have it. This is the highest-impact placement: "the person messaging you is who they say they are" — exactly what the badge is for.

#### 10. /claim-your-listing flow (operator onboarding)
When a Pro+ user claims a rink, after the claim succeeds, show a follow-up prompt: "Boost your claim's credibility — verify your identity." This is the operator's first move on the platform and identity verification makes the most sense right there.

#### 11. Directory listing cards (ClaimedBy badge area)
The `ClaimedBy.tsx` component shows the teal tier checkmark. Add a tiny "ID" indicator next to it for identity-verified users. Visible on every listing they claim — this is the passive "free impressions" surface.

#### 12. Homepage "Why RinkStop" or "For operators" section
If there's a section that pitches operators to claim, mention identity verification as a credibility signal. Optional — depends on whether the homepage already has that section.

#### 13. (Bonus) Footer/utility link
Not in nav, but add a quiet "How verification works" link in the dashboard footer or /faq that links to a full explanation page. Could be a sub-page of /faq.

### Suggested implementation order (build sequence)

1. **Core feature first** (the actual verification flow): `src/app/dashboard/identity/page.tsx`, API routes, webhook, DB migration
2. **Dashboard nav link** (the entry point): #1 from the list above
3. **Public profile badge** (the visible result): #8 from the list above
4. **Welcome next-steps** (post-payment moment): #3 from the list above
5. **Pricing page row** (pre-payment discovery): #5 from the list above
6. **Directory listing badge** (passive impressions): #11 from the list above
7. **Subscription page panel** (engaged-user moment): #4 from the list above
8. **Messages thread badge** (the high-trust surface): #9 from the list above
9. **Claim-your-listing follow-up** (operator moment): #10 from the list above
10. **FAQ entry** (research-surfaced): #6, #13 from the list above
11. **Homepage mention** (if applicable): #12 from the list above
12. **Dashboard overview tile** (post-login moment): #2 from the list above

**Total surface touches: 12** (counting both 1 and 2 as separate nav vs. tile entries). Build effort: items 1-7 are required, 8-12 are polish. The 6-8 day Phase 1 estimate covers items 1-7. Items 8-12 add 1-2 days.

### One visual decision: badge style

**Recommendation: navy/blue "ID" shield, not another checkmark.**

Reasoning: the site already has a teal checkmark for the tier-based verified status. Adding another checkmark (even a different color) for identity would create "what's the difference?" confusion. A small **shield with "ID" inside**, navy color (matches brand), makes the difference obvious at a glance:

- Teal checkmark = "Paid for Pro+ tier"
- Navy ID shield = "Verified identity with government ID"

The two are independent — you can have one without the other. A Pro+ user with no ID verification shows the teal check only. A Pro+ user with ID verification shows both: "I'm a Pro member (teal) AND I've verified my ID (navy)."

**This needs Arnel's sign-off** because it's a brand decision. If Arnel wants two checkmarks (one teal, one navy), we do that. If Arnel wants the ID shield, we do that. The visual style is in the design doc, not committed yet.
