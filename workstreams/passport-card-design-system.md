# Passport Card — Design System Spec

**Date:** 2026-07-16
**Author:** Arnel (creative direction) + KiloClaw (scope + technical breakdown)
**Status:** Approved direction. Treat as a binding spec for WS2 PR2 and every future Passport surface.

---

## Philosophy (Arnel-flagged, do not deviate)

> When someone opens the dashboard, the first reaction should be: "This is my Hockey Passport."

The Passport Card is **not** a settings card, profile card, or ID badge. It is a **premium credential** that communicates permanence, collectibility, officialness, trust, premium quality, and timelessness — the design language of a product in its own right, not a feature inside RinkStop.

**Reference language:** blend of Apple Wallet pass + national passport + NHL credential + premium membership card. Borrow the *feeling*, never the visual.

**Avoid:** credit card look, government ID look, dashboard widget look, settings panel look.

## One Card, Many Surfaces (the design-system intent)

The Passport Card is the visual identity of the entire platform. Every surface that shows a Passport must use the same design language:

| Surface | Used by | Status |
|---|---|---|
| Passport Dashboard Card | `/dashboard/passport` | WS2 PR2 Priority 1 (first implementation) |
| Public Passport Card | `/p/[passportId]` | WS2 PR3 |
| Mobile Passport Card | Capacitor / native apps | Future (WS6) |
| Wallet Pass | Apple Wallet / Google Wallet | Future (WS6) |
| Physical Passport | First-page insert | Future (WS5) |
| Tournament verification screen | Future kiosk / staff view | Future (WS4) |
| Recruiter view | Resume surface | Future (WS6) |

**Rule:** Create the Card once, reuse it everywhere. This is a design system primitive, not just another React component.

---

## Card Anatomy — Front

Information hierarchy (largest → smallest visual weight):

1. **Passport ID** — *largest piece of data on the card*. The ID IS the identity. Monospace, gold accent (`#FFB81C`), generous letter-spacing, prominently positioned.
2. **Holder photo** — 64px (dashboard) / larger (physical), circular, gold border. Empty state: gold ring + first initial in Bebas Neue.
3. **Holder name** — full name, clear and authoritative.
4. **Verification level** — visible label + small visual ladder indicator (1–8 rungs filled).
5. **Current roles** — chips: Player · Coach · Parent · Org Admin · etc.
6. **Member Since** — date, "since 2024" format when older.
7. **Passport Status** — pill: Active / Pending / Verified / Suspended / etc. Distinct color per status.
8. **Small RinkStop mark** — small wordmark or icon, footer-corner placement, subtle (not branding-heavy).

**Copy discipline:** never "settings-style" labels. Card fields speak in passport language, not account-settings language. Examples:
- ✅ "Member Since"
- ❌ "Account Created"
- ✅ "Issued"
- ❌ "Created At"

## Card Anatomy — Bottom Actions

Three buttons, all visible from day one so users understand the roadmap:

1. **Copy Passport ID** — primary action, always enabled. Tap → clipboard → toast confirmation "Passport ID copied".
2. **Share Passport** — disabled with tooltip "Public Passport sharing ships in a future release". Becomes active in PR3.
3. **View Public Passport** — disabled with tooltip "Coming soon". Active in PR3.

These exist visually now so users understand where the platform is going.

## Design Tokens (binding)

These tokens will live in `src/components/design-system/passport-card/tokens.ts` once implementation begins. Values below are the source of truth.

**Colors:**
- Card background: navy gradient `linear-gradient(180deg, #041E42 0%, #02132B 100%)` (matches existing dashboard aesthetic)
- Primary text: `#FFFFFF`
- Secondary text: `rgba(255,255,255,0.5)`
- Passport ID / accent gold: `#FFB81C`
- Photo border / subtle highlights: `rgba(255,184,28,0.4)`
- Status — Active: `#FFB81C` gold
- Status — Pending: `rgba(255,255,255,0.6)` muted
- Status — Verified: `#34D399` (green, also used in WS4 verification ladder)
- Status — Suspended: `#F87171` red
- Status — Expired: `rgba(255,255,255,0.4)` muted
- Card border: `1px solid rgba(255,255,255,0.12)`

**Typography:**
- Headers ("RINKSTOP HOCKEY PASSPORT", "PASSPORT ID"): Bebas Neue, letter-spacing 0.12em
- Holder name: system-ui / Inter, weight 600, 1.125rem
- Passport ID: ui-monospace / SFMono-Regular, weight 500, 1.125rem, letter-spacing 0.04em, color `#FFB81C`
- Field labels: 0.6875rem, letter-spacing 0.08em, uppercase, color `rgba(255,255,255,0.5)`
- Field values: 0.9375rem, weight 500

**Layout:**
- Card padding: 1.5rem (dashboard) — adjust for mobile/physical
- Border radius: 12px
- Field grid: 2 columns desktop, 1 column mobile
- Photo: 64px (dashboard), 80px (public Passport), 96px (physical)
- Aspect ratio: roughly 1.6:1 (wallet-card proportion)

## Empty States Within the Card

Per the WS2 Priority 6 rule ("No section ever says 'No data'"), every empty state inside the Card answers why empty / why care / what next:

- **No photo:** Initial avatar (already implemented). Copy could read "Add a photo to personalize your Passport" if user has edit permission — but Card is read-only in WS2, so no action prompt.
- **No Passport yet:** Card shows "Pending issuance" for status, "Unverified" for verification, "—" for dates. Holder name still shows from profile.
- **No current roles:** "Your Passport is ready. As you participate in hockey — playing, coaching, parenting — your roles will appear here."

---

## QR Strategy (Decision 2)

### Endpoint (stable, opaque identifier)

`rinkstop.com/qr/{qrIdentifier}`

**Critical rule:** the QR encodes the **opaque `qrIdentifier`**, never the Passport URL or Passport ID.

Why: the `qrIdentifier` is an internal map from a revocable token → Passport. This protects the platform if URL structures change, allows revocation/redirect without reissuing physical passports, supports analytics, and gates dynamic redirects + privacy controls.

### Implementation (WS2 PR2)

The `qrIdentifier` field does not yet exist on the Passport model. PR2 work:

1. **Schema migration** — add `qr_identifier` column to `public.passports` (uuid, indexed, default `gen_random_uuid()` for backfill).
2. **QR generator** — server-rendered at `/api/internal/passport/qr/[passportId]/route.ts` returning an SVG (vector, infinite zoom, smallest payload). Service-role gated.
3. **Card renders QR** — `<img src="/api/internal/passport/qr/{passportId}">` server-rendered, no client generation.
4. **Resolution endpoint (stub for now, real in PR3)** — `/qr/[qrIdentifier]/route.ts` resolves the identifier to a Passport and redirects to `/p/[passportId]`. Behind flag `PASSPORT_QR_RESOLVE` (defaults off in WS2 PR2 — disabled gracefully when off).
5. **Flag protection** — if endpoint not yet implemented or disabled, render a tasteful placeholder (e.g. small "QR coming soon" tag in the QR slot). Do not ship a client-side fallback that will need to be removed later.

### Why server-generated, never client

- QR is infrastructure (analytics, revocation, dynamic redirects, deep links, privacy enforcement, future mobile/NFC integration).
- Client-side generation cannot revoke, cannot redirect, cannot track scans, cannot change destination.
- Server endpoint can be cached at CDN edge; client cannot.

---

## Implementation Plan (WS2 PR2)

### Step 1 — Design system extraction
Create `src/components/design-system/passport-card/` with:
- `tokens.ts` — colors, typography, spacing (binding spec)
- `PassportCard.tsx` — the single source-of-truth component
- `PassportCard.module.css` — visual styling (move away from inline styles for design-system primitive)
- `index.ts` — public exports

Move/re-export from `src/components/passport/PassportCard.tsx` so existing import sites keep working during the transition.

### Step 2 — Schema migration
- `supabase/migrations/2026-07-16_passports_qr_identifier.sql` — add `qr_identifier uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE` to `public.passports`
- Index on `qr_identifier`
- Backfill is automatic via default

### Step 3 — Service additions (extend, don't fork)
- `passportService.getQrIdentifier(passportId)` — reads the field
- `passportService.regenerateQrIdentifier(passportId)` — for revocation (admin only, not exposed in PR2)
- Update `getDashboardState()` to include `qrIdentifier` in the composed view

### Step 4 — QR endpoint
- `/api/internal/passport/qr/[passportId]/route.ts` — service-role gated, returns SVG (use a vetted lib like `qrcode` npm package)
- Cache headers: `Cache-Control: public, max-age=86400` (24h — re-renders only if identifier changes)
- Flag-gated: `PASSPORT_INTERNAL_API` must be on (same as other internal endpoints)

### Step 5 — Card UI overhaul
Rebuild `PassportCard.tsx` per the anatomy spec above:
- Front: ID (largest), photo, name, verification level, roles, member since, status, RinkStop mark
- Bottom actions: Copy ID (primary, enabled), Share (disabled, tooltip), View Public (disabled, tooltip)
- Match design tokens

### Step 6 — Verification
- `tsc --noEmit` — 0 errors
- Existing 22 vitest tests still pass
- New tests: QR endpoint returns valid SVG, `getQrIdentifier` returns the field, regeneration produces a different value
- Visual: when flag flipped on, Card renders with new anatomy (manual verify via screenshot — defer to flag-flip session)

### Step 7 — Preserve & ship
- Pre-commit hook check (workspace repo) — bootstrap files under threshold
- Vercel env unchanged (`PASSPORT_DASHBOARD=false` stays)
- Feature flags protect all new code

## Out of Scope for WS2 PR2

- Public Passport rendering at `/p/[passportId]` (PR3)
- Apple/Google Wallet passes (WS6)
- Mobile Passport Card (WS6)
- Physical Passport design (WS5)
- Tournament verification kiosk (WS4+)
- Recruiter view (WS6)

The Card design tokens and component built in WS2 PR2 are the **foundation** these future surfaces will reuse. None of them should fork the Card — they should all import from `design-system/passport-card/`.

## Decision Authority

This spec is **Arnel-flagged**. Changes to:
- Design tokens (colors, typography, spacing)
- Card anatomy / information hierarchy
- The "one card, many surfaces" principle
- The QR endpoint strategy (`/qr/{qrIdentifier}`, server-rendered, never client)

…all require explicit Arnel approval.
