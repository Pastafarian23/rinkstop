# Piece G1a Prep — Tier Gate Helper + Smoke Test API

## Scope

Add a shared `hasTeamAdminAccess(userId)` helper that any future team-admin route can call to decide if the user is allowed. Plus a minimal smoke-test API route at `/api/team/[slug]/events` that uses the helper, returns 402 if blocked, and otherwise returns `[]` (placeholder events list — full CRUD lands in G1b).

## Tier names (locked per Arnel, msg #23813)

Arnel clarified: the previous tier labels (Founding Fan / Verified / Elite / Family Plus) were placeholders. The **approved tier names** are:

| Code (DB) | Display label | Price/yr | Stripe price ID |
|-----------|---------------|----------|-----------------|
| `free` | Free | $0 | (n/a) |
| `starter` | Roster | $19.99 | `price_1ThcqgCJiUbEZVbnyHLCogTF` |
| `family_plus` | Roster+ | $29.99 | `price_1TlGvYCJiUbEZVbnE7LvZVe6` |
| `pro` | Pro | $59.99 | `price_1ThcqhCJiUbEZVbnVfgLCdzu` |
| `premium` | Premium | $299 | `price_1ThcqhCJiUbEZVbnHtmWwpAa` |
| `enterprise` | Enterprise | contact | (n/a) |

**Per Arnel's rule (msg #23809)**: any non-free tier grants team_admin features. So the gate is binary: `tier === 'free'` → blocked, anything else → allowed.

**Reality check (DB audit 2026-06-24 22:08 CDT)**:
- Live `profiles.tier` values in the DB today: `free` (8), `premium` (6), `starter` (2)
- `family_plus` and `pro` not yet in DB (migration `2026-06-22_add_family_plus_tier.sql` PENDING per MEMORY.md)
- Arnel himself is `premium` → will pass the gate

**Implication for the helper**: it must accept any of {starter, family_plus, pro, premium, enterprise} as "allowed", even though some of those aren't in the DB yet. Don't hardcode an enum; check `tier !== 'free'`.

## Files to create

1. **`src/lib/tier-gate.ts`** (new)
   - Export `async function hasTeamAdminAccess(userId: string): Promise<{ allowed: boolean; reason: string; tier: string | null }>`
   - Read `profiles.tier` via `supabaseAdmin`
   - If no row: `{ allowed: false, reason: 'no_profile', tier: null }`
   - If `tier === 'free'`: `{ allowed: false, reason: 'paid_tier_required', tier: 'free' }`
   - Otherwise: `{ allowed: true, reason: 'ok', tier: <value> }`
   - Cache optional but not required (DB hit is cheap)

2. **`src/app/api/team/[slug]/events/route.ts`** (new, GET only in G1a)
   - Auth via Clerk `auth()`; redirect 401 if no userId
   - Look up team by slug; 404 if not found / not active
   - Call `hasTeamAdminAccess(userId)` → if `!allowed`, return 402 with body `{ error: 'paid_tier_required', upgradeUrl: '/pricing', currentTier: ... }`
   - If allowed: return `{ events: [] }` (empty array placeholder; G1b adds real data)
   - Membership check: also confirm user is on roster (`team_members` row); 403 if not (team_admin features require team membership, not just paid tier)

## Files NOT changed in G1a

- `src/app/dashboard/team/[slug]/schedule/*` — still the stub page
- `src/app/dashboard/team/[slug]/events/*` — no UI yet (G1b)
- Existing payment routes — tier gate applied in G3
- `team_events` schema — no migration in G1a

## Must-keep-working (audit checklist)

After G1a ships:
1. Existing `/dashboard/schedule` stub still renders
2. Existing team pages (`/dashboard/team/[slug]`) still load
3. Existing payment routes still work (no gate applied yet)
4. Sign-in / auth flow unchanged
5. Free-tier users hitting the new route get a clear 402 with `upgradeUrl`
6. Paid-tier users (Arnel as `premium`) on a team they belong to get `{ events: [] }`

## Tier gate is server-side only

The helper is called in API routes and server components. Don't expose tier checks in client components — Clerk session has the tier in `publicMetadata`, but server-side is authoritative. If a client-side gate is needed later, use Clerk's `has()` or read `sessionClaims.publicMetadata.tier` but the source of truth is always the DB.

## Failure modes & defaults

- DB read fails (Supabase hiccup): default to `{ allowed: false, reason: 'db_error' }`. Fail closed — better to deny a paid user than grant a free user admin access.
- User has no profile row yet (just signed up): default to `{ allowed: false, reason: 'no_profile' }`. They can finish onboarding first.
- Edge case: `tier` is null/undefined: treat as free. Default deny.

## Out of scope (deferred)

- Auto-create team-admin audit logs (separate piece)
- Per-feature tier differences (all paid tiers get all admin features for now)
- Stripe webhook sync of tier changes (existing `/api/webhooks/stripe` handles it; G1a just reads)
- Migration of `family_plus` to DB (separate piece; PENDING per MEMORY.md)

## Ship plan

1. Write this prep doc (DONE)
2. Show Arnel the prep doc, ask "go"
3. Ship 1 commit: tier-gate.ts + smoke test API route
4. Audit: type-check, manual fetch test (curl with Arnel's session — note: requires Clerk token, so probably need to test in browser)
5. Verify: free-tier user gets 402, paid-tier user gets `{ events: [] }`
6. Log to `memory/2026-06-24.md`