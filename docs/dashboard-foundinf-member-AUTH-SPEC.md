# RinkStop Dashboard + Founding Member Auth — SPEC v2

## Context

RinkStop has 2,116 teams, 193 leagues, and daily game data via highlightly. Currently all profile types (Fan, Player, Coach, Scout, Team, League, Rink, Business) are soft-gated behind Stripe popups. There's no unified user authentication flow, no functional dashboard, and no path for a free user to convert to a paid founding member.

**Goal:** Build a free-signup + annual-subscription membership system. All users can sign up and access a free dashboard. All users can browse + save favorites. Only paid founding members can create, claim, or edit listings. Founding members get Year 1 free, then auto-convert to paid annual.

---

## The Model

### User Tiers (3 Price Levels)

| Tier | Intro Annual Price | Who | Core Entitlement |
|------|------------------|-----|-----------------|
| Fan / Player | **$9.99/yr** | Fans + individual players | Own profile page |
| Coach / Scout | **$29.99/yr** | Coaches + scouts | Player evaluation tools, recruit tracking |
| Team / League / Rink / Business | **$99.99/yr** | Organizations | Full management — rosters, scheduling, analytics, sponsors |

**Fan/Player foundational rate ($9.99) is locked in permanently for founding members — not a promo, it's their rate forever.** Coach/Scout and Org tiers may increase after Year 1 as tools are added.

**All founding members get:**
- Year 1 FREE — 364-day trial via Stripe (no charge)
- After trial → auto-convert to paid annual at their founding rate
  - Fan/Player founding rate: $9.99/yr (LOCKED PERMANENTLY — this is their rate forever)
  - Coach/Scout founding rate: $29.99/yr (may increase post-founding)
  - Org founding rate: $99.99/yr (may increase post-founding)
- Fan/Player rate is permanently locked at $9.99/yr for founding members — no future price increase applies to them
- Claim and edit their listing type in the directory
- Verified founding member badge on claimed listings
- Priority support link
- Founding member badge on their profile

**Free users get:**
- Dashboard (free)
- Browse all directories, see stats
- Save favorites
- Cannot create, claim, or edit any listing

**Pricing note:** These are introductory founding member rates. Post-founding pricing TBD after Year 1. The Stripe prices in Vercel env vars need updating to match.

---

## Database Schema

### Existing tables (keep as-is, just adding profile_id reference)
- `leagues`: + `profile_id UUID REFERENCES profiles(id)` (nullable — for claimed leagues)
- `teams`: + `profile_id UUID REFERENCES profiles(id)` (nullable — for claimed teams)
- `rinks`: + `profile_id UUID REFERENCES profiles(id)` (nullable — for claimed rinks)
- `players`: Has existing `badge_tier`, `stripe_*` fields — legacy, ignore going forward

### New tables

**`profiles`** — links Clerk user to membership + identity
```sql
CREATE TABLE profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,

  -- Membership
  membership_tier TEXT CHECK (membership_tier IN ('free', 'fan', 'player', 'coach', 'scout', 'team', 'league', 'rink', 'business')) DEFAULT 'free',
  membership_status TEXT CHECK (membership_status IN ('none', 'active', 'trialing', 'past_due', 'cancelled', 'lapsed')) DEFAULT 'none',
  membership_started_at TIMESTAMPTZ,
  membership_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Founding member
  is_founding_member BOOLEAN DEFAULT false,
  founding_trial_started_at TIMESTAMPTZ,

  -- Claimed entities (store claimed entity IDs for reference)
  claimed_team_ids UUID[] DEFAULT '{}',
  claimed_rink_ids UUID[] DEFAULT '{}',
  claimed_league_ids UUID[] DEFAULT '{}',

  -- Soft-gate flags
  can_create_listing BOOLEAN DEFAULT false,
  can_verify BOOLEAN DEFAULT false,
  can_priority_support BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profiles_clerk_id ON profiles(clerk_id);
CREATE INDEX idx_profiles_status ON profiles(membership_status);
CREATE INDEX idx_profiles_tier ON profiles(membership_tier);
```

**`membership_events`** — audit log for billing events
```sql
CREATE TABLE membership_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  stripe_event_id TEXT,
  stripe_subscription_id TEXT,
  event_type TEXT NOT NULL,
    -- 'trial_started' | 'subscription_activated' | 'subscription_renewed' |
    -- 'subscription_cancelled' | 'subscription_lapsed' | 'subscription_past_due'
  membership_tier TEXT,
  amount_paid INTEGER, -- cents (0 for trial)
  currency TEXT DEFAULT 'usd',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Stripe Configuration

### Price IDs to set in Vercel env vars

| Tier | Env Var | Price |
|------|---------|-------|
| Fan | `STRIPE_PRICE_FOUNDING_FAN` | $9.99/yr (locked founding rate) |
| Player | `STRIPE_PRICE_FOUNDING_PLAYER` | $9.99/yr (locked founding rate) |
| Coach | `STRIPE_PRICE_FOUNDING_COACH` | $29.99/yr |
| Scout | `STRIPE_PRICE_FOUNDING_SCOUT` | $29.99/yr |
| Team | `STRIPE_PRICE_FOUNDING_TEAM` | $99.99/yr |
| League | `STRIPE_PRICE_FOUNDING_LEAGUE` | $99.99/yr |
| Rink | `STRIPE_PRICE_FOUNDING_RINK` | $99.99/yr |
| Business | `STRIPE_PRICE_FOUNDING_BUSINESS` | $99.99/yr |

Note: Fan + Player share $9.99 (permanent founding rate). Coach + Scout share $29.99. Team/League/Rink/Business all share $99.99. Each has its own Price ID in Stripe for metadata tracking.

### Founding member trial
`trial_period_days: 364` on the subscription. No charge until day 365. Stripe auto-converts to paid invoice on trial_end.

---

## API Endpoints

### New: `POST /api/auth/clerk-webhook/route.ts`
**Purpose:** Provision a `profiles` row when a new user signs up via Clerk.

```ts
// Trigger: Clerk user.created webhook
// Action:
//   - Lookup Clerk user by ID
//   - Insert into profiles (clerk_id, email, first_name, last_name, avatar_url)
//   - membership_tier: 'free', membership_status: 'none'
//   - Return 200 immediately (don't wait for profile write confirmation)
```

### New: `GET /api/profile/me/route.ts` (Clerk-protected)
**Purpose:** Get current user's profile + membership status.

```ts
// Returns:
//   - id, clerk_id, email, first_name, last_name, avatar_url
//   - membership_tier, membership_status, membership_started_at, membership_expires_at
//   - is_founding_member, founding_trial_started_at
//   - claimed_team_ids, claimed_rink_ids, claimed_league_ids
//   - can_create_listing, can_verify, can_priority_support
//   - Entity-specific data (first claimed entity as "primary")
```

### New: `POST /api/profile/me/route.ts` (Clerk-protected)
**Purpose:** Update own profile (name, avatar).

```ts
// Body: { first_name?: string, last_name?: string, avatar_url?: string }
// Action: Update profiles row by clerk_id
// Returns: updated profile
```

### Existing → Updated: `POST /api/founding/upgrade/route.ts`
**Changes:**
- `mode: 'payment'` → `mode: 'subscription'`
- Add `subscription_data: { trial_period_days: 364 }`
- Add `clerk_id` to metadata: `{ entityId, entityType, clerk_id, type: 'founding_subscription' }`
- Always set `customer_email` (required for subscription)
- Add `allow_promotion_codes: false` (founding rate is locked, no manual discounts)
- For NEW (not logged-in) users: set `customer_email` in session, create account post-checkout
- For LOGGED-IN users: include `clerk_id` in metadata

```ts
// Body: { entityType, successUrl?, cancelUrl? }
// entityType: 'fan' | 'player' | 'coach' | 'scout' | 'team' | 'league' | 'rink' | 'business'
// Returns: { url: checkoutUrl }
```

**Claiming logic AFTER checkout:**
When `/dashboard` loads (post-checkout), check for `?upgrade=success` param → call `/api/profile/me` → verify `membership_status === 'active' || 'trialing'` → unlock `can_create_listing = true`.

### New: `GET /api/profile/claim/eligibility/route.ts` (Clerk-protected)
**Purpose:** Check if current user can claim an entity.

```ts
// Query params: entityType ('team'|'rink'|'league'), entityId
// Returns: {
//   eligible: boolean,
//   reason?: string, // 'not_logged_in' | 'free_tier' | 'already_claimed' | 'entity_not_found' | 'eligible'
//   claimedBy?: { name: string, url: string } // if already claimed
// }
```

### New: `POST /api/profile/claim/route.ts` (Clerk-protected)
**Purpose:** Claim an unclaimed entity.

```ts
// Body: { entityType: 'team'|'rink'|'league', entityId: uuid }
// Pre-check:
//   - membership_status IN ('active', 'trialing') → eligible
//   - membership_tier IN ('team','league','rink','business') → can claim org types
//   - membership_tier IN ('fan','player','coach','scout') → can only claim their own type
//   - entity.profile_id IS NULL OR entity.profile_id = current profile → error if claimed
// Action:
//   - Set entity.profile_id = currentProfile.id
//   - Append entityId to appropriate claimed_*_ids array
//   - Set profiles.can_create_listing = true
//   - Return { success: true, entity }
// Errors:
//   - 403: 'already_claimed' (claim attempted on already-claimed entity)
//   - 402: 'upgrade_required' (free user tried to claim)
//   - 404: 'entity_not_found'
```

### Updated: `POST /api/webhooks/stripe/route.ts`
**Replace entire handler** with subscription event model (remove one-time payment logic):

| Stripe Event | Supabase Action |
|---|---|
| `customer.subscription.created` | Insert `membership_events`, set `membership_status: 'trialing'`, `is_founding_member: true`, `founding_trial_started_at` |
| `customer.subscription.trial_will_end` | Log (no email for now — future: send reminder at day 330) |
| `customer.subscription.updated` | Update `membership_status`, `membership_expires_at` |
| `customer.subscription.deleted` | Set `membership_status: 'lapsed'`, clear `stripe_subscription_id`, set `is_founding_member: false` |
| `invoice.payment_succeeded` | Insert `membership_events`, extend `membership_expires_at` |
| `invoice.payment_failed` | Set `membership_status: 'past_due'` |

Note: `checkout.session.completed` is NO LONGER HANDLED — we use subscription mode, not payment mode.

### New: `GET /api/profile/entities/route.ts` (Clerk-protected)
**Purpose:** Get all entities claimed by current user.

```ts
// Returns: {
//   teams: Team[],
//   rinks: Rink[],
//   leagues: League[],
// }
// Each entity includes name, slug, logo_url for display in dashboard
```

---

## Frontend

### `/login` + `/register`
Current: Clerk `<SignIn>` / `<SignUp>` components.
After signup → redirect to `/dashboard`.
After signin → redirect to `/dashboard` (not original page — cleaner UX).

**Update:** Clerk `<SignUp>` should have `afterSignUpUrl: '/dashboard'` set.

### `/dashboard` — redesigned
Works for ALL entity types. Shows:

**Header:** Avatar + name + email + membership tier status + founding badge

**Quick Actions (free users):**
- Browse Directory
- Save Favorites
- View Plans → links to `/founders-club`

**Quick Actions (paid users):**
- Claim a Team/Venue/League (prominent if they haven't)
- Manage My Listings → shows claimed teams/rinks/leagues
- Edit Profile
- Contact Support

**Membership Card (paid):**
```
🏒 FOUNDING MEMBER — {TIER}
Status: {active/trialing}
{TRIAL: "1 year FREE — renews [DATE]" | ACTIVE: "Renews [DATE]"}
[Manage Billing] [Cancel]
```

**Membership Card (free):**
```
🔓 FREE TIER
You have full access to browse and save favorites.
Upgrade to claim and manage your listings.
[View Plans →]
```

### `/founders-club` — updated
Keep existing plan cards layout, update copy + trial messaging.

Key updates:
- "BECOME A FOUNDING MEMBER" header
- "Year 1 is FREE — lock in your founding member rate"
- "After 12 months → auto-converts to annual — cancel anytime"
- Plan cards already exist but prices need updating ($99.99 for org tier)
- Add "Already have an account? Sign in" link for logged-in free users

**IMPORTANT:** Check if user is logged in before showing upgrade flow. If logged in + already a founding member → redirect to `/dashboard`.

### `/dashboard/profile` — stub page (Phase 1)
Simple editable profile fields (name, avatar, bio). More entity-specific fields come later.

### `/dashboard/claims` — show user's claimed entities
Empty state: "You haven't claimed any listings yet. [Browse Directory →]"
Claimed state: Grid of claimed listing cards with "Edit" links.

### Soft-Gating Components

**`ClaimButton.tsx`** (new)
- Used on unclaimed team/rink/league pages
- Logic: if `can_claim` → show "Claim This [Type]" button; if `!can_claim` → show "Sign up free to claim" (for non-logged-in) or "Upgrade to claim" (for logged-in free users)
- Variant: on pages for already-claimed entities → show "Manage This [Type]" for the claiming member

**`UpgradeModal.tsx`** (new)
- Triggered when a free user tries to perform a paid action
- Shows tier summary + plan cards
- "Sign up free" option first → then Stripe checkout inline
- Does NOT redirect away from the page — modal overlay

---

## Implementation Order

### Phase 1: Core Auth + Membership (this spec)
1. SQL migrations: add `profiles` + `membership_events` tables, add `profile_id` to teams/rinks/leagues
2. Clerk webhook (`POST /api/auth/clerk-webhook`) to provision profiles on signup
3. Set Stripe Price IDs in Vercel: $9.99 (fan/player) / $29.99 (coach/scout) / $99.99 (orgs)
4. Update `/api/founding/upgrade` to use `mode: 'subscription'` + `trial_period_days: 364`
5. Replace Stripe webhook handler with subscription event model
6. Build `/api/profile/me` (GET + PATCH)
7. Build `/api/profile/claim/eligibility`
8. Build `/api/profile/claim`
9. Build `/api/profile/entities`
10. Update Clerk SignUp `<signUp>` component with redirect URL
11. Redesign `/dashboard` with membership status + quick actions
12. Build `/dashboard/claims` page
13. Build `ClaimButton.tsx` + `UpgradeModal.tsx` for soft-gating
14. Update `/founders-club` copy + check logged-in state

### Phase 2: Entity-Specific Tools (future)
- Coach dashboard: player evaluation forms
- Team dashboard: roster management
- Rink dashboard: ice time scheduling
- League dashboard: multi-team management

### Phase 3: Affiliates + Game Scores (parallel)
- NHL Fanatics affiliate links on team pages
- Ticketmaster affiliate links on game pages
- Live game score pages for SEO traffic

---

## Environment Variables (additions)

```bash
# Vercel — update existing STRIPE_PRICE_FOUNDING_* values:
STRIPE_PRICE_FOUNDING_FAN=price_...      # $9.99/yr (locked founding rate — permanent)
STRIPE_PRICE_FOUNDING_PLAYER=price_...  # $9.99/yr (locked founding rate — permanent)
STRIPE_PRICE_FOUNDING_COACH=price_...   # $29.99/yr
STRIPE_PRICE_FOUNDING_SCOUT=price_...    # $29.99/yr
STRIPE_PRICE_FOUNDING_TEAM=price_...     # $99.99/yr
STRIPE_PRICE_FOUNDING_LEAGUE=price_...   # $99.99/yr
STRIPE_PRICE_FOUNDING_RINK=price_...     # $99.99/yr
STRIPE_PRICE_FOUNDING_BUSINESS=price_... # $99.99/yr

# Clerk webhook signing secret
CLERK_WEBHOOK_SECRET=whsec_...           # For verifying Clerk webhook events
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/add-profiles.sql` | Migration for new tables + profile_id columns |
| `src/app/api/auth/clerk-webhook/route.ts` | NEW |
| `src/app/api/profile/me/route.ts` | NEW |
| `src/app/api/profile/claim/route.ts` | NEW |
| `src/app/api/profile/eligibility/route.ts` | NEW |
| `src/app/api/profile/entities/route.ts` | NEW |
| `src/app/api/founding/upgrade/route.ts` | MODIFY — subscription mode + trial |
| `src/app/api/webhooks/stripe/route.ts` | REPLACE — subscription handler |
| `src/app/dashboard/page.tsx` | REDESIGN |
| `src/app/dashboard/layout.tsx` | Minor: add claims link |
| `src/app/founding-member/page.tsx` | UPDATE copy + trial explanation |
| `src/components/ClaimButton.tsx` | NEW |
| `src/components/UpgradeModal.tsx` | NEW |
| `src/components/SignUp.tsx` | UPDATE sign-up redirect |
| `.env.local` | Add CLERK_WEBHOOK_SECRET |

---

## Dependencies

Already installed:
- `@clerk/nextjs` — auth
- `stripe` — payments
- `@supabase/supabase-js` — database client

No new packages needed.

---

## Open Questions (resolved)

| Question | Answer |
|----------|--------|
| Free users get dashboard? | ✅ YES — everyone can sign up and access dashboard |
| Browse directories | ✅ FREE — always free |
| Save favorites | ✅ FREE — always free |
| Create/edit listings | ❌ PAID — founding members only |
| Verified badge | ❌ PAID — founding members only |
| Priority support | ❌ PAID — founding members only |
| All 8 profile types same membership_type field? | ✅ YES — `membership_tier` field on profiles |
| Can fans claim a team? | ✅ YES — fan founding member can claim any listing type |
| Payment model | Annual subscription, 364-day trial for founding, auto-renew |
| Fan/Player founding rate | ✅ $9.99/yr LOCKED PERMANENTLY for founding members |
| Coach/Scout founding rate | ✅ $29.99/yr introductory (may increase at Year 2+) |
| Org founding rate | ✅ $99.99/yr introductory (may increase at Year 2+) |
