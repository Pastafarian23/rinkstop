# Workstream 2 — PR2 Implementation Plan (Architecture-First)

**Date:** 2026-07-16
**Author:** Arnel (sequencing + asset service principle) + KiloClaw (scope)
**Status:** Approved direction. Architecture before UI.

---

## Philosophy (Arnel-flagged)

> The Card must be built against the final architecture, not a temporary implementation.

This sequencing ensures every future surface — public Passport, Wallet pass, physical Passport, recruiter view, tournament verification — reuses the same asset infrastructure instead of requiring another round of refactoring.

**No UI work begins until the architecture is in place.**

---

## Architectural Addition — Passport Assets Service

The Card does **not** know how QR codes work. It asks the Passport Assets Service for the visual assets it needs.

```
Passport Card (UI component)
  │
  ▼  "Give me this Passport's visual assets"
Passport Assets Service
  │
  ├── QR SVG (current PR2 scope)
  ├── Wallet Pass artwork (WS6)
  ├── Printable Passport assets (WS5)
  ├── Verification badge images (WS4)
  ├── PDF export (WS6)
  └── Social share cards (WS6)
```

**Why:** keeps the design system clean, makes future expansion trivial. The Card never imports a QR library; it asks for an asset URL/blob and renders it.

---

## Step 1 — Schema & Service Layer (FIRST)

### 1.1 Schema migration

Create `supabase/migrations/2026-07-16_passport_qr_identifier.sql`:

```sql
-- Additive: qrIdentifier on existing passports. Immutable after insert.
ALTER TABLE public.passports
  ADD COLUMN IF NOT EXISTS qr_identifier uuid NOT NULL DEFAULT gen_random_uuid();

-- Immutable guarantee: prevent UPDATE on qr_identifier (revocation regenerates the row,
-- not the identifier — see 1.4 for the revocation path)
CREATE OR REPLACE FUNCTION prevent_qr_identifier_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.qr_identifier IS DISTINCT FROM NEW.qr_identifier THEN
    RAISE EXCEPTION 'qr_identifier is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS passports_qr_identifier_immutable ON public.passports;
CREATE TRIGGER passports_qr_identifier_immutable
  BEFORE UPDATE ON public.passports
  FOR EACH ROW
  EXECUTE FUNCTION prevent_qr_identifier_update();

CREATE UNIQUE INDEX IF NOT EXISTS passports_qr_identifier_idx
  ON public.passports(qr_identifier);

-- Audit log of QR identifier regenerations (revocations)
CREATE TABLE IF NOT EXISTS public.passport_qr_revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id uuid NOT NULL REFERENCES public.passports(passport_id) ON DELETE CASCADE,
  old_qr_identifier uuid NOT NULL,
  new_qr_identifier uuid NOT NULL,
  reason text,
  revoked_by text,                 -- service role user id, or 'admin:<userId>'
  revoked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS passport_qr_revocations_passport_idx
  ON public.passport_qr_revocations(passport_id);
```

**RLS** on `passport_qr_revocations` follows the existing pattern from the WS1 migration: owner-readable, service-role-writable. Add in the same migration.

### 1.2 Repository methods

Extend `src/lib/passport/03-repository.ts` (additive — no changes to existing methods):

```typescript
async findByQrIdentifier(qrIdentifier: string): Promise<PassportRecord | null>;
async regenerateQrIdentifier(passportId: string, reason: string, revokedBy: string): Promise<PassportRecord>;
```

`regenerateQrIdentifier` is admin-only and goes through a separate code path; not exposed in PR2 UI.

### 1.3 ID generator — already exists, no change

`src/lib/passport/06-id-generator.ts` already handles Passport ID generation. The `qr_identifier` is a Postgres-generated uuid with `gen_random_uuid()` default — no application-side generator needed. The trigger enforces immutability.

### 1.4 Revocation path (built into the service, not exposed yet)

When `regenerateQrIdentifier` runs:
1. Read old `qr_identifier`.
2. INSERT into `passport_qr_revocations` with old + new + reason + revoked_by + timestamp.
3. UPDATE `passports` to set new `qr_identifier`. Wait — the trigger prevents UPDATE on `qr_identifier`. Resolution:

**Two options, deciding in implementation:**
- **(a) Drop-and-reinsert pattern:** in a transaction, copy the Passport row, copy all events/links to the new passport_id, mark old as deactivated. Passport ID itself changes — physical cards become orphaned to the old passport_id. This is the cleanest model but breaks the "Passport ID is permanent" guarantee.
- **(b) Admin override pattern:** revocation is a privileged op that bypasses the trigger via `SECURITY DEFINER` function. Old QR keeps resolving to the old Passport (which may have a redirected lookup). The trigger still protects normal updates.

**Default to (b)** — preserves Passport ID permanence (the WS1 guarantee) while allowing controlled revocation for security incidents. The override function is `SECURITY DEFINER` and only callable by service role. Implement and document in the migration; the trigger + override function pair is the security model.

### 1.5 Passport Assets Service

Create `src/lib/passport/12-assets-service.ts`:

```typescript
/**
 * Passport Assets Service
 *
 * Single source of truth for all visual / sharable / exportable assets
 * derived from a Passport. The Passport Card (and every other surface —
 * public Passport, Wallet pass, physical print, recruiter view) requests
 * assets through this service. The service hides the implementation
 * details (QR generation, PDF assembly, wallet-pass packaging, etc.).
 *
 * Current assets:
 *   - qrSvg(passportId): returns SVG string for the Passport's QR code
 *
 * Future assets (out of scope for PR2 but the service contract supports them):
 *   - walletPass(passportId): pkpass bundle
 *   - pdfExport(passportId): printable PDF
 *   - badgeImage(passportId, level): verification badge PNG
 *   - socialShareCard(passportId): OG image
 */

export interface PassportAssetsService {
  qrSvg(passportId: string): Promise<{ svg: string; qrIdentifier: string }>;
  // ...future
}

export const passportAssetsService: PassportAssetsService = new PassportAssetsServiceImpl();
```

Implementation details for `qrSvg`:
- Use the `qrcode` npm package (server-side, no DOM dependency) — add to dependencies.
- Encode the **opaque `qrIdentifier`** (uuid), not the Passport URL.
- Return SVG string (vector, smallest payload, infinitely zoomable).
- Cache at the route level (HTTP `Cache-Control: public, max-age=86400`).
- Server-side errors return a tasteful placeholder SVG (a 1×1 transparent rect with a comment node saying "QR unavailable"). Never throw to the caller.

### 1.6 Internal QR endpoint

Create `src/app/api/internal/passport/qr/[passportId]/route.ts`:

- POST method (matches existing internal endpoints pattern).
- Service-role auth gate (`isPassportInternalApiEnabled()` flag).
- Calls `passportAssetsService.qrSvg(passportId)`.
- Returns SVG with `Content-Type: image/svg+xml`, `Cache-Control: public, max-age=86400`.
- Errors: 403 if flag off, 404 if no Passport, 500 only if SVG generation itself fails (rare — placeholder path covers it).

### 1.7 Public resolver stub

Create `src/app/qr/[qrIdentifier]/route.ts`:

- GET method.
- Feature-flagged behind a new flag: `PASSPORT_QR_RESOLVE` (defaults off).
- When flag off: 404.
- When flag on, calls `passportRepository.findByQrIdentifier(qrIdentifier)`.
  - If not found OR found but old (revoked): render a "This QR code is no longer active" page.
  - If found and active: 302 redirect to `/p/[passportId]` (PR3 will own `/p/[passportId]`). For PR2, if `/p/[passportId]` doesn't exist yet, render a "Coming soon — your Public Passport is being prepared" page.

### 1.8 Update `getDashboardState` to include qrIdentifier

Extend `src/lib/passport/07-passport-service.ts` `getDashboardState()`:

```typescript
const qrIdentifier = passport ? passport.qrIdentifier : null;
return { view, passport, recentEvents, qrIdentifier };
```

`PassportDashboardState` interface gets a new field. Existing callers unaffected (additive).

### 1.9 Feature flags

Add to `src/lib/passport/02-feature-flags.ts`:

```typescript
PASSPORT_QR_RESOLVE: 'pasport.qr.resolve',  // public /qr/[qrIdentifier] resolution
PASSPORT_ASSETS_API: 'passport.assets.api',  // /api/internal/passport/qr/[id]
```

Both default to **off**. The internal QR endpoint requires `PASSPORT_INTERNAL_API && PASSPORT_ASSETS_API` (defense in depth).

---

## Step 2 — Build the Passport Card (after service layer is complete)

Create `src/components/design-system/passport-card/`:
- `tokens.ts` — design tokens (colors, typography, spacing) per `passport-card-design-system.md`
- `PassportCard.tsx` — the single source-of-truth component
- `PassportCard.module.css` — visual styling (move away from inline styles)
- `index.ts` — public exports
- Re-export from `src/components/passport/PassportCard.tsx` so existing import sites keep working during transition.

Card consumes:
- `passport: PassportRecord` (now includes `qrIdentifier`)
- `view: PassportUnifiedView`
- `<img src="/api/internal/passport/qr/{passportId}">` server-rendered, no client generation

Bottom actions:
- **Copy Passport ID** (active, with toast)
- **Share Passport** (disabled, tooltip "Public Passport sharing ships in a future release")
- **View Public Passport** (disabled, tooltip "Coming soon")

All visually present from day 1 so users see the roadmap.

---

## Step 3 — Polish (after Card exists)

Animations, responsive behavior, accessibility, loading states, skeletons, empty states. Only after Step 2 lands.

---

## Deliverables — Implementation Report + QA + Constitution Audit

Before moving to PR2 Priority 2 (Passport Overview), produce three artifacts:

1. **Implementation Report** (`workstreams/workstream-2-pr2-p1-implementation.md`)
   - What shipped (file list + line counts)
   - Schema migration applied (locally + verified)
   - Endpoints registered + smoke-tested
   - Feature flags added + defaults
   - Known follow-ups

2. **QA Report** (`workstreams/workstream-2-pr2-p1-qa.md`)
   - `tsc --noEmit` — 0 errors
   - Vitest — old + new tests pass
   - Manual smoke:
     - Flag off → no new endpoints respond (403/404)
     - Flag on → `/api/internal/passport/qr/{id}` returns valid SVG
     - `/qr/{qrIdentifier}` flag off → 404; flag on → placeholder page (or redirect if PR3 ready)
   - Live prod smoke (without flipping flags): endpoint routes register, but 403 on POST without flag
   - Sub-route preservation unchanged (legacy editor still byte-identical)

3. **Constitution Compliance Audit** (`workstreams/workstream-2-pr2-p1-constitution.md`)
   - All access through Identity Resolver / Passport Service ✓ (no UI → table direct)
   - Feature flags gate all new code ✓
   - No existing functionality removed ✓
   - One-piece-at-a-time ✓ (schema, service, endpoint, Card as separate commits)
   - Existing sub-routes and external references unchanged ✓

---

## Commit Strategy (PR2 Priority 1)

Five focused commits, in order. Each commit leaves the codebase in a working state.

1. **Schema** — `2026-07-16_passport_qr_identifier.sql` + immutability trigger + revocation audit table + RLS. Migration applied locally, `tsc` clean.
2. **Repository** — `findByQrIdentifier` + `regenerateQrIdentifier` (SECURITY DEFINER override) + tests.
3. **Assets Service** — `12-assets-service.ts` with `qrSvg()` + tests.
4. **Endpoints** — `/api/internal/passport/qr/[passportId]` POST + `/qr/[qrIdentifier]` GET stub + flag additions.
5. **Card UI** — design system extraction + new component consuming the architecture (no QR shortcuts).

After commit 5 lands: write the three reports, get Arnel's review, then move to PR2 Priority 2 (Overview).

---

## Out of Scope for PR2 Priority 1

- Public Passport rendering at `/p/[passportId]` (PR3)
- Card polish: animations, a11y, skeletons (Step 3, after Step 2 lands)
- Wallet passes (WS6)
- Physical Passport (WS5)
- Tournament verification kiosk (WS4)
- Recruiter view (WS6)

## Decision Authority

This implementation plan is **Arnel-flagged**. Specifically:
- The Step 1 / Step 2 / Step 3 sequencing (architecture-first, not UI-first)
- The Passport Assets Service abstraction (Card must not know how QR works)
- The opaque `qrIdentifier` strategy (never encode Passport URL in QR)
- Server-rendered QR only (no client generation, ever)
- The immutable `qr_identifier` column with SECURITY DEFINER override for revocation

Any deviation requires explicit Arnel approval.

## What This Means for Next Session

When this session ends, the next session should:

1. Read this file first.
2. Confirm Step 1 work hasn't started (no commits beyond this plan).
3. Begin with Step 1.1 (schema migration) — additive, idempotent, IF NOT EXISTS everywhere.
4. Run `tsc --noEmit` after each commit.
5. Stop after the first commit lands (migration) and confirm with Arnel before continuing to Step 1.2.

This staged-confirmation pattern is intentional. Schema → repo → service → endpoint → UI each deserve a checkpoint.
