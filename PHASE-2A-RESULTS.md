# PHASE-2A RESULTS — Person Identity: Role Correction & Identity Resolution Preparation

**Date:** 2026-11-12 (CST) · **Scope:** isolated Supabase branch `grzhurrryimfylvwmeev` ONLY
**Authorization:** Arnel, 2026-11-12 00:22 CST — Phase 2A (parts A, B, C).
**Production:** **completely unmodified.** No merge, no archival, no deletion, no claim, no
flag enabled, no route/URL/sitemap/SEO change.

---

## 0. Executive Summary

| Deliverable | Result |
|---|---|
| **1. Player role correction** | ✅ **Done and proven on branch.** 6,352 `player` roles added. 5,072 → **11,424** roles. Idempotent (3 runs, zero delta), reversible (verified), additive. **Production not touched.** |
| **2. Reconciled candidate statistics** | ✅ **The 5,915 vs 7,800 discrepancy is fully explained and resolved.** The buckets now sum to **exactly 5,915**. Authoritative dataset created. |
| **3. Identity decision file** | ✅ **`docs/identity/identity-decisions.csv` + `.json` — 5,915 rows**, each with source IDs, person IDs, evidence, confidence, recommended action, and explanation. |
| **4. Merge & archival strategy** | ✅ Documented below. Merge procedure written, tested, **17/17 invariants PASS, 4/4 guards PASS, rollback verified exactly.** |
| **5. Staging test & rollback results** | ✅ All tests pass on the isolated branch. |
| **6. Updated Phase 2 plan** | ✅ Below. |

**The single most important number:** of **5,915** candidate pairs, **1,027 (17.4%)** are
merge-eligible on corroborated evidence, **4,888 (82.6%)** require human review, and **7** are
**protected conflicts** that can never be merged.

**The second most important number:** a merge is **fully reversible**. The 50-merge branch test
was rolled back and every count returned to its exact pre-merge value.

---

## 1. Player Role Correction Results

### 1.1 What was applied

`supabase/migrations/2026-11-12_person_identity_phase2a_player_roles.sql` — one additive
statement, applied on the branch only:

```sql
INSERT INTO public.person_roles
  (person_id, role_type, role_detail, team_id, league_id, season,
   jersey_number, position, source, source_id)
SELECT psrc.person_id, 'player', NULL, p.team_id, NULL, NULL,
       p.jersey_number::text, p.position, 'rinkstop_players', p.id::text
FROM public.players p
JOIN public.person_sources psrc
  ON psrc.source = 'rinkstop_players' AND psrc.source_id = p.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_roles e
  WHERE e.source = 'rinkstop_players' AND e.source_id = p.id::text
);
```

The join is on the **origin key** via `person_sources (source, source_id)` — never on name —
because `nhl_players` contains 314 duplicate-name groups and a name join would fan out and attach
a role to the wrong person.

### 1.2 Before / after (branch)

| Metric | Before | After | Delta |
|---|---|---|---|
| `persons` | 11,443 | 11,443 | **0** |
| `person_sources` | 11,443 | 11,443 | **0** |
| `person_roles` | 5,072 | **11,424** | **+6,352** |
| `roles` by source — `rinkstop_players` | 0 | **6,352** | +6,352 |
| `roles` by source — `nhl_players` | 4,917 | 4,917 | 0 |
| `roles` by source — `nhl_coaching_staff` | 152 | 152 | 0 |
| `roles` by source — `team_members` | 2 | 2 | 0 |
| `roles` by source — `coach_profiles` | 1 | 1 | 0 |
| `players` (source table) | 6,352 | 6,352 | 0 |
| `nhl_players` (source table) | 4,917 | 4,917 | 0 |
| `profiles` (accounts) | 19 | 19 | 0 |
| `identity_state='merged'` | 0 | 0 | 0 |
| `identity_state='claimed'` | 0 | 0 | 0 |
| `person_claims` | 0 | 0 | 0 |
| `person_aliases` | 0 | 0 | 0 |

**All other roles preserved.** The five existing namespaces are byte-identical.

### 1.3 Idempotency

| Run | `person_roles` |
|---|---|
| 1st | 11,424 |
| 2nd | **11,424** |
| 3rd | **11,424** |

Zero delta. The `NOT EXISTS` guard makes re-runs a no-op.

### 1.4 Reversibility

```sql
DELETE FROM public.person_roles WHERE source = 'rinkstop_players';
```
→ roles return to **5,072**; persons, sources, players, nhl_players, profiles all unchanged;
`merged` = 0. **Verified in a rolled-back branch transaction.**

### 1.5 Exceptions

| Exception | Count | Handling |
|---|---|---|
| **8 rows that are coaches/scouts by name match** (Krysanov, Laviolette, Koshechkin, Megalinsky, Riabykin; Wiebe, O'Hara, Guay) | 8 | They receive the `player` role **and keep** their `nhl_players` coach/scout role. `person_roles` is explicitly many-roles-per-person. `players` has no role column, so inferring `coach` from it would be inventing data. |
| **1 row already account-claimed** (Jake the Demo Player, `user_3F8TVg2YvbpYzMWQSSNPCpLdZYn`) | 1 | Receives the `player` role. The `person_claims` row is **Phase 5** — not written. |
| **3 accounts with no display name** | 3 | In `profiles_account` — **deliberately excluded** from the role model. An account is not a professional role. The gate excludes this namespace. |
| **19 accounts total** | 19 | Same as above — no role. |
| **1 `players` row whose `last_verification_source` says "Sport official"** | 1 | A mislabeled player row, not an official record. No officials population exists in `players`. |

### 1.6 Gate 23 — per-namespace role completeness assertion (ADDED)

`scripts/_audit-person-identity.mjs` now asserts, for every role-bearing namespace
(`rinkstop_players`, `nhl_players`, `nhl_coaching_staff`, `team_members`, `coach_profiles`):

> every `person_sources` row has exactly one `person_roles` row.

Plus the reverse: every `person_roles` row must be backed by a `person_sources` row.

**`profiles_account` is deliberately excluded** — an account is not a role.

**The new assertion immediately caught the production gap:**

```
FAIL  rinkstop_players: 6352 of 6352 source rows have no person_roles row
        — every professional source record must carry a role
```

That is the assertion doing exactly its job: it fails against production **today** (because the
correction is not authorized for production) and passes on the branch where the fix is applied
(`missing_roles = 0`, 6,352 sources ↔ 6,352 roles, 0 orphan roles).

**Consequence to note:** the pre-push guard will now **fail on production** until the Phase 2A
role correction is authorized and applied to production. That is intentional and correct — the
gate is reporting a real, known, unfixed gap. **It must be resolved before the next production
push** (either by authorizing the role correction for production, or by shipping the gate with the
`rinkstop_players` check temporarily scoped to "report-only").

---

## 2. Reconciled Candidate-Pair Statistics

### 2.1 The 5,915 vs 7,800 discrepancy — fully explained

The supplemental audit reported 5,915 pairs in one place and 7,800 in another. **Both were
correct measurements of different things.** The full reconciliation, measured on the branch:

| Figure | Value | What it measures |
|---|---|---|
| `T1` raw join pairs | **5,915** | distinct (nhl_players row, players row) pairs sharing a normalized name |
| `T2` nhl rows matched | 4,900 | distinct `nhl_players` rows in at least one pair |
| `T3` players rows matched | 5,403 | distinct `players` rows in at least one pair |
| `T4` distinct slugs (clusters) | 4,582 | distinct name clusters |
| `T5` distinct records involved | **10,303** | 4,900 + 5,403 — the full record population |
| `T6` pair participations | 11,830 | 5,915 × 2 — every pair touches two records |
| Fan-out | **1,015** | 5,915 pairs − 4,900 nhl rows (a row can match several `players` rows) |
| Multi-record clusters | **939** | clusters with >2 records, covering **3,017 records** |

**Root cause of the two numbers:**

1. **5,915** = pairs. **7,800** = the earlier bucket-sum, computed **without placeholder
   birth-date normalization** (A=1,004 · B=1,885 · C=59 · D=2,967) plus a bucket boundary that
   differed from the final classification. With placeholders normalized the buckets sum to
   **exactly 5,915**:
   **A=1,027 · B=1,940 · C=2,941 · D=7.**

2. The apparent 4,552-pair "gap" between the two totals was **fan-out**: 314 `nhl_players` rows
   have derived slugs shared with more than one `players` row, so one nhl row can appear in
   several pairs. `DISTINCT` pair count (5,915) and raw join count are identical here because
   the join is on a deduplicated base.

**Nothing was lost.** The 5,915 is complete and every one of the 10,303 involved records is
represented.

### 2.2 Authoritative candidate-pair dataset

`public.person_identity_candidates` — created on the branch, one row per distinct candidate pair:

| Column group | Columns |
|---|---|
| **Cluster** | `cluster_key`, `cluster_size` (in the cluster table) |
| **NHL side** | `nhl_source_id`, `nhl_person_id`, `nhl_name` |
| **Players side** | `players_source_id`, `players_person_id`, `players_name` |
| **Birth evidence** | `nhl_birth_date` (normalized), `nhl_birth_raw`, `nhl_birth_is_placeholder`, same for players |
| **Nationality** | `nhl_nationality`, `players_nationality`, `nationality_evidence` |
| **Classification** | `confidence`, `birth_date_evidence`, `nationality_evidence`, `team_evidence` |
| **Decision** | `recommended_action`, `protected`, `explanation` |

UNIQUE on `(nhl_source_id, players_source_id)`. Indexed on cluster, confidence, action, and both
person ids.

### 2.3 Placeholder birth-date normalization

**523 of the 1,348 `players.birth_date` values are `YYYY-01-01`** — the year is known, the month
and day are not. They are normalized to **unknown** for matching purposes only; **no source
record is modified** (the raw value is retained in `*_birth_raw` for audit).

Normalization was necessary because treating a placeholder as a real date produced **59
apparent conflicts** when only **7** are genuine.

**Refinement made during this phase:** a placeholder whose **year agrees** with the other
record's real date is genuine corroboration → **high** confidence. A placeholder whose year
**disagrees** is NOT a conflict — the placeholder year is often the only data the source had and
can be wrong — so it lowers confidence to `low` and goes to human review instead of being
permanently protected. (An earlier draft treated year disagreement as a conflict; that inflated
protected conflicts from 7 to 31 and would have wrongly frozen probably-correct pairs.)

### 2.4 Nationality normalization (new in this phase)

The two sources use different vocabularies for the same country. **28 of the 1,027 high-confidence
pairs showed a nationality "mismatch" that was purely vocabulary** — `CHE`/`SUI`, `BUL`/`BGR`,
`NED`/`NLD`, `USSR`/`RUS`, `YUG`/`SVN`, `Czechoslovakia`/`CZE`, `DEN`/`DNK`, `West Germany`/`DEU`.

`public.normalize_nationality(text)` maps every observed value to a canonical code. After
normalization, mismatches inside the high-confidence set dropped **28 → 4**.

The remaining 4 are **dual-citizenship cases** — all have *exact* birth-date matches and
differing legitimate citizenships: Anze Kopitar (YUG/SVN), Garrett Pilon (CAN/USA), Thomas
Bordeleau (CAN/USA), Tomas Tatar (Czechoslovakia/SVK). A nationality mismatch therefore **does
not veto** an exact birth-date match: the birth date is the person-level field, nationality is a
citizenship attribute.

### 2.5 Final classification (5,915 pairs)

| Bucket | Pairs | Share | Confidence | Recommended action |
|---|---|---|---|---|
| **A — birth dates agree** (exact, or one side a placeholder with agreeing year) | **1,027** | 17.4% | `high` | **`merge`** (proposal only) |
| **B — no usable birth date on either side** | 1,940 | 32.8% | `low` | `manual_review` |
| **C — exactly one side has a usable birth date** | 2,941 | 49.7% | `none` | `manual_review` |
| **D — two real, differing birth dates** | **7** | 0.1% | `conflict` | **`do_not_merge_conflict`** |
| **Total** | **5,915** | 100% | | |

`birth_date_evidence` breakdown: `exact_match` 999 · `placeholder_vs_real` 28 · `both_unknown`
1,885 · `one_unknown` 2,991 · `one_or_both_placeholder` 5 · `real_dates_conflict` 7.

`nationality_evidence`: `match` 917 · `mismatch` 10 · `unknown` 4,988.

**Merging on name alone would have wrongly merged 4,888 pairs (82.6%).**

### 2.6 Larger identity clusters (>2 records)

| Cluster size | Clusters | nhl rows | players rows | Records |
|---|---|---|---|---|
| 2 | 3,643 | 3,643 | 3,643 | 7,286 |
| 3 | 742 | 862 | 1,364 | 2,226 |
| 4 | 195 | 389 | 391 | 780 |
| 5 | 1 | 3 | 2 | 5 |
| 6 | 1 | 3 | 3 | 6 |

**939 clusters contain more than two records, covering 3,017 records.** These are **not** pairwise
problems — a cluster must be resolved as a whole, because merging one pair can change what the
remaining pairs mean. The `person_identity_clusters` table records `cluster_size`,
`has_multi_record` and `has_conflict` for each.

Note: **every size-3+ cluster contains at least one `players` row per `nhl_players` row** — the
pattern is one NHL record and 2+ `players` records sharing a name. These are exactly the
name-only stub rows that the (now superseded) stub-deletion migration would have deleted.

### 2.7 The 7 protected conflicts — explicitly protected

| Name | nhl source id | players source id | NHL birth | players birth | Nationality |
|---|---|---|---|---|---|
| Connor Murphy | 77597732 | 235c096e… | 1998-09-01 | 1993-03-26 | —/USA |
| Elias Pettersson | 63504557 | 85a93131… | 2004-02-16 | 1998-11-12 | SWE/SWE |
| Elias Pettersson | 8483678 | 85a93131… | 2004-02-16 | 1998-11-12 | SWE/SWE |
| Jack Hughes | 74945777 | 5a345f92… | 2003-11-02 | 2001-05-14 | USA/USA |
| Matt Murray | 66295997 | fd602169… | 1998-02-02 | 1994-05-25 | CAN/CAN |
| Rutger McGroarty | 76203437 | fb26298f… | 2004-03-03 | 2004-03-30 | USA/USA |
| Sebastian Aho | 64091387 | edd0b6fb… | 1996-02-17 | 1997-07-26 | SWE/FIN |

Same name, same (or compatible) nationality, **different birth dates and different generations**
— different people, or a bad ingest.

**Protection is enforced three ways:**
1. `person_identity_candidates.protected = true` and `recommended_action = 'do_not_merge_conflict'`.
2. `person_identity_decisions.decision = 'rejected_do_not_merge'` (never `manual_review`, never approvable).
3. **The merge function refuses** — `person_merge_identities()` raises on a protected decision.

A branch test proved #3 by attempting to merge a protected decision: **refused**.

---

## 3. Complete Identity Decision File

**`docs/identity/identity-decisions.csv`** (2.4 MB) and **`docs/identity/identity-decisions.json`** (6.3 MB) —
**5,915 rows**, one per candidate pair. Columns:

```
decision_id, cluster_key,
nhl_source_id, nhl_person_id, nhl_name,
players_source_id, players_person_id, players_name,
confidence, birth_date_evidence, nationality_evidence,
nhl_birth_raw, nhl_birth_is_placeholder,
players_birth_raw, players_birth_is_placeholder,
nhl_nationality, players_nationality,
recommended_action, protected,
decision, rationale,
cluster_size, nhl_record_count, players_record_count, has_multi_record, has_conflict,
decided_by, decided_at
```

Every row carries:
- **Source IDs** — the original `nhl_players.id` and `players.id` (never names/slugs).
- **Person IDs** — the central `persons.id` for each side.
- **Evidence** — raw and normalized birth dates, placeholder flags, nationalities, and the
  evidence classification.
- **Confidence** — `high` / `low` / `none` / `conflict`.
- **Recommended action** — `merge` / `manual_review` / `do_not_merge_conflict`.
- **Explanation** — a plain-English sentence stating *why*.
- **Cluster context** — cluster size and record counts, so a reviewer sees the whole group.

**Decision state in the file:** 5,908 `manual_review`, 7 `rejected_do_not_merge`,
**0 `approved_to_merge`**. Nothing has been approved. The file is a proposal for human review.

---

## 4. Proposed Merge and Archival Strategy

### 4.1 Merge procedure

`supabase/migrations/2026-11-12_person_identity_phase2b_merge_procedure.sql` defines
`public.person_merge_identities(decision_id, survivor_id)` — `SECURITY DEFINER`, `search_path`
pinned, and **revoked from PUBLIC/anon/authenticated** (service_role only).

Given two persons (A = survivor, B = merged-away), it:

1. **Refuses** unless the decision is `approved_to_merge`, is not protected, and resolves to two
   distinct persons; refuses if B is already merged.
2. **Re-points** B's `person_sources` rows to A — **never deletes them**. The inverse mapping
   therefore survives.
3. **Re-points** B's `person_roles` rows to A (a coach/player keeps both roles).
4. **Re-points** B's `person_claims` rows to A.
5. **Re-points** B's `person_aliases` rows (retaining, not deleting, a path the survivor already owns).
6. **Fills A's empty attributes** from B (birth date, nationality, name parts).
7. **Marks B** `identity_state='merged'`, `canonical_person_id=A.id`. **B is RETAINED.**
8. **Records every movement** in `person_merge_audit`.

**Survivor selection:** the person owning the record with more attributes wins (so the richer row
survives); ties go to the NHL person. The survivor always keeps its own id. A caller may
override, but only with one of the two participants — anything else is refused.

### 4.2 Archival strategy

**There is no archival in Phase 2A, and there should not be one in Phase 2B either.**

The merged-away person is **retained** with `identity_state='merged'` and
`canonical_person_id` pointing at the survivor. This is *not* archival — it is a **retention
record**, and it is what makes the merge reversible:

- The person row keeps its `origin_key` (the breadcrumb of what it was).
- Its source rows are re-pointed, not deleted, so the inverse mapping is mechanical.
- `person_merge_audit` records every single row movement with its original owner.

A rollback is therefore a mechanical inverse, not a guess — proven below.

**Hard deletion of the merged-away person is proposed for a later phase (Phase 2C), and only if:**
(1) the merge has been stable in production for a defined period, (2) every public URL resolves to
the survivor, and (3) a physical backup exists (PITR is disabled on this project, so recovery
would otherwise depend on Supabase support).

### 4.3 The 939 multi-record clusters — do not merge pairwise

A cluster with >2 records must be resolved **as a whole**. Merging one pair inside a cluster
changes the meaning of the remaining pairs. The recommended Phase 2B sequence:

1. Resolve each cluster to a **survivor set** (one surviving person per cluster).
2. Merge all members of the cluster into that survivor in a **single transaction**.
3. Verify the cluster's invariants after the whole cluster is applied, not per pair.

---

## 5. Staging Test and Rollback Results

### 5.1 Environment

Supabase branch `grzhurrryimfylvwmeev` — separate project ref, separate database host, **separate
JWT secret**, separate anon/service_role keys. All writes went through
`scripts/_branch-sql.mjs`, which **hard-codes the branch ref and refuses to run against
production**.

### 5.2 Guard tests — 4/4 PASS

| Guard | Result |
|---|---|
| Refuse a `manual_review` decision | **PASS** — "only approved_to_merge may be applied" |
| Refuse a protected/conflict decision | **PASS** |
| Refuse a nonexistent decision | **PASS** |
| Refuse a survivor that is not a participant | **PASS** |

A separate check proved the approval UPDATE **cannot** sweep up protected rows: after approving a
batch, `protected AND approved_to_merge` = **0** (the migration raises if it is ever non-zero).

### 5.3 Merge test — 50 merges applied, 17/17 invariants PASS

| # | Invariant | Result |
|---|---|---|
| 1 | `INV_no_source_lost` — `person_sources` count invariant | ✅ true (11,443 → 11,443) |
| 2 | `INV_no_person_deleted` — `persons` count invariant | ✅ true (11,443 → 11,443) |
| 3 | `INV_sources_resolve` — every source row resolves to a person | ✅ true |
| 4 | `INV_no_dup_sources` — no source row on two persons | ✅ true |
| 5 | `INV_merged_have_pointer` — every merged person has a canonical pointer | ✅ true |
| 6 | `INV_survivors_unmerged` — no survivor carries a pointer | ✅ true |
| 7 | `INV_no_self_merge` | ✅ true |
| 8 | `INV_no_chain` — a merged person's survivor is itself unmerged | ✅ true |
| 9 | `INV_roles_have_person` | ✅ true |
| 10 | `INV_audit_rows_match_merges` — audit count == merge count | ✅ true (50/50) |
| 11 | `INV_protected_intact` — no protected decision was approved | ✅ true |
| 12 | `INV_survivors_have_source` | ✅ true |
| 13 | `INV_origin_matches_a_source` | ✅ true |
| 14 | `INV_merged_keep_origin_key` — merged-away person keeps its origin_key | ✅ true |
| 15 | `INV_merged_retained` — merged-away person retained with 0 sources | ✅ true (50/50) |
| 16 | `INV_survivors_have_2_sources` — survivor holds both source rows | ✅ true (50/50) |
| 17 | `INV_no_source_on_merged` | ✅ true |
| — | `players` / `nhl_players` / `profiles` unchanged | ✅ true |
| — | `roles` count invariant | ✅ 11,424 → 11,424 |

**One invariant was corrected during testing.** The first run reported
`INV_origin_agrees = false`. Diagnosis: after a merge the survivor holds **two** source rows
(its own + the merged-in one), but `origin_key` records only the row that *created* the person —
so it can equal only **one** of them. The original check asserted equality against a JOIN,
which silently demanded that a person have exactly one source row. That is wrong post-merge. The
invariant was corrected to "origin_key must equal **one of** the person's source rows", and the
merged-away person's source count (0) was asserted explicitly.

### 5.4 Rollback test — 10 merges, reverted exactly

| Metric | Before | After 10 merges | After rollback |
|---|---|---|---|
| `persons` | 11,443 | 11,443 | **11,443** |
| `person_sources` | 11,443 | 11,443 | **11,443** |
| `person_roles` | 11,424 | 11,424 | **11,424** |
| `identity_state='merged'` | 0 | 10 | **0** |
| `origin_key` agreements | 11,443 | — | **11,443** |
| `ROLLBACK_all_restored` | — | — | ✅ **true** |
| `ROLLBACK_no_orphan_audit` | — | — | ✅ **true** |
| `ROLLBACK_survivors_restored` | — | — | ✅ **true** |

The rollback moves every audited row back to its original owner, restores the merged-away
person's `identity_state`, clears the pointer, and marks the audit rows reverted. **Every count
returned to its exact pre-merge value.**

### 5.5 Data reconciliation — every original source record preserved

| Source table | Branch before | Branch after | Delta |
|---|---|---|---|
| `players` | 6,352 | 6,352 | **0** |
| `nhl_players` | 4,917 | 4,917 | **0** |
| `team_workspaces` | 3,276 | 3,276 | **0** |
| `profiles` | 19 | 19 | **0** |
| `persons` | 11,443 | 11,443 | **0** |
| `person_sources` | 11,443 | 11,443 | **0** |
| `person_roles` | 11,424 | 11,424 | **0** |

**No source record was modified, archived, or deleted by any Phase 2A operation.**

### 5.6 Production verification — completely untouched

| Metric | Value | Expected |
|---|---|---|
| `persons` | 11,443 | 11,443 ✅ |
| `person_sources` | 11,443 | 11,443 ✅ |
| `person_roles` | **5,072** | 5,072 ✅ *(fix NOT applied to prod)* |
| `person_roles` where source = `rinkstop_players` | **0** | 0 ✅ |
| `person_claims` | 0 | 0 ✅ |
| `person_aliases` | 0 | 0 ✅ |
| `identity_state='merged'` | **0** | 0 ✅ |
| `identity_state='claimed'` | 0 | 0 ✅ |
| `person_identity_*` tables in production | **0** | 0 ✅ |
| `person_merge_audit` in production | **0** | 0 ✅ |
| `profiles` / `claims` / `managed_profiles` / `didit_sessions` | 19 / 0 / 1 / 1 | unchanged ✅ |
| `players` / `nhl_players` | 6,352 / 4,917 | unchanged ✅ |

---

## 6. Updated Phase 2 Implementation Plan

### Phase 2A — DONE (branch only) ✅
Role correction + candidate dataset + decision file + merge procedure + tests.

### Phase 2B — production role correction (NEXT, needs authorization)
Apply `2026-11-12_person_identity_phase2a_player_roles.sql` to production.
- Before/after counts: `person_roles` 5,072 → 11,424; everything else unchanged.
- **Gate 23's new completeness assertion passes only after this.**
- Reversible with one DELETE.

### Phase 2C — production merge of the approved set
1. Human review of `docs/identity/identity-decisions.csv`.
2. Approve a subset — recommended **first batch: the 1,027 `high`-confidence pairs**, excluding
   any pair inside a 939 multi-record cluster (those need whole-cluster resolution).
3. Apply in batches, each batch one transaction, each batch verified against the 17 invariants.
4. Reconcile counts after every batch.

### Phase 2D — multi-record cluster resolution
Resolve the 939 clusters (3,017 records) as whole clusters.

### Phase 2E — Phase 3 alias layer (unchanged scope)
Populate `person_aliases` for the 11,283 URLs, settle the 314 NHL duplicate-derivative groups as
a URL-design question, and decide the canonical form per namespace.

### Phase 2F — ownership unification (Phase 5 scope)
`person_claims` becomes the single ownership model; `getEntityOwner` reads it first with the
existing three models as fallback.

### Open items carried forward
| # | Item | Owner |
|---|---|---|
| 1 | **Gate 23 now fails on production** until Phase 2B lands — resolve by authorizing Phase 2B, or ship the gate with the `rinkstop_players` check report-only | Arnel |
| 2 | `spatial_ref_sys` REVOKE (Dashboard SQL Editor only) — Gate 8 still fails on this alone | Arnel |
| 3 | Review the 1,027 merge proposals in the decision file | Arnel |
| 4 | Decide whether dual-citizenship nationality mismatches should ever block a merge (currently they do not) | Arnel |
| 5 | Rename the branch from `api-probe-data` (the rename endpoint rejects POST; recreate if a meaningful name matters) | optional |
| 6 | Highlightly resubscribe · India Hockey invite (expires 2026-11-28) · GA4 Data API · App Store accounts | Arnel |

---

## 7. Confirmation of Restrictions

| Restriction | Status |
|---|---|
| No production merges | ✅ 0 merged in production |
| No production archival or deletion | ✅ no deletes anywhere; merged-away persons retained |
| No account claims or ownership changes | ✅ `person_claims` = 0 everywhere |
| No changes to Didit, Stripe, subscriptions | ✅ `didit_sessions` = 1 unchanged; no Stripe code touched |
| No public route, URL, sitemap, or SEO changes | ✅ no route touched; `person_aliases` = 0 in production |
| No feature flag activation | ✅ `PERSON_IDENTITY_ENABLED` still unset in Vercel |
| No automatic merge on name or birth date alone | ✅ **0 decisions auto-approved**; every merge requires an explicit `approved_to_merge` decision row, which only a human sets |
| Stop after Phase 2A | ✅ Phase 2B not started |

**Production identity consolidation requires separate explicit authorization.**
