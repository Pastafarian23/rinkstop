# Stamp Venues — Admin Process

**Date:** 2026-07-22
**Owner:** Arnel (project owner)
**Status:** v1 process doc (locked with Workstream 3 PR5)

This document describes the out-of-app process for creating venues that
participate in the Hockey Passport stamp system. **Venues are curated by
RinkStop admins** per WS3 Decision 1 — there is no self-serve mint endpoint
in v1.

---

## What is a venue?

A venue is anything that hosts hockey events but **isn't already in
`public.rinks`**. RinkStop treats rinks and venues as separate tables
because rinks have richer data (league affiliation, federation tag, claim
flow, public directory listing) and venues are typically narrower scope.

Examples of venues:

- Tournament hotels (host blocks for traveling teams)
- Training facilities (skill schools, summer camps)
- School gyms (where youth teams play during renovation)
- Cross-ice / dek hockey boxes not in the rink directory

If a place has a permanent ice sheet and is in the public directory, it's
a rink, not a venue. The boundary is: **does it have a RinkStop claim
flow?** If yes, it's a rink. If no, it's a venue.

---

## When to create a venue

Create a venue when:

1. A stamp pilot is being run for an event (e.g., a tournament
   organizer wants to print QR signs for hotels and rinks)
2. A non-rink host is recurring (e.g., a training facility with weekly
   sessions)
3. An admin needs to issue a QR for a one-off hockey event location

Don't create a venue for:

- Rinks that are already in `public.rinks` — use the rink's existing
  `qr_identifier`
- One-off home addresses for pickup hockey (use the rink instead)

---

## How to create a venue

### 1. Open Supabase dashboard

Table editor → `public.venues` → Insert row.

### 2. Required fields

| Column | Value | Notes |
|---|---|---|
| `name` | Display name | e.g., "Cebu Ice Academy Training Rink" |
| `venue_type` | `'rink'` \| `'tournament'` \| `'training'` \| `'other'` | Pick the closest fit |
| `address` | Full street address (optional) | Used for search/discovery later |
| `city` | City | |
| `country` | Country code or name | |
| `location` | PostGIS Point (optional) | For geo distance on scan; click the map widget |
| `operator_user_id` | Internal user_id of the operator (optional) | If you want them to be able to log scans they authored |
| `verification_tier` | `'unverified'` (default) | Promoted later via the same backfill logic as rinks |
| `status` | `'active'` | Only `'active'` venues resolve in the QR resolver |
| `notes` | Free text (optional) | Internal context (e.g., "WS3 pilot — Cebu") |

The `public_id` and `id` columns auto-fill with `gen_random_uuid()`. The
`qr_identifier` for the QR code is `public_id` — copy it after insert.

### 3. Add events at the venue (optional)

If the venue is hosting an event, add a row to `public.venue_events`:

| Column | Value | Notes |
|---|---|---|
| `name` | Event name | e.g., "Cebu Hockey Open 2026" |
| `parent_type` | `'rink'` \| `'venue'` | Pick `'venue'` for venues |
| `parent_venue_id` | The venue's UUID | Set this; leave `parent_rink_id` NULL |
| `starts_at` | ISO timestamp | Required |
| `ends_at` | ISO timestamp (optional) | |
| `federation` | Federation name (optional) | e.g., "Philippines Ice Hockey Federation" |
| `status` | `'active'` | |
| `created_by_user_id` | Internal user_id of the creator | Usually your admin user_id |

The `public_id` is the event's QR identifier.

### 4. Surface the venue (optional)

Venues appear in the public surface only if you build a directory page for
them. Out of v1 scope. For WS3 pilot, venues are just a stamp target.

---

## How to mint a QR for the venue

After insert, the venue's `public_id` column is the QR identifier. Print
signs that encode `https://rinkstop.com/qr/<public_id>`. When scanned:

- If `STAMPS_ENABLED=true`: redirects to `/stamp/<public_id>`, which
  resolves to the venue and shows the confirmation page
- If `STAMPS_ENABLED=false`: redirects to the existing passport resolver
  flow (no stamp page), which 404s for non-Passport QRs

The sign can be a printed paper, a sticker, or an SVG download (the same
shape as rink QR signs — see `/dashboard/manage/rink/[id]`).

For events, use the event's `public_id` instead — same flow.

---

## Promoting a venue to federation_verified

Out of scope for v1. Future work:

- Add `venue_federation_links` join table
- Backfill tier based on parent federation affiliation
- Surface tier in the stamp confirmation page (gray badge vs. green,
  per the WS3 plan's anti-fraud Layer 1)

---

## Off-boarding a venue

To deactivate without losing history:

```sql
UPDATE public.venues
SET status = 'deactivated', updated_at = NOW()
WHERE id = '<venue-uuid>';
```

The QR resolver treats `'deactivated'` as "no longer active" and shows
the deactivated page on scan. Existing stamps stay valid (per WS3 plan:
"don't punish holders for venue compromise").

For a permanent takedown, set `status='deactivated'` AND contact RinkStop
engineering to hard-remove the row (out of v1).

---

## Audit trail

Every venue creation goes through this doc (out-of-app). For a formal
audit log, capture the venue creation in:

- `#rinkstop-ops` channel (Telegram) — "Created venue Cebu Ice Academy
  Training Rink (uuid X) for WS3 pilot"
- `MEMORY.md` or relevant project memory file

Future work: build a v2 admin UI that records venue creation in
`public.admin_audit_log` (table already exists, see
`2026-06-15-admin-audit-log.sql`).

---

## Quick reference

```
venues insert
  id              uuid auto
  public_id       uuid auto  ← QR identifier
  name            text
  venue_type      rink | tournament | training | other
  address         text null
  city            text null
  country         text null
  location        geography(Point, 4326) null
  operator_user_id text null
  verification_tier unverified (default)
  status          active | deactivated
  notes           text null
  created_at      timestamptz auto
  updated_at      timestamptz auto

venue_events insert
  id              uuid auto
  public_id       uuid auto  ← QR identifier
  parent_type     rink | venue
  parent_rink_id  uuid null (FK)
  parent_venue_id uuid null (FK)
  name            text
  starts_at       timestamptz
  ends_at         timestamptz null
  federation      text null
  status          active | cancelled | deactivated
  created_by_user_id text null
  created_at      timestamptz auto
```

QR sign URL pattern: `https://rinkstop.com/qr/<public_id>`
