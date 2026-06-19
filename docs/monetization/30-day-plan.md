# 30-Day Monetization Plan (post-pivot)

**Date**: 2026-06-16
**Context**: Arnel's $500/mo by June 30, $1K/mo by July 31, $3K/mo by Aug 31 targets. After pivot, Arnel doesn't want to drive personal-network outreach — wants me to drive the plan end-to-end.

## Honest top-line

| Target | Original (with Arnel's network) | After pivot (my actions only) |
|---|---|---|
| $500 by June 30 (14 days) | $500 (tight) | $50-200 (not realistic to hit $500) |
| $1K by July 31 (45 days) | $1,000+ | $300-700 |
| $3K by Aug 31 (75 days) | $3,000+ | $1K-2K |
| $50K by Dec 31 (200 days) | $50K (stretch) | $10K-25K (realistic stretch) |

The 60-75% haircut is the cost of removing Arnel's network as a leverage point. None of the 4 plays below produces fast revenue; they all produce compounding infrastructure that pays off 30-90+ days out.

## The 4 plays (all designed for me to run, no Arnel bottleneck)

| Play | Days to ship | Days to first $ | Best case | Realistic | Worst case |
|---|---|---|---|---|---|
| 1. Reverse-claim automation | 4 | 30-90 (renewals) | $1,000/yr | $200/yr | $0 |
| 2. Programmatic SEO city pages | 4 | 30-60 | $2,000/mo | $300/mo | $0 |
| 3. Free public tools | 8 | 30-60 | $3,000/mo | $500/mo | $0 |
| 4. Direct partner outreach | 5 (drafts) | 60-180 | $10,000/yr sponsorship | $0 | $0 |

**Sum (best case at 90 days)**: ~$5,000-6,000/month = $60-72K/year. Hits the stretch.
**Sum (realistic at 90 days)**: ~$800/month = $10K/year. Misses the stretch but builds the system.
**Sum (worst case at 90 days)**: $0. All plays fail. We have learned infrastructure for the next attempt.

## My recommendation: Plays 1+2+3, no paid ads

- **Play 2 (SEO city pages)** — start now. Pure code, no external deps. Ships in 1 PR.
- **Play 3 (free tools)** — start now. Start with Tool 1 (Hockey Cost Calculator, 2 days). Pure code, no external deps.
- **Play 1 (reverse-claim)** — start when Resend is greenlit. Wait for Arnel's email provider decision.
- **Play 4 (partner outreach)** — hold. Most speculative. Save for week 3+ when we have proven funnel data to share.

## Paid ads: optional

- Without paid ads: $50-200 net in 14 days, $300-700 in 45 days, $1K-2K in 75 days
- With $150 retargeting test on pricing-page visitors: $200-500 net in 14 days, $500-1.5K in 45 days, $1.5K-3K in 75 days
- Recommendation: skip for now. Reconsider after 14 days if SEO + tools aren't producing pricing views.

## What I need from Arnel (in order)

1. **Green light to start Play 2 + Play 3 (Tool 1)** — no external dependencies. I can start as soon as you say go.
2. **Resend vs Kit decision for Play 1 + email capture on /pricing** — Resend is my default (simpler, faster, $20/mo after 100/day free).
3. **Green light for Play 1** — only after Resend is set up and you confirm you want cold outreach.
4. **Play 4 hold** — no decision needed yet.

## What I will NOT do

- Will not send cold DMs pretending to be Arnel or anyone
- Will not buy ads without explicit green light
- Will not promise revenue numbers I haven't backed with real math
- Will not touch the existing 1,917 rinks' data quality without your sign-off
- Will not start Play 4 (Bauer, CCM, Hockey News outreach) without your approval on the contact list and message tone

## Tracking + reporting

- Weekly status update to RinkStop Ops: pricing_viewed count, checkout_started count, checkout_completed count, subscription_active count, new claimed listings, new email signups
- Real-time analytics: Supabase `analytics_events` table, queryable via SQL editor
- Conversion funnel: query `analytics_events` grouped by name + day

## Risks (all real)

- **Deliverability** (Play 1): cold B2B email has 5-15% spam complaint risk if done wrong. Mitigated by slow send rate, plain text, easy unsubscribe, proper SPF/DKIM/DMARC.
- **Thin content** (Play 2): 230 programmatic pages could look thin. Mitigated by unique intros, real data, cross-linking to high-quality content.
- **Bad tools** (Play 3): thin or gimmicky tools don't rank. Mitigated by making tools actually useful (real answers, no email gates).
- **Partner silence** (Play 4): hockey media / equipment brands move slow, may not respond. Mitigated by low effort (drafts ready, send when there's signal).

## What "done" looks like at 30 days

- Play 2: 230 city pages indexed, 50-200 organic visits
- Play 3: 1 tool live, 100-1,000 monthly visits
- Play 1: 1,000+ claim emails sent, 10-50 free claims
- Analytics funnel: 100+ pricing views, 5-15 checkouts, 1-5 paid
- Net revenue: $0-200 (if any), 1-5 free cohorts (renew at 1 year)

This is the foundation. The real revenue comes in months 2-6, not month 1.
