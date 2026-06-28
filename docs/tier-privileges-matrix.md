# Tier Privileges Matrix

## Personal Track

| Tier | Price | Max Claims | Max Listings | DMs | Family Hub | Identity Verify | Photo Upload | Analytics | Notes |
|------|-------|------------|--------------|-----|------------|-----------------|--------------|-----------|-------|
| Free | $0 | 0 | 0 | ❌ | ❌ | ❌ | ❌ | ❌ | Browse only |
| Roster | $19.99 | 1 | 3 | ❌ | ❌ | ❌ | ❌ | ❌ | Claim 1 personal profile |
| Roster+ | $29.99 | 1 | 3 | ❌ | ✅ | ✅ | ✅ | ❌ | Family features, kid linking |
| Pro | $59.99 | 5 | 5 | ✅ | ✅ | ✅ | ✅ | ✅ | Team management |

## Business Track

| Tier | Price | Max Claims | Max Listings | DMs | Family Hub | Identity Verify | Photo Upload | Analytics | Lead Capture | Notes |
|------|-------|------------|--------------|-----|------------|-----------------|--------------|-----------|--------------|-------|
| Free | $0 | 0 | 0 | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | Browse only |
| Business Starter | $29.99 | 1 | 1 | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | Single business claim |
| Business Pro | $55.99 | 5 | 5 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Lead forms, DMs |
| Business Premium | $299 | 25 | 25 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Priority) | Analytics, branding |
| Enterprise | Contact | ∞ | ∞ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Priority) | Custom integration |

## Feature Details

### Claims & Listings
- **Personal**: Claim rinks, teams, leagues, or players for personal use (your kid's team, your home rink)
- **Business**: Claim business listings (rink facility, hockey store, training center, league)

### Family Hub
- **Roster+ and above (personal)**, **Business Pro+ (business)**
- Link youth players as parent/guardian
- Includes: Kid profile linking, performance tracking, photos/videos

### Profile Verification
- **Gate**: Roster+ (personal) OR Business Starter+ (business)
- **ID Check**: Government ID + selfie via Didit
- **Display**: Navy-and-gold checkmark on public profile
- **Duration**: 2 years before re-verification

### Direct Messaging
- **Gate**: Pro (personal) OR Business Pro (business)
- **Purpose**: Connect with other users
- **Scope**: Can message any verified user in same or higher tier

### Lead Capture
- **Gate**: Any active claim
- **Business Premium/Enterprise**: Priority placement in directory listings (higher search rank)

## Database Tier Values

```typescript
type TierName = 
  | 'free'
  | 'roster' | 'roster_plus' | 'pro'
  | 'business_starter' | 'business_pro' | 'business_premium'
  | 'enterprise';

type AccountTrack = 'personal' | 'business';
```

## Navigation Split

### Personal Dashboard (`/dashboard/family/` route)
- Family - Linked players, performance tracking
- Claims - Claim personal listings
- Identity - Verification status
- Leads - Lead inquiries
- Subscription - Billing
- Support - Help

### Business Dashboard (`/dashboard/listings/` route)
- Listings - Business claim management
- Identity - Verification status
- Leads - Lead pipeline (priority for Business Premium/Enterprise)
- Subscription - Billing
- Support - Help

## Tier Colors (used across UI)
- **Roster/Roster+/Business Starter**: `#FFB81C` (gold)
- **Pro/Business Pro**: `#14B8A6` (teal)
- **Business Premium/Enterprise**: `#C8102E` (red)