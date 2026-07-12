# Sports Passport — Vision

**Status:** Strategic vision document. No code, no schema, no implementation yet. Reference doc for everything we build.

**Last updated:** 2026-07-10

---

## What this document is

The Sports Passport is the long-term product vision for RinkStop and any future sport-specific properties. This document captures what it is, what it isn't, and the design principles that should govern every feature we ship.

This is not a roadmap. See `passport-roadmap.md` for the 12-week hockey passport v1 plan.

---

## The vision in one sentence

A verified, player-owned identity that connects every aspect of an athlete's journey — across teams, coaches, leagues, federations, facilities, and supporting businesses — across multiple sports, from youth play through recreational or professional careers.

---

## The core model (corrected 2026-07-10)

**Sport-specific records are the source of truth. The passport is the cross-sport view.**

- A hockey player has a **hockey record**, recognized by hockey (USA Hockey, Hockey Canada, IIHF). The record has its own fields (jersey number, position, goals, assists, +/-), its own verification sources (league registration, federation number, coach attestation), and its own privacy rules.

- A figure skater has a **figure skating record**, recognized by figure skating (USFS, ISI, ISU). Different fields (programs, IJS scores, levels, components), different federation, different verification sources.

- A curler has a **curling record**, recognized by curling (USCA, WCF). Different fields (ends, hammer, LSUM, bonspiel results).

- A player who plays multiple sports has multiple records, each recognized in its own sport's domain.

The "passport" is the **view** that surfaces all of a player's sport records under one identity. It is a presentation layer, not a container. It does not hold the data. It joins and displays what each sport's records contribute.

---

## What is shared across sports

Three things:

1. **Identity.** One person, one identity (`profiles`). Verified once via government ID. The identity is the only layer truly shared across sports.

2. **Records metadata.** A list of "this identity has N records across M sports, last verified at T." Pure metadata, no sport-specific data.

3. **Cross-sport endorsements.** A hockey coach can endorse a player for hockey performance. A figure skating coach can endorse for figure skating. Both attach to the player's identity and appear in the passport view. Endorsements are sport-coded; the visibility is cross-sport.

Everything else is sport-specific.

---

## What is sport-specific

For each sport, a parallel set of:

- **Sport record.** The athlete's full record within that sport — affiliations, stats, achievements, transfers, events.
- **Federation relationship.** Which federations recognize records (USA Hockey for hockey, USFS for figure skating, USCA for curling).
- **Verification sources.** Who can verify a record (federation, league, club, coach, self-reported with provenance).
- **Specialized stats.** Hockey has goals/assists/+/-. Figure skating has IJS components. Curling has ends/hammer/LSUM.
- **Specialized entities.** Hockey has teams and rinks. Figure skating has clubs and rinks (shared facility). Curling has clubs and sheets.
- **Sport-coded UI.** Hockey cards, hockey leaderboards, hockey claims. Figure skating cards, etc.

When figure skating lands, it gets its own tables (`figure_skating_skater_scores`, `figure_skating_clubs`, etc.), its own UI surfaces, its own claim flow. The passport view joins them at the identity layer.

---

## Schema pattern

**Decision: separate tables per sport.** Not a single `sport_records` table with a sport column. Not JSONB payloads. Reason: clean separation per sport, real foreign keys, real query plans, no schema drift inside a JSON column. The cost — more tables as we add sports — is worth it.

Naming convention:

- `hockey_*` for all hockey tables (e.g., `hockey_player_stats_season`, `hockey_player_team_history`, `hockey_coach_endorsements`)
- `figure_skating_*` for figure skating
- `curling_*` for curling
- `speed_skating_*` for speed skating

Shared identity-layer tables stay unprefixed (`profiles`, `identity_verifications`, `cross_sport_endorsements`).

---

## What connects the ecosystem

The platform doesn't just hold records. It connects:

- **Player** → profile, records (per sport), history, transfers, stats
- **Administrative** → clubs, leagues, federations, registrations, sanctions, governance
- **Facilities** → rinks (ice), fields (grass), courts (hardwood), gyms (multi-sport), equipment vendors
- **Supporting businesses** → coaches, trainers, equipment brands, tournament operators, scouts, agents

The connections are real data relationships, not marketing copy. A hockey player can list their current team's home rink. A rink can list its home teams. A coach can list their roster of players. A scout can list the prospects they're tracking (with player consent). The platform is the join layer.

---

## Federation relationships are the moat

A federation (USA Hockey, USFS, USCA, IIHF, ISU, WCF) controls the official record. Whoever integrates first with each federation owns that sport's data flow.

Hockey today: we have USA Hockey and Hockey Canada implicitly via the rink/team data. No direct federation integration yet. **First integration target: USA Hockey registration verification.**

Figure skating when it lands: USFS integration is the wedge. Same pattern as hockey.

The moat is not the directory. The moat is the federation integrations.

---

## Who owns the data

**The player.** Not the platform. Not the federation. Not the club.

A player can:
- See all their records across sports
- Export their passport as JSON / CSV (data portability)
- Grant or revoke access to scouts, coaches, federations, brands
- Correct inaccurate records
- Take their records elsewhere (portable)

This is GDPR-style data ownership as a product principle, not just a compliance checkbox.

---

## What the passport enables (the value)

For each stakeholder:

- **Players** carry a verified career record from youth through retirement. Recruitment, scholarship, and identity claims are simpler.
- **Coaches** verify their roster, build a verified coaching record, and endorse players they've trained.
- **Clubs / leagues** verify rosters, manage registrations, run operations.
- **Federations** reduce duplicate registration work via shared identity.
- **Facilities** (rinks, fields, courts) get a verified presence in the ecosystem.
- **Scouts / recruiters** see verified records instead of self-reported stats. Reduces fraud.
- **Equipment brands** see verified customers across sports. Verified reviews from verified athletes.
- **Tournament operators** see verified registrations.

---

## What this platform is NOT

Boundaries matter as much as features.

- **Not a stats engine.** We display verified stats sourced from federations, leagues, and clubs. We don't compute stats.
- **Not a ticketing platform.** We surface events but don't sell tickets.
- **Not a social network.** Players have profiles; profiles don't have walls, feeds, or follow-backs.
- **Not a fantasy / gaming platform.** Real records, not fantasy.
- **Not a streaming / video host.** We display verified media attached to records; we don't host video libraries.
- **Not a single-sport app.** Hockey is the v1 proof. Winter sports hub is the phase 1 expansion. All sports is the long-term.

---

## Phases

| Phase | Scope | Status |
|---|---|---|
| **Hockey v1 (current)** | Directory, claims, paid tiers, basic identity | Live in production |
| **Hockey passport v1** | Career timeline, verified stats, transfers, coach + federation relationships | Planned, 12 weeks (see passport-roadmap.md) |
| **Winter sports hub v1** | Figure skating, curling, speed skating as parallel verticals with sport-specific records | Post-hockey-passport |
| **Federation integrations** | USA Hockey, USFS, USCA registration verification, IIHF/ISU/WCF | 6+ months per federation |
| **Multi-domain / multi-brand** | Each major sport gets its own domain or subdirectory | After winter sports v1 |
| **All-sports platform** | Beyond winter — basketball, soccer, baseball, tennis, etc. | Long-term |

---

## Design principles (every feature must pass these)

1. **Sport-specific data lives in sport-specific tables.** No shared `stats` table.
2. **Identity is the only cross-sport shared layer.** Don't conflate.
3. **The passport is a view, not a container.** No primary `passports` table.
4. **Federations are first-class entities.** They verify records; they don't just appear as text fields.
5. **Players own their data.** Export, portability, and consent are product features, not afterthoughts.
6. **Verification is per-record, not per-identity.** Identity is verified once. Records are verified by their sport.
7. **Hockey is the test bed.** Every passport design decision gets validated in hockey v1 before other sports adopt it.
8. **Directory features and passport features are separate roadmaps.** They share infrastructure but ship independently.

---

## Open questions

1. **Cross-sport endorsement semantics.** When a hockey coach endorses a player for hockey performance, should that endorsement transfer visibility to figure skating recruiters if the player also figure skates? Or stay sport-scoped? Recommendation: stay sport-scoped by default; player opts in to cross-sport visibility.
2. **Federation relationship depth.** Do we federate with one federation per sport, or multiple (USA Hockey + NAHL + USHL for hockey; USFS + ISI for figure skating)? Recommendation: start with the national federation (USA Hockey, USFS), add others as partnerships develop.
3. **Multi-domain strategy timing.** When does RinkStop split into RinkStop + SkateAxis + CurlStop etc.? Recommendation: when each sport's traffic justifies its own SEO play, not before.
4. **International federations.** USA Hockey is US-centric. What about Hockey Canada, IIHF (international), or country-specific bodies? Recommendation: hockey v1 is US/Canada (share rink infrastructure and migration patterns); add IIHF in v2.

---

## Related docs

- `passport-roadmap.md` — 12-week hockey passport v1 plan (Tier 1 → Tier 4 sequencing)
- (Future) `passport-data-model.md` — proposed schema for hockey passport v1 tables
- (Future) `winter-sports-hub-plan.md` — phase 1 expansion plan once hockey passport v1 ships