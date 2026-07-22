# WS3.5 PR4 — Dispute Notifications — Implementation Journal

**Author:** KiloClaw
**Date:** 2026-07-22
**Status:** Feature-complete. tsc clean. Feature flags off; awaiting Arnel
greenlight before merging to main.

## What this PR does

Closes the WS3.5 dispute workflow's notification loop:

1. **Operator gets notified when a stamp at their target is disputed** —
   new `notifyOperatorOnDispute()` private method on the stamp service,
   wired into `disputeStamp()`. Routes to:
   - rink target → all users with an approved `claims` row against the rink
   - venue / event target → all users with `profiles.role='admin'` (staff;
     venues are admin-curated in WS3 v1 with no public.claims table, so
     venue dispute access is staff-only per PR1 RLS — same authorization
     the read policy uses).
2. **Stamper notifications get real templates** — PR2 shipped
   `notifyStamperOnAdjudication()` with generic copy; PR4 rewrites it with
   target-aware titles ("Stamp at *The Rink* removed") and full body
   explaining what happened + where to view their Passport. Adds a
   `dashboard_url` link in metadata.
3. **Inbox page** at `/dashboard/notifications` — was referenced from the
   dashboard's Notifications card (ConsumerCards.tsx) but the route did
   not exist. Page renders the user's most recent 100 inbox rows with
   kind-specific labels, relative timestamps, and per-kind CTA links
   (operator rows → dispute queue, stamper rows → Passport dashboard).

No schema migration: PR1 already extended `consumer_notifications.kind`
with `stamp_disputed`, `dispute_upheld`, `dispute_overturned`. PR4 is
pure service + UI.

Production behavior is unchanged until `STAMPS_ADMIN_ENABLED=true` is
set on Vercel (existing PR1 gate) — and dispute actions only fire when
the dispute endpoint is called, which is itself gated.

## Files changed

### `src/lib/passport/13-stamp-service.ts` (MODIFIED)

**`disputeStamp()` — load target columns + fire operator notification.**

Extended the `stamps` select from `id, subject_user_id, actor_user_id,
status` to also pull `target_type, target_rink_id, target_venue_id,
target_event_id`. After `writeScanEventForDispute()`, now calls
`notifyOperatorOnDispute()` in a try/catch so a notification failure
does not roll back the dispute. (Same best-effort pattern as the
existing `notifyStampReceived()`.)

**`notifyOperatorOnDispute()` — NEW private method.**

Signature:
```ts
private async notifyOperatorOnDispute(params: {
  stampId: string;
  targetType: StampTargetType;
  targetRinkId: string | null;
  targetVenueId: string | null;
  targetEventId: string | null;
  subjectUserId: string;
  reason: string | null;
}): Promise<void>
```

Behavior:
- Resolves target name via `rinks.name` / `venues.name` /
  `venue_events.name` (one query).
- Resolves recipient ids:
  - rink → `claims` rows with `entity_id=targetRinkId`,
    `claim_type='rink'`, `status='approved'`. De-duplicated by user_id.
  - venue/event → `profiles` rows with `role='admin'`. De-duplicated.
- If no recipients (rink with no approved claim, or venue/event with
  no staff), quietly no-ops. The dispute row is still in
  `public.scan_events` and will surface if/when a claim is approved
  later.
- Inserts one row per recipient into `consumer_notifications` with:
  - `kind='stamp_disputed'`
  - `source_key='stamp:${stampId}:operator:${userId}'` (per-recipient
    idempotency — UNIQUE on `(user_id, source_key, kind)`).
  - `title='A stamp at your [rink|venue|event] was disputed'`
  - `body='A holder disputed a stamp at ${targetName}.${reason ? ` Reason: "${reason}".` : ''} Review the dispute queue to uphold or overturn.'`
  - `metadata`: `stamp_id`, `target_type`, `target_name`, `target_id`,
    `subject_user_id`, `dispute_reason`, `queue_url` (points to
    `/dashboard/manage/rink/${id}/disputes` for rinks or
    `/admin/stamps/disputes` for venues/events).
- ON CONFLICT DO NOTHING via UNIQUE. Supabase 23505 = success.
- On non-23555 error, logs to console; does not throw.

**`notifyStamperOnAdjudication()` — REWRITTEN templates.**

Same signature as PR2 (recipient, kind, stampId, targetName). Changes:
- Title now includes the target name: "Stamp at *The Rink* removed" /
  "Stamp at *The Rink* restored".
- Body explains what happened in plain language.
- Metadata adds `target_name` and `dashboard_url='/dashboard/passport'`
  so the inbox page can link directly.
- Source key is unchanged (`stamp:${stampId}:adjudication`) so any
  duplicate inserts still hit the UNIQUE constraint and no-op.

**`resolveTargetNameInline()` — NEW private helper.**

PR2 also adds a `resolveTargetName()` helper with identical shape
(resolves rink/venue/event name from a stamp row). To avoid merge
conflict when PR2 lands first, PR4's copy is renamed to
`resolveTargetNameInline()`. Both helpers are private, both
service-internal. When both PRs merge, the inline version can be
removed and the call site updated to use PR2's helper in a follow-up.

**`disputeStamp()` — load target columns.**

Extended the `stamps` select from `id, subject_user_id, actor_user_id,
status` to also pull `target_type, target_rink_id, target_venue_id,
target_event_id` so `notifyOperatorOnDispute()` can route correctly
without a second roundtrip.

### `src/app/dashboard/notifications/page.tsx` (NEW)

Server component. Auth via `auth()` + `resolveCanonicalUserId()`. Loads
the user's `consumer_notifications` rows ordered by `created_at DESC`,
limit 100.

UI:
- Header with unread badge.
- Per-row card with kind label badge (KIND_LABEL map covers all 9
  existing kinds + the 3 dispute kinds), unread dot, relative
  timestamp, title, body, and a CTA button.
- CTA routing via `resolveLink()`:
  - `stamp_disputed` → operator dispute queue (from `metadata.queue_url`,
    falls back to `/dashboard`)
  - `dispute_upheld` / `dispute_overturned` / `stamp_received` →
    `/dashboard/passport`
  - `document_expiring_*` / `document_expired` /
    `identity_renewal_due` → `/dashboard/passport` (context link)
  - `achievement_added` → `/dashboard/passport`
- Empty state: "No notifications yet" with bell emoji.
- Error state: red banner with the Supabase error.
- "Back to dashboard" link at the bottom.

Style: matches `/admin/stamps/disputes` (PR3) and the operator dispute
queue (PR2) — same borderRadius 10/12, same color palette
(`#0f172a` for unread, `#e2e8f0` for read, `#dc2626` for unread count).
Renders cleanly on both light and dark mode (the dashboard chrome is
dark; this page is light — same as the dispute queue pages).

## What this PR does NOT do

- **No mark-as-read on the server** — the existing API route
  `/api/consumer-notifications/[id]` handles individual mark-read. PR4
  doesn't add a "mark all read" button; can land in a follow-up if
  Arnel wants it.
- **No email fan-out** — out of scope per spec; the in-app inbox is the
  source of truth.
- **No link from ConsumerCards notification card to the inbox rows
  directly** — the existing card's "See all notifications" link already
  points to `/dashboard/notifications`, which now exists. The card's
  per-row link also routes there.
- **No RLS changes** — `consumer_notifications_select_own` already lets
  users read their own inbox. Operators see their `stamp_disputed`
  notifications because they're inserted with `user_id = operator's
  user_id`.

## Idempotency / safety

- `notifyOperatorOnDispute`: per-recipient `source_key` ensures a
  single (operator, stamp) pair generates exactly one inbox row.
- Re-running `disputeStamp()` for an already-disputed stamp
  short-circuits at line 980 before reaching `notifyOperatorOnDispute`,
  so re-disputes don't double-fire.
- The UNIQUE `(user_id, source_key, kind)` constraint at the table
  level is the safety net — duplicate inserts return 23505 which we
  treat as success.

## Out of scope (WS4+)

- Mark-all-read button on inbox page
- Push notifications (native mobile)
- Per-kind email fan-out (would duplicate inbox)
- Notification preferences UI for individual kinds (today the global
  email settings live at `/dashboard/settings/notifications`; no
  per-kind toggle for the in-app inbox)

## Verification

- `npx tsc --noEmit -p tsconfig.json` → exit 0.
- Service layer compiles against the same `StampTargetType` union used
  by PR2/PR3 — no type drift.
- No Vercel preview triggered yet (PR not opened). Vercel will deploy
  on PR open.

## Stack

Built on top of main (post-PR1, commit 65cebcb). Independent of PR2 /
PR3 — PR4 only needs the PR1 schema (kind enum extension) which is on
main. Mergeable in any order with PR2 / PR3 per spec.

**Merge-cleanliness notes:**
- `resolveTargetNameInline()` in PR4 vs `resolveTargetName()` in PR2:
  renamed to avoid the merge conflict when PR2 lands first. When both
  PRs merge, the inline version is dead code and can be removed (or
  PR2's helper can be deleted and the call site updated to inline).
- PR4 does NOT touch `staff-dispute-actions.tsx`, `dispute-actions.tsx`,
  the operator queue page, or any other PR2/PR3-only file.