# RinkStop Platform Audit — Phase 1a + Phase 1b-1

**Audit date:** 2026-07-06 16:56 CDT
**Scope:** 11 recent commits on `main` (Phases 1a + 1b-1) + migration `2026-07-06_player_documents.sql`
**Commits in scope:**
- `42196cb` Phase 1b-1 Player Documents (parent uploads for linked children)
- `52907d3` Phase 1a schedule empty state
- `1fb5801` Phase 1a profile → Hockey Passport
- `a2cbcf6` Phase 1a ConsumerCards row
- `1a8e36a` Phase 1a Family Hub multi-section
- `4f9d94a` Phase 1a FamilySetupWizard mount + parent gate
- `5933eae` Phase 1a FamilySetupWizard client
- `8729212` Phase 1a /api/family/setup-state
- `f1f53cd` Phase 1a family_setup_completed_at column
- `2b6af58` Phase 1a profile cover banner
- `e9993ad` Phase 1a /profile/[slug] brand refresh
**Files read in full (7137 lines):**
`src/app/dashboard/page.tsx` (887), `src/app/dashboard/family/page.tsx` (574),
`src/app/dashboard/profile/page.tsx` (551), `src/app/dashboard/schedule/page.tsx` (192),
`src/app/dashboard/layout.tsx` (437), `src/app/profile/[slug]/page.tsx` (767),
`src/app/api/family/setup-state/route.ts` (160),
`src/components/dashboard/ConsumerCards.tsx` (523),
`src/components/family/FamilySetupWizard.tsx` (354),
`src/components/family/FamilySetupResume.tsx` (104),
`src/lib/tier.ts` (78), `src/lib/tier-gate.ts` (154), `src/lib/connections.ts` (189),
`src/app/api/player-documents/route.ts` (507),
`src/app/api/player-documents/[id]/route.ts` (276),
`src/components/player-documents/PlayerDocumentList.tsx` (434),
`src/components/player-documents/PlayerDocumentSection.tsx` (74),
`src/components/player-documents/PlayerDocumentUpload.tsx` (705),
`supabase/migrations/2026-07-06_player_documents.sql` (171).

**Prep docs consulted:** `docs/phase-1a-consumer-first-prep.md`,
`docs/phase-1b-player-documents-prep.md`.

---

## A. Auth & tier gates

### A-1. Three competing `tierAtLeast` helpers exist (`RISK`)
**Files:**
- `src/lib/tier.ts:67` — `tierAtLeast(actual, min)` (per-track ranks, separate `TIER_TRACK` table)
- `src/lib/tier-gate.ts:64` — `tierAtLeastSameTrack(actual, min)` (per-track ranks, separate `PERSONAL_TIER_RANK`/`BUSINESS_TIER_RANK`)
- `src/lib/connections.ts:60` — `tierAtLeast(actual, min)` (uses pricing's `TIER_TO_TRACK`)

**Callers:**
- `tier.ts` → only `RoleAwareTabBar.tsx`
- `tier-gate.ts` (as `tierAtLeastSameTrack`) → `/api/family/setup-state/route.ts:8`, `/api/player-documents/route.ts:7`, `/dashboard/family/page.tsx:7`, `/dashboard/page.tsx:19`
- `connections.ts` (as `tierAtLeast`) → `/dashboard/layout.tsx:11`

**What this means:** Each helper has its own rank table; they happen to agree on the canonical ranks but the helpers are not literally shared. If a new tier is added (e.g. `club_elite` -> rank 4), three places need updates. The API routes and the dashboard page do use the same one (`tier-gate`), so the gates are internally consistent today. The dashboard layout uses a DIFFERENT helper (`connections.ts`), and there's also a fourth helper in `src/lib/tier.ts` that the consumer side of the codebase ignores.

**Fix:** Consolidate to one helper. The codebase already comments at `src/lib/tier.ts:9-15` saying it's "the canonical server-side table" but `src/lib/tier-gate.ts` is what actually imports from pricing. Pick one and delete the others.

**Severity:** RISK (functionally correct today; refactor debt).

### A-2. Dashboard layout uses a different tier helper than the dashboard page (`NIT`)
**Files:** `src/app/dashboard/layout.tsx:11` imports `tierAtLeast` from `@/lib/connections`. `src/app/dashboard/page.tsx:19` imports `tierAtLeastSameTrack` from `@/lib/tier-gate`.

These two helpers happen to agree on the canonical ranks but are not literally the same function. The result is that the nav-link tier gates (in layout) and the wizard-tier gate (in page) could drift if a future change is made to only one of them.

**Severity:** NIT.

### A-3. `tierAtLeast` from `connections.ts` has an inverted-tier-name typo risk (`OK` verified)
`src/lib/connections.ts:60` `tierAtLeast(actualTier: string, minTier: string)` returns `true` when `actual >= min`. The check is on `TIER_RANK` which has the same per-track ranks as `tier-gate.ts`. Cross-track comparison returns false because both helpers consult `TIER_TO_TRACK`. Verified by reading both helper bodies.

**Severity:** OK.

### A-4. `/dashboard/profile` has NO tier gate at all (`RISK`)
**File:** `src/app/dashboard/profile/page.tsx:11-46`

Profile page auths in (`if (!session?.userId) redirect('/login');`) but does not gate on tier. Per spec §3.4 the "Hockey Passport" reframing is a parent-facing surface and the Family Hub is `identity_plus+` gated. Profile shows the parent relationships + documents sections for any signed-in user, including free-tier users.

**Fix decision:** Decide whether Hockey Passport is identity_plus+-gated or available to everyone. If gated, add `tierAtLeastSameTrack(tier, 'identity_plus') || tierAtLeastSameTrack(tier, 'business_listing')` after the auth check, with a tier upgrade CTA. If ungated (intentional v1), document the decision.

**Severity:** RISK — design question, not necessarily a bug.

### A-5. `/dashboard/schedule` has NO tier gate (`OK` verified intentional)
**File:** `src/app/dashboard/schedule/page.tsx:22-25`

Schedule shows a user's own team events. No tier gate is needed — this is core functionality. Verified.

**Severity:** OK.

### A-6. Account-type gate (parent-only) is consistent (`OK` verified)
**Files:**
- `/api/player-documents/route.ts:212-219` checks `(types || []).some(r => isAccountType(r.account_type) && r.account_type === 'parent')`
- `/api/family/setup-state/route.ts:91-99` same pattern
- `/dashboard/family/page.tsx` line ~32 same pattern
- `/dashboard/page.tsx:357` uses `types.includes('parent')` (where types is `accountTypeRows.map(...).filter(isAccountType)`)

All four use the same single-source-of-truth (`isAccountType` from `dashboardTypes.ts:20`) and the same `account_type === 'parent'` comparison. ✓ Consistent.

**Severity:** OK.

---

## B. RLS policies (read `supabase/migrations/2026-07-06_player_documents.sql`)

### B-1. SELECT policy correctly restricts to managed-profile relationship (`OK` verified)
**File:** `supabase/migrations/2026-07-06_player_documents.sql:97-107`

```sql
CREATE POLICY player_documents_select ON public.player_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_documents.player_id
        AND mp.manager_user_id = current_user_id()
    )
  );
```

A parent can only see a doc if a `managed_profiles` row links them to the player. ✓ Cross-parent leak impossible. The `EXISTS` doesn't filter by `profile_type`, so technically a parent who manages a team's `managed_profiles` row (`profile_type='team'`) — if that ever existed with the same `profile_id` as a player — could see that player's docs. In practice `profile_id` is a UUID that points to either `players` or `teams`/`leagues`, so the foreign-key collisions don't happen. Still, adding `AND mp.profile_type = 'player'` would be defense-in-depth.

**Fix (NIT):** Add `AND mp.profile_type = 'player'` to the EXISTS clauses in the SELECT/INSERT/UPDATE policies for clarity. Not strictly required for correctness because of the FK split, but it's belt-and-suspenders.

**Severity:** NIT.

### B-2. INSERT policy has `WITH CHECK` and checks managed_profiles + uploaded_by (`OK` verified)
**File:** `supabase/migrations/2026-07-06_player_documents.sql:117-126`

```sql
CREATE POLICY player_documents_insert ON public.player_documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.managed_profiles mp
            WHERE mp.profile_id = player_documents.player_id
              AND mp.manager_user_id = current_user_id())
    AND uploaded_by = current_user_id()
  );
```

Both checks present. ✓ `uploaded_by = current_user_id()` ensures the row's uploader matches the actor.

**Severity:** OK.

### B-3. UPDATE policy has USING but no WITH CHECK (`RISK`)
**File:** `supabase/migrations/2026-07-06_player_documents.sql:131-138`

```sql
CREATE POLICY player_documents_update ON public.player_documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.managed_profiles mp
            WHERE mp.profile_id = player_documents.player_id
              AND mp.manager_user_id = current_user_id())
  );
```

`USING` checks the EXISTING row, but no `WITH CHECK` on the new row. A parent who manages the player could `UPDATE` the row and change `uploaded_by` to a different user (e.g. the OTHER parent who shouldn't see the row at all). In practice the API route only updates `status` and `updated_at`, but the policy allows arbitrary column updates.

**Fix:** Add `WITH CHECK (uploaded_by = (SELECT uploaded_by FROM public.player_documents WHERE id = player_documents.id))` or similar — at minimum pin `uploaded_by` and `player_id` to the pre-update values. Or simpler: drop the ability to UPDATE these columns by listing only `status, updated_at` in a column-level GRANT. The RLS pattern here is table-level, so the cleanest fix is the WITH CHECK.

**Severity:** RISK (low practical impact in v1 because the route only updates `status`/`updated_at`, but the policy is broader than it needs to be).

### B-4. No DELETE policy in v1 — correct per spec (`OK` verified)
**File:** `supabase/migrations/2026-07-06_player_documents.sql:141-142`

Comment explicitly says "No DELETE policy in v1. Archive is the only way to 'remove' a document." Matches the prep doc §8 Q5 answer.

**Severity:** OK.

### B-5. `player_document_audit` has no INSERT policy — correct (server uses service role) (`OK` verified)
**File:** `supabase/migrations/2026-07-06_player_documents.sql:160-163`

Comment: "server uses service_role key." All audit writes go through `supabaseAdmin` which bypasses RLS. ✓

**Severity:** OK.

### B-6. `player_document_audit` SELECT policy scoped to the linked player's manager (`OK` verified)
**File:** `supabase/migrations/2026-07-06_player_documents.sql:152-160`

```sql
CREATE POLICY player_document_audit_select ON public.player_document_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.player_documents pd
      JOIN public.managed_profiles mp ON mp.profile_id = pd.player_id
      WHERE pd.id = player_document_audit.document_id
        AND mp.manager_user_id = current_user_id()
    )
  );
```

A parent can see who touched their kid's docs. ✓ Currently no UI surfaces this, but the policy is ready for v2.

**Severity:** OK.

### B-7. Storage.objects policies are NOT in the migration file (`BUG` — gap)
**Files:** `supabase/migrations/2026-07-06_player_documents.sql` (171 lines, no storage policies).

The audit task says "storage.objects policies: 3 of them (select/insert/update)." They are not in this SQL file. The prep doc §11 says "Storage bucket `player-documents` (private, 25MB cap, MIME-restricted) + storage RLS, applied live" — meaning they were applied via Supabase Dashboard or a separate script, not committed to the repo.

This is a structural risk: the policies are not in version control, so a `supabase db reset` could lose them. Also, no test fixture in the repo reproduces them.

**Fix:** Add the storage RLS policies as a second migration file (`2026-07-06_player_documents_storage.sql`) so the policies are version-controlled and a fresh DB setup is reproducible. Even if the policies live on a bucket the SQL can't create, the storage.objects policies themselves are pure SQL and belong in a migration.

Suggested shape (approximated — verify against the actual live state via Supabase Management API first):
```sql
CREATE POLICY "player_documents_storage_select" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'player-documents'
    AND EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id::text = split_part(name, '/', 1)
        AND mp.manager_user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid()::text)
    )
  );
-- + INSERT, UPDATE equivalents
```
(Actual exact policy text depends on how storage paths map to player_id; needs live verification before being applied.)

**Severity:** BUG (verification gap + reproducibility gap). Not a security incident if the policies ARE applied live; IS a launch blocker if they aren't.

### B-8. WITH CHECK on UPDATE is missing for `uploaded_by` and `player_id` columns (RISK — see B-3)
Same as B-3. Already documented.

---

## C. All-or-nothing rollback in POST /api/player-documents

### C-1. Current upload-then-DB-insert-then-audit sequence (`OK` for what it covers, but see C-2)
**File:** `src/app/api/player-documents/route.ts:281-369`

The loop is:
1. `supabaseAdmin.storage.upload(path, buffer, ...)` — push path to `storagePathsToCleanup` AFTER success check
2. `supabaseAdmin.from('player_documents').insert(...).select(...).single()` — push row to `uploadedRows` AFTER success check
3. `supabaseAdmin.from('player_document_audit').insert(...)` — best-effort, no rollback on failure
4. On any throw in the loop, the outer `catch` block runs:
   - `supabaseAdmin.storage.from('player-documents').remove(storagePathsToCleanup)` (wrapped in own try/catch)
   - `supabaseAdmin.from('player_documents').delete().in('id', uploadedRows.map(r => r.id))` (wrapped in own try/catch)

**Severity:** OK for the common failure modes.

### C-2. Storage orphan when `upload()` throws AFTER the object lands (`BUG`)
**File:** `src/app/api/player-documents/route.ts:280-289`

```ts
const { error: upErr } = await supabaseAdmin.storage
  .from('player-documents')
  .upload(path, buffer, { contentType: f.type, upsert: false });
if (upErr) {
  throw new Error(`upload_failed:index=${i}:${upErr.message}`);
}
storagePathsToCleanup.push(path);
```

If the storage service returns an error AFTER the bytes landed (network blip on the response, transient S3 issue, etc.), `upErr` is non-null and the code throws — but the storage object IS uploaded. The throw skips the `storagePathsToCleanup.push(path)` line, so the rollback `remove(storagePathsToCleanup)` does NOT include this path. **Orphan.**

The reverse case (Supabase returns success but bytes weren't fully written) is also possible but less common.

**Fix:** Either (a) push the path to `storagePathsToCleanup` BEFORE the upload (so any failure mode triggers cleanup), or (b) after a failed upload, do a best-effort `storage.remove([path])` inline before throwing. Option (a) is simpler:

```ts
storagePathsToCleanup.push(path);
const { error: upErr } = await supabaseAdmin.storage...
if (upErr) throw ...;
```

That way the orphan is impossible.

**Severity:** BUG (orphan file is silent — not user-visible, but accumulates storage bloat over time).

### C-3. Audit row is inserted AFTER DB insert — if audit fails, DB row gets rolled back (correct), but partial-audit orphans possible (`RISK`)
**File:** `src/app/api/player-documents/route.ts:282-291`

If file 1's storage + DB succeed and the audit insert throws, the outer catch deletes file 1's storage + DB row. If file 2's audit then fails too, the same cleanup runs. The audit table is left with ZERO orphan rows for that batch. ✓ Atomic-ish.

But: if file 1's audit insert succeeds and file 2's storage upload fails, the catch deletes file 1's storage + DB row — but file 1's audit row is now orphaned. Not a security issue, just data hygiene.

**Fix:** Either (a) include audit rows in the rollback delete, or (b) accept that audit is best-effort and document it. Option (a):
```ts
// in catch block
try {
  await supabaseAdmin.from('player_document_audit').delete().in('document_id', uploadedRows.map(r => r.id));
} catch { ... }
```

**Severity:** RISK (low impact — orphan audit rows are not user-visible and v1 has no UI surface for them).

### C-4. Rollback failures are logged but the user sees a clean 500 (`OK`)
**File:** `src/app/api/player-documents/route.ts:340-360`

The `catch` block wraps each cleanup step in its own try/catch with `console.error` logging, and returns a 500 with `{ error: 'batch_failed', message, uploaded_count }`. The user gets a clean error message, the route doesn't propagate the storage-error as the response.

**Severity:** OK.

### C-5. Rollback does NOT include the per-batch consent UPDATE (`RISK`)
**File:** `src/app/api/player-documents/route.ts:316-332`

If the loop completes (all files uploaded + DB rows + audit rows written) and THEN the consent re-assert UPDATE throws, the catch fires AFTER the upload succeeded. The storage cleanup deletes the objects and the DB delete removes the rows — but the catch runs before the consent UPDATE happens, so the consent update is rolled back to its prior state. ✓ Actually this is correct: the consent UPDATE happens after all files succeed, and if it fails, the catch unwinds the file writes.

Wait — let me re-read. The structure is:
```
for (...) { upload + insert + audit }
if (link.minor_consent_revoked_at) { UPDATE managed_profiles }
return ok
```
If the consent UPDATE throws, the catch fires. The DB rows in `uploadedRows` get deleted and the storage paths in `storagePathsToCleanup` get removed. But the consent UPDATE may have partially completed (atomicity is per-row, not per-batch, so the UPDATE either succeeds or fails entirely). The cleanup deletes the doc rows but doesn't restore `minor_consent_revoked_at` because the UPDATE failed before it ran. ✓ Correct.

**Severity:** OK.

---

## D. Idempotency

### D-1. PATCH archive is idempotent (`OK` verified)
**File:** `src/app/api/player-documents/[id]/route.ts:97-103`

```ts
if (doc.status === 'archived') {
  // Idempotent — archive already applied. Don't pretend to mutate.
  const res = NextResponse.json(
    { ok: true, id: doc.id, status: 'archived', already_archived: true },
    { status: 200 }
  );
  return applyRateLimitHeaders(res, rl);
}
```

A second PATCH archive returns 200 with `already_archived: true` and does NOT write a second audit row. ✓ Idempotent.

**Severity:** OK.

### D-2. GET [id] for non-existent ID returns 404, not 500 (`OK` verified)
**File:** `src/app/api/player-documents/[id]/route.ts:80-87`

```ts
const { data: doc, error: docErr } = await supabaseAdmin
  .from('player_documents')
  .select('id, player_id, status')
  .eq('id', docId)
  .maybeSingle();
if (docErr) { /* 500 */ }
if (!doc) {
  return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
}
```

`maybeSingle()` returns `null` for zero rows, which the code catches and returns 404. ✓ Same pattern in both PATCH and GET handlers.

**Severity:** OK.

### D-3. POST `/api/family/setup-state` is idempotent for action='dismiss' (`OK` verified)
**File:** `src/app/api/family/setup-state/route.ts:139-146`

Sets `family_setup_completed_at = now()`. Calling dismiss twice just overwrites the timestamp. Not strictly idempotent (the timestamp changes), but functionally equivalent — the wizard stays dismissed either way.

**Severity:** OK.

---

## E. Validation

### E-1. File MIME types are checked both client-side AND server-side (`OK` verified)
**Files:**
- Client: `src/components/player-documents/PlayerDocumentUpload.tsx:34-40` (`ALLOWED_MIME`) — enforced in `handleFilesPicked` (line 175) and `replaceFile` (line 230)
- Server: `src/app/api/player-documents/route.ts:46-52` (`ALLOWED_MIME`) — enforced at line 281

**Severity:** OK.

### E-2. File size (25MB) checked before upload on client, AFTER `arrayBuffer()` on server (`RISK`)
**Files:**
- Client: `src/components/player-documents/PlayerDocumentUpload.tsx:170-174` — checks `f.size` BEFORE reading bytes. ✓
- Server: `src/app/api/player-documents/route.ts:268-280` — checks `f.size` BEFORE calling `arrayBuffer()`. ✓ Also the DB CHECK constraint (`file_size_bytes > 0 AND file_size_bytes < 26214400`) catches any path that bypasses the route.

But: `await f.arrayBuffer()` at line 285 reads the whole file into memory. If a client sends a 25MB+ file (header forged or race), the route's size check would catch it before `arrayBuffer()` — but the body was already parsed by Next.js into the form data, so memory is already consumed.

**Fix:** Add a content-length check before parsing the multipart body, OR stream-parse and abort early. For v1 with the 25MB cap, this is acceptable. Mark as RISK for v2 hardening.

**Severity:** RISK (current 25MB cap is acceptable; v2 should stream-parse).

### E-3. `expires_at` only for waiver/medical_form/vaccination_record — server enforced (`OK` verified)
**File:** `src/app/api/player-documents/route.ts:217-228`

```ts
if (expiresAt !== null && expiresAt !== undefined) {
  if (typeof expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
    /* 400 invalid_expires_at */
  }
  if (!EXPIRY_ALLOWED.has(cat)) {
    /* 400 expires_at_not_allowed_for_category */
  }
}
```

Also enforced on the client (`PlayerDocumentUpload.tsx:202-209`). Both sides reject.

**Severity:** OK.

### E-4. Title length 1-100 and description <=500 server-enforced (`OK` verified)
**File:** `src/app/api/player-documents/route.ts:206-216`

```ts
if (typeof title !== 'string' || title.length < 1 || title.length > 100) { /* 400 */ }
if (description && (description as string).length > 500) { /* 400 */ }
```

Also enforced by the DB CHECK constraint: `title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100)` and `description text CHECK (description IS NULL OR char_length(description) <= 500)`. Belt-and-suspenders.

**Severity:** OK.

### E-5. `expires_at` format `YYYY-MM-DD` server-enforced via regex (`OK` verified)
**File:** `src/app/api/player-documents/route.ts:218-220`

Regex `/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)`. ✓ The DB column is `date` so any malformed string would also fail at insert.

**Severity:** OK.

### E-6. File `f.size <= 0` (zero-byte file) is rejected (`OK` verified)
**File:** `src/app/api/player-documents/route.ts:269-271`

```ts
if (f.size <= 0 || f.size > MAX_BYTES) { /* 400 file_too_large */ }
```

Also DB CHECK: `file_size_bytes > 0`. ✓

**Severity:** OK.

---

## F. Rate limiting

### F-1. **Rate limit is recorded but NEVER blocks the request** (`BUG` — major)
**Files:**
- `src/app/api/player-documents/route.ts:127` (POST): calls `checkRateLimit`, ignores `result.allowed`
- `src/app/api/player-documents/route.ts:374` (GET): same
- `src/app/api/player-documents/[id]/route.ts:60` (PATCH): same
- `src/app/api/player-documents/[id]/route.ts:170` (GET): same
- `src/app/api/family/setup-state/route.ts:33`: same

The pattern in every route:
```ts
const rl = await checkRateLimit(`...:${ip}`, { maxRequests: 30, windowMs: 60_000 });
maybeCleanup();
// ... no `if (!rl.allowed) return 429` anywhere
// ... eventually `applyRateLimitHeaders(res, rl)` sets X-RateLimit-* headers
```

`checkRateLimit` returns `{ allowed: false, retryAfter }` when the limit is exceeded, but no caller checks `allowed`. The headers get set but the request proceeds. **The rate limit is decorative.**

**Fix:** Add at the top of each handler:
```ts
if (!rl.allowed) {
  const res = NextResponse.json(
    { error: 'rate_limited', retry_after: rl.retryAfter },
    { status: 429 }
  );
  return applyRateLimitHeaders(res, rl);
}
```

**Severity:** BUG (launch blocker for v1 — without an actual 429 gate, the documented limits are advisory only).

### F-2. Rate limit is per-IP only, not per-user (`RISK`)
**File:** `src/lib/rateLimit.ts:36-37` — `checkRateLimit(key, options)` keys by `${ip}`. The player-documents routes pass `key=\`player-documents-upload:${ip}\``.

Per-IP means users behind a shared corporate/school/mobile-carrier NAT can starve each other. A determined attacker can also use IPv6 rotation (each IP gets its own bucket) to bypass entirely. Per-IP + per-user combined (key = `${userId}:${ip}`) is the standard pattern.

**Severity:** RISK (acceptable for v1; harden in v2).

### F-3. Rate-limit defaults per route (`OK` documented)
| Route | Limit | Window |
|---|---|---|
| POST /api/player-documents (upload) | 30/min | 60s |
| GET /api/player-documents (list) | 60/min | 60s |
| PATCH /api/player-documents/[id] (archive) | 30/min | 60s |
| GET /api/player-documents/[id] (signed URL) | 120/min | 60s |
| POST /api/family/setup-state (dismiss/resume) | 30/min | 60s |

All keyed by IP. All "decorative" until F-1 is fixed.

**Severity:** OK (as a config, after F-1 is fixed).

### F-4. Rate-limit fails open on Supabase error (`OK` documented)
**File:** `src/lib/rateLimit.ts:54-58` — if the DB count fails, returns `allowed: true` with the full limit. This is correct for resilience (a transient Supabase outage shouldn't lock users out of form submissions). Documented.

**Severity:** OK.

---

## G. Wizard step 3 wiring

### G-1. Cross-parent leak in wizard query (`OK` — scoped correctly)
**File:** `src/app/dashboard/page.tsx:317-336`

```ts
const { data: childIdsRes } = await supabaseAdmin
  .from('managed_profiles')
  .select('profile_id')
  .eq('manager_user_id', userId)
  .eq('profile_type', 'player');
// ...
const childIds = ...;
if (childIds.length > 0) {
  const { count: docsCount } = await supabaseAdmin
    .from('player_documents')
    .select('id', { count: 'exact', head: true })
    .in('player_id', childIds)
    .eq('status', 'active');
  wizardHasDocuments = (docsCount ?? 0) > 0;
}
```

Filter is `manager_user_id = userId AND profile_type = 'player'`. Cross-parent leak impossible. ✓

**Severity:** OK.

### G-2. Wizard step 3 CTA `/dashboard/family` works for parent with zero children (`OK` verified)
**File:** `src/components/family/FamilySetupWizard.tsx:91`

```ts
cta: { label: state.hasDocuments ? 'Manage documents' : 'Upload a document', href: '/dashboard/family' },
```

Even if the parent has zero children, clicking "Upload a document" lands them on `/dashboard/family`, which has the existing "Link your first child" UI. ✓ Reasonable fallback.

**Severity:** OK.

### G-3. Wizard renders for parent with zero children (`OK` intentional)
**File:** `src/app/dashboard/page.tsx:357-360`

```ts
const wizardVisible =
  types.includes('parent') &&
  wizardTierOk &&
  profile?.family_setup_completed_at == null;
```

No check on `hasChildren`. A parent with zero children AND zero docs sees the full wizard with step 2 ("Add your children") marked as not-done. That's intentional per spec — the wizard is the on-ramp, not a celebration.

**Severity:** OK.

### G-4. Wizard step 3 description and CTA are correct for all states (`OK` verified)
**File:** `src/components/family/FamilySetupWizard.tsx:88-92`

```ts
{
  number: 3,
  title: 'Upload important hockey documents',
  description: state.hasDocuments
    ? 'Your child\u2019s documents are uploaded and ready.'
    : 'Upload a birth certificate, waiver, or medical form to start your child\u2019s Hockey Passport.',
  cta: { label: state.hasDocuments ? 'Manage documents' : 'Upload a document', href: '/dashboard/family' },
  done: state.hasDocuments,
},
```

Description and CTA both flip based on `state.hasDocuments`. ✓

**Severity:** OK.

---

## H. ConsumerCards Pending Documents card

### H-1. `/dashboard/family#<childId>` hash link does not scroll to any section (`BUG`)
**Files:**
- `src/components/dashboard/ConsumerCards.tsx:424`: `<Link href={\`/dashboard/family#${d.childId}\`}>`
- `src/app/dashboard/family/page.tsx`: NO `id="..."` attributes on the rendered children sections. The only markers are `data-testid="family-documents-child"` and React keys based on `managed_profiles.id`.

So clicking the hash link lands at the top of `/dashboard/family` — no scrolling, no visual signal that the user navigated correctly. The hash is dead.

**Additional mismatch:** `d.childId = player_id` (the `managed_profiles.profile_id`, a `players.id`), but the React `key={mp.id}` on the family page uses `managed_profiles.id`. Even if id attributes were added, the player's UUID would not match the managed_profiles row UUID.

**Fix:** Two options:
- (a) Add `id={\`family-documents-\${mp.profile_id}\`}` on the per-child div in `family/page.tsx` line ~497. The hash link in ConsumerCards (`#${d.childId}` where `d.childId = player_id`) would then scroll correctly.
- (b) Change the hash to use the player's first name (slug): `/dashboard/family#child-${slug}`. Less stable.

**Severity:** BUG (UX issue, not security). Confusing for users clicking the link.

### H-2. Non-parent user sees "Documents are parent-only" with `/directory` CTA (`OK` verified)
**File:** `src/components/dashboard/ConsumerCards.tsx:418-430`

```ts
{data.pendingDocuments.length === 0 ? (
  primaryType === 'parent' ? (
    <EmptyMessage ... cta={{ label: 'Open Family Hub', href: '/dashboard/family' }} />
  ) : (
    <EmptyMessage
      headline="Documents are parent-only"
      body="Parents upload birth certificates, waivers, and medical forms for each linked child."
      cta={{ label: 'Browse the directory', href: '/directory' }}
    />
  )
) : ...}
```

For a non-parent user, the empty state explains that documents are parent-only and links to the directory. No leak (no per-child data shown). ✓

**Severity:** OK.

### H-3. Parent with 0 children sees "No linked children yet" with `/dashboard/family` CTA (`OK` verified)
**File:** `src/components/dashboard/ConsumerCards.tsx:419-424`

Path is `/dashboard/family` (correct). Headline "No linked children yet" is accurate. ✓

**Severity:** OK.

### H-4. Parent with N children and 0 docs — list renders empty, fallback empty state shown (`OK` verified)
**File:** `src/components/dashboard/ConsumerCards.tsx:217-235`

If `wizardHasChildren=true` (parent has children) but `player_documents` has 0 active/expired rows, `data.pendingDocuments` is `[]` and the empty state branch fires (parent-specific message + Family Hub CTA). ✓

**Severity:** OK.

### H-5. Parent with multiple children with docs — N+1 if more than 4 (`OK` verified)
**File:** `src/components/dashboard/ConsumerCards.tsx:430-445`

```ts
{data.pendingDocuments.slice(0, 4).map((d) => ( <li>...</li> ))}
{data.pendingDocuments.length > 4 ? (
  <li>+{data.pendingDocuments.length - 4} more</li>
) : null}
```

Caps at 4 visible rows + "+N more" footer. ✓

**Severity:** OK.

### H-6. ConsumerCards uses `primaryType` not `types` for parent check (multi-role bug) (`BUG` — see I-3)
Same finding as I-3. Repeated here for context: a user with `primary='player'` who is ALSO a parent would see "Documents are parent-only" instead of their actual documents.

**Severity:** BUG.

---

## I. Account-type-aware behavior

### I-1. Wizard does not render for users with NO account types (`OK` verified)
**File:** `src/app/dashboard/page.tsx:357`

```ts
const wizardVisible = types.includes('parent') && wizardTierOk && profile?.family_setup_completed_at == null;
```

If `types` is empty, `types.includes('parent')` is false, wizard does NOT render. ✓

**Severity:** OK.

### I-2. ConsumerCards gets only the primary account type, not the full list (`BUG`)
**File:** `src/app/dashboard/page.tsx:478`

```ts
<ConsumerCards primaryType={primary} data={consumerCardData} />
```

`primary` is the row where `is_primary = true` (or fallback to first row). The full `types` array is computed at line 251 (`const types: AccountType[] = ...`) but is not passed to ConsumerCards.

Consequence: a multi-role user who has BOTH `parent` AND `player` account types, with `is_primary=true` on `player`, will have `primary='player'`. ConsumerCards then renders the "non-parent" branch for the Pending Documents card (H-2), even though the user IS a parent.

**Fix:** Pass `types={types}` to ConsumerCards and use `types.includes('parent')` for the parent-specific branches. Or in ConsumerCards, accept a `hasParent: boolean` prop computed at the page level.

**Severity:** BUG (medium — affects a real user segment, silently downgrades their docs view).

### I-3. Player-only vs coach-only vs parent-only vs multi-role ConsumerCards behavior (`BUG` for multi-role)
**File:** `src/components/dashboard/ConsumerCards.tsx:418-430`

Per primary-type branch:
- `parent` → "No linked children yet" / per-child list with docs
- non-parent (player, coach, scout, fan, etc.) → "Documents are parent-only" with /directory CTA
- multi-role with primary≠'parent' but types includes 'parent' → falls into the non-parent branch (BUG, see I-2)

**Severity:** BUG (covered by I-2).

### I-4. Family Hub gate uses `types.includes('parent')` correctly (`OK` verified)
**File:** `src/app/dashboard/family/page.tsx:30-32`

Tier check uses `tierAtLeastSameTrack`, parent check uses `types.includes('parent')`. Same pattern as the wizard. ✓ Consistent.

**Severity:** OK.

---

## J. Public pages — info leak

### J-1. Public `/profile/[slug]` exposes `profile.user_id` (Clerk ID) in React props only — not rendered HTML (`OK`)
**File:** `src/app/profile/[slug]/page.tsx:283, 286`

`<ConnectButton otherUserId={profile.user_id}>` and `<SocialActions messageRecipientId={profile.user_id}>` pass the Clerk user_id to client components. These values go into the JS bundle (which is public) but NOT into the rendered HTML — React doesn't serialize props to HTML.

A determined attacker who downloads and reads the JS bundle could see `otherUserId` values for ANY profile they load (since ConnectButton's source includes `otherUserId` as a prop). This is a minor info leak: Clerk user_ids are sensitive identifiers.

**Mitigation:** Use a server-side action token instead of passing the raw user_id. Or accept that this is a known low-risk exposure for a public social-style profile.

**Severity:** RISK (low — Clerk user_ids are not directly exploitable for auth, but they enable cross-account tracking).

### J-2. Public profile exposes `verifiedAt` and `expiresAt` timestamps publicly (`OK` intentional)
**File:** `src/app/profile/[slug]/page.tsx:215`

`<IdentityVerified verifiedAt={verifiedAt} expiresAt={expiresAt} />` — renders the verified check mark + expiry date. Intentional per "social profile" design.

**Severity:** OK.

### J-3. Public profile exposes account types (`OK` intentional)
**File:** `src/app/profile/[slug]/page.tsx:445-456`

`<AccountTypeBadges types={accountTypes.map(t => t.account_type)} ...>` — renders role badges publicly. Intentional for a public-profile design (X, LinkedIn, etc. all do this).

**Severity:** OK.

### J-4. Public profile uses `supabaseAdmin` (service role) for all reads (`OK` — necessary for hydration)
**File:** `src/app/profile/[slug]/page.tsx:31-34`

```ts
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

Server component uses service role to bypass RLS. Necessary because the public profile hydration needs players, teams, leagues joins across tables. ✓

**Severity:** OK.

### J-5. `/directory/teams` and `/directory` are public, no info leak (`OK` verified)
**File:** `src/app/directory/page.tsx` — public metadata, no auth check, server component fetches public team data.

**Severity:** OK.

---

## K. The 'audit' table reads

### K-1. Audit SELECT policy (`OK` verified)
**File:** `supabase/migrations/2026-07-06_player_documents.sql:152-160`

Parents can read audit rows for docs linked to their kids. No service-role bypass needed because no UI surfaces audit in v1. ✓

**Severity:** OK.

### K-2. Audit writes atomic with operation (`OK` verified — see C-3 caveat)
**File:** `src/app/api/player-documents/route.ts:282-291`

Audit insert is in the same try block as the doc insert. If audit fails, the outer catch deletes the doc row + storage object. ✓

The caveat from C-3 applies: if file N's audit insert succeeds and file N+1 fails later, file N's audit row is orphaned after the rollback deletes the doc row but not the audit row. Low-impact orphan; not a launch blocker.

**Severity:** OK (RISK from C-3 for orphan audit rows).

### K-3. Routes use service role for audit writes (`OK` verified)
**Files:** `/api/player-documents/route.ts:286`, `/api/player-documents/[id]/route.ts:152, 197-209`. All use `supabaseAdmin`. ✓

**Severity:** OK.

---

## L. Error handling

### L-1. Dashboard page queries fail-closed for wizard state (`OK` verified)
**File:** `src/app/dashboard/page.tsx:317-336`

The wizard-state query is wrapped in a try/catch. On error, all `wizardHas*` stay false, and the wizard shows as "not done." Fail-closed is the safe default here. ✓

**Severity:** OK.

### L-2. Dashboard layout has outer try/catch fallback (`OK` verified)
**File:** `src/app/dashboard/layout.tsx:25-55`

The layout catches any error and renders a minimal chrome with a sign-out link so the user can recover. ✓

**Severity:** OK.

### L-3. Upload errors surface to the user via in-form alert (`OK` verified)
**File:** `src/components/player-documents/PlayerDocumentUpload.tsx:267-274`

```ts
const body = await res.json().catch(() => ({}));
throw new Error(body?.error || `Upload failed (${res.status})`);
} catch (e) {
  setError(e instanceof Error ? e.message : String(e));
  setStage('review');
}
```

Error message is shown in a `role="alert"` div. ✓

**Severity:** OK.

### L-4. Storage errors during upload are surfaced via the 500 response (`OK`)
**File:** `src/app/api/player-documents/route.ts:339-360`

The catch block returns `{ error: 'batch_failed', message, uploaded_count }` with status 500. The client decodes `body?.error` and shows it. ✓

**Severity:** OK.

### L-5. Signed URL errors during download surface as 410 (file missing) or 500 (`OK`)
**File:** `src/app/api/player-documents/[id]/route.ts:220-243`

The route distinguishes "file_missing" (object not in storage, returns 410) from generic sign failures (500). Client surfaces the message via the in-list error alert. ✓

**Severity:** OK.

### L-6. Public profile page Promise.all has no outer try/catch (`RISK`)
**File:** `src/app/profile/[slug]/page.tsx:78-89`

The Promise.all queries for managed_profiles, profile_account_types, profile_photo_history have no try/catch around them. If any one throws (e.g., the photo_history table is missing), the entire page errors out with a 500.

**Fix:** Wrap in try/catch and return partial data with a defensive `?? null` on each field. Or use `.catch(() => ({ data: [] }))` on each promise.

**Severity:** RISK (low — the page works today, but a future migration that touches one of these tables could 500 the public profile route).

---

## M. Player self-read RLS

### M-1. No player self-read policy exists; comment says it's v1 deferred (`OK` verified per spec)
**File:** `supabase/migrations/2026-07-06_player_documents.sql:78-82`

```sql
-- Read: managed-profile relationship covers both parent-of-player AND player-self
-- (a player over 18 with their own Clerk account adds a managed_profiles row
-- with manager_user_id = own_user_id, profile_id = own_player_id).
```

The comment claims that "player-self" works because a player over 18 with their own Clerk account would add a `managed_profiles` row with `manager_user_id = own_user_id, profile_id = own_player_id`. The policy at line 97-107 checks for that exact pattern (manager_user_id = current_user_id() AND profile_id = player_documents.player_id). ✓

**Cross-check against the "players table has NO user_id column" fabrication note:** The prep doc and migration both confirm `players.user_id` doesn't exist. The self-read mechanism uses `managed_profiles` only, which is correct.

**Severity:** OK.

### M-2. `auth.uid()` correctly mapped to `manager_user_id` (`OK` verified)
**File:** `supabase/migrations/2026-07-06_player_documents.sql:97-107`

`managed_profiles.manager_user_id` is `text` (the Clerk user_id). `auth.uid()` from Supabase returns the same `text` value. ✓ No column-type mismatch.

**Severity:** OK.

---

## N. GET /api/player-documents edge cases

### N-1. Missing `player_id` query param returns 400 (`OK` verified)
**File:** `src/app/api/player-documents/route.ts:386-389`

```ts
const playerId = url.searchParams.get('player_id');
if (!playerId) {
  const res = badRequest('player_id_required');
  return applyRateLimitHeaders(res, rl);
}
```

✓

**Severity:** OK.

### N-2. `player_id` for a player not linked to caller returns 403 (`OK` verified)
**File:** `src/app/api/player-documents/route.ts:407-418`

```ts
if (!link) {
  const res = NextResponse.json(
    { error: 'You do not manage this player.' },
    { status: 403 }
  );
  return applyRateLimitHeaders(res, rl);
}
```

✓ Correct 403 (not 404 — 403 is the right code for "you don't have permission for this resource").

**Severity:** OK.

### N-3. `player_id` for a player that doesn't exist returns 403 (`OK` verified intentional)
**File:** `src/app/api/player-documents/route.ts:402-418`

A non-existent player_id yields `link = null` from the managed_profiles query, which falls into the 403 branch. Some might prefer 404 here, but returning 403 (rather than distinguishing 404 from 403) avoids leaking "this player_id exists but isn't yours" enumeration. ✓ Reasonable defensive choice.

**Severity:** OK (design decision — current choice is correct for non-enumeration).

---

## Top 3 must-fix bugs (ranked by severity)

### 1. F-1: Rate limit is decorative — never returns 429
**File:** `src/app/api/player-documents/route.ts`, `[id]/route.ts`, `/api/family/setup-state/route.ts`

The routes call `checkRateLimit` and pass the result to `applyRateLimitHeaders`, but never check `result.allowed`. An attacker (or buggy client) can hammer the upload endpoint at unlimited rate. The DB-backed rate-limit infrastructure exists; the gate is missing.

**Fix:** Add `if (!rl.allowed) return 429` at the top of each handler. Five routes total.

**Severity:** BUG (launch blocker — without this, the documented limits are advisory only).

### 2. C-2: Storage orphan when upload fails mid-flight
**File:** `src/app/api/player-documents/route.ts:280-289`

The `storagePathsToCleanup.push(path)` happens AFTER the upload success check. If the upload returns an error AFTER the bytes landed (network blip on the response, partial S3 write), the path is not added to the cleanup list and the file becomes an orphan in storage. The rollback doesn't catch it.

**Fix:** Push the path BEFORE the upload, or do an inline `storage.remove([path])` on upload error before throwing.

**Severity:** BUG (silent data bloat; over time the bucket fills with orphan files that the user never sees and no cleanup cron catches).

### 3. I-2: ConsumerCards primary-type check misses multi-role parents
**File:** `src/app/dashboard/page.tsx:478`, `src/components/dashboard/ConsumerCards.tsx:418`

`<ConsumerCards primaryType={primary}>` — but a user with primary='player' who is also 'parent' falls into the non-parent branch for the Pending Documents card. They have actual document data the card should show but they see "Documents are parent-only" instead.

**Fix:** Pass `types={types}` to ConsumerCards and use `types.includes('parent')` for the parent-specific branches. Or add a `hasParent: boolean` prop computed at the page level.

**Severity:** BUG (medium — silently downgrades a real user segment's experience).

---

## Bugs already fixed in this build

These items in the audit scope were explicitly addressed during the 1b-1 build per `memory/2026-07-06.md` (per Arnel's pre-deploy audit notes):

### Fixed: `parent_consent_ip` inet cast
**File:** `src/app/api/player-documents/route.ts:324-329`

The defensive cast `const consentIP = ip && ip !== 'unknown' ? ip : null` prevents the `inet` column from rejecting `'unknown'`. If the IP helper returns a bad string, we write NULL instead of throwing.

### Fixed: `audit.ip_address` inet cast
**Files:** `src/app/api/player-documents/route.ts:282-291`, `src/app/api/player-documents/[id]/route.ts:152, 197-209`

Same defensive cast pattern for the audit table's `inet` column.

### Fixed: Rollback race on partial batch failure
**File:** `src/app/api/player-documents/route.ts:340-360`

Each rollback step (storage remove + DB delete) is in its own try/catch. A failure in one doesn't block the other.

### Fixed: Empty `playerId` guard in upload component
**File:** `src/components/player-documents/PlayerDocumentUpload.tsx:255-257`

`if (!playerId) { setError('No player selected...'); return; }` — defensive guard prevents an empty-string player_id from being sent.

### Fixed: PATCH/GET `[id]` storage-not-found → 410 instead of 500
**File:** `src/app/api/player-documents/[id]/route.ts:230-243`

```ts
const isMissing =
  signErr?.message?.toLowerCase().includes('not found') ||
  signErr?.message?.toLowerCase().includes('object not found');
const res = NextResponse.json(
  { error: isMissing ? 'file_missing' : 'sign_failed', ... },
  { status: isMissing ? 410 : 500 }
);
```

Returns 410 Gone instead of 500 when the storage object has been orphaned (e.g., from manual dashboard deletion). Clearer client UX.

### Fixed: Rate-limit Promise not awaited in 4 functions (caught by build)
**File:** `src/lib/rateLimit.ts` — verified each caller `await`s `checkRateLimit`. The build error from the earlier "BUG-MISSING-AWAIT" was fixed.

### Fixed: Migration has explicit v1-only comments for v2 backlog
**File:** `supabase/migrations/2026-07-06_player_documents.sql:30-35, 65, 121-126, 142`

Comments call out: trigger for `status='expired'` (v2), co-parent upload (v2), hard DELETE (v2+). These match the prep doc §8 / §11 v2 backlog.

---

## Summary

**Critical (must fix before launch):**
- F-1: Rate limit never blocks
- C-2: Storage orphan on partial upload failure
- I-2: ConsumerCards primary-type bug (multi-role parents)

**Risks (should fix, not launch-blocking):**
- A-1, A-2: Three competing `tierAtLeast` helpers
- A-4: Profile page has no tier gate
- B-3, B-8: UPDATE policy has no `WITH CHECK`
- B-7: Storage.objects policies not in version control
- C-3: Audit row orphans on partial batch failure
- F-2: Rate limit per-IP only, not per-user
- H-1: Dead hash link `/dashboard/family#<childId>`
- J-1: Public profile exposes Clerk user_id in JS bundle
- L-6: Public profile Promise.all has no outer try/catch

**NITs:**
- A-2: Dashboard layout uses a different tier helper than the dashboard page
- B-1: Add `profile_type='player'` to managed_profiles EXISTS for clarity

**Verified OK:**
- Auth & tier gates (consistent across API routes and dashboard page)
- RLS policies for SELECT, INSERT, audit table, no DELETE in v1
- Idempotency for PATCH archive and family setup-state
- File MIME, size, expires_at, title, description validation (both client + server)
- Wizard step 3 wiring scoped correctly to current user
- ConsumerCards empty-state branches for parent vs non-parent vs parent-with-children
- Player self-read via managed_profiles (no players.user_id fabrication)
- GET /api/player-documents edge cases (400/403 correctly distinguished)
- Storage bucket path convention (`{player_id}/{document_id}/{filename}`)

**Bugs already fixed in this build (call out for completeness):**
- `parent_consent_ip` inet cast (route.ts:324-329)
- `audit.ip_address` inet cast (POST + PATCH + GET handlers)
- Rollback race protection (each cleanup step wrapped in own try/catch)
- Empty `playerId` guard (PlayerDocumentUpload.tsx:255-257)
- PATCH/GET `[id]` 410 vs 500 distinction for missing storage objects
- Rate-limit Promise awaited in 4 functions (build caught this)
- v2 backlog items explicitly commented in migration SQL