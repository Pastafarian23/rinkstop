# Philippine Payment Provider Comparison — for RinkStop

**Last updated:** 2026-06-20
**Sources verified:** paymongo.com/pricing, paymongo.com/docs, enterprise.maya.ph/payment-gateway, developers.maya.ph, wise.com/ph/blog/maya-business-account (2025-10-29), pinoynegosyo.net (2026-03-11)

## TL;DR — recommendation

**PayMongo**, unless you have a specific reason to go with Maya.

- PayMongo gives us GCash + Maya + cards + GrabPay + QR Ph + bank transfer in one integration
- PayMongo has a "Payment Splitting" product (usage-based pricing, custom) that fits our model: RinkStop 5% goes to RinkStop, coach's ₱800 goes to coach. PayMongo holds the money at split time so RinkStop doesn't need a money-transmitter license
- PayMongo's sandbox is fully open; you can build and test today before activating live methods
- PayMongo charges 0% on the first ₱0 of "Payments Splitting" — usage-based, custom contract

The main reason to pick Maya instead would be: **lower GCash/QR Ph rates**. But you'd lose cards, GrabPay, and the integrated split-payments product.

## Side-by-side fees (per ₱800 transaction, VAT-exclusive)

| Method | PayMongo | Maya Business | RinkStop net (PayMongo) | RinkStop net (Maya) |
|---|---|---|---|---|
| GCash | 2.23% = ₱17.84 | 2.0% = ₱16.00 | ₱40 - ₱17.84 = **₱22.16** | ₱40 - ₱16.00 = **₱24.00** |
| Maya wallet | 1.79% = ₱14.32 | 1.5% = ₱12.00 | ₱40 - ₱14.32 = **₱25.68** | ₱40 - ₱12.00 = **₱28.00** |
| QR Ph (online) | 1.34% = ₱10.72 | 1.6% = ₱12.80 | ₱40 - ₱10.72 = **₱29.28** | ₱40 - ₱12.80 = **₱27.20** |
| Visa/MC | 3.125% + ₱13.39 = ₱38.39 | 3.5% + ₱15 = ₱43.00 | ₱40 - ₱38.39 = **₱1.61** | ₱40 - ₱43.00 = **-₱3.00** ❌ |
| Online Bank (InstaPay) | 0.71% or ₱13.39 = ₱13.39 | ~1% = ₱8.00 | ₱40 - ₱13.39 = **₱26.61** | ₱40 - ₱8.00 = **₱32.00** |
| GrabPay | 1.96% = ₱15.68 | n/a | ₱40 - ₱15.68 = **₱24.32** | — |
| ShopeePay | 1.70% = ₱13.60 | 1.75-1.85% | ₱40 - ₱13.60 = **₱26.40** | ₱40 - ₱14.00 = **₱26.00** |

**At Cebu scale (40 txns × ₱40 RinkStop fee = ₱1,600 gross):**

| Method mix | PayMongo net | Maya net | Difference |
|---|---|---|---|
| 100% GCash | ₱887 | ₱960 | +₱73/mo for Maya |
| 100% Maya | ₱1,027 | ₱1,120 | +₱93/mo for Maya |
| 100% QR Ph | ₱1,171 | ₱1,088 | -₱83/mo for Maya |
| Realistic PH mix (60% QR Ph, 30% GCash, 10% cards)* | ₱1,066 | ₱1,022 | -₱44/mo for Maya |

*Realistic mix for a Cebu hockey team where most parents have GCash/Maya, some pay by card.

**Key insight:** RinkStop is rate-**insensitive** to within ±₱100/month at Cebu scale. The decision is driven by **features, not fees.**

## What each provider actually supports

### PayMongo

✅ **Has:**
- GCash, Maya, GrabPay, ShopeePay, QR Ph, cards (Visa/MC/JCB), direct online banking (BDO/UBP/BPI/Landbank/Metrobank), BillEase BNPL
- Hosted Checkout (you redirect player to PayMongo's page, they pick method, return)
- Payment Links (one URL per transaction)
- **Payment Splitting** (usage-based, custom contract — splits payment across multiple connected accounts at transaction time)
- Merchant Onboarding API (sub-merchant creation)
- `/v1/checkout_sessions` (creates Payment Intent immediately) + `/v2/checkout_sessions` (defers PI until method chosen, supports `pass_on_fees: true`)
- Webhook events: `payment.paid`, `payment.failed`, etc.
- Sandbox available immediately, no approval needed
- Docs API + SDK samples at docs.paymongo.com + developers.paymongo.com

⚠️ **Watch out:**
- Card rate 3.125% + ₱13.39 means RinkStop NETS almost nothing on card payments (₱1.61 per ₱800). For the 5% flat model to work on cards, we'd need to **absorb the negative** OR **disable card payments at checkout** OR **change fee model for card** (e.g. 6% if card, 5% otherwise)
- Payment Splitting is usage-based and "Custom" — requires contract negotiation. Not a self-serve feature.

### Maya Business

✅ **Has:**
- Maya wallet, Maya QR (in-store), QR Ph, cards, ShopeePay, WeChatPay
- Maya Checkout (hosted page, similar to PayMongo)
- Payment Links (share via chat)
- **Payment Facilitator (PayFac) setup** — process payments for sub-merchants under your account, send `pf.*` metadata to tie transactions
- Vault (card-on-file)
- Subscriptions (Maya Checkout recurring)
- Maya Bank is a real digital bank — funds can sit in Maya Business and earn interest

⚠️ **Watch out:**
- **No standalone "Payment Splitting" product** like PayMongo has. To route 5% to RinkStop and ₱800 to coach, you'd have to: (a) RinkStop collects full amount, then manually transfers ₱800 to coach (RinkStop holds money → needs OPS registration) OR (b) Coach collects full amount, then sends 5% to RinkStop (coach owes RinkStop, no platform enforcement) OR (c) Use PayFac where each coach is a sub-merchant under RinkStop's PayFac, with RinkStop controlling the split. **PayFac requires you to be a registered Payment Facilitator with BSP** — Maya calls this a "PayFac setup" request, not a default feature.
- No card-less checkout via e-wallet redirects that DON'T go to Maya. GCash support through Maya is **GCash-as-bank-transfer** (InstaPay), not native GCash redirect — slightly worse UX.
- Higher card rate (3.5% + ₱15) than PayMongo (3.125% + ₱13.39)
- Self-onboarding via Business Manager has fewer requirements than PayMongo Enterprise (PayFac), but you still need DTI + BIR Form 2303 + bank account + gov ID

## Legal/regulatory implications (PH)

| Question | PayMongo | Maya |
|---|---|---|
| Need to register with BSP as a money transmitter? | No — PayMongo is the regulated entity. You're a merchant. | Same — Maya is the regulated entity. |
| Need OPS (Operator of Payment System) registration? | No (under most volume thresholds). PayMongo is the OPS. | Same. |
| Need DTI/SEC + BIR registration? | Yes (sole prop needs DTI name + BIR Form 2303) | Yes (same) |
| Need bank account for settlement? | Yes (any PH bank, used to receive payouts) | Yes (Maya Bank is built-in, but external banks work too) |
| Hold customer money at any point? | No — PayMongo holds at split time | No — Maya holds at transaction time |
| When money lands in your account | Per PayMongo schedule (T+1 for PH) | T+1 next banking day |
| KYC requirements for split-pay? | Must be a PayMongo Platforms customer (custom contract) | Must apply for PayFac with Maya (relationship manager required) |

**Both options require:**
- DTI Certificate of Registration (sole prop) or SEC (corp)
- BIR Form 2303 (Authority to Print Receipts/Invoices) — yes, even as a tech platform collecting fees
- Bank account in the name of the registered business
- Valid government-issued ID

**RinkStop-specific:**
- We're NOT holding customer money → we don't need a money-transmitter license
- We're a "platform facilitating a coach's collection" — simpler regulatory profile
- Tax on the 5% we keep: gross income, subject to 12% VAT if revenue exceeds ₱3M/year (you won't hit this at Cebu scale)

## Why PayMongo over Maya for our case

1. **Native Payment Splitting** is a documented product. With Maya, we'd need to be a registered PayFac — more paperwork, more compliance.
2. **GCash support is native and has better UX** — players get redirected to their GCash app, not an InstaPay screen.
3. **Lower card rate (3.125% + ₱13.39 vs 3.5% + ₱15)** — at ₱800 per txn, ₱6.39 better margin.
4. **Sandbox is open** — I can build and test the entire flow today without waiting for an account.
5. **More payment methods** — BillEase BNPL, GrabPay, ShopeePay all work. Maya Business is more limited.
6. **More competitive at scale** — PayMongo's published rates drop as volume grows. Maya's rate card is "rate starts at" but the lower tiers require enterprise negotiation either way.

## Why you'd pick Maya anyway

1. **You already have a Maya Business account** (e.g. from Poi Restaurant or Arnel's Farm)
2. **You want funds to earn interest in Maya Bank** while sitting there
3. **You only need GCash/Maya/QR Ph** — no cards, no BNPL, no ShopeePay
4. **You want a single provider across all your PH businesses** (consolidated dashboard)
5. **Maya's 1.5% Maya-wallet rate** is meaningfully lower than PayMongo's 1.79%

## Decision tree for Arnel

```
Do you have an existing Maya Business account with PayFac access?
├── YES → Use Maya (lower ops overhead, consolidate)
└── NO
    ├── Do you need cards/BNPL/GrabPay/ShopeePay for RinkStop?
    │   ├── YES → Use PayMongo (only one with all of these)
    │   └── NO
    │       └── Are you OK with the Payment Splitting contract process?
    │           ├── YES → Use PayMongo (better GCash UX, lower card rate)
    │           └── NO  → Use Maya with PayFac (simpler per-method)
    └── (default) → PayMongo
```

## What I need from you to move forward

For **either** provider:
1. DTI Certificate of Registration (or SEC if you go corp) — get this first
2. BIR Form 2303 (Authority to Print)
3. Bank account in the registered business name

For **PayMongo specifically** (Option A — default):
- Sign up at paymongo.com/business (free, ~5 min)
- Activate payment methods in Settings → Payment Methods (one-by-one as you complete verification)
- Contact PayMongo Platforms team for Payment Splitting access
- Send me: `PAYMONGO_SECRET_KEY` (live), `PAYMONGO_PUBLIC_KEY` (live), `PAYMONGO_WEBHOOK_SECRET`

For **Maya Business specifically** (Option B — if you decide Maya):
- Apply at pbm.paymaya.com (Business Manager) OR via enterprise.maya.ph
- Submit docs (DTI, BIR, bank, ID, sample OR, etc.)
- Wait for relationship manager to call (1-3 days)
- Apply for PayFac access through your RM
- Send me: `MAYA_PUBLIC_KEY`, `MAYA_SECRET_KEY`, `MAYA_WEBHOOK_SECRET`

## What I'll build once you pick

Either way, the implementation shape is the same:
- `src/lib/payments/` (provider-agnostic interface)
- `src/lib/payments/paymongo.ts` or `src/lib/payments/maya.ts` (concrete)
- `POST /api/team/[slug]/payments/[id]/create-checkout-link` — generates a payment URL for a record
- `POST /api/webhooks/paymongo` or `POST /api/webhooks/maya` — receives paid event, flips record to `paid`
- `src/app/pay/[token]/page.tsx` — landing page for the player to see and pay

Scaffolding code today will be provider-agnostic (returns 503 until env vars are set).
