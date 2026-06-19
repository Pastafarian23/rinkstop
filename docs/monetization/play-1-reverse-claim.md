# Play 1 — Reverse-Claim Automation

## The idea

We have **1,858 active rinks** in the database, but most have no claimed operator. We can:

1. For every rink with a public contact email (or a website we can derive a contact email from), auto-generate a polished RinkStop profile page if it doesn't already exist
2. Send a personalized email: "We built you a page on RinkStop. Here's the link. Claim it to take control — first 100 claims get a free year of Supporter."
3. The claim path lands them on /pricing with a 100% off promo code, OR on a "claim now" page that converts the free year

This is **outreach I can run myself** because we're using public contact info from rinks we already have data on. No personal network needed.

## The data we need

For each rink, we need:
- Operator email (publicly available, from rink website or directory listing)
- Operator name (for personalization)
- The rink's current RinkStop URL (so the email links to the right page)

Currently in the DB:
- 1,858 rinks
- Email column: probably < 30% populated
- Website column: 52% populated (per the 03:45 CDT audit)

So we need to:
- For rinks with website: scrape contact page (or use Hunter.io / Clearbit for email lookup)
- For rinks without website: skip them, focus on rinks we can actually contact

## The flow

```
For each rink in DB:
  1. Check if rink.claimed_by IS NOT NULL → skip (already claimed)
  2. Check if rink already has a "claim_invite_sent_at" → skip (already invited)
  3. If rink.website exists:
     a. Try to extract operator email (scrape contact page, or use email lookup API)
     b. If no email found → skip, mark as "no_email_available"
  4. Compose personalized email:
     - To: [operator_email]
     - Subject: "[Rink Name] is on RinkStop — claim your page"
     - Body: Hi [name], we built a page for [rink name] on RinkStop, the global directory for hockey rinks, teams, and leagues. [City, state, country]. Your page shows up in [N] search results per week and is the only listing for [city] right now. Claim it to take control of hours, photos, and contact info. First 100 claims get a free year of Supporter. [CLAIM LINK]
  5. Send via Resend (or whatever email provider)
  6. Log send in rink_claim_invites table
  7. Track open/click in analytics
```

## Conversion math

Realistic industry rates for cold B2B outreach (hockey operators are a niche B2B audience):
- Send: 1,000 emails
- Open: 30-45% (300-450 opens)
- Click: 3-8% (30-80 clicks)
- Claim page view: 30-80
- Free-year claim: 30-60% conversion (typical for "free" offers)
- Net: 10-50 free Supporter claims

For paid conversions (no promo):
- After 100 free slots are taken, switch to "Claim for $19.99/yr (Supporter)"
- Click → claim: 30-60% (these are warmer)
- Paid claim: 10-50
- Revenue: $200-1,000 over 30 days

## What I need

- **Email provider**: Resend (preferred for API simplicity + deliverability). Free 100/day, $20/mo for 50K emails/mo.
- **Email lookup API**: Hunter.io (free 25/month), or built-in scraping (slower, no quota).
- **Green light from Arnel** to send cold outreach using public contact data.
- **A "claim" page** that handles the free Supporter promo and the cold → warm → paid funnel.
- **Suppression list**: don't email rinks already in claim_invites table.
- **Unsubscribe link**: every email must have a working unsubscribe (CAN-SPAM / GDPR compliance).

## Effort estimate

- Day 1: Resend setup, claim_invites table, claim page
- Day 2: Email lookup (Hunter.io + scrape fallback), email composition
- Day 3: Send queue (cron, daily batch, 100 emails/day to avoid spam flags)
- Day 4: Tracking + analytics + suppression + unsubscribe
- **Total: 4 days to first batch send. First results in 7-14 days.**

## Compliance

- CAN-SPAM: physical address in footer, working unsubscribe, no deceptive subject lines ✅
- GDPR: legitimate interest (directory is for the rink's benefit), but you should still allow opt-out ✅
- Plain text or minimal HTML (no images, no tracking pixels by default — better deliverability) ✅
- Send rate cap: 100/day max to avoid being flagged ✅

## Honest expected output

- **Day 7**: 700 emails sent, 210-315 opens, 21-56 clicks, 5-15 free claims
- **Day 14**: 1,400 emails sent, 420-630 opens, 42-112 clicks, 10-30 free claims
- **Day 30**: 3,000 emails sent, 900-1,350 opens, 90-270 clicks, 25-75 free claims
- **Free → paid conversion** (after free year ends): 10-25% of free claims convert to paid
- **Direct revenue**: $0 in first 14 days (everything is free). $200-1,000 in 30-90 days as the free cohort moves to renewal.

## Risk: deliverability

Cold B2B email to small businesses has ~5-15% spam complaint rate if done wrong. Mitigations:
- Don't email rinks we don't have a real business relationship with (we have their PUBLIC data, but not their consent)
- Plain text only, no tracking pixels
- Easy unsubscribe
- Send from a real domain (rinkstop.com, not gmail)
- Authenticate: SPF, DKIM, DMARC records (Resend handles this)

If spam complaints > 0.5%, our sending reputation tanks and we can't email anyone. The right play is: send slow (50-100/day), expect low volume, and never spam.

## What this play does NOT do

- Won't hit $500 in 14 days (the free year suppresses initial revenue)
- Won't produce direct revenue in the first 30 days
- Is the foundation for the $1K-$3K/month targets (60-180 days out, when free cohort renews)

## Recommendation: build it (slowly)

This is the highest-ROI long-term revenue play. Every rink we claim = 1,200 days of addressable renewal revenue. Even at 50 free claims, that's 50 rinks × $19.99/yr = $1,000/year renewing, year over year.

But the first 30 days are free → no revenue. So this is a 30-90 day play, not a 14-day play.
