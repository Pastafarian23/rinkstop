# Stripe Flow Audit (2026-06-16)

Audit of the full RinkStop Stripe integration: upgrade flow, webhook handlers,
dunning, cancellation, conversion tracking.

## TL;DR

The Stripe flow is **functionally correct** but had two latent bugs that could
cause silent tier loss during a dunning period. Both fixed in this audit:

1. **`customer.subscription.updated` would downgrade the tier on `past_due`** —
   a single failed payment would wipe the user's Pro tier. Now kept during
   dunning; only nulled on true `canceled` / `unpaid`.
2. **`invoice.payment_failed` was inconsistent with the above** — only updated
   status. Now matches the same "keep tier, change status" semantics.

Plus:
- Added `invoice.paid` handler as a backstop to refresh `tier_expires_at` on renewals
- Wrapped the `subscriptions.retrieve` call in `checkout.session.completed` in a try/catch
  so a transient Stripe API failure triggers a retry instead of 500-ing
- Added `checkout_started` conversion event log in `/api/tier/upgrade`

---

## What Was Audited

| File | What it does | Status |
|------|--------------|--------|
| `src/app/api/tier/upgrade/route.ts` | Creates Stripe Checkout session | ✅ Has downgrade guard, idempotency, promo codes, conversion log |
| `src/app/api/webhooks/stripe/route.ts` | Handles Stripe webhook events | ✅ Signature verified, handles 6 event types, idempotent writes |
| `src/app/api/billing/portal/route.ts` | Opens Stripe Customer Portal | ✅ No self-serve cancel/downgrade (founder-friendly) |
| `src/app/api/billing/subscription/route.ts` | Reads subscription + invoice history | ✅ Returns live data from Stripe |
| `src/app/dashboard/subscription/ManageSubscriptionClient.tsx` | "Manage in Stripe" button | ✅ Links to portal, no cancel button |
| `src/app/dashboard/welcome/page.tsx` | Post-purchase welcome page | ✅ Race-tolerant, tier-specific copy |

## Webhook Events Handled

| Event | Handler | Notes |
|-------|---------|-------|
| `checkout.session.completed` | ✅ | Sets tier, awards founding member if applicable, idempotent on retries |
| `customer.subscription.updated` | ✅ | **FIXED**: keep tier during dunning |
| `customer.subscription.deleted` | ✅ | Sets tier=null, subscription_status=cancelled |
| `invoice.payment_failed` | ✅ | **FIXED**: comment clarifies tier is not downgraded here |
| `invoice.paid` | ✅ **NEW** | Refreshes tier_expires_at on renewals |
| `customer.subscription.created` | ❌ | Not handled directly — `checkout.session.completed` covers this in practice |

## Idempotency

**Webhook idempotency is implicit, not explicit.** Stripe sends the same event
ID on retries, and we use `event.id` only for logging. The writes are
idempotent because we use `eq('user_id', userId)` to update — repeated calls
just overwrite with the same value.

**No replay defense.** Stripe signature verification prevents tampering but
not replays within the 5-minute webhook tolerance window. Acceptable risk
because all writes are idempotent (a replay would just re-write the same
state).

## Conversion Tracking

**Added in this audit:**

```log
[conversion] checkout_started user_id={clerk_user_id} tier={tier} customer_id={stripe_customer_id} session_id={cs_id}
```

**Recommended next steps (not done):**
- Add `checkout_completed` event in the webhook (correlates with `checkout_started` for funnel)
- Add `pricing_page_viewed` event on the /pricing page
- Forward to PostHog / Plausible / Vercel Analytics
- Track which traffic source drove the conversion (UTM params on the upgrade page)

## Dunning / Failed Payment Flow

**The fix:**

1. Card fails → Stripe sends `invoice.payment_failed`
2. Webhook sets `subscription_status='past_due'`, **tier is preserved**
3. User sees a banner on /dashboard/subscription saying their payment failed
4. Stripe retries the card 8 times over 2 weeks (Smart Retries default — see [Stripe docs](https://docs.stripe.com/billing/revenue-recovery/smart-retries))
5. If all 8 retries fail → Stripe sends `customer.subscription.deleted`
6. Webhook sets `tier=null`, `subscription_status='cancelled'`

**Before this fix:** step 2 would have set `tier=null` immediately, wiping the
user's Pro tier after a single failed payment. Now the user keeps Pro for the
full 2-week dunning window (Stripe Smart Retries default).

**No email notification is sent on payment_failed** — that's a manual TODO
(we don't have a transactional email system wired up yet). The dashboard
banner is the only signal.

## Cancellation Flow

**No self-serve cancel.** To cancel, user emails support@rinkstop.com.

- Stripe Customer Portal is configured to disable cancel/switch-plan
- `ManageSubscriptionClient` has no cancel button (intentional)
- `tier/upgrade` route blocks self-serve downgrades (returns 403 with message
  pointing to support)

**Why:** Founder-friendly design. Friction on cancel so we can hear what we
could do better. This is documented in the route and client comments.

## Test Coverage

**E2E:** No automated test of the full Stripe flow. Manual test would be:

1. Use Stripe test card `4242 4242 4242 4242`
2. Click upgrade to Supporter
3. Complete checkout
4. Verify `customer.subscription.created` webhook fires
5. Verify `profile.tier` is now `supporter`
6. Verify `tier_expires_at` is set
7. Verify `is_founding_member` is true (if under cap of 500)

**Test plan saved at:** (TBD — not done in this audit)

## Known Gaps (Not Fixed)

1. **No `pricing_page_viewed` event** — would tell us how many users reach
   the pricing page vs how many actually click upgrade
2. **No A/B test framework** — can't measure if the new homepage pricing teaser
   converts better than the old direct-to-pricing-page flow
3. **No dunning email** — user has no idea their payment failed unless they
   visit the dashboard
4. **No pro-rated upgrade** — upgrading from Supporter to Pro charges full
   year, not pro-rated. This is a Stripe configuration issue, not a code one.
5. **No annual vs monthly toggle** — pricing is annual-only, no monthly option
6. **No "pause subscription"** — Stripe supports it, not implemented
7. **Refund handling** — manual via Stripe dashboard, no API integration
8. **Tax handling** — no tax collection configured (Stripe Tax not enabled)
9. **Stripe Customer Portal branding** — defaults to Stripe blue, not RinkStop colors

## Files Modified in This Audit

- `src/app/api/webhooks/stripe/route.ts` — fixed past_due tier downgrade, added
  invoice.paid handler, added try/catch around subscriptions.retrieve
- `src/app/api/tier/upgrade/route.ts` — added `checkout_started` conversion log
- `src/components/UpgradeNudgePopup.tsx` — NEW, post-login upgrade modal
- `src/app/layout.tsx` — mounted UpgradeNudgePopup in root layout

## Commit

- TBD (will be in the commit message when this audit lands)
