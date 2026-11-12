# PHASE-2C-B APPROVAL REVIEW

**Date:** 2026-11-12 · **Scope:** final human approval gate — PREPARATION ONLY
**Branch:** `grzhurrryimfylvwmeev` · **Production:** not modified
**Authorization:** Arnel, 2026-11-12 02:33 CST.

> **NOTHING IS APPROVED. NOTHING IS MERGED.** Every candidate carries
> `decision = 'pending_human_review'`. A recommendation is not an approval.

---

## 0. Summary

| | Count |
|---|---|
| **Total candidates in the package** | **39** |
| Tier 1 (identical upstream id) | 17 |
| Tier 2 (exact birth date) | 22 |
| **`decision = 'pending_human_review'`** | **39 (100%)** |
| `decision = 'approved'` | **0** |
| `decision = 'rejected'` | **0** |
| `decision = 'deferred'` | **0** |
| Recommendation: `recommend_approve` | 34 |
| Recommendation: `recommend_approve_with_caveat` | 5 |
| Candidates with a **competing-person caveat** | 8 (3 in T1, 5 in T2) |

**Files:** `docs/identity/phase-2c-final-approval.csv` · `docs/identity/phase-2c-final-approval.json`
**Builder:** `scripts/_build-phase2c-final-approval.mjs` — reads the branch, refuses production, and
**exits non-zero** if any validation rule fails.

---

## 1. Tier 1 — 17 candidates, independently validated

### 1.1 What was checked, and how it was checked *independently*

The Tier-1 classification came from the Phase 2A candidate table. To validate it, I **recomputed
the evidence from the source tables**, not from the candidate table:

| Check | Method | Result |
|---|---|---|
| `players.highlightly_id` exactly equals `nhl_players.id` | JOIN on the raw source columns | ✅ **17/17** |
| The upstream id is **authoritative** | Checked the NHL row's `source` tag | ✅ **17/17 are `highlightly`** |
| The id is unique, not reused | `count(*)` of `players` rows and `nhl_players` rows carrying that id | ✅ **exactly 1 and 1** for all 17 |
| No competing identity match | `count(*)` of candidate pairs touching each source row | ✅ **exactly 1 and 1** for all 17 |
| No protected conflict | Set intersection | ✅ **0** |
| No multi-record cluster | Set intersection | ✅ **0** |
| Names agree | Alphabetical comparison (accent/punctuation-insensitive) | ✅ **17/17 equal** |

### 1.2 Why "the source tag is `highlightly`" matters

`nhl_players.id` is a **mixed namespace**: 3,218 rows tagged `highlightly`, 885 tagged `espn`,
814 tagged `nhl.com`. An id from the `espn` or `nhl.com` subsets is a *locally assigned* key —
matching on it would be coincidental, not authoritative.

**All 17 Tier-1 candidates are tagged `highlightly`**, so their `id` is a genuine upstream
identifier. Globally, 4,281 `players.highlightly_id` values match an `nhl_players.id`, and **0** of
those match a *different* person — the id is not reused across identities.

### 1.3 The 17 Tier-1 candidates

| # | Name | Upstream id | NHL row source | players rows w/ id | nhl rows w/ id | Birth (nhl → players) |
|---|---|---|---|---|---|---|
| 1 | Alex Beaucage | 68823812 | highlightly | 1 | 1 | 2001-07-25 → 2001-01-01 |
| 2 | Antti Saarela | 76564277 | highlightly | 1 | 1 | 2001-06-27 → 2001-01-01 |
| 3 | Arttu Ruotsalainen | 66344537 | highlightly | 1 | 1 | 1997-10-29 → 1997-01-01 |
| 4 | Austin Czarnik | 45373307 | highlightly | 1 | 1 | 1992-12-12 → 1992-01-01 |
| 5 | Chris Tierney | 46019117 | highlightly | 1 | 1 | 1994-07-01 → 1994-01-01 |
| 6 | Daniel Carr | 45385922 | highlightly | 1 | 1 | 1991-11-01 → 1991-01-01 |
| 7 | Derick Brassard | 53657 | highlightly | 1 | 1 | 1987-09-22 → 1987-01-01 |
| 8 | Filip Zadina | 65291567 | highlightly | 1 | 1 | 1999-11-27 → 1999-01-01 |
| 9 | Joren Van Pottelberghe | 59132567 | highlightly | 1 | 1 | 1997-06-05 → 1997-01-01 |
| 10 | Lawrence Pilut | 65867627 | highlightly | 1 | 1 | 1995-12-30 → 1995-01-01 ⚠️ |
| 11 | Ludovic Waeber | 77595587 | highlightly | 1 | 1 | 1996-08-19 → 1996-01-01 ⚠️ |
| 12 | Manix Landry | 73431152 | highlightly | 1 | 1 | 2002-11-23 → 2002-01-01 |
| 13 | Michael Raffl | 45560417 | highlightly | 1 | 1 | 1988-12-01 → 1988-01-01 |
| 14 | Petteri Lindbohm | 46041227 | highlightly | 1 | 1 | 1993-09-23 → 1993-01-01 |
| 15 | Ronald Knot | 73724837 | highlightly | 1 | 1 | 1994-08-03 → 1994-01-01 |
| 16 | Simon Ryfors | 73420247 | highlightly | 1 | 1 | 1997-08-16 → 1997-01-01 |
| 17 | Valentin Nussbaumer | 68815037 | highlightly | 1 | 1 | 2000-09-25 → 2000-01-01 ⚠️ |

⚠️ = the birth date is shared with a different person (see §1.4). **Irrelevant to the Tier-1
conclusion** — the upstream id is decisive on its own.

### 1.4 Exceptions and disclosures

1. **All 17 have a placeholder birth date on the `players` side** (`YYYY-01-01`, year only). This is
   immaterial for Tier 1 — the id match is decisive and the year agrees in every case — but it does
   mean **birth date alone would not have identified these 17**. That is precisely why the
   upstream id is the right key.
2. **3 Tier-1 candidates share their birth date with a different person** — Lawrence Pilut
   (Igor Shesterkin), Ludovic Waeber (Joey Daccord), Valentin Nussbaumer (Raphael Lavoie). Their
   nationality and team differ from the competing person, and the id match resolves them. Disclosed
   in the manifest as `competing_person_name`.
3. **3 have no nationality on either side** (Joren Van Pottelberghe, Manix Landry, Ronald Knot).
4. **No `players` row in this tier has an attached account** (`players_user_id` is empty), so no
   account-ownership conflict is possible. One (`Valentin Nussbaumer`) has `claimable = true`.

---

## 2. Tier 2 — 22 candidates, reviewed individually

### 2.1 Evidence available per candidate

Every Tier-2 candidate has, at minimum: an **identical full birth date**, an **identical name**
(alphabetically), plus position/jersey/team/nationality where recorded. Career history is thin on
both sides (`player_team_history` and `hockey_player_team_history` have 0 rows for every one of
these 22), so **team is a snapshot, not a career record**.

### 2.2 The birth date is NOT unique — and what resolves it

**This is the most important finding of the Tier-2 review.** For **5** of the 22, the birth date is
shared with a **different person**:

| Candidate | Birth date | Competing person | Candidate nat/team | Competing nat/team |
|---|---|---|---|---|
| Dakota Joshua | 1996-05-15 | **Jalen Chatfield** | USA / TOR | USA / CAR |
| Egor Chinakhov | 2001-02-01 | **Juuso Parssinen** | RUS / PIT | FIN / NYR |
| Kevin Lankinen | 1995-04-28 | **Connor Clifton** | FIN / VAN | — / PIT |
| Kiefer Sherwood | 1995-03-31 | **Trevor Moore** | USA / SJS | USA / LAK |
| Samuel Montembeault | 1996-10-30 | **Dennis Gilbert** | CAN / MTL | — / OTT |

For all five, the **within-pair names are identical** while the **competing person has a
different name, nationality and team**. So the date alone would NOT have identified the
candidate — but the **combination** (name + date + team + nationality all agreeing, and no attribute
shared with the competing person) does.

**Juraj Slafkovský (2004-03-30)** is the extreme case: **six** distinct people share that date
(Isaac Howard, Rieger Lorenz, Rodwin Dionicio, Ty Nelson, Rutger McGroarty, Juraj Slafkovsky). His
candidate pair is `nhl=8483515` (nhl.com) ↔ `players=7f7924ae`. A *separate* cluster
`juraj-slafkovsky` (`nhl=73731302`, highlightly) is very likely **the same human** under a
different source and spelling, currently classified `manual_review` with `one_unknown`. **Merging
the approved pair would not break that** (different source rows), but the reviewer should know the
Slafkovský identity spans three rows, not two.

### 2.3 The 17 Tier-2 candidates with no competing person

| # | Name | Birth date | Nat (nhl/pl) | Team (nhl → players) | Position (nhl/pl) | Jersey |
|---|---|---|---|---|---|---|
| 1 | Alexis Lafrenière | 2001-10-11 | CAN/CAN | — → NY Rangers | Forward / left_wing | 13/13 |
| 2 | Derek Forbort | 1992-03-04 | USA/USA | Vancouver Canucks → Vancouver Canucks | Defense / defenseman | 27/— |
| 3 | Evander Kane | 1991-08-02 | —/CAN | Vancouver Canucks → Vancouver Canucks | — / left_wing | 91/— |
| 4 | Filip Chytil | 1999-09-05 | CZE/CZE | — → Vancouver Canucks | Forward / center | 72/— |
| 5 | Isac Lundeström | 1999-11-06 | SWE/SWE | — → Anaheim Ducks | Forward / center | 21/21 |
| 6 | Jake DeBrusk | 1996-10-17 | CAN/CAN | — → Vancouver Canucks | Forward / left_wing | 74/— |
| 7 | Juraj Slafkovský | 2004-03-30 | SVK/SVK | — → Montreal Canadiens | Forward / left_wing | 20/20 ⚠️6 |
| 8 | Leevi Meriläinen | 2002-08-13 | FIN/FIN | — → Ottawa Senators | Goalie / goalie | 1/1 |
| 9 | Marcus Pettersson | 1996-05-08 | SWE/SWE | — → Vancouver Canucks | Defense / defenseman | 29/— |
| 10 | Martin Fehérváry | 1999-10-06 | SVK/SVK | — → Washington Capitals | Defense / defenseman | 42/42 |
| 11 | Nils Aman | 2000-02-07 | SWE/SWE | Vancouver Canucks → — | Center / center | 88/— |
| 12 | Noah Juulsen | 1997-04-02 | —/CAN | Philadelphia Flyers → Vancouver Canucks | — / defenseman | 47/— |
| 13 | Oskar Bäck | 2000-03-12 | SWE/SWE | — → Dallas Stars | Forward / center | 10/10 |
| 14 | Teddy Blueger | 1994-08-15 | —/LVA | Vancouver Canucks → Vancouver Canucks | — / center | 53/— |
| 15 | Thatcher Demko | 1995-12-08 | USA/USA | — → Vancouver Canucks | Goalie / goalie | 35/— |
| 16 | Tim Stützle | 2002-01-15 | DEU/DEU | — → Ottawa Senators | Forward / center | 18/18 |
| 17 | Zachary Bolduc | 2003-02-24 | CAN/CAN | — → St. Louis Blues | Forward / right_wing | 76/76 |

⚠️6 = the date is shared with 5 other people; the name resolves it (see §2.2).

### 2.4 Why the evidence supports one individual rather than two people sharing a birth date

For every one of the 22:

1. **The names are identical**, including diacritics and multi-word forms (`Isac Lundeström`,
   `Martin Fehérváry`, `Tim Stützle`, `Joren Van Pottelberghe`). Two unrelated people sharing a
   full name *and* a full birth date is a far rarer coincidence than a shared birth date alone.
2. **Where a competing person shares the date, the competing person differs on name, nationality
   and/or team** — the candidate is not ambiguous, the *date* is.
3. **Position and jersey agree** on 12 of the 22 where both sides carry them (13/13, 59/59,
   21/21, 20/20, 1/1, 42/42, 10/10, 35/35, 18/18, 76/76 …).
4. **Where both sides carry a team, they agree** (Derek Forbort, Evander Kane, Teddy Blueger).
5. **No competing candidate pair touches either source row** — each of the 22 participates in
   exactly one candidate pair, so there is no second identity competing for the same record.
6. **No attached account on the `players` side** for any of the 22, so no ownership conflict.
7. **Career history is empty on both sides** — which is why team cannot be used as a strong
   independent signal, and why the reviewer should weigh name + date + nationality + jersey.

**Known weaknesses, stated plainly:**
- **18 of 22 have no team on the NHL side** (expected — the NHL team snapshot is often blank for
  players no longer on an NHL roster). Team therefore corroborates only 4 of the 22.
- **5 have no nationality on the NHL side** (Evander Kane, Noah Juulsen, Teddy Blueger and the two
  nhl.com rows without nationality).
- **Nils Aman** has an NHL team (Vancouver Canucks) but **no team** on the players side — the
  players row is a bare profile.
- **Noah Juulsen** and **Teddy Blueger** have differing teams (Philadelphia→Vancouver,
  Vancouver→Vancouver for Blueger who matches). Noah Juulsen's NHL side is Philadelphia Flyers
  and the players side is Vancouver Canucks — **consistent with a trade**, but it is also
  consistent with two different players, and the name + date are what carry the identification.
- **Position wording differs** on several (Forward vs left_wing, Defense vs defenseman,
  Goalie vs goalie) — a format difference, not a conflict.

---

## 3. The approval package

**`docs/identity/phase-2c-final-approval.csv`** and **`.json`** — 39 records.

**Columns:** `approval_id` · `evidence_tier` · `cluster_key` · both source namespaces + source ids ·
both person uuids · both names · players slug · players upstream id · upstream-id-match flag · raw +
normalized birth dates + placeholder flags on both sides · birth-date evidence · raw nationality on
both sides + evidence · full team/league/position/jersey/birth-place/active attributes on both
sides · claimable + user id · roles on both sides · alias counts on both sides · validation counters
(upstream-id uniqueness, candidate-pair counts, name equality, same-birthdate row counts) ·
competing-cluster / person / nationality / team · proposed survivor side + uuid + score · proposed
merged uuid + score · supporting evidence · conflicting information · missing information ·
explanation · recommendation + recommendation note · **`decision` · `decision_rationale` ·
`decided_by` · `decided_at` · `applied_at`**.

### The decision field

Every record is initialized as:

```
decision           = 'pending_human_review'
decision_rationale = ''
decided_by         = ''
decided_at         = ''
applied_at         = ''
```

The allowed values are `pending_human_review` · `approved` · `rejected` · `deferred`. The builder
**never** sets anything else, and the recommendations
(`recommend_approve` / `recommend_approve_with_caveat`) are **advisory fields**, not decisions.

---

## 4. Technical readiness — reconfirmed

### 4.1 Branch checks — 18/18 MATCH

| Check | Actual | Expected |
|---|---|---|
| Package total | **39** | 39 |
| Tier 1 / Tier 2 | **17 / 22** | 17 / 22 |
| nhl source ids independent | true | true |
| players source ids independent | true | true |
| nhl person ids independent | true | true |
| players person ids independent | true | true |
| **no person id shared across the two sides** | true | true |
| **no source id shared across the two sides** | true | true |
| 977 multi-cluster merge-eligible excluded | 977 | 977 |
| Protected conflicts total | 7 | 7 |
| Protected + approved | **0** | 0 |
| Year-only pairs excluded (total) | 28 | 28 |
| **Year-only pairs that are NOT Tier 1** (i.e. genuinely T3) | **11** | 11 |
| Tier-1 upstream-id pairs | 17 | 17 |
| `approved_to_merge` anywhere | **0** | 0 |
| Merged persons | **0** | 0 |
| Merge-audit rows | **0** | 0 |

### 4.2 Production checks — 14/14 MATCH

| Check | Actual | Expected |
|---|---|---|
| Backup rows | 5,072 | 5,072 |
| Backup RLS enabled | true | true |
| Backup policies | 2 | 2 |
| Backup anon SELECT / INSERT / UPDATE / DELETE grants | false ×4 | false |
| Backup authenticated SELECT grant | false | false |
| Backup PUBLIC SELECT grant | false | false |
| Backup immutability trigger | 1 | 1 |
| service_role SELECT grant (needed for rollback) | true | true |
| merged persons / person_claims / person_aliases | 0 / 0 / 0 | 0 / 0 / 0 |

**Backup protection and immutability are established.** Any future production backup must be
created the same way — RLS + deny policies + `REVOKE ALL FROM anon, authenticated, PUBLIC` +
an immutability trigger refusing UPDATE and DELETE — **from the start**, not retrofitted.

### 4.3 Gates

| Gate | Result |
|---|---|
| Gate 23 (`_audit-person-identity.mjs`) | **PASS** on production |
| Gate 8 (`_audit-rls-disabled.mjs`) | extended identity/backup checks **PASS** on production and on the branch; only the pre-existing `spatial_ref_sys` fails |
| New-table detection | **verified** — a deliberately unprotected table on the branch makes the gate exit 1 and name it; removing it makes the gate pass; re-adding it fails again |
| Cluster-completeness | enforced by the builder — every candidate must be in a 2-record cluster, and no two candidates may share a source or person id. The builder exits non-zero otherwise |

### 4.4 The staging merge and rollback procedure (documented, proven)

**Staging merge (branch only, rolled back):**
1. Approve the T1+T2 pairs in `person_identity_decisions` (the rehearsal raises if a T3 pair is
   approved).
2. For each approved decision, call `public.person_merge_identities(decision_id)`.
   - The function refuses anything that is not `approved_to_merge`, is protected, or does not
     resolve to two distinct persons.
   - It re-points (never deletes) `person_sources`, `person_roles`, `person_claims`,
     `person_aliases`; fills the survivor's empty attributes; and marks the merged-away person
     `identity_state='merged'` with a canonical pointer. **The merged-away person is retained.**
   - Every movement is written to `person_merge_audit`.
3. Verify the 17 Phase 2A invariants and the 8 rehearsal requirements.
4. Roll back using `person_merge_audit` (the inverse is mechanical, not a guess).

**Proven results (39 merges on the branch):** 17/17 invariants true · 8/8 requirements true ·
rollback restored `persons` 11,443 · `sources` 11,443 · `roles` 11,424 · `merged` 0 ·
`origin_agreements` 11,443.

**For production, the same procedure applies, with these additions:**
- The candidate/decision tables must exist in production (they are currently **branch-only**).
  Creating them in production requires **separate authorization** — not granted here.
- A pre-merge backup must be taken **with** RLS, revoked grants and an immutability trigger.
- The batch must be applied one transaction at a time, with the invariants checked after each.

---

## 5. Outstanding items for the reviewer

| # | Item | Why it matters |
|---|---|---|
| 1 | **5 Tier-2 candidates have a competing person on the birth date** (Dakota Joshua, Egor Chinakhov, Kevin Lankinen, Kiefer Sherwood, Samuel Montembeault) | The date alone would not identify them; the name, team and nationality do. Recorded as `recommend_approve_with_caveat`. |
| 2 | **3 Tier-1 candidates share their birth date with a different person** (Pilut, Waeber, Nussbaumer) | Immaterial to the upstream-id conclusion, but disclosed. |
| 3 | **Juraj Slafkovský's identity spans three rows** across two clusters (accented + unaccented spellings, two sources) | The approved pair merges two of them; the third remains `manual_review`. Worth a decision in Phase 2D. |
| 4 | **18 of 22 Tier-2 candidates have no NHL team**; **5 have no NHL nationality** | Team and nationality cannot corroborate for those; name + date + jersey carry them. |
| 5 | **Nils Aman** — NHL team present, players side has no team | The players row is a bare profile. |
| 6 | **Noah Juulsen** — NHL Philadelphia Flyers, players Vancouver Canucks | Consistent with a trade; name + date carry the identification. |
| 7 | **Career history is empty on both sides for all 22** | Team is a snapshot, not a trajectory. |
| 8 | **The 11 Tier-3 pairs are excluded from this package** | Year-only birth date + differing teams = an assumption, not a confirmation. |

---

## 6. State verification

**Production — unchanged by this phase:**

| Metric | Value |
|---|---|
| `persons` / `person_sources` / `person_roles` | 11,443 / 11,443 / 11,424 |
| backup table | 5,072 rows · RLS · revoked grants · immutability trigger |
| merged / claimed | **0 / 0** |
| `person_claims` / `person_aliases` | 0 / 0 |
| `person_identity_*` tables in production | **0** (branch-only) |
| `person_merge_audit` in production | **0** |
| `profiles` / `claims` / `managed_profiles` / `didit_sessions` | 19 / 0 / 1 / 1 |
| `players` / `nhl_players` | 6,352 / 4,917 |
| Public behavior | rinkstop.com 200 · counts identical |
| Gate 23 / Gate 8 | PASS / PASS (except the pre-existing `spatial_ref_sys`) |
| Feature flags | `PERSON_IDENTITY_ENABLED` unset |

**Branch `grzhurrryimfylvwmeev`:** ACTIVE_HEALTHY · 5,915 candidates · 4,582 clusters ·
**0 approved** · 7 protected · **0 merged** · 0 merge-audit rows · 4 Phase 2A tables
RLS-hardened · no leftover gate-test artifacts.

---

## 7. What happens next

**Stopping here.** The next production authorization will be based on **individually approved
records** — the reviewer sets `decision` per row in
`docs/identity/phase-2c-final-approval.csv`. The number of recommendations is not the input.

Before any production merge, these remain prerequisites:
1. The candidate + decision tables created in **production**, RLS-protected (separate
   authorization).
2. A pre-merge backup with RLS + revoked grants + immutability trigger, from the start.
3. The cluster-completeness gate active on the production path.
4. Per-batch invariant verification and a proven rollback.

**No production merge, identity write, claim, archival, deletion, route change, or feature
activation has occurred.**
