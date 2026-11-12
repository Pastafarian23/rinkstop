# PHASE-2C-C — HUMAN REVIEW PACKAGE

**Date:** 2026-07-12 · **Scope:** human approval workflow preparation — **NO MERGES**
**Branch:** `grzhurrryimfylvwmeev` · **Production:** not modified
**Authorization:** Arnel, 2026-07-12 02:46 CST.

> **NOTHING IS APPROVED. NOTHING IS MERGED. NO PRODUCTION WRITE.**

---

## 0. What you are looking at

| File | Purpose |
|---|---|
| **`docs/identity/phase-2c-final-approval.csv`** | **The reviewable decision file.** 39 rows, explicit `decision` column. Edit it and hand it back. |
| `docs/identity/phase-2c-final-approval.json` | Same 39 records, machine-readable. |
| `scripts/_apply-identity-decisions.mjs` | Records your decisions (and refuses invalid ones). **Does not merge.** |
| `scripts/_gate-identity-cluster-completeness.mjs` | Gate 25 — the pre-flight safety check on the approved set. |

**Current state of every row:** `decision = 'pending_human_review'`, `decided_by = ''`,
`decided_at = ''`. **0 approved.**

---

## 1. Tier 1 review — 17 candidates

### 1.1 The primary evidence

**Every Tier 1 candidate shares one thing: the two records carry the SAME authoritative
Highlightly identifier.**

```
players.highlightly_id  ==  nhl_players.id
```

This is **primary evidence**, and it is stronger than anything the Tier 2 pairs have:

- The two rows are not two similar people. They are **the same upstream entity written into
  two tables**.
- The conclusion **does not rest on the name at all**. The name is a secondary check.
- It does **not** rest on the birth date either — every one of these 17 has a `YYYY-01-01`
  placeholder on the `players` side. **The date could not have found these 17.** The id could.

### 1.2 Why the id is authoritative (and how that was verified)

`nhl_players.id` is a **mixed namespace** — 3,218 rows tagged `highlightly`, 885 tagged `espn`,
814 tagged `nhl.com`. An id from the `espn` or `nhl.com` subsets is *locally assigned*;
matching on it would be coincidence. **All 17 Tier-1 NHL rows are tagged `highlightly`**, so
their id is a genuine upstream key.

Global check: 4,281 `players.highlightly_id` values match an `nhl_players.id`, and **0** of those
match a *different* person — the id is not reused across identities.

### 1.3 The 17 candidates

All 17 have: `nhl_players` row = 1, `players` row = 1, **exactly 1 candidate pair each**,
names alphabetically equal, **1 role on each side**, **0 aliases on either side**.

| # | Name | `players` source id | `players` person UUID | `nhl_players` source id | `nhl_players` person UUID | Highlightly id | NHL tag | Unique | Roles (nhl / players) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Alex Beaucage | `72257ff4-…` | `1d38889f-…` | `68823812` | `19818901-…` | **68823812** | highlightly | 1/1, 1 pair | player:player / player: |
| 2 | Antti Saarela | `aead6a74-…` | see CSV | `76564277` | see CSV | **76564277** | highlightly | 1/1, 1 pair | player:player / player: |
| 3 | Arttu Ruotsalainen | `c7f66e70-…` | see CSV | `66344537` | see CSV | **66344537** | highlightly | 1/1, 1 pair | player:player / player: |
| 4 | Austin Czarnik | `f04be119-…` | see CSV | `45373307` | see CSV | **45373307** | highlightly | 1/1, 1 pair | player:player / player: |
| 5 | Chris Tierney | `c181fe27-…` | see CSV | `46019117` | see CSV | **46019117** | highlightly | 1/1, 1 pair | player:player / player: |
| 6 | Daniel Carr | `05e8557b-…` | see CSV | `45385922` | see CSV | **45385922** | highlightly | 1/1, 1 pair | player:player / player: |
| 7 | Derick Brassard | `3e1277db-…` | see CSV | `53657` | see CSV | **53657** | highlightly | 1/1, 1 pair | player:player / player: |
| 8 | Filip Zadina | `55338131-…` | see CSV | `65291567` | see CSV | **65291567** | highlightly | 1/1, 1 pair | player:player / player: |
| 9 | Joren Van Pottelberghe | `5ecf7fca-…` | see CSV | `59132567` | see CSV | **59132567** | highlightly | 1/1, 1 pair | player:player / player: |
| 10 | Lawrence Pilut | `864c377f-…` | see CSV | `65867627` | see CSV | **65867627** | highlightly | 1/1, 1 pair | player:player / player: |
| 11 | Ludovic Waeber | `1d80d357-…` | see CSV | `77595587` | see CSV | **77595587** | highlightly | 1/1, 1 pair | player:player / player: |
| 12 | Manix Landry | `1cf3841c-…` | see CSV | `73431152` | see CSV | **73431152** | highlightly | 1/1, 1 pair | player:player / player: |
| 13 | Michael Raffl | `b642e72a-…` | see CSV | `45560417` | see CSV | **45560417** | highlightly | 1/1, 1 pair | player:player / player: |
| 14 | Petteri Lindbohm | `67202716-…` | see CSV | `46041227` | see CSV | **46041227** | highlightly | 1/1, 1 pair | player:player / player: |
| 15 | Ronald Knot | `d01f3df5-…` | see CSV | `73724837` | see CSV | **73724837** | highlightly | 1/1, 1 pair | player:player / player: |
| 16 | Simon Ryfors | `8544f3d3-…` | see CSV | `73420247` | see CSV | **73420247** | highlightly | 1/1, 1 pair | player:player / player: |
| 17 | Valentin Nussbaumer | `b6c33808-…` | see CSV | `68815037` | see CSV | **68815037** | highlightly | 1/1, 1 pair | player:player / player: |

*The full UUIDs, all attributes and the proposed survivor/merged person for each row are in the CSV
and JSON — one row per candidate, nothing summarised away.*

### 1.4 Unusual data and potential consequences

**Every one of the 17 carries these notes** — they are systematic, not individual:

1. **The `players` side has a placeholder birth date** (`YYYY-01-01`). Year only. **Immaterial for
   Tier 1** — the id is decisive — but it means the date is *not* corroborating evidence here.
2. **The teams and leagues differ on all 17.** This is **expected and consistent**: the NHL row is a
   *current-roster* snapshot (NHL) while the `players` row records an *older club* (Finnish Liiga,
   Swiss National League, AHL, etc.). Every one of these 17 is a European player whose NHL row and
   club row reflect different points in the same career. **The team difference is corroborating
   context, not a conflict.**
3. **All 17 `players` rows have `claimable = true`** — the public "claim this listing" CTA is
   currently live on each of them, to anonymous visitors.
4. **12 of 17 have `nhl_players.is_active = false`** — the NHL row is a historic roster entry.
5. **No `players` row has an attached account** (`players_user_id` is empty on all 17), so **no
   account-ownership conflict is possible.**
6. **3 have no nationality on either side** (Joren Van Pottelberghe, Manix Landry, Ronald Knot).
7. **3 share their birth date with a different person** (below).

### 1.5 The consequence that actually matters: the public listing

**A merge does NOT touch the public listing.** This was verified on the staging branch with a real
merge:

| Checked | Result |
|---|---|
| `players` table row still exists | ✅ |
| `players.slug` unchanged | ✅ |
| `players.claimable` unchanged | ✅ |
| `players.headshot_url` unchanged | ✅ |
| `players` table row count | ✅ 6,352 (unchanged) |
| `person_sources` row count | ✅ 11,443 (unchanged) — rows are **re-pointed**, never deleted |
| Both source rows still exist | ✅ |
| Both source rows now point at one person | ✅ 1 |

The merge re-points `person_sources` rows only. The `players` and `nhl_players` **table** rows —
and therefore the slug, the headshot, the biography and the claimable flag — are **untouched**.
**No public URL moves.** The alias layer (Phase 3) is not required for these 39 to be safe.

### 1.6 Proposed survivor

The survivor is chosen on **data quality** — whichever side holds the richer identity attributes,
because the survivor's display attributes are what a public person page would show. Ties go to the
`players` side (it owns the canonical public slug). For 16 of the 17 the NHL side scores higher
(it has a real birth date, team and position where the `players` side has a placeholder).

**This is reversible**: the survivor choice is a parameter of the merge call
(`person_merge_identities(decision_id, survivor_person_id)`), and the merged-away person is
retained with a canonical pointer, so a later decision to swap the survivor is a rollback plus a
re-merge — not a data loss.

---

## 2. Tier 2 review — 22 candidates, kept separate

**Tier 2 rests on an exact birth-date match.** That is weaker than Tier 1's upstream id, and these
22 are reviewed individually below. **They are not approved on birth date alone.**

### 2.1 The five shared-birth-date cases — the birth date does NOT identify these people

| Candidate | Birth date | **Competing person (same date)** | Candidate nat/team | Competing nat/team |
|---|---|---|---|---|
| **Dakota Joshua** | 1996-05-15 | **Jalen Chatfield** | USA / TOR | USA / CAR |
| **Egor Chinakhov** | 2001-02-01 | **Juuso Parssinen** | RUS / PIT | FIN / NYR |
| **Kevin Lankinen** | 1995-04-28 | **Connor Clifton** | FIN / VAN | — / PIT |
| **Kiefer Sherwood** | 1995-03-31 | **Trevor Moore** | USA / SJS | USA / LAK |
| **Samuel Montembeault** | 1996-10-30 | **Dennis Gilbert** | CAN / MTL | — / OTT |

For all five, the **within-pair names are identical** while the **competing person differs on
name, nationality and team**. So the *date* is ambiguous and the *name* resolves it. Recorded in
the CSV as `recommendation = recommend_approve_with_caveat`, with the competing person named in
`competing_person_name`.

### 2.2 The eight competing-person caveats (5 Tier-2 + 3 Tier-1)

The three Tier-1 ones (Lawrence Pilut / Igor Shesterkin, Ludovic Waeber / Joey Daccord, Valentin
Nussbaumer / Raphael Lavoie) are **immaterial to the Tier-1 conclusion** but disclosed anyway, so
the reviewer sees the same field populated everywhere.

### 2.3 Missing NHL teams and nationalities

| Gap | Count | Effect |
|---|---|---|
| No team on the NHL side | **18 of 22** | Team cannot corroborate. Name + date + jersey carry the identification. |
| No nationality on the NHL side | **5 of 22** (Evander Kane, Noah Juulsen, Teddy Blueger + 2 nhl.com rows) | Nationality cannot corroborate. |
| No nationality on either side | 3 Tier-1 + 3 Tier-2 | Neither side has it. |
| **Career history empty on both sides** | **22 of 22** (`player_team_history` and `hockey_player_team_history` have 0 rows) | Team is a **snapshot**, not a career trajectory. It cannot be used as a strong independent signal. |

### 2.4 Noah Juulsen — differing teams

NHL side: **Philadelphia Flyers**. Players side: **Vancouver Canucks**. Exact birth date
1997-04-02; nationality unknown on the NHL side, CAN on the players side; position defenseman;
jersey 47.

**Assessment:** the team difference is consistent with a trade or a free-agent move — Philadelphia
and Vancouver are both NHL clubs, so this is a normal career progression, not a nationality-style
contradiction. The name and the exact birth date are what carry the identification. **Worth a
look, but not a blocker.**

### 2.5 Nils Aman — missing players-side team

NHL side: **Vancouver Canucks**, center, jersey 88, SWE. Players side: **no team at all** (a bare
profile), but SWE/SWE nationality matches and the birth date 2000-02-07 is exact.

**Assessment:** the `players` row is a stub with only a name, a placeholder date and a nationality.
The NHL side is fully populated. Merging is safe, and the survivor should be the NHL side for
exactly this reason — the `players` row has almost nothing to contribute.

### 2.6 Juraj Slafkovský — three rows across two clusters

| Row | Source | Cluster | Status |
|---|---|---|---|
| `nhl=8483515` (nhl.com, accented) | nhl_players | `juraj-slafkovsk-` | **in this package** — exact birth date match, SVK/SVK, MTL/MTL, jersey 20/20 |
| `nhl=73731302` (highlightly, unaccented) | nhl_players | `juraj-slafkovsky` | **not in this package** — `manual_review`, `one_unknown` |
| `players=7f7924ae` | players | `juraj-slafkovsk-` | **in this package** — the pair partner |
| `players=590f642b` | players | `juraj-slafkovsky` | **not in this package** — `manual_review` |

His birth date **2004-03-30 is shared by six distinct people** (Isaac Howard, Rieger Lorenz,
Rodwin Dionicio, Ty Nelson, Rutger McGroarty, Juraj Slafkovsky).

**Consequence:** the approved pair merges two of the four Slafkovský rows. **That is safe** — the
other two rows are in a different cluster with different source ids, so nothing collides. But his
identity genuinely spans **three rows across two clusters**, and the two rows not in this package
should be resolved in Phase 2D. **Do not treat this pair as "the Slafkovský problem solved."**

### 2.7 The remaining 17 Tier-2 candidates — no competing person

Alexis Lafrenière · Derek Forbort · Evander Kane · Filip Chytil · Isac Lundeström ·
Jake DeBrusk · Juraj Slafkovský (see 2.6) · Leevi Meriläinen · Marcus Pettersson ·
Martin Fehérváry · Nils Aman (see 2.5) · Noah Juulsen (see 2.4) · Oskar Bäck · Teddy Blueger ·
Thatcher Demko · Tim Stützle · Zachary Bolduc.

**Why the evidence supports one individual rather than two people sharing a birth date:**
1. **Identical names**, including diacritics and multi-word forms. Name + full birth date together
   is a far rarer coincidence than a date alone.
2. Where a competing person shares the date, the competing person differs on **name, nationality
   and/or team** — no attribute is shared with the candidate.
3. **Position and jersey agree** on 12 of the 22 where both sides carry them.
4. Where both sides carry a team, **they agree** (Derek Forbort, Evander Kane, Teddy Blueger).
5. **No competing candidate pair touches either source row** — exactly one pair each.
6. **No attached account** on the `players` side, so no ownership conflict.

**Weaknesses, stated plainly:** 18/22 lack an NHL team, 5/22 lack an NHL nationality, career
history is empty on all 22, position wording differs on several (Forward vs left_wing, Defense vs
defenseman, Goalie vs goalie — a format difference, not a conflict).

---

## 3. Human decision controls

### 3.1 What you do

**Edit `docs/identity/phase-2c-final-approval.csv`.** Set the `decision` column per row:

| `decision` | Meaning |
|---|---|
| `pending_human_review` | not yet decided (the current value on all 39) |
| `approved` | **this specific record** is approved to merge |
| `rejected` | this specific record must never be merged |
| `deferred` | hold for more information |

**For an `approved` row you must also set:**

| Column | Why |
|---|---|
| `decided_by` | who approved it — **required**, the tool refuses an approval without it |
| `decided_at` | when — **required** |
| `decision_rationale` | why — optional but recommended |

`decision_rationale` is free text. **Every row is independent** — approving one row approves
nothing else.

### 3.2 What the tooling guarantees

`scripts/_apply-identity-decisions.mjs` records your decisions. It **never merges**. It enforces:

| Rule | Verified |
|---|---|
| Only an explicit `approved` is recorded as approved — a recommendation or confidence tier is **never** inferred | ✅ |
| An approval without `decided_by` / `decided_at` is **refused** | ✅ tested |
| An invalid `decision` value is **refused** | ✅ tested |
| Two approvals sharing a source or person id are **refused** (the pairwise hazard) | ✅ tested |
| A protected conflict is **refused** — and it is not even in the package | ✅ both |
| A multi-record-cluster pair is **refused** | ✅ in code |
| Tier 1 and Tier 2 decisions are counted and applied **separately** | ✅ |
| The script **refuses to target production** without an explicit override | ✅ |

**Recording a decision is not a merge.** Merging is a separate, explicit call to
`person_merge_identities()`, one transaction per batch.

### 3.3 Why there is no interactive screen

There is no interactive approval UI in this package. The codebase *has* the pattern to build one
(`/api/admin/username-review` — admin-gated list + `approve`/`reject` POST with a note, backed by
`pending_username_review_queue`), but building it would be an application change, and this phase
authorizes **no production writes and no route changes**. So the deliverable is the reviewable CSV
with an explicit decision column — which is what you asked for as the fallback.

---

## 4. Technical preparation (no production application)

### 4.1 Gate 25 — cluster completeness (`scripts/_gate-identity-cluster-completeness.mjs`)

A pre-flight check on the approved set. It asserts:

1. Every approved decision is in a **two-record** cluster.
2. No two approvals share an `nhl_source_id`, a `players_source_id`, or a person id.
3. No approved decision is a protected conflict.
4. Every approved decision's source rows still exist and still resolve.
5. **A direct simulation** — no source row would be moved by more than one approved merge.
6. Every approval has a named human.

**Tested.** A synthetic hazard (two approvals sharing one `players_source_id`) was injected on the
branch and the gate **failed with all six hazards reported**, including
`rinkstop_players:7945f960… x2`. The injection was then removed and the gate passed again.

**One real bug was found and fixed during this test:** the gate originally used an INNER JOIN to
`person_identity_candidates`, which meant an approval row with no matching candidate was
**invisible** to the gate — the most anomalous approvals, exactly the ones a gate exists to catch,
were the ones it could not see. It now uses a LEFT JOIN and explicitly fails any approval with no
candidate row.

### 4.2 Secure production backup procedure

`supabase/migrations/2026-07-12_person_identity_merge_backup.sql` — **committed, NOT applied.**

The Phase 2B lesson is applied at creation: the backup table is **already hardened when it is
created**, so there is never a window in which the rollback path is world-readable.

| Protection | Value |
|---|---|
| Tables captured | `persons` · `person_sources` · `person_roles` · `person_claims` · `person_aliases` |
| Rows captured (branch rehearsal) | 34,310 — 11,443 + 11,443 + 11,424 + 0 + 0 |
| RLS enabled | ✅ |
| Deny policies (anon + authenticated) | ✅ 2 |
| Grants revoked from anon / authenticated / PUBLIC | ✅ all |
| Immutability trigger refusing UPDATE and DELETE | ✅ 1 — **tested, both refused** |
| Refuses to overwrite an existing snapshot | ✅ |
| Verifies snapshot count == live count | ✅ |

**Tested on the branch in a rolled-back sandbox:** 34,310 rows captured, RLS on, grants revoked,
trigger present, UPDATE and DELETE both refused, and the "created already-hardened" regression
check passes — the exact defect that Phase 2B shipped is structurally impossible here.

**Two independent recovery paths** exist: `person_merge_audit` (row-by-row inverse) and this
snapshot (whole-table restore). The snapshot **survives** the merge — that is the point.

### 4.3 Per-batch invariants and reconciliation

Every batch runs in one transaction and is verified against the **17 Phase 2A invariants**:

`no_source_lost` · `no_person_deleted` · `sources_resolve` · `no_dup_sources` ·
`merged_have_pointer` · `survivors_unmerged` · `no_self_merge` · `no_chain` ·
`roles_have_person` · `audit_rows_match_merges` · `protected_intact` · `survivors_have_source` ·
`origin_matches_a_source` · `merged_keep_origin_key` · `merged_retained` ·
`survivors_have_2_sources` · `no_source_on_merged`

**Reconciliation** after each batch: `persons` / `person_sources` / `person_roles` / `person_claims`
/ `person_aliases` counts against the pre-batch snapshot, plus the Gate 25 re-run.

**Proven on the branch:** 39 merges applied → **17/17 invariants true, 8/8 rehearsal requirements
true**, and the rollback restored `persons` 11,443 · `sources` 11,443 · `roles` 11,424 ·
`merged` 0 · `origin_agreements` 11,443.

### 4.4 Rollback and recovery

**Primary (audit-ledger):**
```sql
-- move every audited row back to its original owner
UPDATE public.person_sources s SET person_id = a.merged_id
  FROM public.person_merge_audit a
 WHERE a.note='person_sources re-pointed' AND a.source_row_id=s.id::text AND a.reverted_at IS NULL;
-- (same for person_roles, person_claims, person_aliases)
UPDATE public.persons p SET identity_state='unverified', canonical_person_id=NULL
 WHERE p.id IN (SELECT merged_id FROM public.person_merge_audit WHERE reverted_at IS NULL);
UPDATE public.person_merge_audit SET reverted_at=now() WHERE reverted_at IS NULL;
```

**Secondary (snapshot), if the audit ledger is ever damaged:**
```sql
UPDATE public.persons p SET identity_state='unverified', canonical_person_id=NULL
  FROM public.person_identity_merge_backup b
 WHERE b.backup_of='persons' AND b.row_id=p.id AND b.original_person_id<>p.id;
UPDATE public.person_sources s SET person_id=b.original_person_id
  FROM public.person_identity_merge_backup b
 WHERE b.backup_of='person_sources' AND b.row_id=s.id AND b.original_person_id<>s.person_id;
```

### 4.5 Every proposed merge is reversible

- The merged-away person is **retained**, marked `identity_state='merged'` with a canonical
  pointer — never deleted.
- Its `origin_key` is retained as provenance of what it was.
- Every row movement is recorded with its original owner.
- **No source record is deleted or modified** — only re-pointed.
- **The survivor choice is a parameter**, so it can be reversed and re-decided without data loss.

### 4.6 Original source records and provenance preserved

| Preserved | How |
|---|---|
| `players` / `nhl_players` table rows | **Never touched.** Verified on the branch: the row, its slug, headshot, bio and claimable flag are unchanged. |
| `person_sources` rows | Re-pointed, **never deleted**; the count is invariant at 11,443. |
| `origin_key` on every person | Retained, including on merged-away persons. |
| `person_roles` | Re-pointed, never deleted; both sides' roles end up on the survivor. |
| The inverse mapping | `person_sources` + `person_merge_audit` + the pre-merge snapshot. |

---

## 5. State verification

**Production — unchanged by this phase:**

| Metric | Value |
|---|---|
| `persons` / `person_sources` / `person_roles` | 11,443 / 11,443 / 11,424 |
| backup | 5,072 rows · RLS · revoked grants · immutability trigger |
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
RLS-hardened · gate-test injection removed · no leftover artifacts.

---

## 6. What happens next

**Stopping here.** The next step is yours: edit the `decision` column in
`docs/identity/phase-2c-final-approval.csv`, one row at a time. Tier 1 and Tier 2 decisions stay
separate.

Before any production merge, these remain prerequisites:
1. The candidate + decision tables created in **production** (RLS-protected) — **separate
   authorization, not granted**.
2. The secure backup procedure applied — already prepared and tested.
3. Gate 25 passing on the approved set.
4. Per-batch invariant verification and a proven rollback.

**No production write, merge, claim, archival, deletion, route change, alias change, sitemap
change, SEO change, or feature activation has occurred.**
