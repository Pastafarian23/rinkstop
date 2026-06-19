# Claim Verification — Free, Tier-Based Trust

**Status:** Design doc. Not yet implemented.
**Owners:** KiloClaw (builds), Arnel (approves final tier gates).
**Created:** 2026-06-17 after Didit.me KYC discussion in Project X.

---

## Why this exists

Didit.me is a regulated KYC vendor ($0.15–$0.33/check, 500 free/month). It's overkill for RinkStop's current state — no money flows between users, no regulated activity, no age-gated content. But "this person is real" and "this person owns this listing" are different problems. ID verification doesn't prove the second one.

This design solves the **second** problem: how does RinkStop know an operator is legit enough to manage a listing, before we let them post hours, edit rosters, or take over a rink's profile?

**Trigger to revisit KYC (Didit / Stripe Identity):** When RinkStop starts taking a cut of marketplace transactions, booking fees, or paid lead routing. See "When to add real KYC" at the bottom.

---

## What RinkStop actually needs to verify a claim

For a user to claim a rink/team/league listing, we need to confirm one of:

1. **They control the org's email domain** (e.g., email at @chicagoblackhawks.com for a Chicago Blackhawks youth team).
2. **They have a public role at the org** (LinkedIn / official website shows them as coach, GM, rink manager, etc.).
3. **They control a domain or social handle tied to the listing** (e.g., they get a verification code DMed to the org's official IG, or they can post a code on the org's website).
4. **They have insider knowledge** only staff would have (e.g., the listing's claimed operating hours match a known schedule, or they can answer a question from public + private sources).
5. **A trusted existing claim holder vouches for them** (Verified/Pro user with a similar org says "yes, this is our new assistant coach").

None of these require a passport scan. None require paid vendor. All can be done with existing infrastructure.

---

## The flow (5 methods, $0 cost)

When the user submits a claim, they pick **one** method. The system stores the verification artifact + auto-decides where it can; flags manual review where it can't.

### Method 1: Domain email match (strongest, automatic)

- User submits claim with email at the org's domain.
- System sends a 6-digit code to that email.
- User enters the code → claim auto-approved.
- **How we know the domain:** Already in `rinks.website`, `teams.website`, or a manual `claimed_domain` field we add to each entity. Fallback: scrape the entity's official site / Wikipedia / league page.
- **Edge case:** Public rinks run by municipalities (city email, not org domain) — accept `.gov` emails and skip domain check.
- **Cost:** $0 (Clerk email + Resend free tier or existing Zoho SMTP).

### Method 2: Public role URL (strong, light review)

- User submits a LinkedIn URL, official team page, or org bio page that shows them in a role at the entity.
- Our staff (or a future AI check) eyeballs it: does the URL exist? Does the page show the user at the entity?
- 24-hour SLA on review.
- **Cost:** $0 (manual review). At scale, swap for a $0 web-fetch + AI check that reads the page.

### Method 3: Insider knowledge challenge (medium, automatic)

- 2-3 questions only staff would know:
  - "What time does the rink close on Sundays?" (answer must match public hours within ±30 min)
  - "What's the name of your head coach's dog?" (from a public team bio, or a known fact we seed in the DB)
  - "What's the gate code for the staff door?" (we store this from a previous approved claim, or from a public source we add)
- User answers 2/3 correctly → auto-approved.
- **Cost:** $0. We seed the answers when an entity is first added to the DB.

### Method 4: Social handle control (medium, automatic)

- We generate a unique code (e.g., `RINKSTOP-7K4M`).
- User must post it on the entity's official Instagram / Twitter / Facebook page, or change the bio to include it temporarily.
- Our crawler (or manual check) confirms the post.
- **Cost:** $0 if we do it manually on the first 100 claims. ~$50/mo if we add a social-listening tool later.

### Method 5: Vouch from a trusted user (weak but real)

- A Verified or Pro user with an approved claim at the same org can vouch.
- The voucher accepts liability (their own claim gets reviewed if the vouchee turns out bad).
- Vouched claims auto-approve with a small flag in the admin panel.
- **Cost:** $0.

---

## Schema changes (minimal)

```sql
-- Add to existing claims table
ALTER TABLE claims
  ADD COLUMN verification_method TEXT,        -- 'domain_email' | 'public_role_url' | 'insider_quiz' | 'social_post' | 'vouch'
  ADD COLUMN verification_artifact JSONB,     -- {email: ..., url: ..., answers: [...], post_url: ..., voucher_user_id: ...}
  ADD COLUMN verification_status TEXT,        -- 'pending' | 'auto_approved' | 'needs_review' | 'failed' | 'expired'
  ADD COLUMN verified_at TIMESTAMPTZ,
  ADD COLUMN expires_at TIMESTAMPTZ,         -- 7-day expiry on codes
  ADD COLUMN voucher_user_id TEXT REFERENCES clerk users;  -- for vouch method

-- New: insider knowledge answers table (per entity)
CREATE TABLE entity_insider_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,    -- 'rink' | 'team' | 'league'
  entity_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer_hash TEXT NOT NULL,    -- bcrypt(answer.lower().strip())
  source TEXT,                  -- 'public_hours' | 'staff_provided' | 'wikipedia'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- New: vouch graph
-- (already covered by voucher_user_id column above + RLS)
```

That's it. The `claims` table already has `status` (pending/approved/rejected). We add `verification_*` fields and don't break the existing flow.

---

## What we ship first (priority order)

1. **Method 1: Domain email match** — 2 days, fits Clerk email + Zoho SMTP. Auto-approves 60-70% of claims.
2. **Method 3: Insider quiz** — 3 days, seed 3-5 questions per top-500 rink. Auto-approves another 20%.
3. **Method 2: Public role URL** — 1 day to ship the form, manual review in admin panel.
4. **Method 5: Vouch** — 1 day, just an admin button.
5. **Method 4: Social post** — 2 days (requires crawler or manual).

Methods are additive. The user picks the easiest one for them. The system tries to auto-decide; falls back to manual review queue.

**Total: ~9 days of build, all $0.** Existing Clerk + Supabase + Zoho covers it.

---

## Admin UX (where human review happens)

- `/admin/claims` already exists (per `/admin/teams/[id]/page.tsx` and similar).
- Add a filter: `verification_method = needs_review`.
- For each pending claim, show the artifact:
  - Domain email: did the user actually verify the code? (yes/no, logged automatically)
  - Public role URL: open the URL in a new tab, click "Approve" or "Reject".
  - Insider quiz: show the questions + the user's answers (with the correct answer hidden — staff knows if it's "right enough").
  - Social post: show the post URL when present, with timestamp.
  - Vouch: show the voucher's name + claim history.
- SLA: 24 hours. After 24 hours, escalation banner to Project X channel.

---

## When to add real KYC (Didit / Stripe Identity)

Add a KYC vendor — and only at the **Pro tier or above** — when any of these become true:

- **Marketplace transactions.** Operators book ice time, register for tournaments, or pay each other through RinkStop. We take a cut. Regulators + Stripe Connect require identity verification on the receiving party.
- **Paid lead routing.** Pro tier captures leads (per existing schema). If those leads include PII or financial intent (someone asking for a quote on $10K of ice time), the lead seller should be KYC'd.
- **Background-check-adjacent.** Youth hockey operators working with minors. Even if not legally required in all jurisdictions, it's a liability / insurance question. KYC + a background-check partner becomes table stakes.
- **International expansion with sanctions risk.** Once we have users in regions with OFAC/sanctions complexity, KYC + AML screening becomes a real ask, not a nice-to-have.

Until one of those triggers, the claim-based verification above is enough. It answers "does this person own this listing?" — which is the actual question — for $0 and 60 seconds of user time, not $0.33 and 90 seconds.

**Recommended vendor if/when:** Didit (cheap, modern, MCP-friendly, 500 free/mo absorbs initial Pro-tier volume). Stripe Identity ($1.50/check, integrated into Stripe Checkout — fewer vendors) is the backup.

---

## Anti-abuse considerations

- One user can vouch for max 3 users per 90 days.
- Vouchee claims auto-revoke if the voucher's claim is later revoked.
- Domain email domain must match one of: `entity.claimed_domain`, `entity.website` parsed domain, or a city `.gov` email for public rinks.
- Codes expire in 7 days. Max 3 code requests per claim per 24h.
- Manual review queue has rate limits so a flood of fake claims doesn't drown it.
- All verification artifacts stored for 1 year for audit. After 1 year, scrub PII (email, social handle), keep method + status + timestamp.

---

## Open questions (parking lot)

- Should rink/team/league admins from leagues be able to bulk-vouch for teams under their league? (Yes, probably — saves review time, but adds risk.)
- Do we expose any of this as a public trust signal on the listing? ("Verified by RinkStop via org email" badge vs. just a checkmark.)
- How long before a claim needs re-verification? (Annual? Only on staff turnover? Never?)
- What about parent-managed player profiles? Those have a different path (`parent_managed:` prefix in `reason`). Should they require any verification beyond Clerk auth?

---

## Sources

- Didit pricing verified 2026-06-17: $0.15/check standalone, $0.33/full KYC bundle, 500 free/month, pay-per-success, no contract.
- Stripe Identity pricing: $1.50/check (industry-standard rate; verify at dashboard.stripe.com before committing).
- Current claim flow: `/api/claims/route.ts`, `/claim-your-listing/page.tsx`, `lib/ownership.ts`.
- Tier limits: `lib/connections.ts` (getMaxClaimsForTier: Supporter=1, Verified=5, Pro=25, Enterprise=Infinity).