# Maya Business Account Setup — Step by Step

**For:** Arnel (sole proprietor, DTI-registered)
**Goal:** Activate RinkStop as a Maya Business merchant with Payment Facilitator (PayFac) access for split payments
**Estimated time:** 3-7 business days (slightly longer than PayMongo due to PayFac contract)
**Source:** enterprise.maya.ph/payment-gateway, developers.maya.ph, wise.com/ph/blog/maya-business-account (2025-10-29)

## When to pick this over PayMongo

- You already have a Maya Business account (e.g. for Poi Restaurant or Arnel's Farm)
- You want to consolidate all PH payments under one provider
- You want funds in Maya Bank earning interest while waiting
- You only need GCash/Maya/QR Ph/cards (no GrabPay, no BNPL, no ShopeePay)
- You want a slightly lower GCash rate (2.0% vs PayMongo's 2.23%) and Maya-wallet rate (1.5% vs 1.79%)

**If those don't apply, use PayMongo instead.** See `docs/payments-ph-providers.md`.

## Before you start (gather these)

Same as PayMongo:
1. **DTI Certificate of Registration** (sole prop)
2. **BIR Form 2303** (Authority to Print) + Form 1901
3. **Bank account** in registered business name (Maya Bank works, or external)
4. **Valid gov ID** (passport, driver's license, UMID)
5. **Sample Official Receipt (OR) booklet**
6. **Selfie holding gov ID** for KYC

Additional for Maya PayFac:
7. **Latest Audited Financial Statements** — for sole prop with no recent AFS, a **bank certificate** showing ₱50,000+ balance is accepted
8. **Notarized Secretary's Certificate** — only if registering as Partnership/Corporation, not needed for sole prop
9. **General Information Sheet (GIS)** — only for Partnership/Corporation

## Sign-up steps

### Step 1: Apply for PayMaya Business Manager
- Go to https://pbm.paymaya.com (PayMaya Business Manager)
- Or use https://enterprise.maya.ph/payment-gateway and click "Apply Now"
- Email business.signup@maya.ph if self-onboarding is unclear
- You do NOT need a Maya-registered mobile number — any email works

### Step 2: Submit merchant application
You'll be asked for:
- Business name (matches DTI)
- Business address
- Business phone
- Email (use a business email, not your personal one)
- Business type: **Sole Proprietorship**
- Nature of business: "Online platform for hockey team management and payment facilitation"
- Website: rinkstop.com
- Estimated monthly volume: <₱100,000 initially

Upload documents:
- DTI Certificate of Registration
- BIR Form 2303
- Sample Official Receipt
- Bank certificate or statement
- Valid ID (front + back)
- Selfie with ID

### Step 3: Wait for specialist to call
- A **Maya relationship manager** will call you within 1-3 business days
- They confirm your details, walk through product activation
- They assign you a merchant ID and access to Maya Business Manager dashboard

### Step 4: Activate payment solutions
In the Maya Business Manager dashboard, request activation for:
- ✅ **Maya Checkout** (hosted page, like PayMongo Checkout)
- ✅ **Payment Links** (shareable URL per transaction)
- ✅ **Maya QR** (in-store QR — useful for rink-side cashless)
- ✅ **QR Ph** (universal QR, accepts any bank/wallet)
- ⏸️ Maya Vault (skip for now — card storage, not needed for one-time payments)
- ⏸️ Pay with Maya (Maya wallet — useful, but already covered by QR Ph)

Each solution may have separate KYC.

### Step 5: Request PayFac (Payment Facilitator) access
**Critical for split payments.** Email your Maya relationship manager:

> Subject: PayFac setup request for RinkStop (merchant ID: ___)
>
> Hi [RM name],
>
> We're RinkStop, a hockey team management platform. We need PayFac access for our marketplace:
>
> - Player pays ₱840 total (session ₱800 + RinkStop 5% platform fee ₱40)
> - Split at transaction: ₱800 → coach's connected account, ₱40 → RinkStop's connected account
> - Maya holds the money at split time; we never hold customer funds
>
> Can you process our PayFac application? Coaches will be sub-merchants under our PayFac, with RinkStop controlling the split.
>
> Estimated volume: ~50 transactions/month initially
> Sub-merchant count: 1-3 coaches (will scale)
>
> Attached: DTI, BIR, bank certificate, ID
>
> Thanks,
> Arnel

Maya reviews PayFac requests. Approval takes 3-7 business days. They may want additional docs.

### Step 6: Generate API keys
Maya Business Manager → **API Keys**
- **Public key:** `pk-...`
- **Secret key:** `sk-...`

Maya Manager 1.0 → same flow for sales-assisted accounts.

### Step 7: Set up webhook
Maya Business Manager → **Webhooks** → **Add Endpoint**
- **URL:** `https://rinkstop.com/api/webhooks/maya`
- **Events to send:** Payment success, payment failure, refund events
- Maya generates a **webhook secret** — copy it

## What to send me when done

1. `MAYA_PUBLIC_KEY` — `pk-xxx`
2. `MAYA_SECRET_KEY` — `sk-xxx`
3. `MAYA_WEBHOOK_SECRET` — Maya-generated secret
4. Confirmation PayFac is approved
5. RinkStop's PayFac merchant ID

## Once I have those, I build

(Same shape as PayMongo — provider-agnostic interface)
- Env vars wired into Vercel
- Player-facing `/pay/[token]` page
- "Pay now" button on payment records
- Webhook auto-confirmation
- Refund flow
- Reminder cron

## FAQ

**Q: Can I use one Maya account for RinkStop + Poi + Arnel's Farm?**
A: Yes, with PayFac. RinkStop is the parent, each business is a sub-merchant with its own settlement account.

**Q: PayFac vs Payment Links only — what's the difference?**
A: Payment Links only: Maya collects full amount, you (RinkStop) must manually transfer each coach's share. You hold the money briefly → OPS registration may apply.
PayFac: Maya collects full amount, splits at transaction time, sends to each connected account. You never hold money. No OPS needed.

**Q: What if my application gets rejected?**
A: Common reasons: incomplete DTI registration, bank account not in business name, business description too vague. Fix and resubmit. Maya's RM will tell you exactly what's missing.

**Q: Can I use Maya Bank to receive settlements?**
A: Yes, and it earns interest (4-5% p.a. on certain accounts). Or settle to any PH bank via InstaPay/PESONet.

**Q: How long does settlement take?**
A: T+1 banking day for most methods. Card settlements: T+1 to T+3.

**Q: What's the minimum to start?**
A: Maya Business Manager account + Maya Checkout + QR Ph activated. PayFac can come in parallel. Players can pay with e-wallet on day 1, cards when activated.

---

**See also:** `docs/payments-ph-providers.md` for the comparison with PayMongo.
