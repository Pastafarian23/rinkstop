# Phase 2-A0 — Corrections Flow

**Status:** APPROVED (Arnel: "Work on stage b, Prepare document for files but go straight to correction and complete if deemed safe")
**Author:** KiloClaw
**Date:** 2026-07-08
**Parent pieces:** 1c-4 (analytics), 1c-5 (youth-friendly counts), 1c-6 (player-centric)

---

## 0. Why

Per Arnel 2026-07-08 (#35686): any user can submit a correction when they see information that's wrong. Spam protection is critical ("I want to make sure that corrections submissions are valid and not spam").

## 1. Schema

New table `corrections` (entity_type + entity_id abstracts away user-vs-family):

```sql
CREATE TABLE corrections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL CHECK (entity_type IN ('player', 'team', 'rink', 'league')),
  entity_id       text NOT NULL,  -- uuid (player/team/rink) or league code
  field_name      text NOT NULL,
  current_value   text,
  proposed_value  text NOT NULL,
  reason          text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 1000),
  submitter_user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_user_id text REFERENCES profiles(user_id) ON DELETE SET NULL,
  reviewer_note   text,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz
);
```

Indexes:
- `(entity_type, entity_id, field_name)` — "is there already an open correction for this field"
- `(submitter_user_id, status)` — user's own pending list
- `(status, submitted_at)` — admin queue ordering

## 2. Spam protection (the important part)

All four layers are enforced in the API:

1. **Account age**: `account_age_days >= 7`. Throwaway signups can't submit.
2. **Rate limit**: 3 submissions per user per 24h (existing rateLimit lib).
3. **One open per (submitter, entity, field)**: if user already has a `pending` correction for the same entity+field, reject the duplicate.
4. **Min content**: `proposed_value` non-empty, `reason` ≥ 10 chars.

Plus: **admin reviews every submission before any data changes**. No auto-apply. Worst case = admin queue noise, not data corruption.

## 3. Endpoints

### `POST /api/corrections`
- Auth required (any signed-in user, no tier gate)
- Body: `{ entity_type, entity_id, field_name, current_value, proposed_value, reason }`
- Enforces all four spam gates above
- Returns 201 with `{ id, status: 'pending' }` or 4xx with `{ error, code }`

### `POST /api/corrections/[id]/review`
- Admin-only (`getAdminFromRequest()` from existing admin-auth lib)
- Body: `{ action: 'approve' | 'reject', note?: string }`
- On approve: applies the correction to the target row (whitelisted fields only — see §5) and sets status='approved'
- On reject: just sets status='rejected' with note
- Returns 200 or 403

### `GET /api/corrections/mine`
- Auth required
- Returns the caller's submissions (any status), newest first
- Powers the "Your submissions" list on /corrections/new

## 4. UI

### `/corrections/new` (public to signed-in users)
- Form: entity type dropdown, entity id input, field dropdown, current/proposed value, reason
- Pre-fills from query string (`?entity_type=player&entity_id=...&field=birth_date&current=...`)
- Shows user's own pending list at the bottom

### `/admin/corrections` (admin only)
- Queue: pending corrections, oldest first
- Per row: entity + field + current + proposed + reason + submitter info
- Approve / Reject buttons (each opens a confirm with optional note)
- History toggle to see approved/rejected

### Entry point on player detail page
- "Suggest correction" link near the bio card → opens `/corrections/new?entity_type=player&entity_id=...&field=...&current=...`

## 5. Whitelisted fields (apply target)

Only fields in this whitelist can be auto-applied on approve. Anything else goes to status='review_required' (admin manually edits the row, then marks the correction approved via a follow-up action).

**players**: first_name, last_name, position, jersey_number, shoots, catches, height_cm, weight_kg, birth_date, nationality, bio
**teams**: (deferred to v2)
**rinks**: (deferred to v2)
**leagues**: (deferred to v2)

Players-only in v1. The other entity types get the submit/review flow but corrections are marked `review_required` and admin handles them manually.

## 6. Tier gate

No tier gate on submission (any signed-in user). Review is admin-only.

## 7. Rollback

- Drop the corrections table (single migration)
- Delete `/corrections/new`, `/admin/corrections`, `/api/corrections/*`
- Revert the player detail page link

## 8. Out of scope (deferred)

- Email notification when a correction is approved/rejected (v2)
- Public attribution ("Submitted by X")
- Diff view of the change
- Bulk approve / reject
- Corrections for non-player entities (the submit/review flow exists, the apply doesn't)

## 9. Estimated work

- Migration + apply: 0.25 day
- 3 API endpoints: 1 day
- /corrections/new page: 0.5 day
- /admin/corrections page: 0.5 day
- Player detail page link: 0.1 day
- Smoke tests + build + commit + deploy: 0.5 day

**Total: ~3 days. Ship as one commit.**