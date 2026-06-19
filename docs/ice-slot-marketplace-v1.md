# Ice Slot Marketplace — V1 Spec

**Status:** Draft for Arnel's review (REVISED 2026-06-17 — messaging-first design)
**Author:** Jarvis
**Date:** 2026-06-17
**Estimated build time:** 1-2 weeks (~36 hours)

---

## What V1 is

A **listings board** for surplus ice time. Rinks (and teams with surplus booked ice) post available time blocks. Coaches, teams, and players browse and message the seller directly through RinkStop's existing messaging system. RinkStop does not process payments in v1.

**What v1 is NOT:** No payments flow through RinkStop. No contracts. No Stripe Connect. No escrow. No off-platform contact form — buyers and sellers communicate in-app, gated to upgraded profiles.

---

## Why this is V1, not a marketplace

The competitive landscape (verified 2026-06-17):

| Category | Examples | Stage | What we learn from them |
|----------|----------|-------|--------------------------|
| B2B SaaS for rinks | RinkWare ($199-499/mo), EZFacility, XEPOS, Anolla | Established | Rinks pay for software. But it's a saturated, slow-growing market. |
| Ice marketplaces | Ice Exchange, PublicIce, CivicX1 | Early, demo-only pricing | Direct competitors. None are dominant. |
| Referee platforms | Refr ($0.75/game), YesRef (13k officials), Herd of Zebras | Active | Picked apart as a feature, not a market. |
| Pickup games | BetterPuck, Rink Rats, Pickup Play | Active | User-side is solved. We don't need to build it. |

**Key insights from the research:**

1. **No dominant ice marketplace exists.** Ice Exchange is the closest competitor and is a small startup (founded 2022, 2-person team vibe from the website).
2. **Our wedge is the directory + team data.** 1,918 rinks, 8,000+ team records. No competitor has this combined dataset. The "teams selling surplus ice" angle is novel — none of the 18 platforms I researched built for the team-side of the market.
3. **Marketplace fee benchmarks are not public** (Ice Exchange, PublicIce, CivicX1 all "Schedule a demo"). The 5% I floated is industry-standard for SaaS marketplaces but unverified for this specific market.
4. **Tax/legal review is mandatory before V2.** US state money-transmission licensing, sales tax, 1099 thresholds all need professional review. v1 avoids this by not holding money.

---

## What V1 builds on (existing infrastructure)

| Component | Already exists | Used for V1 |
|-----------|----------------|------------|
| Clerk auth + tier system | Yes | Gate: Pro users can list. Verified can list 1. Free can browse + contact. |
| `claims` table | Yes | Authorize: user must have approved claim on a rink OR team to list slots for it. |
| `profiles.tier` | Yes | Read-only reference for gating. |
| `rinks` + `teams` tables | Yes | The entities that own slots. |
| `threads` + `messages` + `connections` tables | Yes | **The contact flow.** Slot inquiry is a thread with `context_profile_type='ice_slot'`. Tier gating ("Verified or Pro required to send") already enforced in `/api/threads/route.ts` line 131. |
| `/dashboard/messages` page | Yes | **The inquiry inbox.** No new dashboard page needed. Slot inquiries show up here. |
| `/dashboard/listings` | Yes | UX template. Slot listings are a new listing_type, use same dashboard page. |
| `/api/listings` | Yes | Extend with `listing_type='ice_slot'`. Add slot-specific fields. |
| Analytics events | Yes | Track listing_created, listing_viewed, message_initiated, featured_purchased. |
| Featured placement (pay-per-day for rinks) | **Not built yet** | **This is the actual revenue line in V1.** Rinks pay to boost their slot listings. Build the featured boost as part of v1. |

**The v1 spec is small** because the hard parts (auth, claims, listing pattern, **messaging**) are done. The new code is the slot-specific schema, the listing form, the browse page, the message-modal-on-slot-detail, and the featured boost payments.

---

## Data model

### REVISED 2026-06-17: messaging replaces the inquiry form

After auditing the codebase, RinkStop already has a real messaging system:
- `threads` + `messages` tables (real inbox with unread counts)
- `connections` table with accept/decline/block (the friend-request model)
- Tier gating: "Verified or Pro membership required to send messages" (already enforced in `/api/threads/route.ts` line 131)
- `/dashboard/messages` page is a working inbox

**This changes v1 materially:** the "contact seller" flow is not a new inquiry form. It's a new thread created against the seller's user_id (because the seller has an approved claim on the rink/team). The buyer's first message is the inquiry. The seller's response is the negotiation. The transaction happens off-platform, but the conversation is in-app.

**No `ice_slot_inquiries` table needed.** The existing `threads` table handles this if we add a `context_profile_type` value of `'ice_slot'` and a `context_profile_id` pointing at the slot listing.

### 3 new tables (down from 4)

```sql
-- The slot listing itself
CREATE TABLE ice_slot_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id TEXT NOT NULL,           -- Clerk user who created the listing
  seller_type TEXT NOT NULL,              -- 'rink' or 'team'
  seller_entity_id UUID NOT NULL,         -- rink.id or team.id
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60
  ) STORED,
  activity_type TEXT NOT NULL,            -- 'practice' | 'game' | 'training'
  price_cents INT,                        -- null = "contact for price"
  currency TEXT DEFAULT 'USD',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB,                  -- iCal RRULE or simple "every Sunday for 12 weeks"
  recurrence_end_date DATE,
  status TEXT NOT NULL DEFAULT 'open',    -- 'open' | 'held' | 'booked' | 'cancelled'
  notes TEXT,
  city TEXT,                              -- denormalized for search
  country TEXT,                           -- denormalized
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT chk_activity CHECK (activity_type IN ('practice', 'game', 'training'))
);

CREATE INDEX idx_ice_slot_listings_seller ON ice_slot_listings (seller_type, seller_entity_id);
CREATE INDEX idx_ice_slot_listings_status_start ON ice_slot_listings (status, start_time) WHERE status = 'open';
CREATE INDEX idx_ice_slot_listings_location ON ice_slot_listings (country, city);

-- Featured placement (the actual revenue line)
CREATE TABLE featured_slot_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES ice_slot_listings(id) ON DELETE CASCADE,
  buyer_user_id TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  price_cents INT NOT NULL,
  stripe_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_featured_slot_listings_active ON featured_slot_listings (listing_id, ends_at) WHERE status = 'active';
```

### Updated `threads.context_profile_type` to include 'ice_slot'

The existing threads table already supports `context_profile_type` and `context_profile_id`. We add `'ice_slot'` as a valid value. The existing `connections` accept/decline flow handles the social gating.

**RLS:**
- `ice_slot_listings`: SELECT for everyone (open listings are public), INSERT/UPDATE/DELETE for `seller_user_id = auth.uid()::text`
- `featured_slot_listings`: SELECT for the buyer, INSERT/DELETE for service_role only (paid via Stripe)
- `threads` + `messages`: existing RLS — only thread participants can read; Verified+ can write (already enforced)
- `connections`: existing RLS — only connection participants can read

### Why this revision is materially better

1. **Reuses the existing inbox.** The seller doesn't get inquiries in a different tab — they get messages in their normal inbox, with the slot listing as the conversation context. This is what users expect (matches Airbnb, VRBO, every marketplace with a "Messages" tab).
2. **Connection system provides natural spam protection.** A buyer can't just message any seller — they need an accepted connection. Sellers can decline. This is the same model as LinkedIn.
3. **Existing tier gating is the gating.** "Verified or Pro required to send messages" is already the rule. We don't need to add a new gate for slot inquiries.
4. **The data we collect is much richer.** In v1, we know: who initiated the conversation, when, response time, message length. In v2 (when we add payments), we can correlate conversations to bookings.
5. **Pro tier value gets sharper.** "Pro lets you receive inquiries on your slot listings" is a direct revenue connection. "Pro lets you claim 25 listings" is an abstract limit. The new framing is easier to sell.

### Why these decisions (slot listings)

- **Single `ice_slot_listings` table for both rinks and teams** (with `seller_type` + `seller_entity_id`) — simpler than two tables, queries can filter by seller_type. Trade-off: harder to add seller-type-specific fields later. Acceptable for v1.
- **`is_recurring` + `recurrence_rule` JSONB** — supports both one-off and recurring contracts. Real-world complexity (exceptions, holidays) can be added in v1.1.
- **No `featured_slot_listings` integration with Stripe Checkout yet** — we have Stripe in production; reuse the existing `/api/tier/upgrade` flow as a template. The actual Stripe Checkout session creation is ~50 lines of code.
- **Analytics reuse the existing `analytics_events` table** — just new event types. No new table.

---

## UI pages

### REVISED 2026-06-17: messaging-first contact flow

### Public-facing

| Page | Path | Purpose |
|------|------|---------|
| Browse | `/directory/ice-slots` | Filter by city, date range, activity type, max price, seller type. |
| Detail | `/directory/ice-slots/[id]` | Slot info, seller info, **"Message seller" button** (replaces the contact form). |
| Featured | (inline) | Featured slots appear at top of `/directory/ice-slots` filtered by their `city` + `activity_type`. |

### Contact flow (the new messaging-first design)

1. Buyer clicks "Message seller" on a slot detail page.
2. If buyer is **not logged in** → redirect to `/login?redirect_url=/directory/ice-slots/[id]`. After login, return to the slot page with the message modal pre-opened.
3. If buyer is **logged in but Free/Supporter** → show upgrade modal: "Verified members can message sellers directly. Upgrade to send your message." CTA: `/pricing`.
4. If buyer is **Verified or Pro** → show message modal with pre-filled "Hi, I'm interested in your [slot name] on [date]..." (editable). On submit:
   - Create a `connection` between buyer and seller (if not already accepted)
   - Create a `thread` with `context_profile_type='ice_slot'`, `context_profile_id=[listing id]`
   - Send the first `message` in the thread
   - Buyer is redirected to `/dashboard/messages/[threadId]`
5. Seller sees the new message in their normal `/dashboard/messages` inbox. The conversation has the slot listing as context. Reply normally.

**What the buyer does NOT get:**
- A separate `/dashboard/ice-slots/inquiries` tab (the inbox is the inbox)
- An "inquiries" data model (threads already model this)
- A new notifications system (the existing unread-count system handles it)

**What the seller does NOT get:**
- A separate "leads" tab to manage (the inbox is the inbox)
- A different way to respond (it's a normal thread)
- A way to see "this thread was about a slot listing" without context_profile_type being set (the slot details show at the top of the thread)

### Dashboard (gated)

| Page | Path | Purpose |
|------|------|---------|
| My listings | `/dashboard/ice-slots` (new) | List of my slot listings (where I am the seller). |
| Create listing | `/dashboard/ice-slots/new` | Form to create a slot listing. Gated by tier + approved claim. |
| Inbox | `/dashboard/messages` (existing) | Already exists. Slot inquiries show up here. |

### Gating logic (unchanged from earlier draft)

```typescript
// Pseudo-code
const user = await getUser(userId);
const profile = await getProfile(userId);
const claim = await getApprovedClaim(userId, sellerEntityId);

if (!claim) return 403; // not authorized for this rink/team
if (profile.tier === 'free' || profile.tier === 'supporter') {
  // Free can list 1 slot, max 4 weeks ahead, no featured
  // (Same as the "1 free claim" pattern for general listings)
}
if (profile.tier === 'verified') {
  // Verified can list up to 5 slots, recurring allowed, no featured
}
if (profile.tier === 'pro') {
  // Pro can list unlimited, recurring, featured
}
```

**Reuse the existing tier patterns** from `src/lib/listingTier.ts` and the claims authorization. Don't invent a new gating system.

**The contact-side gating is already done** by `/api/threads` line 131. We just create the thread with `context_profile_type='ice_slot'`. No new code needed on the contact side.

### What this revision means for the "Contact the rink" / "Contact the team" pattern in the rest of the directory

The existing rink detail page and team detail page likely have a "Contact" or "Claim" button. Today, that probably opens a generic claim/inquiry form. In v1, we should refactor those to also use the messaging system (with `context_profile_type='rink'` or `'team'`). This unifies the contact pattern across the site.

**That refactor is in v1's scope** because it's the same code path. Without it, we have two different "contact" systems in the same product, which is confusing.

---

## Monetization in V1 (revised 2026-06-17)

**Four revenue lines, all $0 in new vendors:**

1. **Pro tier upsell (existing, sharper with messaging):** Pro sellers receive inquiries directly in their inbox. The CTA on the slot detail page for non-Pro sellers is "Upgrade to Pro to receive inquiries." This makes Pro a real revenue connection, not an abstract listing limit.
2. **Verified tier upsell (existing, sharper with messaging):** Verified members can message sellers. Free/Supporter users get a "Upgrade to Verified to message this seller" modal. This is a direct, immediate ask at the moment of intent.
3. **Featured placement (new):** Rinks pay $5-10/day to have their slot listings appear at the top of `/directory/ice-slots` for their city + activity type. 100% margin (just Stripe processing fee).
4. **Pro/Verified for buyers (existing, sharper):** Coaches and team managers who want to use the messaging flow to find ice also need to be Verified+. Verified+ is the only way to message anyone (not just slot sellers — the same Verified+ gate applies to all messages in the system).

**What v1 does NOT include:**
- Transaction fees (no money flows through us)
- Subscriptions for sellers (use the existing Pro tier)
- Listing fees (creating a listing is free; featured boost is paid)

**Why the messaging-first design is the bigger revenue story:**

The Pro/Verified upgrade prompts surface at the moment of intent. A user who came to the site to find ice for their team is the perfect person to upsell into Verified ($59.99/yr) — they were going to message a seller anyway, and the message modal is a clean conversion point. The "you need to upgrade to send" pattern is used by every marketplace (LinkedIn, Airbnb, etc.) and converts well.

**Honest revenue projection (treat as direction, not forecast):**
- If 5% of slot-detail page visitors hit the upgrade modal and 2% convert to Verified = meaningful Verified tier growth
- If 5% of Pro rinks (assume 50 Pro rinks in year 1) buy featured placement at $5/day for 30 days = $750/mo ARR
- If 20% of Pro rinks do this = $3,000/mo ARR
- Realistic year-1 featured revenue: $500-2,000/mo depending on adoption
- **Plus Pro/Verified tier conversions** from messaging-driven upgrades. This is the bigger revenue line.

**The point:** v1 with messaging-first is more valuable to the business than v1 with off-platform contact, because every message is a potential conversion event, and the conversion event is right where the user is already engaged.

---

## What is explicitly out of scope for V1

- **No payments between buyers and sellers.** Buyers contact sellers. Deal happens off-platform.
- **No contracts.** A "contract" is a recurring listing (is_recurring=true). No signing flow.
- **No Stripe Connect.** Rinks use their own bank accounts. RinkStop is not a money transmitter in v1.
- **No escrow.** Same reason.
- **No dispute resolution.** If a deal goes bad, it's between buyer and seller.
- **No multi-currency.** USD only. Add CAD/EUR in v1.1 if needed.
- **No team-side user accounts.** A user claims a team, then can list slots "as" that team. The team itself doesn't have a Clerk account.
- **No mobile app.** Web only. The existing site is mobile-responsive.

---

## Build plan (1-2 weeks, 30-40 hours)

| Day | Work | Hours |
|-----|------|-------|
| 1 | Schema migration + RLS + Supabase verification. Audit existing listing + claim + threads + connections code for reuse points. | 4 |
| 2 | Build the 2 new API routes: `POST /api/ice-slots`, `GET /api/ice-slots`. Wire to claims system for authorization. | 6 |
| 3 | Build the create-listing form in dashboard. Reuse the `/dashboard/listings` UX pattern. | 6 |
| 4 | Build the public browse + detail pages. Detail page has the **"Message seller"** button that opens a modal and creates a thread on submit. | 6 |
| 5 | Build the message-modal flow: thread creation with `context_profile_type='ice_slot'`, connection-request flow, tier upgrade modal for Free/Supporter users. | 6 |
| 6 | Featured placement: Stripe Checkout integration + boost display in browse. | 4 |
| 7 | Analytics events + smoke testing + Vercel deploy. | 4 |
| **Total** | | **~36 hours** |

**This is smaller than the previous plan** because the inquiry-form code is replaced by an integration with the existing threads API. We trade "build a new form" for "wire a button to an existing API."

---

## Success metrics (V1)

**60-day measurement window after launch:**

| Metric | Target | Why |
|--------|--------|-----|
| Pro rinks in top 10 US youth-hockey markets with ≥1 active slot listing | 30% (5 of ~17 markets × 1 Pro rink each = 15-20 rinks) | Validates rinks will use the feature. |
| Slot listings created (total) | 50+ | Validates supply side. |
| Message threads initiated on slot listings (total) | 10+ | Validates demand side (replaces "inquiries submitted" since the inquiry IS the message). |
| Tier upgrades attributed to the upgrade modal (total) | 5+ | Validates the messaging-first monetization story. |
| Featured placements purchased (total) | 3+ | Validates the featured revenue line. |
| Conversion rate: thread initiated → off-platform booking (we can't measure this, but we can survey Pro users) | "Most Pro users say inquiries converted" | Honest validation. |

**If we miss all 5 targets:** Pause. The market signal is "rink owners don't want this." Pivot to a different feature.

**If we hit 1-2 of 5:** Investigate. Either the feature is right but distribution is wrong, or the feature is right for some user but we built for the wrong one.

**If we hit 3-5 of 5:** v2 makes sense. Start tax/legal review for v2 in parallel.

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Rinks don't list. The friction of going to RinkStop to post a slot is higher than emailing the local hockey group. | Medium | Make the form 5 fields. Mirror the patterns coaches already use. Survey Pro users in week 2. |
| Teams don't list. We don't have a clear path to reach team managers. | High | v1 doesn't market to teams. Focus on rinks first. |
| Featured boost doesn't sell. Rinks think $5/day is too much or don't see the value. | Medium | Start at $2/day for the first 30 days as a promo. Adjust based on data. |
| Tax/legal issue surfaces even though no money flows. | Low | We are not a money transmitter. Inquiries are contact info only. We don't store payment data. **Still: get a tax person to review the v1 terms of service before launch.** |
| Ice Exchange ships a competing feature while we're building. | Medium | Ship fast. Our moat is the directory + team data, which they don't have. |
| Scope creep. We add "let buyers pay through RinkStop" before validating v1. | High | This spec explicitly says no. v2 is a separate build with a separate spec. |

---

## Open questions for Arnel

1. **Featured placement price.** $5/day? $10/day? $2/day for the first 30 days as a promo? (My lean: $5/day with $2/day intro pricing for the first 30 days.)
2. **Free tier limit.** Free users can list 1 slot (mirroring the "1 free claim" pattern). Or no free listings at all? (My lean: 1 free slot, max 4 weeks ahead, no featured. Drives Pro upsell.)
3. **Activity type scope.** "Practice / game / training" — should "game" be more specific (regular season / playoff / tournament / scrimmage)? (My lean: keep it simple for v1. Add specificity in v1.1 if usage data shows demand.)
4. **Geographic scope.** v1 is global (we already cover US/CA/Europe). Should we soft-launch in 1-2 markets first, or global from day 1? (My lean: global, since the browse page already filters by city, and rinks self-select.)
5. **Team vs rink priority for marketing.** When v1 ships, who do we email first? (My lean: rinks. We have 1,918 rinks and rink claim data. Teams are a v1.1 conversation.)
6. **Should I do the tax/legal review now or wait until v2?** (My lean: do it now. A 1-hour consult gives us confidence that v1's "no money through us" framing is legally clean. $300-500 well spent.)

---

## What I'd ship this week if you say "go"

If you approve this spec, here's the order I'd work in:

1. **Today:** Schema + RLS (2-3 hours)
2. **Day 1-2:** API routes (8 hours)
3. **Day 3:** Create-listing form in dashboard (6 hours)
4. **Day 4:** Public browse + detail pages (6 hours)
5. **Day 5:** Inquiries view + smoke test (4 hours)
6. **Day 6:** Featured placement + Stripe Checkout (6 hours)
7. **Day 7:** Analytics + deploy (4 hours)

**I'd have V1 live in 7 working days** if you say go now. The first version is a listings board, not a marketplace, but it gives us the data and the user behavior to know whether v2 makes sense.

---

## What this spec does NOT do (and why that's a feature)

This spec deliberately stops at "listings board with featured boost." It does not include:
- Payments
- Contracts
- Stripe Connect
- Multi-currency
- Mobile app
- Tournament management
- Referee booking
- Pickup games

**Why:** v1 is a test. We don't know if rinks will list. We don't know if buyers will contact. We don't know if featured placements will sell. Building a full marketplace with payments before we have signal is a 6-month project that may not be the right product.

**The right move is:** Ship v1, measure for 60-90 days, and let the data tell us what v2 should be. If v1 shows the marketplace has legs, we know we should invest in payments + contracts. If it doesn't, we've spent 30-40 hours learning that, not 6 months.

---

**Status:** Awaiting Arnel's review. Open questions above. Will not start building until you say go.
