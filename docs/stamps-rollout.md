# Stamp System Rollout Runbook

**Date:** 2026-07-22
**Owner:** Arnel (project owner)
**Status:** v1 rollout plan (locked with Workstream 3 PR5)

This document describes how to enable the Hockey Passport stamp system in
production. Per Workstream 1 Rule 5, **all stamp functionality stays off
in production until explicitly enabled** via env vars. PR5 ships the
code; this runbook ships the activation sequence.

---

## Gates

| Env var | Default | Effect when `true` |
|---|---|---|
| `PASSPORT_ENABLED` | `false` | Master switch for all Passport code |
| `STAMPS_ENABLED` | `false` | Enables stamp endpoints, QR dispatch, attendance section, dashboard history, dispute, QR rotation |

When `STAMPS_ENABLED=false`:

- `/stamp/[qrIdentifier]` → 404
- `POST /api/passport/stamp` → 403
- `PATCH /api/passport/stamp/[stampId]` → 403
- `POST /api/passport/stamp/[stampId]/dispute` → 403
- `POST /api/internal/passport/stamps/rotate-qr` → 403
- `/admin/stamps/qr-rotation` → requires admin role, page renders but the
  API behind it returns 403
- `/dashboard/passport` → stamp history section doesn't render
- `/passport/[passportId]` → attendance section doesn't render
- `/qr/[qrIdentifier]` → skips stamp dispatch, falls through to passport lookup

When `STAMPS_ENABLED=true` (with `PASSPORT_ENABLED=true`):

- All endpoints become live
- QR resolver dispatches on stamp targets (rink/venue/event)
- `/dashboard/manage/rink/[id]` for approved rink operators shows the
  QR card
- Public Passport page renders attendance aggregates

---

## Pre-flight checklist

Before enabling in any environment, confirm:

- [ ] PR1 migration applied to target DB:
      `supabase/migrations/2026-07-22_stamps_schema.sql`
- [ ] PR2 migration applied to target DB:
      `supabase/migrations/2026-07-22_stamps_rls_policies.sql`
- [ ] All 5 NHL arenas have `verification_tier='nhl_arena'` (query:
      `SELECT count(*) FROM rinks WHERE verification_tier='nhl_arena'` —
      expect 5)
- [ ] Federation-affiliated rinks have
      `verification_tier='federation_verified'` (query:
      `SELECT count(*) FROM rinks WHERE verification_tier='federation_verified'`)
- [ ] Approved rink claims have `verification_tier='claimed'` (query:
      `SELECT count(*) FROM rinks r JOIN claims c ON c.entity_id=r.id
       AND c.claim_type='rink' AND c.status='approved'
       WHERE r.verification_tier='claimed'`)
- [ ] No `public.stamps` rows exist yet (fresh deployment):
      `SELECT count(*) FROM public.stamps` should be 0
- [ ] `public.consumer_notifications.kind` includes `'stamp_received'`
      (verify via `SELECT conname FROM pg_constraint WHERE conrelid =
      'public.consumer_notifications'::regclass AND contype='c'`)

---

## Rollout stages

Per Workstream 1 Rule 5, gradual rollout across three stages:

### Stage 1 — Internal (Arnel + admin)

**When:** Within 1 week of PR5 merge
**Goal:** Validate end-to-end with Arnel's own Passport
**Audience:** Arnel only

Steps:

1. Apply migrations to production DB (Supabase dashboard → SQL editor →
   paste each migration file → run)
2. Set `PASSPORT_ENABLED=true` and `STAMPS_ENABLED=true` on a staging
   environment first (Vercel preview deployment or dedicated staging)
3. Smoke test:
   - Scan a rink QR from your phone → see confirmation page
   - Confirm a stamp → row in `public.stamps`
   - Check `/dashboard/passport` → stamp appears
   - Toggle visibility to public → check `/passport/[id]` shows the
     stamp in the attendance section
4. Fix any issues found
5. Set `STAMPS_ENABLED=true` on production (via gateway config or env
   var)

### Stage 2 — Beta cohort (operators + a few players)

**When:** 1-2 weeks after Stage 1 stable
**Goal:** Validate with real rink operators and a small group of
players
**Audience:** 5-10 rink operators who have approved claims + their
immediate user networks

Steps:

1. Identify the beta cohort (operators with approved rink claims)
2. Announce via `#rinkstop-ops` channel with the QR sign workflow
   (operators print and post QRs)
3. Monitor:
   - Stamp creation rate (`SELECT count(*) FROM public.stamps`)
   - Dispute rate (`SELECT count(*) FROM public.stamps WHERE
     status='disputed'`)
   - Audit log outcomes (`SELECT outcome, count(*) FROM public.scan_events
     GROUP BY outcome`)
4. Hold for 1-2 weeks
5. Address any operator feedback (QR card UX, sign printing, dispute
   flow)

### Stage 3 — Public rollout

**When:** Beta cohort is stable, no critical issues
**Goal:** Open to all users
**Audience:** Everyone

Steps:

1. Add a prominent callout to `/claim-your-listing` for approved rink
   operators pointing to the QR card on their manage page
2. Update `/dashboard/passport` onboarding copy to mention stamps
3. Add blog post / social announcement (Coordinate with marketing)
4. Monitor:
   - Stamp creation rate (week-over-week growth)
   - Coach→player stamp rate vs. self-scan rate
   - Distance-flagged stamps (`scan_events.outcome='flagged_dispute'`)
5. Adjust rate limits or fraud thresholds as needed

---

## Monitoring queries

Run these weekly during beta, monthly after public rollout.

### Stamp creation rate

```sql
SELECT
  date_trunc('day', stamped_at) AS day,
  count(*) AS stamps_created
FROM public.stamps
WHERE stamped_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;
```

### Dispute rate

```sql
SELECT
  date_trunc('day', stamped_at) AS day,
  count(*) FILTER (WHERE status = 'disputed') AS disputed,
  count(*) FILTER (WHERE status = 'confirmed') AS confirmed,
  count(*) FILTER (WHERE status = 'revoked') AS revoked
FROM public.stamps
WHERE stamped_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;
```

### Audit outcomes

```sql
SELECT outcome, count(*)
FROM public.scan_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY outcome
ORDER BY count(*) DESC;
```

### Coach vs. self-scan

```sql
SELECT
  source,
  count(*) AS total,
  count(*) FILTER (WHERE status = 'disputed') AS disputed
FROM public.stamps
WHERE stamped_at > NOW() - INTERVAL '30 days'
GROUP BY source;
```

### QR rotation history

```sql
SELECT
  target_type,
  count(*) AS rotations,
  array_agg(DISTINCT reason) AS reasons
FROM public.qr_revocations
WHERE revoked_at > NOW() - INTERVAL '90 days'
GROUP BY target_type;
```

---

## Rollback plan

If issues surface in production, the rollback is **a single env-var
change**:

```bash
# Set STAMPS_ENABLED=false in production env
# This disables all stamp code paths without deploying anything.
```

The migrations stay applied (they're additive). Existing stamps remain in
the DB but become invisible to users because no endpoints serve them.

If you need to drop the schema entirely (extreme case):

```sql
DROP TABLE IF EXISTS public.scan_events CASCADE;
DROP TABLE IF EXISTS public.qr_revocations CASCADE;
DROP TABLE IF EXISTS public.stamps CASCADE;
DROP TABLE IF EXISTS public.venue_events CASCADE;
DROP TABLE IF EXISTS public.venues CASCADE;

ALTER TABLE public.rinks DROP COLUMN IF EXISTS qr_identifier;
ALTER TABLE public.rinks DROP COLUMN IF EXISTS verification_tier;
ALTER TABLE public.rinks DROP COLUMN IF EXISTS qr_revoked_at;
```

Reverting the migration does NOT undo `stamps_received` notifications
already created in `consumer_notifications` — those are domain-level
records and stay.

---

## Out of scope for v1

These are deliberate gaps from WS3 + WS3.5 plans. Don't address them
during rollout:

- Admin dispute queue (WS3.5) — admin resolves `'disputed'` →
  `'revoked'` in a separate workstream
- Strike system (WS3.5) — fraud banning
- Family Hub parent → child stamps (WS3.5)
- Challenges, prizes, leaderboards (WS4)
- Native push notifications (WS4+)
- Travel-map visualization (WS4)

---

## Quick reference

- Schema: `supabase/migrations/2026-07-22_stamps_schema.sql`
- RLS: `supabase/migrations/2026-07-22_stamps_rls_policies.sql`
- Plan: `workstreams/workstream-3-stamps.md`
- Venue creation: `docs/stamps-venue-creation.md`
- PRs: #29 (schema), #30 (endpoint), #31 (attendance), #32 (dispute + rotation), #33 (rollout — this PR)
