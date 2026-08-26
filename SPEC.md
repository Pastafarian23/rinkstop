# RinkStop Booking System — Unified Design
**Date:** 2026-08-25
**Purpose:** Design the complete unified booking system for ice rentals + referee/scorekeeper scheduling

---

## Core Analogy: Two-Sided Marketplace with Commitment

**Referee scheduling (the familiar pattern):**
- League posts game → assigns referee → referee confirms → game is scheduled
- Referee works game → league pays referee → done
- Dispute: referee no-shows → league escalates to federation

**Ice rental (same pattern):**
- Team requests ice → rink approves + sets price → team pays → booking confirmed
- Rink delivers ice → payment captured → done
- Dispute: rink cancels → RinkStop mediates

**The key insight from Arnel:** The approval IS the commitment. Once a rink approves a booking, they own it. The payment window exists only to handle timing — not as a financial hold mechanism.

---

## Unified BookingRequest Model

Both ice rentals and referee scheduling use the same state machine:

```
REQUESTED → APPROVED → PAID → CONFIRMED → COMPLETED
                ↓
           DECLINED / CANCELLED
                ↓
           EXPIRED (request timeout)
```

### For Ice Rentals (booking_requests table)

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| rink_id | fk | The rink being booked |
| listing_id | fk | ice_listings.id — the specific slot |
| requestor_id | fk | users.id — who is booking |
| status | enum | requested/approved/declined/paid/confirmed/completed/cancelled/expired |
| requested_price | int | What the customer wants to pay (null initially) |
| quoted_price | int | What the rink owner quoted (set on approval) |
| payment_status | enum | pending/paid/refunded/disputed |
| payment_intent_id | text | Stripe PaymentIntent ID |
| payment_session_url | text | Stripe Checkout URL |
| payment_expires_at | timestamptz | Window for customer to pay after approval |
| starts_at | timestamptz | When the ice slot begins |
| ends_at | timestamptz | When the ice slot ends |
| notes | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### For Referee/Scorekeeper Scheduling (suggestion: reuse booking_requests or new table)

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| game_id | fk | rink_events.id — the game being officiated |
| official_id | fk | rink_employees.id — referee/scorekeeper |
| requestor_id | fk | users.id — team/league making request |
| league_id | fk | leagues.id — the organizing league |
| status | enum | same as above |
| fee | int | officiating fee in cents |
| payment_status | enum | pending/paid/refunded/disputed |
| payment_intent_id | text | |
| confirmed_at | timestamptz | When official confirmed |
| game_starts_at | timestamptz | |
| created_at | timestamptz | |

---

## Payment Flow — Unified

### Step 1: Rink approves + sets price
```
PATCH /api/rink-connections/booking-requests/[id]
{ status: "approved", quoted_price: 15000 }

→ Creates Stripe Checkout Session:
   - line_items: [{ price: $150, product_data: { name: "Ice rental at [rink]" } }]
   - payment_intent_data.application_fee_amount: $7.50 (5%)
   - payment_intent_data.transfer_data.destination: rink.stripe_account_id
   - mode: "payment"
   - success_url: /dashboard/rink-connections/bookings/[id]?paid=1
   - cancel_url: /dashboard/rink-connections/bookings/[id]?cancelled=1
   - expires_at: now + 48 hours (or sooner for same-day)

→ booking_requests.status = "approved"
→ booking_requests.quoted_price = 15000
→ booking_requests.payment_session_url = <stripe_checkout_url>
→ booking_requests.payment_expires_at = now + 48h
→ rink notified via thread message
```

### Step 2: Customer pays via Stripe Checkout
```
Customer clicks → Stripe Checkout → pays $150
→ Stripe PaymentIntent created, payment captured immediately
→ Stripe transfers:
   - $150 - $4.65 (Stripe fees) - $7.50 (RinkStop fee) = $137.85 → rink's Stripe account
   - $7.50 → RinkStop platform account (automatic via application_fee_amount)
→ Stripe sends checkout.session.completed webhook
```

### Step 3: Webhook confirms payment
```
POST /api/rink-connections/stripe/webhook
→ booking_requests.status = "paid"
→ booking_requests.payment_status = "paid"
→ ice_listings.status = "confirmed" (no longer available)
→ rink notified: "Booking confirmed! [customer] paid $150"
→ customer notified: "Your ice at [rink] is booked for [date/time]"
→ rink_thread updated with payment confirmation
```

### Step 4: Ice delivered / Game played
```
→ No automatic payment release needed — payment was already captured at step 2
→ After event ends: status → "completed"
→ Rink owner sees +$137.85 in Stripe dashboard (within 2 days)
→ RinkStop sees +$7.50 in platform dashboard
```

---

## Payment Hold Rules (Revised)

**No separate "hold" release mechanism needed.**

Payment is captured IMMEDIATELY when the customer completes Stripe Checkout. The rink owner receives their payout within 2 business days (standard Stripe payout). The "window" concept is just the deadline for the customer to pay after rink approval.

**Payment expiry rules:**

| Time until event | Payment window after rink approval |
|---|---|
| < 4 hours | 2 hours |
| 4–24 hours | 4 hours |
| 24–72 hours | 24 hours |
| > 72 hours | 48 hours |

**If customer doesn't pay in time:**
- `booking_requests.status` → `expired`
- `ice_listings` slot released (available for rebooking)
- Rink notified: "Customer didn't complete payment. Slot is now available."
- Customer notified: "Payment window expired. Your request was not completed."

**Edge case — rink approves then cancels:**
- Rink admin manually sets `status = "cancelled"` from dashboard
- RinkStop support triggers full refund via Stripe dashboard
- Rink owner's account flagged for excessive cancellations
- Dispute logged in `rink_threads`

---

## Referee/Scorekeeper Scheduling Details

**Flow:**
1. League/team posts game → assigns desired officials (optional) or leaves open
2. Open requests visible on league dashboard → available officials can claim
3. Official confirms → `status = approved`, fee locked in
4. League pays via Stripe (same checkout flow) → `status = paid`
5. Official works game → `status = completed`
6. Payment captured at step 4 (not held until game completion — league committed by approving)

**Who pays?** League/Tournament (not individual team) — they control the budget and game scheduling.

**Fee structure:** Set by official at profile level (`rink_employees.hourly_rate`) or by league at game level. League sees fee before approving.

**Federation layer:** Federation admin can mandate fee floors/ceilings for official games. Can view all scheduled games in their jurisdiction.

---

## Dashboard Pages Needed

### Rink Owner
- `/dashboard/manage/rink/[id]/bookings` — All incoming/outgoing requests (ice + officials)
- `/dashboard/manage/rink/[id]/payments` — Stripe earnings, connect/review dashboard
- `/dashboard/manage/rink/[id]/schedule` — Calendar of confirmed bookings

### Team/League
- `/dashboard/bookings` — My bookings (as customer of rinks)
- `/dashboard/games/[id]/schedule-officials` — Assign referees/scorekeepers to a game
- `/dashboard/games/[id]/payments` — Pay officials

### Official (Employee type: referee/scorekeeper)
- `/dashboard/official/schedule` — Confirmed game assignments
- `/dashboard/official/earnings` — Payment history

### Federation
- `/dashboard/federation/officials` — All registered officials
- `/dashboard/federation/games` — Games in jurisdiction
- `/dashboard/federation/disputes` — Official disputes

---

## Payment Architecture

**Single payment capture point:** Stripe Checkout — payment is captured immediately upon customer completion, before the event.

**RinkStop fee:** 5% of `quoted_price`, captured via `application_fee_amount` at time of PaymentIntent creation.

**Who receives the payout:**
- Ice rental: rink owner (destination account)
- Officiating fee: official/employee (destination account)

**Stripe dashboard links:**
- Rink owner: link to `https://dashboard.stripe.com/connect/accounts/{stripe_account_id}`
- RinkStop admin: main platform dashboard

---

## Implementation Order

### Phase 2B (Stripe Connect + Ice Rentals) — BUILDING NOW
1. [x] `src/lib/stripe-connect.ts` — Stripe lib
2. [x] `POST /api/rink-connections/stripe/onboard` — Create Express account
3. [x] `GET /api/rink-connections/stripe/account-status` — Check onboarding
4. [x] `POST /api/rink-connections/stripe/checkout-session` — Create checkout
5. [ ] `POST /api/rink-connections/stripe/webhook` — Handle events
6. [ ] `/dashboard/manage/rink/[id]/payments` — Rink payment dashboard
7. [ ] Wire checkout-session into booking-request approval
8. [ ] Set `STRIPE_WEBHOOK_SECRET` on Vercel

### Phase 2C (Referee/Schedule Official) — NEXT
9. Add `game_id`, `official_id`, `fee` to booking_requests OR new `officiating_requests` table
10. `POST /api/officials/[id]/claim-game` — Official claims open game
11. League pays officials via same Stripe checkout flow
12. Official schedule dashboard page
13. Federation dashboard for officiating oversight

### Phase 2D (Cancellations + Disputes)
14. Cancellation flow with refund initiation
15. Dispute table + resolution workflow
16. RinkStop support mediation UI

---

## Database Changes Needed

### New columns on `booking_requests`:
```sql
ALTER TABLE booking_requests ADD COLUMN quoted_price    INTEGER,  -- cents, set on approval
ADD COLUMN payment_intent_id    TEXT,
ADD COLUMN payment_session_url  TEXT,
ADD COLUMN payment_expires_at   TIMESTAMPTZ,
ADD COLUMN payment_status      TEXT DEFAULT 'pending',  -- pending/paid/refunded/disputed
ADD COLUMN stripe_session_id   TEXT;
```

### New table for officiating:
```sql
CREATE TABLE officiating_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID NOT NULL REFERENCES rink_events(id),
  official_id   UUID NOT NULL REFERENCES rink_employees(id),
  requestor_id  UUID NOT NULL REFERENCES users(id),
  league_id     UUID REFERENCES leagues(id),
  status        TEXT NOT NULL DEFAULT 'requested',  -- requested/approved/declined/paid/completed/cancelled
  fee           INTEGER NOT NULL,  -- cents
  payment_status TEXT DEFAULT 'pending',
  payment_intent_id TEXT,
  payment_expires_at TIMESTAMPTZ,
  confirmed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```
