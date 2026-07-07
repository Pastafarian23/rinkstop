# Phase 2 A-ii — Minor-Attribution Fix Prep

**Status:** Awaiting Arnel `go`
**Date:** 2026-07-07
**Author:** KiloClaw
**Companion docs:**
- `docs/phase-2-team-admin-audit.md` (audit findings)
- `docs/phase-2-team-admin-gap-fix.md` (lines 179-208, Phase A-ii section)

## Discovery

**Most of A-ii is already shipped under A-iii.** When A-iii implemented real e-sign
semantics (`632e1af`), the sign route was rewritten with the A-ii flow built in.
Verified by reading `src/app/api/team/[slug]/documents/[id]/sign/route.ts:113-140`:

```ts
// Minor-attribution: when caller signs as parent/guardian with player_id,
// verify the player is in their managed_profiles. Skip when caller is
// signing for themselves (no player_id).
let playerId: string | null = null;
if (body.player_id) {
  if (body.signed_by_role !== 'parent' && body.signed_by_role !== 'guardian') {
    return 400;  // player_id only valid for parent/guardian
  }
  const { data: link } = await supabaseAdmin
    .from('managed_profiles')
    .select('profile_id')
    .eq('manager_user_id', userId)
    .eq('profile_id', body.player_id)
    .eq('profile_type', 'player')
    .maybeSingle();
  if (!link) return 403;
  playerId = body.player_id;
}
```

The route already:
1. ✅ Accepts optional `player_id`
2. ✅ Validates it (parent/guardian role only, in caller's managed_profiles)
3. ✅ Sets `player_id` on the signature row
4. ✅ Falls back to parent-self-sign behavior when `player_id` is absent

**What A-ii still needs:**

1. A child-picker UI in `DocumentsClient.tsx` so parents can actually pick their
   kid instead of typing a UUID. Today they'd have to know the UUID — impossible.
2. A small verification step to confirm the route still behaves as documented
   (no separate route change needed if the existing code is correct).

## Verified live state (2026-07-07 ~08:36 CDT)

- `document_signatures.player_id` exists as **TEXT NULL** (verified via `information_schema.columns`)
- `managed_profiles.profile_id` is **UUID NOT NULL** (verified)
- `players.id` is **UUID NOT NULL** (verified)
- Existing code does an implicit UUID→TEXT cast on insert. Works, but mismatched types
  — see "Known variance" below.

**Will-keep or fix:** For A-ii, this is left as-is. A future cleanup (separate piece)
can `ALTER COLUMN` to UUID. Out of scope here.

## What this phase changes

### 1. UI edit only: `DocumentsClient.tsx`

When a parent/guardian clicks "Sign" on a required team-wide doc, show a child
picker (dropdown of `managed_profiles` rows where `profile_type = 'player'`).

**Implementation outline:**

```tsx
// 1. Fetch parent's managed profiles (kids) at component mount via a new
//    /api/me/managed-profiles route or via the parent passing them in props.
//    Decision: server page fetches and passes props — matches existing
//    DocumentsClient prop-driven pattern.

// Page (src/app/dashboard/team/[slug]/documents/page.tsx) adds:
const { data: managedKids } = ... await supabaseAdmin
  .from('managed_profiles')
  .select('profile_id, relationship, players:profile_id (id, first_name, last_name, slug)')
  .eq('manager_user_id', userId)
  .eq('profile_type', 'player');
// pass to DocumentsClient as managedKids prop

// In the sign modal, when signingRole in ('parent','guardian') AND managedKids.length > 0:
//   show a child picker (select). Default = "myself" (player_id NOT sent).
//   on select → store chosen player UUID; include in sign POST body as `player_id`.

// Required-for-kid docs: when `doc.required === true && doc.kind === 'liability_waiver'`
// (or `medical_consent`, whichever we tag), the picker is mandatory.
// For informational docs, the picker stays optional ("signing on behalf of one of my kids?")
```

**`doc.kind` handling:** Today the codebase accepts `kind` as a free TEXT column
(per A-0 migration). There's no enum constraint. The picker logic should be
strict-but-extensible:
- If `kind` is one of `liability_waiver | medical_consent | code_of_conduct`,
  picker is **required** for parents.
- Otherwise picker is **optional**.
- If the parent has 0 kids, the picker doesn't appear at all (defensive).

### 2. New prop threading
`DocumentsClient` already takes props. Add `managedKids` (shape below). No API
changes.

```ts
interface ManagedKid {
  player_id: string;        // managed_profiles.profile_id == players.id
  first_name: string;
  last_name: string;
  full_name: string;         // derived "First Last"
  relationship: string;      // "parent", "guardian", etc.
}
```

### 3. Verify existing route doesn't need edits

The route already does the right thing. **No code changes to `sign/route.ts`.**
A-ii as a code change is UI-only.

If verification fails (route rejects valid `player_id` or accepts invalid ones),
escalate and write a follow-up plan. Do NOT bundle a route fix into A-ii.

## What this phase MUST NOT change

- The sign route (`sign/route.ts`) — verify only, no edits
- `document_signatures` schema — no migration
- A-iii e-sign surface (already shipped, contract fixed)
- A-i distribution/inbox (just shipped, independent)
- Player-documents (separate system, different `player_documents` table)

## Must-keep-working audit checklist

- [ ] Sign flow with `player_id` absent still works (parent self-sign → `player_id = NULL`)
- [ ] Sign flow as `signed_by_role === 'player'` still maps to caller's user_id (legacy path)
- [ ] Sign flow as `signed_by_role === 'parent'` + `player_id` valid → row has player UUID
- [ ] Sign flow as `signed_by_role === 'parent'` + invalid `player_id` → 403
- [ ] Sign flow as `signed_by_role === 'player'` + `player_id` present → 400 (rejected)

## Smoke plan

1. **Build:** `pnpm run build` exit 0
2. **Visual:** when a parent with kids logs in and clicks "Sign" on a liability
   waiver, the picker shows their kids' names (no UUID typing needed)
3. **Smoke test in production** (after deploy, requires Arnel parent account or
   a test account Arnel sets up):
   - Parent A signs liability waiver for kid 1 → DB row has the UUID under `player_id`
   - Parent A self-signs a different informational doc → DB row has `player_id = NULL`
   - Parent B (no kids) signs any doc → still works (picker is hidden)
   - Manual `curl` smoke: parent with managed profile signs with random UUID
     → API returns 403 (rejected, not silently bypassed)

## Rollback plan

`DocumentsClient.tsx` revert + reload (1 file, ~50 lines). No migration, no route
edit. Page-level revert; no database impact.

## Risk

**Low.** UI-only. Backwards compatible — `player_id` absent path unchanged.

## Known variance (NOT fixed in this phase)

`document_signatures.player_id` is TEXT in the live DB. The relations upstream
(`managed_profiles.profile_id`, `players.id`) are UUID. Postgres casts on insert,
so this works today. It's a schema smell that a separate piece should clean up
(`ALTER COLUMN document_signatures.player_id TYPE UUID USING player_id::uuid`).

For A-ii: document and move on. Not bundled.

## Push plan

1. Confirm sign route still passes all 5 must-keep-working cases (read-only check)
2. UI edit: `DocumentsClient.tsx` + `page.tsx` prop threading
3. `pnpm run build` (exit 0)
4. Visual smoke (parent with kids → picker appears)
5. One commit to `main`. Vercel auto-deploys.
6. Arnel does the manual `curl` smoke 3 against his parent account → reports back.

## What I will NOT do without your explicit `go`

- Push to `main`
- Any DB schema change (none needed)
- Any route change (none needed)
