# Sports Passport — Hockey v1 Roadmap

**Status:** Roadmap document. Companion to `passport-vision.md`. No code yet. Phasing is rough; weeks are estimates, not deadlines.

**Last updated:** 2026-07-10

---

## What this document is

A 12-week sequencing plan for shipping the **hockey passport v1** — the minimum set of features that make RinkStop's hockey surface a real "sports passport" for hockey players, not just a directory.

This roadmap runs in parallel with the existing hockey v1 directory + SaaS work (claim flow, pricing, marketing). The two share infrastructure but ship independently.

---

## Hockey passport v1 — minimum definition

The hockey passport v1 is "done" when a hockey player can:

1. Verify their identity (already exists: government ID via Clerk/Didit)
2. Have a verified **hockey record** (entity exists, federation-recognized data attached)
3. Show a **hockey career timeline** — every team affiliation with dates, jersey number, role
4. Show **verified stats by season** — goals, assists, +/-, games played, with verification source
5. Have a verified **federation registration** — USA Hockey number, Hockey Canada number, or both
6. Receive verified **coach endorsements** — coach attestations of skills, character, performance

That is hockey passport v1. Everything else (tournaments, multi-sport view, scouts, scholarships, equipment history) is v2 or beyond.

---

## Tier 1 — Player record + career timeline + stats

**Goal:** A player's verified hockey record exists and is meaningful.

**Weeks:** 1-2

**Tables to add:**
- `hockey_player_team_history` — every team affiliation: player_id, team_id, league_id, season_id, start_date, end_date, jersey_number, position, role, verification_source
- `hockey_player_stats_season` — per-season stats: player_id, season_id, league_id, level (youth/amateur/junior/college/pro), games_played, goals, assists, points, plus_minus, pim, verification_source, verified_at
- `hockey_seasons` — season lookup: id, label (e.g. "2024-25"), start_date, end_date, league_id

**Tables to extend:**
- `players` — add `primary_position_category` (forward/defense/goalie), `current_team_id` (live), `usa_hockey_number`, `hockey_canada_number`

**UI:**
- `/profile/[slug]/passport` or `/profile/[slug]/hockey` — passport view: career timeline, stats by season, current team, federation registration
- Player can add a historical team affiliation (self-reported, marked as such until verified)
- Coach or team admin can verify a player's stats for a given season

**Verification model:**
- Self-reported → status = "self_reported"
- League-registered → status = "league_verified"
- Federation-registered (USA Hockey # match) → status = "federation_verified"
- Coach-endorsed → status = "coach_verified"

**Risks:**
- Self-reported stats are unverified data. Public display must clearly mark "self-reported" vs "verified" to preserve E-E-A-T.
- Migration: existing `players.team_id` (one team) becomes "current_team_id" with full history tracked separately.

---

## Tier 2 — Federation + coach verification

**Goal:** Federations and coaches can verify records.

**Weeks:** 3-4 (federation), 5-6 (coach)

### Federation table + USA Hockey integration (weeks 3-4)

**Tables to add:**
- `federations` — id, name, country, sport (= 'hockey' for now), official_website, registration_api_url, registration_api_status
- `federation_registrations` — id, profile_id, federation_id, registration_number, registered_at, expires_at, verified_at, verification_source

**USA Hockey integration scope:**
- v1: USA Hockey number manual entry by player, verified by matching name + DOB against public USA Hockey roster data
- v2: USA Hockey API integration (requires partnership — 6+ month timeline)
- Hockey Canada: same pattern

**Tables to extend:**
- `profiles` — add `primary_federation_id` (FK to federations)

**UI:**
- `/dashboard/identity/federation` — player registers their federation number
- `/profile/[slug]/passport` shows federation badge once verified

### Coach verification + endorsements (weeks 5-6)

**Tables to add:**
- `coaches` — id, profile_id (the user), license_number, license_issuing_authority, license_expires_at, years_coaching, current_team_id, bio, verification_status
- `coach_team_history` — coach_id, team_id, role (head/assistant/private), season_id, start_date, end_date
- `coach_endorsements` — id, coach_id, player_id, endorsement_type (skills/character/leadership/eligible_for_*), text, visibility (sport_scoped/cross_sport), created_at

**Verification model:**
- Coach profile claims their license → status = "self_reported"
- Coach's profile_id matches an existing user with that license in our DB → status = "platform_verified"
- License verified against federation roster → status = "federation_verified" (future)

**UI:**
- `/directory/coaches/[id]` — coach profile (future; not in v1 directory surface)
- `/dashboard/coach/endorsements` — coach manages who they endorse
- `/profile/[slug]/passport` shows coach endorsements
- Coach signs up → migrates existing profile role

**Risks:**
- Coaches and players are the same identity model (both use `profiles`). Role differentiation on `profiles.role` becomes important — not a new entity class.
- Coach endorsements are reputation signals. Misuse (fake endorsements, retaliatory negative endorsements) needs moderation.

---

## Tier 3 — Schema sport-agnostic refactor + data portability

**Goal:** The data model supports N sports, not just hockey. The player owns and exports their passport.

**Weeks:** 7-10

### Sport-agnostic schema (weeks 7-8)

**Decisions to make in this phase:**
- Confirm `hockey_*` prefix pattern for all sport-specific tables
- `federations` table becomes multi-sport (`sport` column); existing hockey rows get `sport = 'hockey'`
- `profiles` becomes the cross-sport identity table; `role` enum extended if needed

**What's NOT changing in this phase:**
- We don't add figure skating tables yet (that's winter sports hub v1, a separate phase)
- We don't migrate existing data — `hockey_*` tables are added alongside existing `players`, `teams`, `leagues` etc. Cross-table linking happens via foreign keys.

### Data portability (weeks 9-10)

**New endpoints:**
- `GET /api/passport/export?format=json|csv` — full passport export for the authenticated user
- `GET /api/passport/export/[sport]` — sport-specific export

**Data included in export:**
- Identity (`profiles`)
- All sport records (hockey_team_history, hockey_stats_season, etc.)
- Federation registrations
- Coach endorsements
- Audit trail of verifications (who verified what when)

**Format:**
- JSON: structured, machine-readable, mirrors API shape
- CSV: flat per sport, suitable for Excel/Sheets

**Privacy:**
- Player must be authenticated
- Export is rate-limited (1 export per hour per user)
- Export includes a signature/hash for tamper detection (future)
- Export is logged in audit table

**UI:**
- `/dashboard/passport/export` — export UI with format selection
- Email confirmation required for export (anti-account-takeover)

---

## Tier 4 — Tournaments + events + recruitment v1

**Goal:** A hockey player's passport includes their tournament/event history. Verified scouts can view (with consent).

**Weeks:** 11-12

**Tables to add:**
- `tournaments` — id, name, host_organization, start_date, end_date, location_id, level, sanctioning_body
- `events` — id, name, type (tournament/showcase/camp/tryout/combine), sport (= 'hockey'), start_date, end_date, location_id, registration_url
- `event_participations` — id, event_id, participant_id (player or team), result, verified_by
- `scout_profiles` — id, profile_id, organization, role, sport, verified_status
- `recruitment_interests` — id, scout_id, player_id, status (interested/contacted/offered/committed), visibility (player_only/player_and_scout), created_at

**UI:**
- Player adds tournament/event participations to their passport
- Coach/team admin verifies tournament results
- Player grants scout visibility to passport
- Scout views verified passport (subset by consent)
- `/directory/tournaments/[id]` — tournament page (future; not in v1)

**Verification model:**
- Self-reported → "self_reported"
- Event-host verified (club, federation, tournament operator with verified profile) → "host_verified"
- Sanctioning body verified (USA Hockey sanctioned tournament) → "sanctioned_verified"

---

## What stays out of hockey passport v1 (deferred)

- Cross-sport passport view (waits for figure skating landing)
- Equipment / brand affiliation history
- Training facility + coach ratings (marketplace)
- Multi-domain strategy (rinkstop.com → rinkstop.com + skateaxis.com etc.)
- International federations beyond USA Hockey and Hockey Canada
- IIHF / international record sync
- Scholarship / NIL tracking

These are v2 or v3 of hockey, or part of the winter sports hub expansion.

---

## Parallel work — directory + SaaS continues

The hockey passport v1 runs **in parallel** with the hockey directory + SaaS work. The directory work monetizes now; the passport work builds the moat.

| Workstream | Owner | Cadence |
|---|---|---|
| Hockey directory + SaaS (claim flow, pricing, marketing, SEO) | Existing | Continuous |
| Hockey passport v1 (this roadmap) | New stream | 12-week plan |

The two share `profiles`, identity verification, paid tiers, and the basic `players` / `teams` / `leagues` / `rinks` schema. They diverge at the hockey record layer (passport) and the listing/claim layer (directory).

**Coordination rule:** any new directory feature should be reviewed against "does this serve the passport?" Directory-only features ship fast; passport-compatible features need design review.

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Self-reported stats pollute the passport | High | Always show "self-reported" vs "verified" badges; never present unverified stats alongside verified stats in any list view |
| Coach endorsement misuse (fake endorsements, retaliation) | Medium | Moderation queue for endorsements; player can flag; coach endorsement count limited |
| Federation integration takes longer than expected | High | Manual USA Hockey # entry is the v1 path; real API integration is later |
| Multi-sport schema refactor breaks existing code | Medium | Phase 3 is additive (new `hockey_*` tables alongside old `players`/`teams`); no migration until each table is dual-written |
| Player doesn't want their passport public | Low | Default privacy is "private" with opt-in sharing; scout visibility requires explicit consent |
| Coach-side adoption is slow | High | Coach verification is "free" (no tier required to claim your coaching record); federation partnerships drive adoption |

---

## Success metrics (after hockey passport v1 ships)

| Metric | Target | Why |
|---|---|---|
| Players with verified USA Hockey # | 100 in first 30 days, 1,000 by month 6 | Federation verification is the wedge |
| Players with at least 1 verified coach endorsement | 50 in first 30 days | Endorsements are the value layer |
| Players with self-reported + verified stats | 200 in first 30 days | Stats are the visible content |
| Passport exports per month | 10-50 | Adoption signal |
| `/profile/[slug]/passport` page views | Track over time | Engagement with the passport surface |

---

## Open questions for Arnel

1. **Coach tier — corrected twice 2026-07-10.** First recommendation was "free" — rejected. Second was "Verified Coach tier $49.99/yr" — also rejected. **Correct model: no separate coach tier.** A coach is a user with Verified Identity (or Identity Plus) who also has a coaching record attached to their identity. Identity verification cost is already covered by the existing tier — no new SKU needed. Coach endorsements are unlimited at any paid identity tier. **Role differentiation (player vs coach vs parent) lives on `profiles.role` metadata, not in tier pricing.** Tier pricing is for verification depth and feature access; role is for what the user does on the platform. **Pricing rule going forward:** never propose "free" for any tier where the platform pays anything per user. And: don't invent new tiers when an existing tier covers the same verification need. Tier sprawl is bad — it fragments pricing logic and confuses users.
2. **Federation partnership timing.** USA Hockey API integration requires partnership. Do we approach them now (parallel to v1) or after v1 ships?
3. **Scout role launch.** Tier 4 includes scout profiles. Is that wanted in hockey passport v1, or v2? My recommendation: v2 — scouts are a separate audience and need their own onboarding.
4. **Tournaments + events ingestion.** Manual player entry, or do we partner with tournament operators (via API) to auto-populate? My recommendation: manual first, API later.
5. **Multi-sport schema refactor timing.** Tier 3 says "weeks 7-8." That's mid-passport-v1. Could be deferred to after v1 ships if hockey-only data is acceptable for now. Your call.

---

## Related docs

- `passport-vision.md` — strategic vision, principles, what this is / isn't
- (Future) `passport-data-model.md` — proposed SQL schema for Tier 1-4 tables
- (Future) `winter-sports-hub-plan.md` — phase 1 expansion once hockey passport v1 ships
- (Future) `hockey-direct-passport-fork.md` — when figure skating lands, how hockey passport and figure skating passport coexist