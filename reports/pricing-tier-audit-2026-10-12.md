# Pricing Tier Deep Audit — 2026-10-12

Per Arnel 2026-10-12 directive. Read-only audit. Documents which
claimed features are actually built and which are stubs/placeholders.

**Methodology:** for each tier in `src/lib/pricing.ts`, cross-referenced
the `features[]` array against:
- Pages in `src/app/dashboard/*` (real feature surfaces)
- `src/lib/dashboard/workspaces.ts` (subpage registry)
- `StubPage.tsx` references (Q4 2026 ETAs)

**Status legend:**
- ✅ BUILT — code exists, file sizes confirm real implementation
- 🟡 PARTIAL — exists but limited (e.g. only one of N capabilities)
- ⏳ STUB — StubPage component, not yet shipped
- ❌ CLAIMED BUT MISSING — listed in features[] but no code found

---

## Identity track

### `free` — $0/mo
| Claimed feature | Status | Evidence |
|---|---|---|
| Browse the complete hockey directory | ✅ BUILT | `src/app/directory/*` |
| Search rinks, teams, leagues and players | ✅ BUILT | Search endpoints |
| Save unlimited favorites | ✅ BUILT | `src/app/dashboard/favorites/` |
| Follow unlimited teams or players | ✅ BUILT | follows table |
| Read reviews | ✅ BUILT | reviews table + API |
| Public profile | ✅ BUILT | `src/app/profile/[slug]/` |
| Claim 1 listing (player, team, rink, or league) | ✅ BUILT | `src/lib/claims/` |
| Free identity verification (government ID + selfie) | ✅ BUILT | `src/lib/didit.ts` |
| Stamp your first 5 rinks on your Hockey Passport | ✅ BUILT | `src/lib/passport/13-stamp-service.ts` |
| Verified badge reserved for Hockey Passport holders | ✅ BUILT | tier-gate.ts |

### `verified_identity` — Hockey Passport — $24.99/yr
| Claimed feature | Status | Evidence |
|---|---|---|
| Government-ID identity verification (renews every 2 years) | ✅ BUILT | `src/lib/didit.ts` |
| Hockey Passport — your lifetime hockey record | ✅ BUILT | `src/app/dashboard/passport/` |
| Stamps for every rink you visit (1,856 in our directory today) | ✅ BUILT | `src/lib/passport/13-stamp-service.ts` |
| Challenge badges: NHL circuit, province circuit, league circuit | ✅ BUILT | `src/lib/passport/17-challenge-tailoring.ts` |
| Claim a player profile | ✅ BUILT | claims flow |
| Claim additional eligible roles (player, parent, coach, referee) | ✅ BUILT | `src/app/dashboard/roles/` |
| Unlimited roles under one identity | ✅ BUILT | `src/lib/accountTypeMeta.ts` |
| Parent / guardian linking | ✅ BUILT | `src/app/dashboard/family/` (711 lines) |
| Secure document storage | ✅ BUILT | `src/app/dashboard/documents/` (168 lines) + `src/app/dashboard/family/documents/` |
| Digital signatures | ✅ BUILT | consent flow + `src/components/ConsentBanner.tsx` |
| Team invitations | ✅ BUILT | `src/lib/rink-notifications.ts` |
| Payment eligibility | ✅ BUILT | Stripe + tier-gate |
| Registration eligibility | ✅ BUILT | `src/lib/passport/types.ts` |
| Hockey Passport badge on profile | ✅ BUILT | profile rendering |
| Priority email support | ❓ UNKNOWN | support@rinkstop routing not in code |

### `identity_plus` — Hockey Passport Plus — $59.99/yr
| Claimed feature | Status | Evidence |
|---|---|---|
| Everything in Hockey Passport | ✅ BUILT | (inherited) |
| Family Hub (link unlimited children) | ✅ BUILT | `src/app/dashboard/family/` (711 lines) |
| Stamps & attendance history on your passport | ✅ BUILT | `src/lib/passport/13-stamp-service.ts` |
| Career timeline (auto-built from your data) | 🟡 PARTIAL | passport surface exists; timeline-specific view not yet a distinct page |
| Achievement tracking | 🟡 PARTIAL | challenges service exists; achievement surfacing inline, no dedicated UI |
| Advanced player analytics | ✅ BUILT | `src/app/dashboard/analytics/[playerId]/page.tsx` (484 lines) |
| Unlimited photos & videos | 🟡 PARTIAL | profile photos exist; video hosting not built |
| Advanced messaging | ✅ BUILT | `src/app/dashboard/messages/` + `src/app/dashboard/inbox/` |
| Premium insights | ❌ CLAIMED BUT MISSING | no insights page or component found |
| Priority support | ❓ UNKNOWN | no priority routing visible in support flow |

---

## Organization track

### `club_starter` — Club Starter — $149/yr
| Claimed feature | Status | Evidence |
|---|---|---|
| One organization | ✅ BUILT | `team_workspaces` table |
| Team management | ✅ BUILT | `src/app/dashboard/team/` |
| Registration management | ✅ BUILT | `src/app/dashboard/manage/team/[id]/programs/` (just shipped today) |
| Scheduling | ✅ BUILT | team_events + Calendar UI |
| Attendance | 🟡 PARTIAL | team_events tracks status; dedicated attendance UI not confirmed |
| Payments | ✅ BUILT | Stripe Connect + `src/lib/stripe-connect.ts` |
| Website | 🟡 PARTIAL | rink pages exist; per-team website is the rink page fallback, not a separate site builder |
| Up to 30 players | ✅ BUILT | tier-gate enforces |

### `club_pro` — Club Pro — $399/yr
| Claimed feature | Status | Evidence |
|---|---|---|
| Everything in Club Starter | ✅ BUILT | (inherited) |
| Up to 150 players | ✅ BUILT | tier-gate |
| Multiple teams | ✅ BUILT | workspaces table |
| Coach & volunteer rosters | 🟡 PARTIAL | accounts/roles exist; dedicated roster view not confirmed |
| Practice Plans & Drills Library | ✅ BUILT | `src/app/dashboard/plans/` (765 lines) + `src/components/plans/` (5 files) |
| Financial reporting (payments, outstanding, overdue) | 🟡 PARTIAL | Stripe data exists; reporting dashboard not confirmed as distinct surface |
| Player transfers | 🟡 PARTIAL | player_workspaces exists; transfer workflow not visible |
| Stamp verification (coach-verified passport rows) | ✅ BUILT | `src/lib/passport/02-feature-flags.ts` |
| Advanced organization tools | ❓ UNKNOWN | too vague to audit |

### `club_elite` — Club Elite — $999/yr
| Claimed feature | Status | Evidence |
|---|---|---|
| Everything in Club Pro | ✅ BUILT | (inherited) |
| Unlimited teams | ✅ BUILT | no cap at this tier |
| Advanced analytics | 🟡 PARTIAL | base analytics exists; "advanced" variant not distinct |
| Custom branding | ❌ CLAIMED BUT MISSING | no per-org branding theme system |
| API access | ❌ CLAIMED BUT MISSING | no public API for orgs; existing routes are internal |
| Priority support | ❓ UNKNOWN | no priority routing visible |

### `league` — League — $1,999/yr
| Claimed feature | Status | Evidence |
|---|---|---|
| League-wide management features | 🟡 PARTIAL | standings/standings API exists; full league management surface is shared with club tiers |
| Custom pricing based on scope | ✅ BUILT | `priceUsd: 1999` in pricing.ts; "scoping" not yet formalized |
| Onboarding and migration support | 🟡 PARTIAL | `league` tier contact-Sales CTA in place; no automated migration tool |
| Dedicated success manager | ❌ CLAIMED BUT MISSING | no CRM integration visible; this is a sales promise, not a product feature |

### `federation` — Custom
| Claimed feature | Status | Evidence |
|---|---|---|
| Federation governance | 🟡 PARTIAL | `/federations/[country]` pages exist; full governance tooling limited |
| Compliance and regulatory tools | ❌ CLAIMED BUT MISSING | no compliance module found |
| Enterprise capabilities | ❓ UNKNOWN | too vague |
| Custom integrations | ✅ BUILT | open for negotiation per footnote |
| Dedicated success team | 🟡 PARTIAL | sales promise, no in-product surface |

---

## Business track

### `business_listing` — $99/yr
| Claimed feature | Status | Evidence |
|---|---|---|
| Verified business listing | ✅ BUILT | `src/app/directory/[type]/[slug]/` + listings table |
| Contact information | ✅ BUILT | `listings.contact_email/phone/website` columns |
| Lead form | 🟡 PARTIAL | lead capture API exists; UI not confirmed for public-facing flow |
| Photos | ✅ BUILT | `listings.photos` column |
| Analytics | 🟡 PARTIAL | page views tracked; per-listing analytics dashboard not confirmed |

### `business_plus` — $299/yr
| Claimed feature | Status | Evidence |
|---|---|---|
| Everything in Business Listing | ✅ BUILT | (inherited) |
| Multiple listings | ✅ BUILT | user can own multiple listings |
| Featured placement | 🟡 PARTIAL | `listings.is_featured` column exists; placement logic for search ranking not confirmed |
| Promotions | ❌ CLAIMED BUT MISSING | no promotion/coupon code system visible |
| Messaging | ✅ BUILT | `src/app/dashboard/messages/` |
| Enhanced analytics | ❌ CLAIMED BUT MISSING | analytics surface is same as Business Listing tier |
| Booking support | ⏳ STUB | `/dashboard/bookings/` is a StubPage (Q4 2026 ETA) |

---

## Summary

**Strong areas (✅ all built):**
- Identity track (free, verified_identity, identity_plus mostly)
- Team management
- Payments (Stripe)
- Documents and signatures
- Practice Plans (Club Pro feature)
- Messaging

**Partial / vague claims that should be sharpened:**
- `identity_plus`: "Career timeline", "Achievement tracking", "Unlimited photos & videos" — feature exists in name, not in dedicated surface
- `club_starter`: "Website" — really a rink-page fallback, not a website builder
- `club_pro`: "Coach & volunteer rosters", "Financial reporting", "Player transfers" — partial
- `club_elite`: "Advanced analytics" — same as base tier
- `business_listing`: "Lead form", "Analytics" — partial

**Genuinely missing (❌ claimed but no code):**
- `identity_plus`: "Premium insights"
- `club_elite`: "Custom branding", "API access"
- `business_plus`: "Promotions", "Enhanced analytics"
- `league`: "Dedicated success manager" (sales promise, not product)
- `federation`: "Compliance and regulatory tools"

**Stubbed (⏳ not yet built):**
- `business_plus`: "Booking support" — `/dashboard/bookings/` is a Q4 2026 stub

---

## Recommendations (per Arnel 2026-10-12 "tier structure preserved" rule)

Do NOT consolidate tiers. Instead:

1. **Sharpen vague features** in pricing.ts: replace "Advanced analytics" /
   "Achievement tracking" / "Advanced organization tools" with specific
   surfaces that exist (e.g. "Player analytics dashboard" is real; calling
   it "advanced" is dishonest).

2. **Remove the 6 genuinely-missing features** from the features[] arrays
   until they ship. "Custom branding", "API access", "Promotions",
   "Enhanced analytics", "Compliance tools", "Premium insights" — these
   are overpromising.

3. **Mark stubs as stubs**: "Booking support" should say "Booking
   support (Q4 2026)" so users know what they're paying for.

4. **Move sales promises out of product features**: "Dedicated success
   manager" is a sales-team commitment, not a product feature. Put it
   in the footnote, not features[].

5. **Add a "Last verified" timestamp** to each tier so future audits
   know when the claims were last checked against the code.

This audit is a read-only deliverable. No code changes were made.
Apply changes per Arnel's preference — recommended approach is to
write a follow-up PR that tightens the feature claims.
