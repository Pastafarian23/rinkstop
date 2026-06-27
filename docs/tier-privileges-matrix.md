# Tier Privileges Matrix

## Personal Track

| Tier | Price | Max Claims | Family Hub | Profile Verification | DMs | Analytics | Storage |
|------|-------|------------|------------|---------------------|-----|-----------|---------|
| Free | $0 | 0 | ❌ | ❌ | ❌ | ❌ | 0GB |
| Roster | $19.99 | 1 | ❌ | ❌ | ❌ | ❌ | 0GB |
| Roster+ | $29.99 | 1 | ✅ | ✅ | ❌ | ❌ | 1GB |
| Pro | $59.99 | 5 | ✅ | ✅ | ✅ | ✅ | 5GB |

## Business Track

| Tier | Price | Max Claims | Family Hub | Profile Verification | DMs | Analytics | Lead Capture | Storage |
|------|-------|------------|------------|---------------------|-----|-----------|--------------|---------|
| Free | $0 | 0 | ❌ | ✅ | ❌ | ❌ | ❌ | 0GB |
| Business Starter | $29.99 | 1 | ❌ | ✅ | ❌ | ❌ | ✅ | 1GB |
| Business Pro | $55.99 | 5 | ✅ | ✅ | ✅ | ✅ | ✅ | 5GB |
| Business Premium | $299 | 25 | ✅ | ✅ | ✅ | ✅ | ✅ (Priority) | 25GB |
| Enterprise | Contact | ∞ | ✅ | ✅ | ✅ | ✅ | ✅ (Priority) | ∞ |

## Feature Details

### Claims & Listings
- **Personal**: Claim rinks, teams, leagues, or players for personal use (your kid's team, your home rink)
- **Business**: Claim business listings (rink facility, hockey store, training center)

### Family Hub
- **Roster+ and above**: Link youth players as parent/guardian
- **Includes**: Kid profile linking, performance tracking, photos/videos
- **Purpose**: Track your children's hockey journey

### Profile Verification
- **Gate**: Roster+ (personal) OR Business Starter+ (business)
- **ID Check**: Government ID + selfie via Didit
- **Display**: Navy-and-gold checkmark on public profile
- **Duration**: 2 years before re-verification

### Direct Messaging
- **Gate**: Pro (personal) OR Business Pro+ (business)
- **Purpose**: Connect with other users
- **Scope**: Can message any verified user in same or higher tier

### Lead Capture
- **Gate**: Any active claim
- **Business Premium/Enterprise**: Priority placement in directory listings

## Database Tier Values

```typescript
type TierId = 
  | 'free'
  | 'roster' | 'roster_plus' | 'pro'
  | 'business_starter' | 'business_pro' | 'business_premium'
  | 'enterprise';
```

## Navigation Split

### Personal Dashboard
- Family - Linked players, performance tracking
- Claims - Claim personal listings
- Identity - Verification status
- Leads - Lead inquiries
- Subscription - Billing
- Support - Help

### Business Dashboard
- Listings - Business claim management
- Identity - Verification status
- Leads - Lead pipeline (priority for Business Premium/Enterprise)
- Subscription - Billing
- Support - Help

## Tier Colors (used across UI)
- **Roster/Roster+/Business Starter**: `#FFB81C` (gold)
- **Pro/Business Pro**: `#14B8A6` (teal)
- **Business Premium/Enterprise**: `#C8102E` (red)