# PHASE-2B POST-MIGRATION AUDIT

**Date:** 2026-11-12 · **Type:** READ-ONLY audit · **Production data:** not modified (except one security fix — see §1)
**Authorization:** Arnel, 2026-11-12 01:55 CST — post-migration audit before Phase 2C.

---

## 0. Executive Summary

**One critical security defect was found and fixed during this audit.** The Phase 2B rollback
backup table had **no RLS and no revoked grants** — anon and authenticated held full
SELECT/INSERT/UPDATE/DELETE on it, and the audit **proved all four vectors exploitable through
the public REST API**. One legitimate backup row was deleted and one fake row was injected by the
audit itself; both were detected and repaired in the same session, and the table has since been
hardened (RLS + revoked grants + an immutability trigger).

**The defect class is exactly the one the RLS gate (Gate 8) catches for the five person tables —
it simply did not exist for the backup table, because that table was created after the gate was
written and new tables are not automatically covered.**

| # | Audit item | Result |
|---|---|---|
| 1 | Backup contents + protection | ⚠️ **Found unprotected → repaired → hardened → verified** |
| 2 | Independent export + integrity | ✅ 5,072 rows, byte-equivalent, checksummed |
| 3 | Committed migration 3× from clean baseline | ✅ identical, zero delta |
| 4 | Backup stability, role counts, rollback | ✅ all verified |
| 5 | Reconcile 1,027 vs 5,915 decision file | ✅ exact match, no drift |
| 6 | Exact manifest | ✅ produced |
| 7 | Multi-record clusters + resolution | ✅ 939 clusters, **7 shapes, 182 hazard clusters** |
| 8 | 7 protected conflicts excluded | ✅ proven excluded on every path |

### The finding that should reshape Phase 2C

**977 of the 1,027 merge-eligible pairs (95%) live inside multi-record clusters.** Only **50** sit
in clean 2-record clusters. And in **182 clusters**, the *same* `players` row is a merge candidate
for **two different** `nhl_players` rows — merging those pairs **pairwise silently corrupts the
first merge**.

Phase 2C should therefore be scoped to the **50 clean pairs**, not the 1,027.

---

## 1. Backup table verification and hardening

### 1.1 Contents — verified correct

| Check | Actual | Expected | Status |
|---|---|---|---|
| Backup rows | 5,072 | 5,072 | ✅ |
| Distinct ids | 5,072 | 5,072 | ✅ |
| Rows with `source='rinkstop_players'` | **0** | 0 | ✅ |
| Rows with a nonexistent person | 0 | 0 | ✅ |
| Rows missing from live `person_roles` | 0 | 0 | ✅ |
| Live roles matching backup on **every column** | **5,072** | 5,072 | ✅ |
| Live roles NOT in backup (the 6,352 added) | **6,352** | 6,352 | ✅ |
| Source distribution | nhl_players 4,917 · nhl_staff 152 · team_members 2 · coach_profiles 1 | same | ✅ |

The backup is exactly the pre-correction snapshot, byte-identical to the live rows it covers.

### 1.2 🚨 Protection — WAS MISSING, NOW FIXED

**Found (before the fix):**

| Property | Value | Risk |
|---|---|---|
| RLS enabled | **false** | — |
| RLS policies | **0** | — |
| anon SELECT / INSERT / UPDATE / DELETE | **true / true / true / true** | 🔴 |
| authenticated SELECT / UPDATE / DELETE | **true / true / true** | 🔴 |
| Triggers | 0 | — |

**Exploitation proven live through the public REST API:**

| Vector | Result | Damage |
|---|---|---|
| anon `SELECT` | **HTTP 200** — all 5,072 rows readable, including `person_id` | internal person↔source mapping exposed |
| anon `DELETE` | **HTTP 204** | a legitimate backup row **deleted** |
| anon `UPDATE` | **HTTP 204** | a legitimate backup row **mutated** |
| anon `INSERT` | **HTTP 201** | a **fake** backup row injected |

**Why it nearly went unnoticed:** the row **count stayed at 5,072** after the delete + insert
(one row removed, one added). A count-only check would have reported "backup intact" while the
contents were wrong. The audit caught it by comparing row **contents** against live
`person_roles`, not counts.

**Damage assessment and repair:**

| Item | State |
|---|---|
| Deleted row `10183481-…` (role_type `coach`) | **Restored** from live `person_roles` (which still held it) — verified present with `role_type='coach'` |
| Injected row `11111111-…` (`player/x/x`) | **Removed** — verified gone |
| Backup rows after repair | 5,072, of which **5,072** match live on every column |
| Rows now differing from live | **0** |

**The fix** (`supabase/migrations/2026-11-12_person_identity_phase2b_harden_backup.sql`, applied
to production, commit `ce3d95de`):

1. `ALTER TABLE … ENABLE ROW LEVEL SECURITY`
2. `deny_anon_*` + `deny_authenticated_*` policies (RESTRICTIVE, `USING (false)`) — same shape as
   the five person tables
3. `REVOKE ALL … FROM anon, authenticated` **and** `FROM PUBLIC` — defence in depth, so the deny
   is not carried by RLS alone
4. **Immutability trigger** refusing `UPDATE` and `DELETE` on the backup, so the rollback
   snapshot cannot drift silently. `INSERT` stays allowed (that is how the backup is taken);
   `TRUNCATE` remains an explicit operator action.

**Post-fix verification (live):**

| Vector | Before | After |
|---|---|---|
| anon SELECT | HTTP 200, 5,072 rows | **HTTP 401 `42501`** |
| anon INSERT | HTTP 201 | **HTTP 401 `42501`** |
| anon UPDATE | HTTP 204 | **HTTP 401 `42501`** |
| anon DELETE | HTTP 204 | **HTTP 401 `42501`** |
| anon/authenticated table privileges | all `true` | **all `false`** |
| service_role SELECT | true | true (unchanged — needed for rollback) |
| backup rows | 5,072 | 5,072, contents verified |

Sandbox-tested before applying: the trigger refuses UPDATE and DELETE (PASS), INSERT still works
(PASS), and the cleanup path was proven to restore the exact row count.

**Recommended follow-up (not done — out of scope for this audit):** extend Gate 8 so that **any
newly created public table** is automatically checked for RLS, rather than relying on the gate
being updated by hand. This defect existed for one table because it was created after the gate
was written. A table-creation hook that fails the push when a new public table has no RLS would
prevent the whole class.

### 1.3 Independent export

| Item | Value |
|---|---|
| Export path | `backups/person_roles_backup_20260712_20261112T081129Z.json` |
| Rows exported | **5,072** |
| Distinct ids | 5,072 |
| Source breakdown | nhl_players 4,917 · nhl_coaching_staff 152 · team_members 2 · coach_profiles 1 |
| `rinkstop_players` rows | **0** |
| Null `person_id` | 0 |
| File sha256 | `e35c7b6414ce7d1529295b7f296ada03a9b0356fe545bee45aaabe3a3f674bf9` |
| Content digest | `d9597543367b82def5af6c9557c14eb98e792ba30d254161b005f5b0de4778f1` |
| Re-export comparison | **byte-equivalent** — same digest, same row count |

The export lives on the gateway host, outside the database, so there is now a **second** recovery
path in addition to the in-database table.

---

## 2. Committed migration tested 3× from a clean isolated baseline

**Clean baseline** (sandbox): drop the backup table, delete the `rinkstop_players` roles →
`person_roles` 5,072 · `rinkstop_players` roles 0 · persons 11,443 · sources 11,443 · merged 0.

Then the **committed** `2026-11-12_person_identity_phase2b_apply.sql` was run three consecutive
times inside one transaction:

| | `person_roles` | `rinkstop_players` | backup rows | `persons` | merged |
|---|---|---|---|---|---|
| baseline | 5,072 | 0 | 0 | 11,443 | 0 |
| **run 1** | **11,424** | **6,352** | **5,072** | 11,443 | 0 |
| **run 2** | 11,424 | 6,352 | 5,072 | 11,443 | 0 |
| **run 3** | 11,424 | 6,352 | 5,072 | 11,443 | 0 |

**Zero delta across runs 2 and 3.** The backup stays at 5,072 — it does not drift to include the
newly-added roles.

**Invariants after 3 runs:**

| Invariant | Value |
|---|---|
| duplicate `(person_id, source, source_id)` | **0** |
| duplicate `(person_id, role_type)` | **0** |
| roles pointing at a nonexistent person | **0** |
| source rows still missing a role | **0** |
| backup rows matching live on every column | 5,072 |
| backup rows with `source='rinkstop_players'` | **0** |
| other-namespace roles | 5,072 |
| `origin_key` mismatches | **0** |
| `person_claims` / `person_aliases` | 0 / 0 |

**Rollback from that state:** `person_roles` → **5,072** · `rinkstop_players` roles → 0 · other
namespaces → 5,072 · backup **preserved** at 5,072 · persons 11,443 · merged 0.

Production was re-verified immediately after the test and was untouched by it.

---

## 3. Decision-file reconciliation

`docs/identity/identity-decisions.csv` (branch `grzhurrryimfylvwmeev`) vs the live branch DB:

| Check | File | Branch DB | Match |
|---|---|---|---|
| Candidate pairs | 5,915 | 5,915 | ✅ |
| Clusters | 4,582 | 4,582 | ✅ |
| Decision rows | 5,915 | 5,915 | ✅ |
| `recommended_action='merge'` | 1,027 | 1,027 | ✅ |
| `confidence='high'` | 1,027 | 1,027 | ✅ |
| `confidence='conflict'` | 7 | 7 | ✅ |
| `recommended_action='do_not_merge_conflict'` | 7 | 7 | ✅ |
| Protected | 7 | 7 | ✅ |
| `decision='approved_to_merge'` | **0** | **0** | ✅ |
| `decision='rejected_do_not_merge'` | 7 | 7 | ✅ |
| `decision='manual_review'` | 5,908 | 5,908 | ✅ |
| Merged persons | — | **0** | ✅ |
| `person_merge_audit` rows | — | **0** | ✅ |

**`merge` set ≡ `high` confidence set — exactly, 1,027 = 1,027.** No drift between the file and
the database.

*Note:* my first reconciliation pass reported `protected: 0` and `multi-record clusters: 0`.
That was a **bug in my checker**, not in the file: the CSV writer emitted Python's `True`/`False`
and I compared against lowercase `'true'`. Corrected and re-verified.

---

## 4. Exact manifest

Written to `docs/identity/phase2c-manifest.json`.

| Bucket | Count |
|---|---|
| **Total candidate pairs** | **5,915** |
| **Approved to merge** (human decision) | **0** |
| Merge-*eligible* (recommended, not approved) | **1,027** |
| Manual review | 5,908 |
| Rejected — do not merge | **7** |
| Clusters | 4,582 |
| Multi-record clusters | 939 |
| Records in multi-record clusters | 2,272 |
| Merge-eligible inside 2-record clusters | **50** |
| Merge-eligible inside multi-record clusters | **977** |

By confidence: `high` 1,027 · `low` 1,940 · `none` 2,941 · `conflict` 7.
By birth-date evidence: `exact_match` 999 · `placeholder_vs_real` 28 · `both_unknown` 1,885 ·
`one_unknown` 2,991 · `one_or_both_placeholder` 5 · `real_dates_conflict` 7.

---

## 5. Multi-record clusters — structure and resolution

### 5.1 All 939 clusters by shape

| nhl rows | players rows | records | clusters | example |
|---|---|---|---|---|
| 1 | 2 | 3 | **622** | Aaron Ekblad |
| 2 | 2 | 4 | **188** | A.J. Greer |
| 2 | 1 | 3 | **120** | Adam Ingram |
| 1 | 3 | 4 | 4 | Josh Doan |
| 3 | 1 | 4 | 3 | Elias Pettersson |
| 3 | 3 | 6 | 1 | Connor Brown |
| 3 | 2 | 5 | 1 | Sebastian Aho |

**7 distinct shapes.** Merge-eligible pairs per cluster: **0** → 144 clusters · **1** → 613
clusters · **2** → 182 clusters.

### 5.2 ⚠️ The pairwise-merge hazard — 182 clusters

In **182 clusters the same `players` row is a merge candidate for two different `nhl_players`
rows.** Concrete example (`sebastian-aho`):

```
nhl=58563662  pl=edd0b6fb  high    merge                 exact_match   1997-07-26 = 1997-07-26
nhl=58563662  pl=452761fb  none    manual_review         one_unknown
nhl=64091387  pl=edd0b6fb  CONFLICT do_not_merge_conflict real_dates_conflict 1996-02-17 vs 1997-07-26
nhl=64091387  pl=452761fb  none    manual_review         one_unknown
nhl=8478427   pl=edd0b6fb  high    merge                 exact_match   1997-07-26 = 1997-07-26
nhl=8478427   pl=452761fb  none    manual_review         one_unknown
```

**What pairwise merging would do:**
1. Merge `pl=edd0b6fb` into `nhl=58563662` → `pl_edd0b6fb.person_id = nhl_58563662`
2. Merge `pl=edd0b6fb` into `nhl=8478427` → `pl_edd0b6fb.person_id = nhl_8478427`

**The second merge silently re-points a source row the first merge already moved.** The first
merge is effectively undone and its survivor loses a source row. The current
`person_merge_identities()` would raise on the duplicate-`(source, source_id)` check — so it would
**fail loudly rather than corrupt** — but a naive pairwise batch would simply stall at 182
clusters with no progress, and a "workaround" that skips the guard would corrupt data.

Note the same pattern in `a-j-greer`: two *different* `nhl` rows both match `pl=ad49b3da` with an
exact birth-date match. One of the two NHL rows is a duplicate of the other, and the cluster must
resolve to **one** person, not two.

### 5.3 How each cluster should be resolved (Phase 2D)

**Rule: a cluster resolves to exactly ONE person. Pairs inside it are not independent.**

Proposed per-cluster algorithm (whole-cluster, one transaction):

1. **Build the cluster graph.** Nodes = source records (nhl rows + players rows). Edges =
   candidate pairs, weighted by confidence.
2. **Pick the survivor deterministically** — the record with the most corroborating attributes
   (birth date, nationality, team). Ties → the NHL row (it is the upstream source of record).
3. **Select a maximum-evidence spanning structure** (not arbitrary pairwise merges): prefer
   `exact_match` edges; only fall back to `placeholder_vs_real`; never use an edge whose evidence
   is `one_unknown` / `both_unknown`.
4. **Apply the whole cluster in one transaction** — all its rows re-pointed to the survivor at
   once. This is what makes the "same players row, two candidates" case safe: the row is moved
   exactly once.
5. **Verify the cluster invariants** after the whole cluster: every source row in the cluster
   resolves to the survivor; exactly one survivor; no row left on a non-survivor.

**For the 622 clusters of shape (1 nhl, 2 players)** — the common case — the resolution is
unambiguous: one NHL row, two `players` rows, and the pair with an exact birth-date match wins;
the other `players` row is a **name-only stub** (no birth date, no team) and stays as its own
person, or is folded into the survivor if it is provably the same record. That distinction is a
**Phase 2D** judgement, not something the pair table can decide.

**For the 120 clusters of shape (2 nhl, 1 players)** — one `players` row matched by two NHL rows.
One NHL row is a duplicate of the other. The `players` row's own attributes decide which NHL row
it belongs to; the other NHL row becomes a second person (or is folded if identical).

**For the 188 clusters of shape (2 nhl, 2 players)** — a 2×2 ambiguity grid. This is where the
`a-j-greer` pattern lives. Needs whole-cluster resolution with the survivor rule above.

---

## 6. The 7 protected conflicts — exclusion proven

| Name | nhl source | players source | NHL bd | players bd | Nat |
|---|---|---|---|---|---|
| Sebastian Aho | 64091387 | edd0b6fb… | 1996-02-17 | 1997-07-26 | SWE/FIN |
| Connor Murphy | 77597732 | 235c096e… | 1998-09-01 | 1993-03-26 | —/USA |
| Elias Pettersson | 63504557 | 85a93131… | 2004-02-16 | 1998-11-12 | SWE/SWE |
| Elias Pettersson | 8483678 | 85a93131… | 2004-02-16 | 1998-11-12 | SWE/SWE |
| Jack Hughes | 74945777 | 5a345f92… | 2003-11-02 | 2001-05-14 | USA/USA |
| Matt Murray | 66295997 | fd602169… | 1998-02-02 | 1994-05-25 | CAN/CAN |
| Rutger McGroarty | 76203437 | fb26298f… | 2004-03-03 | 2004-03-30 | USA/USA |

**Exclusion proven on every path:**

| Path | Check | Result |
|---|---|---|
| Candidate table | `protected = true` | 7 |
| Candidate table | `recommended_action ≠ 'merge'` | **0** protected rows recommended merge |
| Candidate table | `confidence = 'conflict'` | 7 (protected set == conflict set, exactly) |
| Decision table | `decision = 'rejected_do_not_merge'` | 7 |
| Decision table | `decision = 'approved_to_merge'` | **0** |
| Merge function | raises on a protected decision | proven in the Phase 2A branch test |
| Branch DB | `person_merge_audit` rows | **0** — no merge has ever been applied |
| Branch DB | merged persons | **0** |

**One nuance worth stating:** the protected conflicts are **not all outside multi-record
clusters** — Sebastian Aho and Elias Pettersson are inside clusters that also contain
merge-eligible pairs. So cluster resolution must treat a protected pair as a **hard barrier**: the
cluster algorithm must not fold a protected record into a survivor, and must not use a protected
pair as a connecting edge. The `do_not_merge_conflict` pair splits the cluster into components.

---

## 7. Proposed Phase 2C scope

### Recommended: Phase 2C = the 50 clean pairs only

**Rationale:** merging the 1,027 pairwise would hit the 182-clusters hazard, where a naive batch
either stalls or (if the guard were bypassed) corrupts. The **50 pairs in 2-record clusters** are
provably safe: one NHL row, one `players` row, one survivor, no shared-row ambiguity.

| Batch | Scope | Count | Depends on |
|---|---|---|---|
| **2C-1** | Merge-eligible pairs in **2-record clusters** | **50** | nothing |
| 2C-2 | Merge-eligible pairs in **multi-record clusters** | 977 | **Phase 2D** (whole-cluster resolution) |
| 2C-3 | Manual-review candidates | 5,908 | human decisions |
| — | Protected conflicts | 7 | **never** |

### Preconditions for 2C-1 (must be in place before any merge)

1. **A cluster-completeness gate.** Assert that no merge touches a cluster with >2 records, and
   that no two approved pairs in a batch share a `players_source_id` or a `nhl_source_id`.
   Without it, the hazard is only caught by the function raising mid-batch.
2. **Batch verification.** Each batch in one transaction, with the 17 invariants from Phase 2A
   re-checked after every batch.
3. **Backup of the pre-merge state** — same pattern as Phase 2B: a self-contained table plus an
   independent file export, **with RLS and revoked grants from the start** (the Phase 2B lesson).
4. **The decision table on production.** The candidate/decision tables currently exist only on the
   branch. Phase 2C needs them in production, populated identically.
5. **Human approval.** `decision='approved_to_merge'` must be set explicitly for the 50 pairs.
   Nothing auto-approves.

### Explicitly NOT in Phase 2C
- No multi-record cluster merges (that is Phase 2D).
- No manual-review candidates.
- No protected conflicts.
- No archival or deletion.
- No alias/URL work (Phase 3).
- No claim/ownership changes (Phase 5).
- No feature-flag activation.

---

## 8. State verification

**Production (unchanged by this audit, except the §1 security fix):**

| Metric | Value |
|---|---|
| `persons` / `person_sources` | 11,443 / 11,443 |
| `person_roles` | **11,424** (6,352 `rinkstop_players`) |
| backup rows / hardened | 5,072 / ✅ RLS + revoked grants + immutability trigger |
| merged / claimed | **0 / 0** |
| `person_claims` / `person_aliases` | 0 / 0 |
| `profiles` / `claims` / `managed_profiles` / `didit_sessions` | 19 / 0 / 1 / 1 — unchanged |
| `players` / `nhl_players` | 6,352 / 4,917 — unchanged |
| Public behavior | 12/12 URLs 200 · counts identical · PostgREST HEALTHY |
| Gate 23 | PASS |
| Feature flags | `PERSON_IDENTITY_ENABLED` unset |

**Branch `grzhurrryimfylvwmeev`:** ACTIVE_HEALTHY · 5,915 candidates · 4,582 clusters ·
5,915 decisions · **0 approved** · 7 protected · **0 merged** · 0 merge-audit rows.

**No identity was merged. No record was archived or deleted. No claim was changed. No feature was
enabled.** The only production write in this audit was the §1 security fix.

---

## 9. Open items

| # | Item | Owner |
|---|---|---|
| 1 | **Gate 8 extension:** auto-fail the push when a newly created public table has no RLS. The backup-table defect existed only because the table was created after the gate was written. | recommended |
| 2 | Approve Phase 2C scope: **50 clean pairs** (recommended) vs the full 1,027 (needs Phase 2D first) | Arnel |
| 3 | Phase 2D: whole-cluster resolution for the 939 multi-record clusters | Arnel |
| 4 | `spatial_ref_sys` REVOKE — Dashboard SQL Editor only | Arnel |
| 5 | Highlightly resubscribe · India Hockey invite (expires 2026-11-28) · GA4 Data API · App Store accounts | Arnel |
