# PHASE-2C-A RESULTS — 50-Pair Identity Review Preparation

**Date:** 2026-11-12 · **Scope:** preparation + staging validation ONLY
**Branch:** `grzhurrryimfylvwmeev` (isolated) · **Production:** not modified
**Authorization:** Arnel, 2026-11-12 02:22 CST — Phase 2C-A.

> **No identity was merged. Nothing was approved. No production write occurred.**

---

## 0. Executive Summary

| Deliverable | Result |
|---|---|
| **1. 50-pair manifest** | ✅ **50 pairs** identified and fully documented — `docs/identity/phase-2c-approval-manifest.csv` + `.json` |
| **2. Exclusion rules** | ✅ **All 5 rule families pass.** Exactly **50 independent pairs**, no shared source or person ids |
| **3. Staging rehearsal** | ✅ **39 merges rehearsed** (T1+T2 only) — 17/17 invariants true, 8/8 requirements true, rollback exact |
| **4. Security gate** | ✅ Gate 8 extended; **tested against a deliberately unprotected table** and confirmed to fail |
| **5. Manifest** | ✅ CSV + JSON produced, **0 approved** (`decision=pending_human_review` on every row) |
| **6. Rejection list** | ✅ **11 pairs flagged for rejection or further review** (Tier 3) |

### The finding that matters most for the human review

The 50 pairs are **not** of equal quality. Evidence tiers:

| Tier | Count | Evidence | Recommendation |
|---|---|---|---|
| **T1** | **17** | **Identical upstream id** on both sides (`players.highlightly_id == nhl_players.id`) — the same upstream entity recorded twice. Independent of name AND date. | `recommend_merge` |
| **T2** | **22** | **Exact birth date** on both sides; 19 also have matching nationality | `recommend_merge` |
| **T3** | **11** | **Birth YEAR only** (players side is a `YYYY-01-01` placeholder), no nationality, **different teams** | **`manual_review_required`** |

**T1 is the strongest evidence in the entire system** — an identical upstream identifier means the two rows are demonstrably the same entity, with no inference from names or dates. **T3 is an assumption, not a confirmation**, and is deliberately not recommended for merging.

---

## 1. The 50-pair manifest

**Files:** `docs/identity/phase-2c-approval-manifest.csv` (44 columns) and
`docs/identity/phase-2c-approval-manifest.json`
**Builder:** `scripts/_build-phase2c-manifest.mjs` — reads the branch, writes local files, refuses to
run against production.

**Columns include:** both source namespaces + ids · both person uuids · both names · raw and
normalized birth dates + placeholder flags · nationality raw + normalized + evidence · upstream id
match flag · all identifying attributes (team, position, jersey, birth place, activity flag) ·
roles on both identities · alias counts on both · proposed survivor and merged person uuids ·
survivor/merged attribute scores · supporting evidence · conflicting information ·
missing information · plain-English explanation · tier · recommendation ·
`decision=pending_human_review`.

### The manifest is a proposal, not an approval

Every row carries `decision = 'pending_human_review'`, `decided_by = ''`, `decided_at = ''`,
`applied_at = ''`. **0 rows are approved.** The script prints:
`NOTE: nothing is approved. decision=pending_human_review for all rows.`

The previous classification (`confidence='high'` / `recommended_action='merge'`) was used only to
*select candidates*. It was **not** treated as authorization to merge.

---

## 2. Exclusion rules — all enforced and verified

Enforced in the manifest builder itself (the script **exits non-zero** if any rule fails) and
independently re-verified afterwards.

| Rule | Check | Result |
|---|---|---|
| All 977 merge-eligible pairs inside multi-record clusters excluded | no selected pair is in a multi-record cluster | ✅ **0 overlaps** |
| All 7 protected conflicts excluded | no selected pair is protected | ✅ **0 overlaps** |
| No pair sharing a source id with another candidate | 50 nhl ids unique · 50 players ids unique · no id shared across sides | ✅ |
| No pair with conflicting authoritative identity evidence | no `conflict` confidence · no real-vs-real birth date disagreement · no nationality mismatch on an exact birth-date match | ✅ **0 found** |
| Every pair's identity confidently established | every pair has birth-date corroboration | ✅ **0 without** |

**Independence proof:** 50 unique nhl source ids · 50 unique players source ids · 50 unique nhl
person uuids · 50 unique players person uuids · **no person uuid shared across the two sides** ·
50 unique cluster keys.

**The count is exactly 50** — not forced. The builder extracted 50 and every rule passed on the
first extraction, so nothing had to be dropped.

---

## 3. Staging rehearsal

**39 merges applied** on the isolated branch (T1 + T2 only — the 11 T3 pairs were **not**
approved and the rehearsal **raises** if a T3 pair is ever approved).

### Before → after

| Metric | Before | After | After rollback |
|---|---|---|---|
| `persons` | 11,443 | 11,443 | **11,443** |
| `person_sources` | 11,443 | 11,443 | **11,443** |
| `person_roles` | 11,424 | **11,424** | **11,424** |
| `person_claims` | 0 | 0 | 0 |
| `person_aliases` | 0 | 0 | 0 |
| `identity_state='merged'` | 0 | **39** | **0** |
| `origin_key` agreements | 11,443 | — | **11,443** |
| T3 pairs approved | — | **0** | — |

### The 17 Phase 2A invariants — all true

`INV_no_source_lost` · `INV_no_person_deleted` · `INV_sources_resolve` · `INV_no_dup_sources` ·
`INV_merged_have_pointer` · `INV_survivors_unmerged` · `INV_no_self_merge` · `INV_no_chain` ·
`INV_roles_have_person` · `INV_audit_rows_match_merges` · `INV_protected_intact` ·
`INV_survivors_have_source` · `INV_origin_matches_a_source` · `INV_merged_keep_origin_key` ·
`INV_merged_retained` · `INV_survivors_have_2_sources` · `INV_no_source_on_merged` — **all true.**

### The 8 rehearsal requirements — all true

| Requirement | Result |
|---|---|
| Canonical pointers correct (merged → survivor) | ✅ true (39/39) |
| All existing roles preserved | ✅ true — total unchanged at 11,424; **78 role rows now on the 39 survivors** (both sides' roles) |
| Every merge creates a complete audit record | ✅ true — **39 distinct merge_ids, 39 `merge applied` rows, 39 source re-point records** |
| Merged identities remain recoverable | ✅ true — 39 rows with `identity_state='merged'` + non-null `canonical_person_id` + non-null `origin_key` |
| No source records deleted | ✅ true — `person_sources` count invariant |
| Public URL / alias mappings intact | ✅ true — alias count unchanged, every alias still resolves to a live person |
| `origin_key` behaviour with multiple source records | ✅ verified — a survivor holds **2** source rows and its `origin_key` matches **one of** them (the row that created it); the merged-away person keeps its `origin_key` as provenance |
| Complete rollback + reconciliation | ✅ true — every count returned exactly |

### Rollback evidence

`ROLLBACK_persons_match` · `ROLLBACK_sources_match` · `ROLLBACK_roles_match` ·
`ROLLBACK_aliases_match` · `ROLLBACK_merged_zero` · `ROLLBACK_origin_agreements_match` ·
`ROLLBACK_survivors_restored` · `ROLLBACK_audit_all_reverted` · `ROLLBACK_no_orphan_audit` — **all
true.** `origin_agreements` back to **11,443**.

The rehearsal ran inside a transaction that was **rolled back** — the branch is unchanged.

---

## 4. Security gate improvements (Gate 8)

`scripts/_audit-rls-disabled.mjs` extended with four new check families.

### 4.1 Any public table with RLS disabled is reported

**The gap this closes:** the original check only flagged RLS-off tables that anon could *reach*.
A table created with RLS off and no grants passed silently — which is exactly the state the
Phase 2C-A gate test reproduced. The default posture is permissive, so one later `GRANT` exposes
it with no other signal.

Now: **any** public table with RLS disabled is a finding, unless it is in `ALLOWED_NO_RLS` with a
written reason.

### 4.2 Sensitive identity tables must be fully closed

`persons` · `person_sources` · `person_roles` · `person_claims` · `person_aliases` ·
`person_identity_candidates` · `person_identity_clusters` · `person_identity_decisions` ·
`person_merge_audit` — must have RLS enabled, at least one policy, and no anon/authenticated/PUBLIC
grants.

### 4.3 Backup tables must be immutable and unreachable

Any table matching `_backup|_snapshot|_bak|_old|_copy` must be RLS-protected and unreachable. If it
is an **identity** backup (name contains `person`), it must additionally have an **immutability
trigger** that refuses UPDATE and DELETE.

### 4.4 Exposure vs grant debt — the distinction matters

The gate now separates:
- **EXPOSED (fail)** — reachable in practice.
- **GRANT DEBT (warn)** — RLS denies it, but the blanket grant is still there. If RLS were ever
  disabled, the table becomes world-readable.

Conflating these trains people to ignore the gate. The Phase 2B backup defect was genuine
exposure; the identity tables are RLS-protected but grant-heavy. Both need fixing; they are not
the same finding.

### 4.5 The gate was tested against a deliberately unprotected table

| Test | Result |
|---|---|
| Baseline gate on the branch (no probe) | ✅ **extended checks passed**, only the known `spatial_ref_sys` |
| Create `gate_test_unprotected_probe` (RLS off, no grants) | created on the **branch only** |
| Gate against the branch with the probe | ❌ **exit 1**, naming the table: *"RLS is DISABLED on a public table (anon SELECT=false). Even with no grants today, the default posture is permissive — one later GRANT exposes it with no other signal."* |
| Probe dropped; gate re-run | ✅ extended checks passed again |
| Probe re-created → gate | ❌ exit 1 again — **the detection is repeatable** |

**The gate also caught 4 real tables:** the Phase 2A branch tables (`person_identity_candidates`,
`person_identity_clusters`, `person_identity_decisions`, `person_merge_audit`) had **RLS
disabled**. Fixed on the branch with RLS + deny policies + revoked grants, and re-verified.

**The probe table was dropped.** The branch has no leftover test artifacts.

### 4.6 Current gate results

**Production:** extended identity/backup checks **PASS**. The only failure is the pre-existing
`spatial_ref_sys` (owned by `supabase_admin`; requires the Dashboard SQL Editor).
**6 grant-debt warnings** reported for `persons`, `person_sources`, `person_roles`,
`person_claims`, `person_aliases`, `highlight_backups` — RLS-verified as denying (anon reads `[]`),
but the grants are still present. **Recommended:** `REVOKE ALL FROM anon, authenticated, PUBLIC`.
This is the Phase 3 hardening item from the supplemental audit, still open.

---

## 5. Candidates requiring rejection or further manual review

### 11 Tier-3 pairs — `manual_review_required` (not recommended for merging)

Evidence is **name + birth YEAR only**. The `players` side has a `YYYY-01-01` placeholder (month
and day unknown), no nationality, and **a different team** than the NHL record.

| # | Name | NHL id | players id | NHL year | Teams (NHL → players) |
|---|---|---|---|---|---|
| 1 | Dmytro Timashov | 59083202 | 3188ba65… | 1996 | New York Islanders → Admiral Vladivostok |
| 2 | Evgeny Svechnikov | 58562417 | 1bc609ea… | 1996 | San Jose Sharks → Amur Khabarovsk |
| 3 | Joachim Blichfeld | 60952907 | 6709eb0c… | 1998 | San Jose Sharks → Tappara Tampere |
| 4 | Joseph Blandisi | 46010867 | b50f56aa… | 1994 | Toronto Maple Leafs → SKA Saint Petersburg |
| 5 | Kristian Vesalainen | 63505967 | 1d378b68… | 1999 | Winnipeg Jets → HIFK Helsinki |
| 6 | Matvei Korotky | 78573092 | f513ffc5… | 2005 | St. Louis Blues → SKA Saint Petersburg |
| 7 | Nikita Soshnikov | 54027587 | 0fcc67fa… | 1993 | New York Islanders → Admiral Vladivostok |
| 8 | Nikita Zaitsev | 60162152 | 3adb5877… | 1991 | Chicago Blackhawks → SKA Saint Petersburg |
| 9 | Nikolai Chebykin | 64074362 | 1b004918… | 1997 | Toronto Maple Leafs → Severstal Cherepovets |
| 10 | Tyce Thompson | 66297212 | a2324d9d… | 1999 | New York Islanders → Barys Astana |
| 11 | William Bitten | 64091342 | 32384213… | 1998 | St. Louis Blues → HC Sochi |

**Reasoning:** a differing team is *consistent with* a career move and also with two different
people sharing a name. The placeholder date means the month/day were never known. **Recommendation:
reject for merge, or hold for manual review.** Do not merge on this basis.

### 7 protected conflicts — excluded from every path

Not in the manifest at all, and excluded from the rehearsal: protected set == conflict set (7),
`recommended_action ≠ merge`, `decision = rejected_do_not_merge`, `approved_to_merge = 0`, and the
merge function raises on a protected decision.

### 5 further items for manual review

1. **Two Tier-2 pairs have a differing team** (Dakota Joshua — NHL team unknown vs Vancouver
   Canucks; Kiefer Sherwood — same pattern). Exact birth date + matching nationality still
   corroborate, but worth a glance.
2. **One Tier-2 pair has no nationality on either side** (Joren Van Pottelberghe is T3; the
   Tier-2 nationality-unknown pairs are Evander Kane, Noah Juulsen, Teddy Blueger) — exact birth
   date only, no nationality to cross-check.
3. **`no current team` on the NHL side** for 18 of the 22 Tier-2 pairs — expected for players
   traded or retired, but it means the team cannot corroborate.
4. **Nils Aman** — NHL side has Vancouver Canucks, players side has **no team**. Exact birth date
   + nationality SWE/SWE agree.
5. **Noah Juulsen** — NHL side Philadelphia Flyers, players side Vancouver Canucks, nationality
   unknown on the NHL side (CAN on the players side). Exact birth date agrees.

---

## 6. Deliverables

| # | File | Contents |
|---|---|---|
| 1 | `PHASE-2C-A-RESULTS.md` | this report |
| 2 | `docs/identity/phase-2c-approval-manifest.csv` | 50 rows × 44 columns |
| 3 | `docs/identity/phase-2c-approval-manifest.json` | machine-readable, same 50 records |
| 4 | `scripts/_build-phase2c-manifest.mjs` | reproducible builder; refuses production; enforces all exclusion rules |
| 5 | `scripts/_audit-rls-disabled.mjs` | extended Gate 8 |
| 6 | `scripts/_branch-sql.mjs` | branch-only SQL runner (refuses production) |

---

## 7. State verification

**Production — unchanged by this phase:**

| Metric | Value |
|---|---|
| `persons` / `person_sources` / `person_roles` | 11,443 / 11,443 / 11,424 |
| backup table | 5,072 rows, RLS + revoked grants + immutability trigger |
| merged / claimed | **0 / 0** |
| `person_claims` / `person_aliases` | 0 / 0 |
| `profiles` / `claims` / `managed_profiles` / `didit_sessions` | 19 / 0 / 1 / 1 |
| `players` / `nhl_players` | 6,352 / 4,917 |
| Public behavior | rinkstop.com 200 · counts identical |
| Gate 23 | PASS |
| Gate 8 | extended checks PASS (only the pre-existing `spatial_ref_sys` fails) |
| Feature flags | `PERSON_IDENTITY_ENABLED` unset |

**Branch `grzhurrryimfylvwmeev`:** ACTIVE_HEALTHY · 5,915 candidates · 4,582 clusters ·
**0 approved** · 7 protected · **0 merged** · 0 merge-audit rows · 4 Phase 2A tables now
RLS-hardened · no leftover gate-test artifacts.

---

## 8. Recommended next scope — Phase 2C-B (production), requires authorization

**Merge the 39 T1+T2 pairs** (17 T1 + 22 T2). The 11 T3 pairs are excluded.

Preconditions:
1. The candidate + decision tables must exist in **production** (they are currently branch-only),
   populated identically, and RLS-protected.
2. A **pre-merge backup** with RLS, revoked grants and an immutability trigger **from the start**
   — the Phase 2B lesson.
3. A **cluster-completeness gate**: no merge may touch a cluster with >2 records, and no two
   approved pairs may share a source id. Without it the 182 hazard clusters are only caught
   mid-batch by the function raising.
4. **Human approval** set explicitly on each of the 39 decision rows.
5. Batch verification with the 17 invariants after every batch, and the rollback path proven
   before the first production batch.

**Explicitly not in scope:** the 11 T3 pairs · the 977 multi-record-cluster pairs (Phase 2D) ·
the 5,908 manual-review candidates · the 7 protected conflicts · archival or deletion · alias/URL
work (Phase 3) · claim/ownership changes (Phase 5) · feature-flag activation.

**Stopping for authorization. Production merges require a separate explicit approval of this
manifest.**
