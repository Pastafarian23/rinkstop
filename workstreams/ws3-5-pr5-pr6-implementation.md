# WS3.5 PR5 + PR6 — Family Hub Multi-Stamp Passport Picker + subject_passport_id

**Author:** KiloClaw
**Date:** 2026-07-22
**Status:** Feature-complete. tsc clean. Feature flag off (`STAMPS_FAMILY_PICKER_ENABLED=false`); awaiting Arnel greenlight before merging to main.

## What this PR does

Two PRs combined into one for shipping efficiency (PR6 depends on PR5 per spec, no value shipping them separately):

1. **PR5 — Passport picker UI** on `/stamp/[qrIdentifier]`. When enabled and caller has 2+ eligible Passports, a card-style picker shows before the Yes-stamp button. Caller picks which Passport receives the stamp (own or linked kid via `managed_profiles`). When caller has 0 eligible Passports, a "you need a verified Passport" empty-state with a CTA to `/dashboard/passport`. When caller has 1 (just own), no picker — current WS3 PR2 behavior.
2. **PR6 — `subject_passport_id` column** on `public.stamps`. New column records WHICH Passport a stamp attaches to. Service layer accepts `subjectPassportId` in `CreateStampRequest` and resolves the value server-side when not provided.

Per Workstream 1 Rule 9: the migration only ADDS a column + index + CHECK. Does not modify any existing FK or column. Existing stamps have `subject_passport_id = NULL` (backfilled on read via `actor_user_id` → one Passport per user today).

Per Workstream 1 Rule 5: Feature flag is `STAMPS_FAMILY_PICKER_ENABLED` (default false). Production behavior is unchanged until the flag is flipped. The new `subject_passport_id` column ships unconditionally (data, not behavior) — services still resolve the value transparently when the picker is off.

## Files changed

### `supabase/migrations/2026-07-22_stamps_subject_passport_id.sql` (NEW)

Three sections:

1. **Add `subject_passport_id text` column to `public.stamps`.**
   Nullable. Same TEXT type as `passports.passport_id` (no FK constraint per Rule 9).

2. **Index** `stamps_subject_passport_id_idx` — partial WHERE `subject_passport_id IS NOT NULL`, sorted by `stamped_at DESC`. Same shape as the existing `stamps_subject_user_id_idx` for query patterns like "list stamps for Passport X".

3. **CHECK constraint** `stamps_subject_identity_check` — at least one of `subject_user_id`, `subject_passport_id`, `actor_user_id` must be set. Defense against degenerate empty rows. Idempotent (DO-block gated on existence).

### `src/lib/passport/02-feature-flags.ts` (MODIFIED)

- Added `STAMPS_FAMILY_PICKER_ENABLED: false` to `PASSPORT_FLAGS`.
- Added `isStampsFamilyPickerEnabled()` helper that requires both `isStampsEnabled()` AND the new flag. Per spec: picker is meaningless without the stamp workflow.

### `src/lib/passport/index.ts` (MODIFIED)

- Re-exported `isStampsFamilyPickerEnabled` from the barrel so consumers can `import { isStampsFamilyPickerEnabled } from '@/lib/passport'`.

### `src/lib/passport/types.ts` (MODIFIED)

- `CreateStampRequest.subjectPassportId?: string` — NEW optional field.
- `StampRecord.subjectPassportId: string | null` — NEW field on the row shape.

### `src/lib/passport/13-stamp-service.ts` (MODIFIED)

**`stampRowToRecord()` — pull new column.**

Added `subjectPassportId: (row.subject_passport_id as string | null) ?? null` to the row mapper.

**`createStamp()` — resolve and persist subject_passport_id.**

New resolution block after the visibility line (before third-party validation):

```ts
let subjectPassportId: string | null = req.subjectPassportId ?? null;
if (!subjectPassportId) {
  const resolveUserId = req.subjectUserId ?? actorUserId;
  const { data: passportRow, error: passportErr } = await supabaseAdmin
    .from('passports')
    .select('passport_id, status')
    .eq('internal_user_id', resolveUserId)
    .maybeSingle();
  if (passportErr) throw new Error(...);
  if (!passportRow) {
    throw new StampForbiddenError(
      req.subjectUserId
        ? 'Subject has no Passport; cannot stamp'
        : 'You need a verified Passport to stamp here'
    );
  }
  subjectPassportId = passportRow.passport_id as string;
}
```

Then the INSERT includes `subject_passport_id: subjectPassportId`.

**`listEligiblePassportsForStamping(userId)` — NEW public method.**

Resolves the caller's eligible Passports:
1. Caller's own Passport (always eligible if it exists).
2. Passports owned by `managed_profiles.profile_id` rows where caller is the manager AND `relationship IN ('parent', 'guardian')` AND `profile_type='player'` AND the kid's `passports.verification_level != 'none'` AND `status` is active.

Returns `Array<{ passportId, internalUserId, displayName, ageYears, relationship, verificationLevel }>` sorted by: own first, then kids by age (youngest first), then kids with no known age last.

`ageFromDob()` — private helper converting ISO `date_of_birth` to age in years.

### `src/app/stamp/[qrIdentifier]/page.tsx` (MODIFIED)

Loads `eligiblePassports` (when `isStampsFamilyPickerEnabled()`) and passes them to the client form. Imports `isStampsFamilyPickerEnabled` from the barrel.

### `src/app/stamp/[qrIdentifier]/stamp-confirm-form.tsx` (MODIFIED)

**New props:** `eligiblePassports: EligiblePassport[]`, `familyPickerEnabled: boolean`.

**New state:**
- `showPicker` = `familyPickerEnabled && eligiblePassports.length >= 2`.
- `showEmptyState` = `familyPickerEnabled && eligiblePassports.length === 0 && !subjectUserId`.
- `pickedPassportId` default = `eligiblePassports[0]?.passportId ?? null`.

**Effective values for the rest of the form:**
- `effectiveSubjectUserId` = picked Passport's `internalUserId` when picker open; else `subjectUserId`.
- `effectiveSubjectName` = picked Passport's `displayName` when picker open; else `subjectName`.
- `isCoachScan` (controls context selector visibility) = `effectiveSubjectUserId !== caller's own Passport id` when picker open; else legacy logic.

**POST body** now includes `subjectPassportId: pickedPassportId` when picker open; service falls back to server-side resolution otherwise.

**UI changes:**
- Empty-state block at the top: "You need a verified Passport" with CTA → `/dashboard/passport`.
- Picker section: card-style buttons, one per eligible Passport, showing `displayName`, `(you)` badge for own, `passportId`, `age` (when known). Active pick has navy outline + tinted background.
- Done-state copy: "X's Passport now records Y" when stamping on behalf of a kid (relationship !== 'self').

## Verification

- `npx tsc --noEmit -p tsconfig.json` → exit 0.
- Service layer compiles with `StampTargetType` and `PassportAdapterLike` interfaces unchanged.
- No Vercel preview yet (PR not opened).

## Stack

Built on top of main (post-PR1). Independent of PR2 / PR3 / PR4 — none of those files are touched. Mergeable in any order with #35 / #36 / #39.

## Production behavior

Unchanged until `STAMPS_FAMILY_PICKER_ENABLED=true` on Vercel (and `STAMPS_ENABLED=true`, which PR1 also gated). When the flag is off:
- `/stamp/[qrIdentifier]` does not call `listEligiblePassportsForStamping` (skipped at the page layer).
- `createStamp()` still resolves `subject_passport_id` server-side from `actor_user_id` (self-scan) or `subject_user_id` (third-party) — no behavior change for callers, but the column is now populated on new stamps.
- Stamp reads/dashboards that filter on the column will see data once flag is flipped.

## Out of scope (WS4+)

- Coach stamping on behalf of player (today's coach flow already uses `?subject=` query param; picker doesn't replace that path).
- Bulk-stamping at tournaments.
- Photo verification on multi-stamp.
- Multi-passport-per-user (today: one Passport per user; the column future-proofs the schema).