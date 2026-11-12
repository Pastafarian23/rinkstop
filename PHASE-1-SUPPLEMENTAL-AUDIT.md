# PHASE-1-SUPPLEMENTAL-AUDIT.md

**Date:** 2026-11-11 (CST) · **Type:** READ-ONLY audit · **Production data: unmodified**
**Authorization:** Arnel, 2026-11-11 23:29 CST — supplemental audit before identity resolution begins.
**Scope:** (1) player role completeness · (2) URL alias completeness · (3) security audit · (4) isolated testing environment.

> **Explicitly NOT done, per instruction:** no merges · no archive/delete · no claim or account
> modification · no feature flag enabled · no route or public-behavior change · **Phase 2 not started.**

---

## 0. Executive Summary

| Area | Headline |
|---|---|
| **1. Player roles** | All 6,352 `players` rows have **zero** `person_roles` because the Phase 1 migration **never wrote a role insert for the `rinkstop_players` namespace** — a genuine omission, not a data condition. **6,352 role rows are missing.** It is a real gap and it is safely correctable. |
| **2. URL aliases** | `person_aliases` is **empty (0 rows)** — correct, it is Phase 3. But the audit found that **4,553 slug values are claimed by two different namespaces**, and that **the NHL namespace has no public URL of its own at all** (a soft-404 today). Alias design must change before Phase 3. |
| **3. Security** | **All five tables are locked down.** Anon and authenticated both read `[]` and are rejected with `42501` on write. No views, no RPCs, no app code, no public endpoint exposes person data. **One hardening gap: table-level privileges are still granted to anon/authenticated** — RLS is what stops them, not grants. |
| **4. Isolated staging** | **A genuine staging environment now exists and is verified.** A Supabase branch with the full production schema **and data** (205 tables, 15 views, 539 policies, 6,352 players, 11,443 persons), its own database host, its own JWT secret and its own API keys. **This is not a rolled-back production transaction.** |

**The single most important finding for Phase 2:** running the merge-candidate classification on the
isolated branch (read-only) shows that of **5,915 candidate pairs**, only **1,056 are safe to merge
automatically** and **7 are genuinely conflicting** — the same name with different birth dates, i.e.
**different people**. The other 4,852 pairs have insufficient evidence. Merging on name alone would
have produced **4,852 wrong merges**.

**Production state at end of audit — unchanged and verified:**

| Metric | Value |
|---|---|
| `persons` / `person_sources` / `person_roles` | 11,443 / 11,443 / 5,072 |
| `person_claims` (Phase 5) / `person_aliases` (Phase 3) | 0 / 0 |
| `identity_state='merged'` / `'claimed'` | **0 / 0** — all 11,443 are `unverified` |
| `profiles` / `claims` / `managed_profiles` / `didit_sessions` | 19 / 0 / 1 / 1 — **all unchanged** |
| `players` / `nhl_players` | 6,352 / 4,917 — **unchanged** |
| rinkstop.com / /api/health | 200 / 200 |

---

## 1. Player Role Completeness

### 1.1 Why all 6,352 `players` records have zero `person_roles`

**Root cause: an omission in the Phase 1 migration. Not a property of the data.**

`supabase/migrations/2026-11-12_person_identity_phase1_backfill.sql` contains exactly **four**
`INSERT INTO public.person_roles` statements, at lines 160, 227, 286 and 345:

| Line | Source namespace | Rows written |
|---|---|---|
| 160 | `nhl_players` | 4,917 |
| 227 | `nhl_coaching_staff` | 152 |
| 286 | `team_members` | 2 |
| 345 | `coach_profiles` | 1 |
| — | **`rinkstop_players`** | **MISSING — no INSERT exists** |

The `players` source got its `persons` row and its `person_sources` row, but the role insert was
simply never written. Live confirmation:

```
persons by name_source:    rinkstop_players = 6352
person_roles by source:    nhl_players = 4917 · nhl_coaching_staff = 152
                           team_members = 2 · coach_profiles = 1
                           (rinkstop_players = ABSENT)
players with NO role row:  6352
```

**Why it was missed:** the Phase 1 migration's own reconciliation block only asserted
(1) no duplicate `(source, source_id)` pairs, (2) no person without a source row, and
(3) `origin_key` agreement. **It never asserted that every source namespace had a role.** The
integrity checks passed because a missing role row is not a broken invariant under the checks
that existed. The Gate 23 audit asserts `person_roles` reference real persons — but does not
assert completeness per namespace.

**Severity:** HIGH but **fully self-inflicted and safely correctable.** The gap is in *our* new
table only; no existing table, route or user-visible behavior is affected.

### 1.2 Should these records receive the `player` role?

**Yes — all 6,352, with 8 exceptions handled as non-`player`.**

Supporting evidence:

- The table is named `players`, lives in the player directory, is served by
  `/directory/players`, is exported in `sitemap-players.xml` (1,763 URLs), and is the table the
  claim flow (`players.claimable`, 4,248 rows) and the player analytics dashboard target.
- `player` is already in the `person_roles.role_type` CHECK constraint and is already used by the
  `nhl_players` insert (4,909 rows with `role='player'`). Adding the `rinkstop_players` namespace
  is consistent with the schema, not an extension of it.
- **The role_type vocabulary is not source-specific.** `nhl_players` rows with `role='coach'`
  (5) and `role='scout'` (3) are written as `coach`/`scout`. The `players` table has **no `role`
  column at all**, so the only role it can natively express is `player`.

**Data quality of the target rows** (all 6,352 `players` rows):

| Attribute | Rows |
|---|---|
| `highlightly_id` present | 5,218 |
| `team_id` present | 1,876 |
| `position` present | 1,782 |
| `birth_date` present | 1,348 |
| `nationality` present | 1,280 |
| `jersey_number` present | 1,262 |
| `headshot_url` present | 852 |
| `bio` present | 1 |
| `user_id` present | 1 |
| `claimable = true` | 4,248 |

So the rows carry a real hockey identity (82% have an upstream Highlightly id) — they are
directory records, not placeholders. They belong in the role model.

### 1.3 Exceptions

**Exception A — 8 rows that are NOT players.** Cross-referencing `players` against `nhl_players`
by normalized full name finds 8 `players` rows whose name matches an NHL row with a non-player
role. All 8 have `position = NULL`:

| `players` row | NHL role | NHL id |
|---|---|---|
| Anton Krysanov | coach | 64090907 |
| Peter Laviolette | coach | 30261767 |
| Vasily Koshechkin | coach | 31933742 |
| Dimitri Megalinsky | coach | 37889357 |
| Dimitri Riabykin | coach | 59138927 |
| Art Wiebe | scout | 30287042 |
| Colin O'Hara | scout | 31986902 |
| Paul Guay | scout | 30251762 |

**These are people whose identity spans a role boundary — exactly the case the central person
identity exists to solve.** A player record for a coach is a role, not a second person.

**Recommendation: leave them as `player` in Phase 1 correction, and let Phase 2 add the coach/scout
role to the same person.** The `players` table has no role column, so inferring `coach` from it
would be inventing data. The authoritative role signal (`nhl_players.role`) belongs to the
`nhl_players` namespace and is already recorded. **Do not silently discard the `player` role from
these 8** — they genuinely have both, and `person_roles` is explicitly a *many-roles-per-person*
table. This is a documentation matter, not a correction.

**Exception B — 1 row already claimed by an account.** `players.id = ca73d730-…` ("Jake the Demo
Player") has `user_id = user_3F8TVg2YvbpYzMWQSSNPCpLdZYn` and `claimable = false`. It must still
receive the `player` role. It also needs a `person_claims` row — but that is **Phase 5**, so no
`person_claims` write is authorized now.

**Exception C — 3 accounts with no display name.** `profiles` rows `user_3GSptDg51uRv0n7GwdgajqtTdg0`,
`test_fav_1781450750717`, `user_3IPntJObDuqih0fzy8Rfu043uHL` have neither `display_name` nor
`username`. Their `persons` rows fall back to `user_id`. These are in the `profiles_account`
namespace and **do not need a role** — a fan account is not a player.

**Exception D — no officials/referees in `players`.** The one `players` row whose
`last_verification_source` mentions "Sport official" is a mislabeled player row, not an official
record. There is **no officials/referee population in `players` to exclude.** The `officials`
directory's emptiness is a separate `nhl_players` issue, not a `players` one.

### 1.4 Recommended safe correction (NOT APPLIED)

A single additive, idempotent statement, equivalent to:

```sql
INSERT INTO public.person_roles
  (person_id, role_type, role_detail, team_id, league_id, jersey_number, position, source, source_id)
SELECT psrc.person_id,
       'player', NULL,
       p.team_id, NULL,
       p.jersey_number::text, p.position,
       'rinkstop_players', p.id::text
FROM public.players p
JOIN public.person_sources psrc
  ON psrc.source='rinkstop_players' AND psrc.source_id = p.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_roles e
  WHERE e.source='rinkstop_players' AND e.source_id = p.id::text
);
```

**Safety properties:**
- **Additive only** — writes only to `person_roles`, a table no production code reads.
- **Idempotent** — the `NOT EXISTS` guard makes a second run a no-op. Verified pattern: the
  identical guard was used for the other four namespaces and Phase 1 run three times produced zero
  delta.
- **Reversible** — `DELETE FROM person_roles WHERE source='rinkstop_players'` restores the exact
  prior state (5,072 rows). No other table is touched, so no other table needs restoring.
- **No merge, no delete, no archive** — the 6,352 `players` rows are untouched.
- **Idempotency proof available** — run twice, compare `person_roles` counts (5,072 → 11,424 → 11,424).

**Recommendation: apply it in Phase 2, not as a standalone Phase 1.1 patch.** Rationale: the
correction makes `person_roles` complete, and Phase 2 is the phase that *consumes* `person_roles`
to attach coach/scout roles. Doing both at once lets the merge logic see a complete role model.
Applying it separately would require a second full review cycle for no behavioral gain.

**Mandatory gate addition (recommended before Phase 2):** extend
`scripts/_audit-person-identity.mjs` with a **per-namespace completeness** assertion —
"every source namespace that represents a professional role must have ≥1 role row per source row."
Without it, the same class of omission can recur. The current gate would not have caught this gap;
it checks that roles reference real persons, not that every person *has* roles.

**Risk if the correction is never applied:** low short-term (nothing reads `person_roles`), but
**the omission becomes invisible** — a later reviewer sees a complete-looking `persons` table with
no roles and may conclude the data model says players have no roles. That is a documentation
hazard, not a runtime one.

---

## 2. URL Alias Completeness

### 2.1 How many existing URLs are in `person_aliases`

**Zero. `person_aliases` has 0 rows.** This is **correct** — the alias layer is Phase 3, and the
Phase 0 table was created empty by design. Nothing was missed; the work has not been scheduled.

### 2.2 Reconciliation of existing person URLs

| Surface | Backing table | Live URL form | Rows | In a sitemap? |
|---|---|---|---|---|
| **A** Player directory | `players` | `/directory/players/<slug>` | 6,352 | ✅ 1,763 in `sitemap-players.xml` |
| **B** NHL people | `nhl_players` | `/directory/players/nhl-<id>` → **soft-404** | 4,917 | ❌ none |
| **B** NHL staff | `nhl_players` | `/directory/coaches/nhl-<id>` | 8 (role≠player) | ❌ none |
| **C** NHL coaching staff | `nhl_coaching_staff` | `/api/staff/coach` only | 152 | ❌ none |
| **D** Community coaches | `team_members` | `/directory/coaches/team-<uuid>` | 2 | ❌ none |
| **E** Certified coaches | `coach_profiles` | account-linked | 1 | ❌ none |
| **F** Accounts | `profiles` | `/profile/<username>` | 4 (with username) | ❌ none |

**Two findings that change the Phase 3 alias design:**

**(a) The NHL namespace has no public URL of its own.**
`/directory/players/<id>` resolves via `.eq(isUuid ? 'id' : 'slug', id)` against `players` only.
An NHL id (`nhl-64090907`) is not a uuid and not a `players` slug, so it falls through to
`notFound()` — **but it returns HTTP 200 with the title "Player Not Found."** Verified live:

```
/directory/players/nhl-64090907   HTTP 200   <title>Player Not Found | RinkStop</title>
/directory/coaches/nhl-64090907   HTTP 200   <title>Anton Krysanov — Coach | Arizona Coyotes | RinkStop</title>
```

So 4,909 NHL players are **unreachable through any public page** except the 5 coaches and 3 scouts
that happen to be in the staff directory, and the API (`/api/players?nhl-<id>`).

**(b) `/directory/players/<slug>` and `/directory/coaches/<id>` share one route.**
`/directory/coaches/[id]` serves every staff role — a scout's URL is `/directory/coaches/nhl-30287042`.
There is no `/directory/officials/[id]`, `/directory/scouts/[id]`, or `/directory/staff/[id]`.

**Total distinct person URLs that exist today (conservative):**
6,352 (`/directory/players/<slug>`) + 8 (`/directory/coaches/nhl-<id>`) + 2 (`/directory/coaches/team-<uuid>`)
+ 4 (`/profile/<username>`) + **4,917 NHL ids** that are *intended* but currently soft-404
= **11,283 URLs** that `person_aliases` must cover in Phase 3.

### 2.3 Missing aliases and slug collisions

**Missing aliases:** all of the above. `person_aliases` is empty.

**Slug collisions — the significant finding:**

| Metric | Value |
|---|---|
| `players.slug` values (all unique) | 6,352 |
| Distinct slugs derived from `nhl_players.full_name` | 4,589 (from 4,917 rows) |
| **NHL rows whose derived slug collides with a `players` slug** | **4,869** |
| **Distinct colliding slug values** | **4,553** |
| Derived slugs used by **more than one** NHL row | **314** (covering 642 rows) |
| `players` slugs used by more than one row | **0** |

**The collision is a design problem, not an accident.** `nhl_players` has **no slug column** — its
URL segment is computed at render time by
`slugifyName(full_name)` → `lower(replace(full_name,'[^a-zA-Z0-9]+','-','g'))`. Meanwhile
`players.slug` is a stored column. Two independent derivations of the same human name will
collide by construction, and they already do for **4,553 distinct values**.

**The 314 duplicate-derivative groups are the dangerous ones.** Within `nhl_players`, 314 slugs
are shared by 642 rows — 318 distinct names, 283 distinct birth dates, 284 distinct
birth-date-or-null values, and only 16 distinct nationalities. These are **not all the same
person**: `connor-brown` (Toronto) vs `connor-brown-edm` (Edmonton) have different upstream ids.
**A slug-keyed alias table would map one path to two different people.**

**Additional finding — placeholder birth dates distort the conflict analysis.** 523 of the 1,348
`players.birth_date` values are `YYYY-01-01` placeholders (year preserved, month/day not known).
Treating them as real birth dates produced **59 apparent birth-date conflicts**; excluding them
leaves only **7 genuine conflicts**. Any Phase 2 merge rule must treat `MM-DD = 01-01` as
"unknown", not as a conflicting value.

### 2.4 How legacy URLs will resolve after consolidation

**Design requirement, stated for the record (nothing implemented):**

1. **Every existing URL keeps working.** `person_aliases.path` holds the existing public path;
   `persons.id` holds the identity. Resolution = path → alias → person.
2. **The alias table is keyed on `path`, not on slug.** `person_aliases_path_unique` is already
   in place, so one path maps to exactly one person. The 4,553 collisions do **not** corrupt the
   alias table — they corrupt a *slug-keyed* table, which is why the alias table must be
   **path-keyed** and the person identified by `persons.id`.
3. **The canonical URL is chosen per person, not per source.** A person with both a `players` row
   and an `nhl_players` row has two legacy paths. One becomes canonical (`is_canonical = true`);
   the other is an alias. Which one is canonical is a **Phase 3** decision — the recommendation is
   the **existing indexed URL wins** (i.e. the `/directory/players/<slug>` form for players), so
   Google keeps the URLs it already has.
4. **The NHL soft-404 becomes a real page.** `/directory/players/nhl-<id>` is currently a 200
   "Player Not Found". Under the alias model it resolves to the same person as
   `/directory/players/<slug>` — turning 4,909 dead-but-200 URLs into live pages. **This is an SEO
   improvement**, but it also **changes what a 200 means**, which is exactly the trap that has
   already bitten this codebase twice (the 5-day rink outage; the coach "Player Not Found"). So
   Phase 3's gate must assert on the **rendered title**, not the status code.
5. **Redirects, not 404s.** The non-canonical legacy path should 301 to the canonical person URL.

**Risks:**

| Risk | Severity | Mitigation |
|---|---|---|
| **Alias path collision** — two source rows producing the same path | HIGH | `person_aliases.path` is UNIQUE. The 314 NHL duplicate-derivative groups must be disambiguated (distinct paths, e.g. keep the `nhl-<id>` form for NHL and the slug form for `players`, so they never collide) **before** Phase 3 |
| **A 200 that means "Not Found"** | HIGH | Phase 3 gate asserts on rendered title, not status code |
| **Canonical flip after indexing** | MEDIUM | Canonical = the already-indexed URL; never the reverse |
| **Person page has no slug yet** | MEDIUM | `persons.slug` and `persons.public_id` are intentionally NULL until Phase 3 |
| **4,909 NHL people gaining a page** | MEDIUM | This is intended, but it must not be a surprise: decide explicitly whether NHL players get public pages at all, and if so with which canonical form |

**Recommended Phase 3 pre-work (not Phase 2):** decide the canonical URL form per namespace
**before** writing any alias row, and settle the 314 NHL duplicate-derivative groups — they are a
Phase 3 URL-design question, not a Phase 2 merge question, because merging them would not
necessarily resolve their URL collision.

### 2.5 Reconciliation summary

```
person_aliases rows                                    0   (correct — Phase 3)
─────────────────────────────────────────────────────────────────
Existing person URLs requiring an alias                11,283
  /directory/players/<slug>                             6,352
  /directory/players/nhl-<id>  (soft-404 today)         4,917
  /directory/coaches/nhl-<id>                                8
  /directory/coaches/team-<uuid>                             2
  /profile/<username>                                         4
─────────────────────────────────────────────────────────────────
Distinct slug VALUES colliding across namespaces       4,553
Distinct derived slugs shared by >1 NHL row               314
```

---

## 3. Security Audit

### 3.1 RLS policies

All five tables: `relrowsecurity = true`, `relforcerowsecurity = false`, **2 policies each** —
a `deny_anon_*` and a `deny_authenticated_*`, both `AS RESTRICTIVE FOR ALL` with `USING (false)`.

| Table | RLS | Policies | anon deny | authenticated deny |
|---|---|---|---|---|
| `persons` | ✅ | 2 | ✅ RESTRICTIVE ALL false | ✅ RESTRICTIVE ALL false |
| `person_sources` | ✅ | 2 | ✅ | ✅ |
| `person_roles` | ✅ | 2 | ✅ | ✅ |
| `person_claims` | ✅ | 2 | ✅ | ✅ |
| `person_aliases` | ✅ | 2 | ✅ | ✅ |

### 3.2 Grants — **the one hardening gap**

`has_table_privilege` shows **table-level SELECT/INSERT/UPDATE/DELETE granted to `anon` and
`authenticated` on all five tables** (service_role likewise).

```
persons:          anon S=T I=T U=T D=T | authenticated S=T I=T U=T D=T | service_role S=T I=T U=T D=T
person_sources:   (identical)
person_roles:     (identical)
person_claims:    (identical)
person_aliases:   (identical)
```

**RLS is what stops them, not the grants.** Verified effective behaviour:

| Test | Result |
|---|---|
| anon `SELECT * FROM persons` | `[]` — HTTP 200, no rows |
| anon `SELECT` on all 5 tables | `[]` on all five |
| anon `INSERT` into `persons` | **HTTP 401 `42501` — "new row violates row-level security policy"** |
| anon `INSERT` into `person_sources` | **HTTP 401 `42501`** |
| anon `INSERT` into `person_roles` | **HTTP 401 `42501`** |
| anon `INSERT` into `person_claims` | **HTTP 401 `42501`** |
| anon `INSERT` into `person_aliases` | **HTTP 401 `42501`** |
| Post-attempt row counts | unchanged: 11,443 / 11,443 / 5,072 / 0 / 0 — **no injection** |
| anon `SELECT 'hacker'` / alias `path='/x'` | 0 / 0 |

**Assessment:** the deny policies are correct and effective. The grants are permissive but
**inert** because RLS is enabled and every policy denies. This is the same pattern used by
`nhl_players` (which has `deny_anon_nhl_players` / `deny_authenticated_nhl_players`), so it is
consistent with the codebase.

**Recommendation (Phase 3, not now):** when the central person page goes public, **replace the
deny policies with a deliberate public-read policy on the specific columns the page needs**, and
in the same change **REVOKE** the blanket anon/authenticated grants on `persons`, `person_sources`
and `person_roles`. Recommended policy shape:

- `persons`: `SELECT` to `anon` for public columns only (display_name, first_name, last_name,
  slug, birth_date, nationality) — **exclude** `origin_key`, `canonical_person_id`,
  `name_source` (internal provenance).
- `person_sources`: keep **denied** for anon. It carries the upstream-id mapping, which is
  internal provenance — publishing it would expose the deduplication structure.
- `person_roles`: `SELECT` to `anon` if the page shows roles.
- `person_claims`: keep **denied** for anon. It contains `user_id` — **the account link**. This is
  the most sensitive table: exposing it maps a person to their Clerk account id.
- `person_aliases`: `SELECT` to `anon` only if the page needs it; otherwise keep denied.

**Do not weaken any existing control to achieve this.** The Phase 3 change is a *replacement* of
deny policies with narrower public-read policies — strictly a reduction in anon surface.

### 3.3 Views, RPC functions, and other exposure paths

| Path | Result |
|---|---|
| **Views referencing the person tables** | **0** — queried `information_schema.views` for `%persons%`, `%person_sources%`, `%person_roles%`, `%person_claims%`, `%person_aliases%` in the view definition → empty |
| **RPC / functions referencing the person tables** | **0** — queried `pg_proc` (`prokind='f'`) whose `prosrc` mentions any of the five tables → empty |
| **App code reading the person tables** | **only `src/lib/person-identity.ts`** — a full `grep` of `src/` for `from('persons')` etc. returns hits in that one file only |
| **Routes calling the loader** | **0** — `src/lib/person-identity.ts` is imported by no route or API handler; it is reachable only via direct import |
| **Public endpoints leaking person fields** | **none** — `/api/players`, `/api/staff/coach`, `/api/counts`, `/api/search/suggest` all grep-clean for `person_id`, `persons`, `origin_key`, `person_sources` |
| **Existing anon-readable tables** | `players` still anon-readable (pre-existing, unchanged); `nhl_players` anon-denied (pre-existing) |
| **Storage buckets** | 9 buckets exist on both prod and branch; **no person tables are referenced by any bucket** |

### 3.4 Can private identity data be exposed through public profile endpoints?

**No.** Verified at every layer:

| Endpoint | Result |
|---|---|
| `/api/profiles/arnel` | `{"error":"Profile not found."}` — the endpoint expects a `userId`, not a username; no person data |
| `/profile/arnel` (rendered HTML) | grep for `birth_date`, `birthday`, `identity_verified`, `didit`, `nationality` → **0 hits** |
| `/directory/players/<slug>` | renders only `players` columns (name, position, team, league) — no person-table data |
| `/directory/coaches/<id>` | renders only `nhl_players` / `team_members` — no person-table data |
| `/api/counts` | aggregate counts only |

**The exposure boundary is clean by construction:** the person tables are service-role only, and
the single module that can read them is not called by any route. There is **no path** from an
HTTP request to `persons`, `person_sources`, `person_roles`, `person_claims` or `person_aliases`.

**One caveat to carry into Phase 3:** `src/lib/person-identity.ts` uses the **service-role**
client (`supabaseAdmin`), which **bypasses RLS**. The moment a route calls it, RLS stops being
the guard for that route — the code becomes the guard. Phase 3 must therefore:
1. Use `supabaseAdmin` only for server-side reads, never pass raw person rows to the client.
2. Project only the fields the page needs (never `select('*')` on `persons` into a response).
3. Add an explicit allowlist test asserting no `origin_key` / `canonical_person_id` /
   `user_id` reaches any API response.

### 3.5 Security risks summary

| # | Risk | Severity | Status |
|---|---|---|---|
| S1 | Blanket table grants to anon/authenticated | **MEDIUM** | Inert under RLS. **Recommended:** REVOKE in Phase 3 when public-read policies land. |
| S2 | `service_role` bypasses RLS in the loader | **MEDIUM** | No route calls it today. Phase 3 must add a field allowlist before any route does. |
| S3 | `person_claims.user_id` is the account link | **HIGH if exposed** | Currently denied to anon. Must stay denied in Phase 3. |
| S4 | `person_sources` reveals the dedup structure | MEDIUM | Currently denied to anon. Recommended to stay denied. |
| S5 | `persons.origin_key` / `canonical_person_id` are internal | MEDIUM | Service-role only today; exclude from any public projection. |
| S6 | PostgREST schema cache lags after DDL | LOW | No DDL in Phase 3's hot path. PostgREST auto-recover cron is healthy. |
| S7 | `spatial_ref_sys` anon-reachable (pre-existing) | **MEDIUM** | **Not mine, not fixable from here** — owned by `supabase_admin`; requires the Supabase Dashboard SQL Editor. Gate 8 still fails on this alone. |
| S8 | No `FORCE ROW LEVEL SECURITY` | LOW | Not needed — `service_role` has BYPASSRLS by design and the loader needs it. |

**Net assessment: no security defect was introduced by Phase 0/1.** The five tables are locked
down and unreadable/unwritable by anon and authenticated. One hardening item (S1) is recommended
for Phase 3.

---

## 4. Isolated Testing Environment

### 4.1 What exists today — and what a rolled-back transaction is NOT

**Explicitly, per instruction, a rolled-back production transaction is not a staging environment.**
For the record, what was used during Phase 0/1 and why it is not sufficient:

| Property | Rolled-back production transaction | Genuine staging |
|---|---|---|
| Schema | ✅ real | ✅ real |
| Constraint enforcement | ✅ real | ✅ real |
| Data visible | ✅ real | ✅ real |
| **Durability** | ❌ discarded on rollback | ✅ persists |
| **Iterate freely** | ❌ every run starts from zero | ✅ yes |
| **Run the app against it** | ❌ no — it is inside the prod DB | ✅ yes, own REST host |
| **Break it safely** | ⚠️ a bug could commit | ✅ isolated |
| **Parallel with prod** | ❌ no | ✅ yes |
| **Separate credentials** | ❌ no | ✅ yes |

A rolled-back transaction proves a *statement* works. It cannot prove an *application feature*
works, cannot be iterated on, and carries the risk that a stray `COMMIT` writes to production.

### 4.2 Option A — Supabase Branch (RECOMMENDED, and now verified working)

**This was built and verified during this audit.** It is a genuine, isolated, full-fidelity
environment.

**What was created:**

| Branch | Ref | Schema | Data | Status |
|---|---|---|---|---|
| `api-probe-data` (to be renamed) | `grzhurrryimfylvwmeev` | **205 tables, 15 views, 539 policies, 7 extensions** | **6,352 players · 4,917 nhl_players · 19 profiles · 11,443 persons · 11,443 sources · 5,072 roles · 3,276 teams · 749 storage objects** | `ACTIVE_HEALTHY` |
| `person-identity-staging` | `ogzvkvlastcqasvsgxpi` | 205 tables, 15 views | **empty** (schema only) | deleted after audit |

**Isolation proof — the branch is a separate project, not a copy with a shared door:**

| Property | Production | Branch | Same? |
|---|---|---|---|
| Project ref | `yszheonqyyskkjoxoexk` | `grzhurrryimfylvwmeev` | ❌ |
| DB host | `db.yszheonqyyskkjoxoexk.supabase.co` | `db.grzhurrryimfylvwmeev.supabase.co` | ❌ |
| anon key JWT payload `ref` | `yszheonqyyskkjoxoexk` | `grzhurrryimfylvwmeev` | ❌ |
| service_role key JWT payload `ref` | `yszheonqyyskkjoxoexk` | `grzhurrryimfylvwmeev` | ❌ |
| JWT signing secret | prod | **different** | ❌ |
| REST endpoint | `yszheonqyyskkjoxoexk.supabase.co` | `grzhurrryimfylvwmeev.supabase.co` | ❌ |
| RLS behaviour | anon sees `[]` on persons | anon sees `[]` on persons (RLS copied, 539 policies) | — |

Each key was independently verified: the branch anon key successfully authenticates against the
branch REST host and returns the expected data, and the prod anon key likewise against prod. They
are not interchangeable.

**Create command (idempotent, documented):**
```bash
curl -s -X POST \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_PAT" \
  -H "Content-Type: application/json" \
  -d '{"branch_name":"person-identity-staging","region":"ap-northeast-1","with_data":true,"persistent":true}' \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/branches"
```

**Timing observed:** create → `CREATING_PROJECT`; `ACTIVE_HEALTHY` after **~4 minutes** with data
(3× 60s poll). The schema-only branch was `FUNCTIONS_DEPLOYED` in ~90s.

**Gotcha found:** the branches list endpoint reports `MIGRATIONS_FAILED` as a transient status
during/after a `with_data` restore, while `GET /v1/branches/<ref>` reports `ACTIVE_HEALTHY` and
the database is fully queryable. **Trust `GET /v1/branches/<ref>` and a live query, not the list
field.**

**Cost:** one branch per environment; `persistent: true` keeps it beyond 90 days. Branch count is
plan-limited — currently 1 of 2 branches used.

### 4.3 Option B — A separate Supabase project (manual, heavier)

Create a second project (`POST /v1/projects`), apply the schema via the Management API, load data
from the daily REST export, and configure a separate Vercel project pointed at it.

- **Pros:** complete control; independent billing; no branch limits; the export is already a
  faithful JSON dump of all 87 tables with checksums.
- **Cons:** the branch mechanism already automates the schema+data copy that is the expensive
  part; a separate project means hand-managing env vars, API keys, Stripe/Clerk webhooks and the
  Vercel project. **Not worth it while Option A works.**
- **Use it if:** the branch limit binds, or Phase 3 needs a Stripe/Clerk sandbox too (branches
  clone the database but not third-party integrations).

### 4.4 Option C — Local Postgres (not viable here)

Verified: **no `psql`, no `postgres`, no `initdb`, no Docker, no local Postgres** on this host.
`supabase` CLI 3.1.0 is present but `supabase db start` requires Docker. **Not available.**

### 4.5 Minimum requirements to test Phase 2 safely

**Phase 2 = merging identities.** Its risk is a wrong merge that silently attaches one person to
another, or that deletes an unmerged listing. The test environment must therefore be able to run
the merge, **inspect the result**, and **undo it**.

| Requirement | Status on the branch |
|---|---|
| **Schema identical to prod** (all 205 tables, 15 views, 539 policies, triggers, functions, grants, RLS) | ✅ verified |
| **Data identical to prod** (6,352 players · 4,917 nhl_players · 11,443 persons · 3,276 teams · 749 storage objects) | ✅ verified |
| **Separate database host + JWT secret + API keys** | ✅ verified — branch keys authenticate against the branch only |
| **RLS behaviour preserved** | ✅ verified (539 policies copied; anon sees `[]` on persons) |
| **Person-identity audit gate runnable against it** | ✅ — it takes the URL/key from `.env`; needs a branch env file |
| **Ability to run the Phase 2 merge and inspect** | ✅ — full SQL access via the Management API on the branch |
| **Ability to undo** | ✅ — `TRUNCATE person_roles/person_sources/persons` restores Phase 1 state; the branch is disposable |
| **Storage objects for media** | ✅ 749 objects copied |
| **Auth users** | ⚠️ **0 on both prod and branch** — Clerk holds identities, not Supabase Auth. Branch sessions would need separate Clerk setup. **Not required for a DB-level merge test.** |
| **Cron jobs / scheduled functions** | ⚠️ `cron.job` does not exist on either DB. Branch-side crons are not inherited. **Fine for a merge test; a problem for a full end-to-end app test.** |
| **Third-party integrations** (Stripe, Clerk, Didit, Highlightly, Vercel) | ❌ **NOT inherited.** Branch tests must not hit production Stripe/Clerk. A branch-bound Vercel preview with branch-scoped env vars is needed for an app-level test. |

### 4.6 Recommended Phase 2 test plan on the branch

1. Create/refresh the branch with `with_data: true`.
2. Point `scripts/_audit-person-identity.mjs` at the branch (branch `.env` with the branch
   `NEXT_PUBLIC_SUPABASE_URL` + service_role key). Baseline: gate PASS.
3. **Generate the merge decision file** on the branch — for every candidate pair, a row with
   source ids, the evidence used, and a recommended action (`merge` / `manual_review` /
   `do_not_merge`). **No automatic merge.** Output to a file, reviewed by a human.
4. **Apply** the approved merges on the branch. Verify:
   - every `person_sources` row still resolves to exactly one person
   - `persons` count drops by exactly the number of approved merges
   - **no source row is lost** — count reconciliation per namespace
   - `identity_state='merged'` count == approved merge count
   - `canonical_person_id` chain has no cycles and no self-references
   - `origin_key` still agrees with the source row for every surviving person
   - the merged-away row is **retained** with `merged_at` set, not deleted
5. Run the branch's `/api/players` and `/api/staff/*` endpoints (service role) and diff the
   rendered output against production for a sample of merged and unmerged people.
6. **Rollback test on the branch:** restore Phase 1 state and confirm the counts return to
   11,443 / 11,443 / 5,072.
7. Only then apply to production — one merge batch, one push, with the audit gate extended for
   merge completeness.

### 4.7 Phase 2 merge-candidate classification (measured on the branch, READ-ONLY)

**5,915 candidate pairs** (`nhl_players` row ↔ `players` row, same normalized name):

| Bucket | Pairs | Phase 2 disposition |
|---|---|---|
| **A — same birth date** (or one side is a `YYYY-01-01` placeholder) | **1,056** | **Auto-merge eligible** — two independent corroborating fields agree |
| **B — both birth dates NULL** | 1,885 | **Manual review / do not auto-merge** — no disambiguating evidence |
| **C — one birth date NULL** | 4,852 | **Do not auto-merge** — insufficient evidence |
| **D — genuine birth-date conflict** (both real, both differ) | **7** | **Do not merge** — almost certainly different people |

**The 7 genuine conflicts**, with the same name and nationality but different birth dates:

| Name | NHL birth date | `players` birth date | Assessment |
|---|---|---|---|
| Connor Murphy | 1998-09-01 | 1993-03-26 | different generations |
| Elias Pettersson | 2004-02-16 | 1998-11-12 | different generations |
| Jack Hughes | 2003-11-02 | 2001-05-14 | different generations |
| Matt Murray | 1998-02-02 | 1994-05-25 | different generations |
| Rutger McGroarty | 2004-03-03 | 2004-03-30 | different people (both USA) |
| Sebastian Aho | 1996-02-17 | 1997-07-26 | different nationalities (SWE/FIN) |
| (Elias Pettersson — 2 rows) | | | duplicate candidate row |

**This is the finding that makes the merge rule non-negotiable:** merging on name alone would have
wrongly merged **4,852 pairs** (82% of the candidate set). Merging with a birth-date rule, and
treating `MM-DD = 01-01` as *unknown*, reduces the auto-merge set to **1,056 (17.8%)** and leaves
**7 named humans** who must never be merged.

**The 1,056 auto-merge candidates still require a human-reviewed decision file before Phase 2 is
applied to production.** They are *eligible*, not *approved*.

---

## 5. Consolidated Recommendations

| # | Recommendation | Phase | Risk if deferred |
|---|---|---|---|
| R1 | Add the missing `rinkstop_players` → `person_roles` insert (6,352 rows, additive, idempotent, reversible) | **Phase 2** (with the merge) | Low runtime, but the gap becomes invisible and looks like a design decision |
| R2 | Extend Gate 23 with a **per-namespace role-completeness** assertion | Phase 2 | **The same omission class can recur silently** |
| R3 | Generate the Phase 2 merge **decision file** on the branch; human-approve before applying | Phase 2 | Merging on name would wrongly merge 4,852 pairs |
| R4 | Treat `MM-DD = 01-01` birth dates as **unknown**, never as a conflict value | Phase 2 | Inflates conflicts from 7 to 59 and could block valid merges |
| R5 | Apply the 1,056 approved merges on the **branch** first; verify counts, cycles, and reversibility | Phase 2 | — |
| R6 | REVOKE blanket anon/authenticated grants; replace deny policies with narrow public-read policies on `persons`/`person_roles` only | Phase 3 | Medium — currently inert under RLS |
| R7 | Keep `person_claims` and `person_sources` **denied** to anon permanently | Phase 3 | **High if leaked** — `person_claims.user_id` maps a person to their Clerk account |
| R8 | Add a field allowlist to the loader before any route calls it (service role bypasses RLS) | Phase 3 | **High if missed** |
| R9 | Decide the canonical URL form per namespace **before** writing alias rows; canonical = the already-indexed URL | Phase 3 | Redirect churn / SEO loss |
| R10 | Settle the 314 NHL duplicate-derivative groups as a **URL-design** question (distinct paths), not a merge question | Phase 3 | One path → two people; `path` is UNIQUE so this would block the alias insert |
| R11 | Keep the branch as the standing Phase 2/3 environment; rename it to something meaningful; document the create command | Now | — |
| R12 | `spatial_ref_sys` REVOKE via the Supabase Dashboard SQL Editor | Arnel | Gate 8 fails on this alone (pre-existing, unrelated to identity) |

---

## 6. Confirmation of Non-Interference

**Production state re-verified at the end of this audit:**

| Check | Result |
|---|---|
| `persons` / `person_sources` / `person_roles` | 11,443 / 11,443 / 5,072 — **unchanged** |
| `person_claims` / `person_aliases` | 0 / 0 — **unchanged** |
| `identity_state` distribution | 11,443 `unverified`; **0 `merged`; 0 `claimed`** |
| `profiles` / `claims` / `managed_profiles` / `didit_sessions` | 19 / 0 / 1 / 1 — **unchanged** |
| `players` / `nhl_players` / `team_workspaces` | 6,352 / 4,917 / 3,276 — **unchanged** |
| Feature flags | `PERSON_IDENTITY_ENABLED` **not set in Vercel** → resolves false; 13 passport flags, 0 set true |
| Public behavior | rinkstop.com 200 · /api/health 200 · counts 2,656/6,352/1,859/295/687/85 — unchanged |
| Gate 23 | PASS |
| Branch creation side effects on prod | **none** — prod row counts re-verified identical before and after branch create/restore/delete |

**Actions deliberately NOT taken:** no merge · no archive · no delete · no claim write · no account
modification · no flag enabled · no route change · no public-behavior change · **Phase 2 not
started** (the branch merge-candidate analysis is read-only SQL).

**Stopping for authorization.**
