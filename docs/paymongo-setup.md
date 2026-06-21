# PayMongo Account Setup — Step by Step

**For:** Arnel (sole proprietor, DTI-registered)
**Goal:** Activate RinkStop as a PayMongo merchant with Payment Splitting access
**Estimated time:** 1-3 business days for approval
**Source:** paymongo.com/pricing, paymongo.com/docs, enterprise.maya.ph/payment-gateway (cross-ref)

## Before you start (gather these)

1. **DTI Certificate of Registration** — sole prop under your name or a business name. Get this from your nearest DTI office or online via bnrs.dti.gov.ph. Cost: ₱200-2,000 depending on scope. Takes 1-7 days.
2. **BIR Form 2303** — Authority to Print. Register at your RDO. Cost: free. Takes 30 min if you go in person.
3. **BIR Form 1901** (if you don't have one) — registration as sole proprietor for income tax.
4. **Bank account** in the **registered business name** — BPI, UnionBank, BDO, Metrobank, Landbank all work. If account is under your personal name, PayMongo may reject it. Open a business savings account: ₱2,500 minimum at most banks.
5. **Valid government-issued ID** — passport, driver's license, UMID, PhilSys ID. Photo + signature.
6. **Sample Official Receipt (OR)** — even one blank receipt book from National Book Store or a BIR-authorized printer. PayMongo requires this for compliance.
7. **Selfie holding your gov ID** — for KYC.

## Sign-up steps

### Step 1: Create PayMongo account
1. Go to https://www.paymongo.com/business
2. Click "Get Started" / "Sign Up"
3. Use a business email (NOT arnel@rinkstop.com — use arnel@ personal or info@ business)
4. Verify email
5. Set password (12+ chars, mixed case + numbers + symbol)

### Step 2: Choose your business type
- **Sole Proprietorship** (recommended if you have DTI certificate under your name)
- **Corporation** (only if you have SEC registration)

### Step 3: Complete business profile
PayMongo will ask for:
- **Business name** (must match DTI certificate exactly)
- **Business address** (must match DTI)
- **Business phone** (mobile, will receive OTP)
- **Nature of business:** "Online platform for hockey team management" or "Software/SaaS" — pick whatever fits
- **Website:** rinkstop.com
- **Estimated monthly volume:** Start with "Less than ₱100,000" — you can update later
- **Product description:** "Hockey team management platform that processes payment events (Sunday sessions, tournaments) for team coaches and players. Coaches collect payments from players via PayMongo Checkout, RinkStop charges a 5% platform fee."

### Step 4: KYC verification
- Upload gov ID (front + back)
- Take a selfie holding the ID
- Provide personal details: full name, address, DOB, nationality, source of funds

### Step 5: Upload business documents
- DTI Certificate of Registration
- BIR Form 2303
- Sample Official Receipt (one blank OR booklet)
- Bank account proof (bank statement, passbook photo, or certificate of deposit)
- Signatory ID (your gov ID, may be same as above)

### Step 6: Wait for review
- PayMongo reviews in **1-3 business days** for sole prop
- You get an email when approved
- Some methods (cards, GrabPay) need additional activation

### Step 7: Activate payment methods
In dashboard → **Settings → Payment Methods**, toggle ON:
- ✅ GCash
- ✅ Maya
- ✅ QR Ph (Online)
- ✅ Cards (Visa/Mastercard/JCB)
- ⏸️ GrabPay, ShopeePay, BillEase (optional, can activate later)
- ⏸️ Direct Online Banking (optional, already covered by QR Ph/InstaPay)

Each method may need:
- **Cards:** additional form (3D Secure, installment settings, international card acceptance)
- **QR Ph:** verify your bank account

### Step 8: Request Payment Splitting access
This is **NOT** self-serve. Email PayMongo Platforms team:
- **To:** platforms@paymongo.com
- **Subject:** "Payment Splitting access for RinkStop (merchant ID: ___)"

> Hi PayMongo Platforms team,
>
> We're RinkStop, a hockey team management platform. We need Payment Splitting for our marketplace model:
> - Player pays ₱840 (session ₱800 + RinkStop 5% platform fee ₱40)
> - Split at transaction time: ₱800 → coach's connected account, ₱40 → RinkStop's connected account
> - PayMongo holds the money at split time; we never hold customer funds
>
> Can you share the contract/pricing for Payment Splitting + Merchant Onboarding for sub-coaches?
>
> Merchant ID: [your merchant ID from Settings]
> Estimated volume: ~50 transactions/month initially
> Settlement accounts: RinkStop's bank, individual coach's Maya/GCash/bank accounts
>
> Thanks,
> Arnel Larracas

PayMongo will reply with contract docs. Review, sign, return. Takes 3-7 days.

### Step 9: Get your API keys
Dashboard → **Developers → API Keys**
- **Live secret key:** `sk_live_...` (NEVER expose to client-side JS)
- **Live public key:** `pk_live_...` (safe to expose, used in client-side redirects)

### Step 10: Set up webhook
Dashboard → **Developers → Webhooks** → **Add Endpoint**
- **URL:** `https://rinkstop.com/api/webhooks/paymongo`
- **Events to send:**
  - `payment.paid`
  - `payment.failed`
  - `checkout_session.payment.paid` (if using hosted checkout)
- PayMongo generates a **webhook secret key** (`whsk_...`) — copy it

## What to send me when done

1. `PAYMONGO_SECRET_KEY` (live) — `sk_live_xxx`
2. `PAYMONGO_PUBLIC_KEY` (live) — `pk_live_xxx`
3. `PAYMONGO_WEBHOOK_SECRET` — `whsk_xxx`
4. Confirmation that Payment Splitting contract is signed
5. RinkStop's connected account ID (PayMongo gives this after contract)

## Once I have those, I build

1. Env vars wired into Vercel
2. Player-facing `/pay/[token]` page (shows breakdown: ₱800 session + ₱40 platform fee = ₱840 total)
3. "Pay now" button on each payment record (coaches can also click "Generate pay link" to share via Messenger)
4. Webhook auto-confirmation: player pays → PayMongo hits our endpoint → record flips to `paid` → coach gets email
5. Refund flow: coach can refund from detail page
6. Reminder cron: 3 days after due, 7 days, 14 days — auto-email unpaid players

## FAQ

**Q: Can I use the same PayMongo account for SativaExchange, TopShelfToker, etc.?**
A: Yes. Use the same merchant account, configure split recipients per checkout. One contract.

**Q: Do I need to register each of my other PH businesses (Poi, Arnel's Farm, Casa Azul) as sub-merchants?**
A: Only if they collect payments through RinkStop. If they collect through their own flow (e.g. Poi's own POS), they need their own PayMongo account or sub-merchant relationship.

**Q: What if I get rejected?**
A: PayMongo rarely rejects sole props. Common rejection reasons: DTI name doesn't match bank account, business description is too vague, gov ID unreadable. Fix and resubmit.

**Q: How long does settlement take?**
A: T+1 business day for most methods. QR Ph is T+1 as well. Cards: T+1 to T+3 depending on issuing bank.

**Q: What's the minimum I need to start?**
A: PayMongo account + GCash + Maya activated + Payment Splitting contract. Cards and others can come later. Player can pay with e-wallet on day 1.

---

**See also:** `docs/payments-ph-providers.md` for the comparison with Maya Business.
