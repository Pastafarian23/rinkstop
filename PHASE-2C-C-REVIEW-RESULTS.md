# PHASE-2C-C — REVIEW RESULTS

**Date:** 2026-07-12 · **Scope:** review-results preparation — **NO MERGES, NO APPROVALS**
**Branch:** `grzhurrryimfylvwmeev` · **Production:** not modified
**Source:** Arnel's independent review of `docs/identity/phase-2c-decision-sheet.csv`.

> **The original decision sheet was NOT modified.** Every row in it still reads
> `decision = 'pending_human_review'`. This is a **separate** review-results artifact.
> **Nothing was approved in the database. Nothing was merged.**

---

## 0. Files

| File | Contents |
|---|---|
| **`docs/identity/phase-2c-review-results.csv`** | **The review results.** 39 rows × 83 columns. Every original evidence column preserved verbatim, plus 9 review columns. |
| `docs/identity/phase-2c-review-results.json` | Same 39 records, machine-readable. |
| `scripts/_build-phase2c-review-results.mjs` | Reproducible builder with built-in validation. |
| `docs/identity/phase-2c-decision-sheet.csv` | **UNCHANGED** — verified by checksum. Still the authoritative decision file, all rows `pending_human_review`. |

**New review columns** (appended, original evidence untouched):

| Column | Meaning |
|---|---|
| `review_recommendation` | `approve` · `defer` · `reject` — **the reviewer's recommendation, not an approval** |
| `review_rationale` | why, in plain English |
| `review_caveats` | the explicit caveats, where applicable |
| `review_outcome` | `recommended_for_approval` · `deferred_pending_cluster_resolution` |
| `review_caveat_flag` | `true` / `false` |
| `reviewed_by` | `Arnel (independent review)` |
| `review_source` | provenance of the review |

---

## 1. Outcome

| | Count |
|---|---|
| Total candidates | **39** |
| **Recommended for approval** | **38** |
| — Tier 1 (authoritative upstream id) | 17 — `2CB-001` … `2CB-017` |
| — Tier 2 (exact birth date) | 21 — `2CB-018` … `2CB-039` excluding `2CB-026` |
| **Deferred** | **1** — `2CB-026` Juraj Slafkovský |
| Rejected | 0 |
| **With explicit caveats preserved** | **8** (5 Tier 2 + 3 Tier 1) |

---

## 2. Tier 1 — 2CB-001 to 2CB-017 (17, recommended for approval)

Primary evidence: **`players.highlightly_id` exactly equals `nhl_players.id`**, with the NHL row
tagged `highlightly` — an authoritative upstream key, not a locally-assigned one.

| Approval ID | Name | `nhl_players` id | `players` id | Highlightly id |
|---|---|---|---|---|
| 2CB-001 | Alex Beaucage | `68823812` | `72257ff4…` | **68823812** |
| 2CB-002 | Antti Saarela | `76564277` | `aead6a74…` | **76564277** |
| 2CB-003 | Arttu Ruotsalainen | `66344537` | `c7f66e70…` | **66344537** |
| 2CB-004 | Austin Czarnik | `45373307` | `f04be119…` | **45373307** |
| 2CB-005 | Chris Tierney | `46019117` | `c181fe27…` | **46019117** |
| 2CB-006 | Daniel Carr | `45385922` | `05e8557b…` | **45385922** |
| 2CB-007 | Derick Brassard | `53657` | `3e1277db…` | **53657** |
| 2CB-008 | Filip Zadina | `65291567` | `55338131…` | **65291567** |
| 2CB-009 | Joren Van Pottelberghe | `59132567` | `5ecf7fca…` | **59132567** |
| 2CB-010 | Lawrence Pilut ⚠️ | `65867627` | `864c377f…` | **65867627** |
| 2CB-011 | Ludovic Waeber ⚠️ | `77595587` | `1d80d357…` | **77595587** |
| 2CB-012 | Manix Landry | `73431152` | `1cf3841c…` | **73431152** |
| 2CB-013 | Michael Raffl | `45560417` | `b642e72a…` | **45560417** |
| 2CB-014 | Petteri Lindbohm | `46041227` | `67202716…` | **46041227** |
| 2CB-015 | Ronald Knot | `73724837` | `d01f3df5…` | **73724837** |
| 2CB-016 | Simon Ryfors | `73420247` | `8544f3d3…` | **73420247** |
| 2CB-017 | Valentin Nussbaumer ⚠️ | `68815037` | `b6c33808…` | **68815037** |

⚠️ = the birth date is shared with a different person. **Immaterial to the Tier-1 conclusion** —
the upstream id resolves it independently of any date — but preserved as an explicit caveat.

---

## 3. Tier 2 — 21 recommended, 1 deferred

### 3.1 Recommended for approval (21)

| Approval ID | Name | `nhl_players` id | `players` id | Birth date | Nat (nhl/pl) |
|---|---|---|---|---|---|
| 2CB-018 | Alexis Lafrenière | `8482109` | `5ab3d809…` | 2001-10-11 | CAN/CAN |
| 2CB-019 | **Dakota Joshua** ⚠️ | `8478057` | `badd3e37…` | 1996-05-15 | USA/USA |
| 2CB-020 | Derek Forbort | `88502` | `70b0e232…` | 1992-03-04 | USA/USA |
| 2CB-021 | **Egor Chinakhov** ⚠️ | `8482475` | `61181f40…` | 2001-02-01 | RUS/RUS |
| 2CB-022 | Evander Kane | `8475169` | `866e17d3…` | 1991-08-02 | —/CAN |
| 2CB-023 | Filip Chytil | `8480078` | `1701428e…` | 1999-09-05 | CZE/CZE |
| 2CB-024 | Isac Lundeström | `8480806` | `a4f07ba5…` | 1999-11-06 | SWE/SWE |
| 2CB-025 | Jake DeBrusk | `8478498` | `08a46aa3…` | 1996-10-17 | CAN/CAN |
| 2CB-027 | **Kevin Lankinen** ⚠️ | `8480947` | `930ac5e0…` | 1995-04-28 | FIN/FIN |
| 2CB-028 | **Kiefer Sherwood** ⚠️ | `8480748` | `6bd4c5be…` | 1995-03-31 | USA/USA |
| 2CB-029 | Leevi Meriläinen | `8482447` | `806917b1…` | 2002-08-13 | FIN/FIN |
| 2CB-030 | Marcus Pettersson | `8477969` | `55331b15…` | 1996-05-08 | SWE/SWE |
| 2CB-031 | Martin Fehérváry | `8480796` | `cfeb61f9…` | 1999-10-06 | SVK/SVK |
| 2CB-032 | Nils Aman | `70464752` | `7945f960…` | 2000-02-07 | SWE/SWE |
| 2CB-033 | Noah Juulsen | `8478454` | `fa3ccc84…` | 1997-04-02 | —/CAN |
| 2CB-034 | Oskar Bäck | `8480840` | `1ced9bff…` | 2000-03-12 | SWE/SWE |
| 2CB-035 | **Samuel Montembeault** ⚠️ | `8478470` | `47d061f3…` | 1996-10-30 | CAN/CAN |
| 2CB-036 | Teddy Blueger | `8476927` | `b7f2d8d8…` | 1994-08-15 | —/LVA |
| 2CB-037 | Thatcher Demko | `8477967` | `5cc327ef…` | 1995-12-08 | USA/USA |
| 2CB-038 | Tim Stützle | `8482116` | `b4442ec5…` | 2002-01-15 | DEU/DEU |
| 2CB-039 | Zachary Bolduc | `8482737` | `f7ff7122…` | 2003-02-24 | CAN/CAN |

### 3.2 The five shared-birth-date caveats — preserved verbatim

| Approval ID | Candidate | Birth date | Competing person (same date) |
|---|---|---|---|
| **2CB-019** | Dakota Joshua | 1996-05-15 | **Jalen Chatfield** (USA/CAR) |
| **2CB-021** | Egor Chinakhov | 2001-02-01 | **Juuso Parssinen** (FIN/NYR) |
| **2CB-027** | Kevin Lankinen | 1995-04-28 | **Connor Clifton** (–/PIT) |
| **2CB-028** | Kiefer Sherwood | 1995-03-31 | **Trevor Moore** (USA/LAK) |
| **2CB-035** | Samuel Montembeault | 1996-10-30 | **Dennis Gilbert** (–/OTT) |

**Caveat text carried on each row:** the birth date is shared with a different person; the date
alone would **not** identify the candidate; the identical name plus team and nationality identify
him, and **no attribute is shared with the competing person**.

### 3.3 The three Tier-1 caveats (also preserved)

| Approval ID | Candidate | Competing person | Note |
|---|---|---|---|
| 2CB-010 | Lawrence Pilut | Igor Shesterkin (RUS/NYR) | **Immaterial to the Tier-1 conclusion** — the identical authoritative Highlightly id (65867627) resolves it independently of any date. |
| 2CB-011 | Ludovic Waeber | Joey Daccord (USA/SEA) | Same — id 77595587. |
| 2CB-017 | Valentin Nussbaumer | Raphael Lavoie (–/VGK) | Same — id 68815037. |

### 3.4 Other Tier-2 caveats carried in the original evidence columns

| Item | Candidates | Evidence column |
|---|---|---|
| No team on the NHL side | 18 of 22 | `nhl_team` = (blank) |
| No nationality on the NHL side | 5 of 22 | `nhl_nationality_raw` = (blank) |
| Career history empty on both sides | 22 of 22 | — |
| **Noah Juulsen** — NHL Philadelphia Flyers vs players Vancouver Canucks | 2CB-033 | `nhl_team` / `players_team` — trade-consistent |
| **Nils Aman** — no players-side team | 2CB-032 | `players_team` = (blank) |
| Position wording differs (Forward vs left_wing, Defense vs defenseman, Goalie vs goalie) | several | `nhl_position` / `players_position` |

---

## 4. The deferral — 2CB-026 Juraj Slafkovský

**Recommendation: DEFER.** `review_outcome = deferred_pending_cluster_resolution`.

**Rationale, verified against the live branch data:**

The identity spans **three source records across two separate two-record clusters**:

| Cluster | `nhl_players` id | `players` id | Names | Current state |
|---|---|---|---|---|
| `juraj-slafkovsk-` | `8483515` (nhl.com, accented) | `7f7924ae` | Juraj Slafkovský / Juraj Slafkovský | **this candidate** — `high`, `merge`, exact birth date |
| `juraj-slafkovsky` | `73731302` (highlightly, unaccented) | `590f642b` | Juraj Slafkovsky / Juraj Slafkovsky | `none`, `manual_review`, `one_unknown` |

Merging only the pair in the first cluster would leave the identity **split across clusters**.
And the birth date **2004-03-30 is shared by five other distinct people** (Isaac Howard, Rieger
Lorenz, Rodwin Dionicio, Ty Nelson, Rutger McGroarty).

**Required before this can be reconsidered:** resolve the entire three-record identity across both
clusters — a **whole-cluster** resolution, which is Phase 2D work, not a pairwise merge.

**Note:** `2CB-026` is **not** a protected conflict and is **not** in a multi-record cluster — it is
a normal 2-record pair. The deferral is a **cluster-resolution** decision, not a bypass of any
protection.

---

## 5. Confirmations

### 5.1 All 39 candidates accounted for exactly once

| Check | Result |
|---|---|
| Rows in the review file | **39** |
| Distinct approval IDs | **39** |
| Duplicates | **NONE** |
| Approval-ID set matches the decision sheet | ✅ **TRUE** |
| Missing from the review file | **NONE** |
| Extra in the review file | **NONE** |
| Every row carries a `review_recommendation` | ✅ |
| Original evidence columns re-verified against the package (26 columns, 39 rows) | ✅ **no altered values** |
| Columns carried | 74 original + 9 review = 83 |

The only difference detected during the evidence comparison was cosmetic: the JSON stores a null
date as `null` while the CSV writes an empty string. Re-checked with null/empty normalization —
**no altered evidence, no altered source ID.**

### 5.2 No protected DOB conflict or cluster hazard bypassed

Checked against the live branch decision/candidate tables for the **38 recommended** candidates:

| Check | Result |
|---|---|
| Candidates in the recommendation set | 38 |
| **Protected conflicts among them** | **0** |
| **Inside a multi-record cluster** | **0** |
| Shared `nhl_source_id` between two approvals | **0** |
| Shared `players_source_id` between two approvals | **0** |
| Approvals with no matching candidate row | **0** |

And separately:

| Check | Result |
|---|---|
| The 7 protected conflicts in the review file | **0** — they were never in the package, so they cannot be approved through it |
| The 977 multi-record-cluster merge-eligible pairs | **0** recommended (`of_those_recommended_in_review` = 0) |
| The deferral's relationship to protections | **disjoint** — 2CB-026 is a normal 2-record pair; deferring it bypasses nothing |

### 5.3 No production writes, approvals, or merges

| Check | Value |
|---|---|
| Production `persons` / `person_sources` / `person_roles` | 11,443 / 11,443 / 11,424 |
| Production merged / claimed | **0 / 0** |
| Production `person_claims` / `person_aliases` | 0 / 0 |
| Production `person_identity_*` tables | **0** (branch-only) |
| Production `person_merge_audit` | **0** |
| Production `players` / `nhl_players` | 6,352 / 4,917 |
| Production public behavior | rinkstop.com 200 · counts identical |
| Decision sheet checksum | **UNCHANGED** (`sha256sum -c` → OK) |
| Decision sheet `decision` column | `pending_human_review` on all 39 |
| Decision sheet `decided_by` / `applied_at` | empty on all 39 |
| Branch `approved_to_merge` | **0** |
| Branch merged persons / merge-audit rows | **0 / 0** |

---

## 6. Final proposed approval count and deferred cases

| Outcome | Count | Approval IDs |
|---|---|---|
| **Recommended for approval** | **38** | 2CB-001 – 2CB-025, 2CB-027 – 2CB-039 |
| — Tier 1 | 17 | 2CB-001 – 2CB-017 |
| — Tier 2 | 21 | 2CB-018 – 2CB-025, 2CB-027 – 2CB-039 |
| **Deferred** | **1** | **2CB-026** — Juraj Slafkovský |
| Rejected | 0 | — |
| **Total** | **39** | |

**Deferred cases requiring resolution before reconsideration:**

| Approval ID | Name | Reason | What would resolve it |
|---|---|---|---|
| **2CB-026** | Juraj Slafkovský | Identity spans 3 records across 2 clusters (`juraj-slafkovsk-` and `juraj-slafkovsky`); birth date shared with 5 other people | Whole-cluster resolution of all three records — **Phase 2D** |

**Carried caveats on the 38 recommendations:** 5 Tier-2 shared-birth-date cases (2CB-019, 021,
027, 028, 035) and 3 Tier-1 cases whose date is shared but whose id is decisive (2CB-010, 011,
017). All recorded in `review_caveats` and flagged in `review_caveat_flag`.

---

## 7. What has NOT happened

- The decision sheet was **not modified** (checksum verified).
- **No candidate was approved** in the database — `decision` remains `pending_human_review` on all 39.
- **No merge was executed** — 0 merged persons, 0 merge-audit rows, on branch and in production.
- **No production write of any kind.**
- No claim, account ownership, verification, archival or deletion.
- No route, URL, alias, sitemap, SEO, or feature-flag change.

**Awaiting further authorization.** The next step — applying the 38 recommendations as decisions
and then merging — requires explicit authorization, and per your instruction will be based on
individually approved records rather than a batch count.
