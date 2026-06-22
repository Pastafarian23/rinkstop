# Tier Restructure — TODO (created 2026-06-22)

**Decision (Arnel, 2026-06-22):** Option C naming. Add `family_plus` tier. Push and DM-coaches open to Starter. "Verified" is permanently retired as a tier label.

## Final Tier Ladder (Option C, code names preserved)

| Code | Display | Price | Persona | Differentiated features |
|------|---------|-------|---------|------------------------|
| `free` | Free | $0 | Anyone browsing | 1 push/week ("team has a game today" only); no DMs; no claims |
| `starter` | Roster | $19.99/yr | Player / parent of 1 kid | 1 claim, kid profiles, unlimited push, DM coaches of teams the kid is on |
| `family_plus` (new) | Roster+ | $29.99/yr | Engaged parent, multi-kid, serious kid | All Roster + video highlights, recruiting profile, multi-season stat tracking, custom profile URL, family calendar, sibling compare, year-end report |
| `pro` | Pro | $59.99/yr | Operator (single rink, league director, team coach) | 5 claims, DM anyone, lead capture, "open to" tags |
| `premium` | Premium | $299/yr | Rink chains, leagues, brands | 25 claims, featured rotation, analytics, multi-admin |
| `enterprise` | Enterprise | Custom | Multi-location, brands | API, bulk, branded pages, SLA |

## Naming Rules (enforced)

- **No "Verified" as a tier label anywhere.** "Verified" is reserved for the `identity_verified` checkmark (separate concept).
- Display names match persona: Roster / Roster+ / Pro / Premium / Enterprise.
- Code names unchanged (`starter`, `pro`, `premium`, `enterprise`) — `family_plus` is the new code name for the new tier.

## TODO

### Tier restructure (Phase 1 — naming + DM + push)

- [ ] Add `family_plus` to `profiles.tier` CHECK constraint (DB migration)
- [ ] Create Stripe Product + Price for `family_plus` ($29.99/yr) — record product/price IDs in MEMORY.md
- [ ] Add `STRIPE_PRICE_TIER_FAMILY_PLUS` to Vercel env vars
- [ ] Update `TIER_LABELS` in `src/lib/listingTier.ts` → `starter: 'Roster'`, add `family_plus: 'Roster+'`
- [ ] Update `TIER_RANK` in `src/lib/listingTier.ts` → add `family_plus` (between `starter` and `pro`)
- [ ] Update `getMaxClaimsForTier()` in `src/lib/connections.ts` → `family_plus = 1` (or sync with starter)
- [ ] Remove all "Verified" tier references from `UpgradeNudgePopup.tsx` ("Become Verified →" → "Become a Roster Member →")
- [ ] Remove "Verified required to claim as parent" from `ClaimParentButton.tsx` (parent claims now work on `starter`/Roster)
- [ ] Remove "Verified required to connect" / "Signed in but not Verified+" from `ConnectButton.tsx`
- [ ] Update `FoundersClubPopup.tsx` benefits copy — "Verified profiles" is NOT a tier; replace with tier-neutral language
- [ ] Refactor DM gating: family/parents on `starter` can DM coaches whose team the parent's claimed kid is rostered on. Implementation: at send-time, verify recipient is in `team_memberships` for any team where sender's claimed kid is rostered.
- [ ] Refactor push notification gating: free = 1/week ("game day only"), `starter`+ = unlimited, `family_plus`+ = unlimited + recruiting alerts
- [ ] Update `/pricing` page with new 6-tier ladder (Free / Roster / Roster+ / Pro / Premium / Enterprise)
- [ ] Update `ClaimThisListing.tsx` CTA copy: free tier upsell goes to Roster first, then Roster+ for parents
- [ ] Update `UpgradeNudgePopup.tsx` frequency context for Roster upsell

### Tier restructure (Phase 2 — Roster+ feature builds)

- [ ] Video highlights upload + auto-clip feature (Roster+ gated)
- [ ] College recruiting profile (Roster+ gated) — public showcase page
- [ ] Multi-season stat tracking (Roster+ gated) — year-over-year development
- [ ] Custom profile URL (Roster+ gated)
- [ ] Family calendar (Roster+ gated) — all kids' games in one view
- [ ] Sibling compare (Roster+ gated) — side-by-side stats
- [ ] Year-end report card (Roster+ gated) — PDF download

### Documentation

- [ ] Update MEMORY.md "Tier Rename" section → replace with "Final Tier Structure (2026-06-22)"
- [ ] Update pricing.ts comments — `Roster` (was Starter), `Roster+` (new), `Pro`, `Premium`

### Decision records (Arnel, 2026-06-22)

- "I like C" — confirmed Option C naming.
- "Proceed" — green-lit to start Phase 1 after naming finalization.
- "Verified is no longer to be referenced" — permanent retirement as tier label.

## Decision Pending

- Pricing: keep $19.99 / $29.99 / $59.99 / $299 — confirm or adjust?
- Phase 1 starts after pricing confirmation + Stripe Product/Price ID creation.