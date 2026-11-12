#!/usr/bin/env bash
# Pre-push guard for RinkStop
# Runs 6 gates before any push to origin. If any gate fails, the script exits
# non-zero and the push is blocked. Designed to catch the class of bugs that
# caused the 2026-08-11 prod 500: dynamic-segment collisions in Next.js routes.
#
# Usage: ./scripts/pre-push-guard.sh [branch-name]
# Exit: 0 if all gates pass, 1 otherwise.
#
# Note: Removed Gate 4 (full pnpm build) on 2026-09-17 per Arnel's approval.
# The build was taking 146-163s on every push and duplicating work Vercel
# already does on every push (Vercel blocks failed deploys anyway).
# TypeScript errors are still caught by Gate 3. Route collisions are caught
# by Gate 4 (now). If a new bug class emerges that needs full build
# verification, add it as a targeted gate rather than re-adding the full build.

set -euo pipefail

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
echo "=== pre-push guard: branch=$BRANCH ==="

cd "$(git rev-parse --show-toplevel)"

# Gate 1: working tree state
echo "[1/22] checking working tree..."
if [ -n "$(git status --porcelain)" ]; then
  echo "FAIL: working tree has uncommitted changes"
  git status -sb
  exit 1
fi

# Gate 2: branch is ahead of main (we're pushing new work)
echo "[2/22] checking branch is ahead of main..."
if [ "$BRANCH" = "main" ]; then
  echo "    main branch - skipping ahead-of-main check"
else
  AHEAD=$(git rev-list --count main..HEAD 2>/dev/null || echo 0)
  if [ "$AHEAD" -eq 0 ]; then
    echo "FAIL: branch is not ahead of main; nothing to push"
    exit 1
  fi
  echo "    branch is $AHEAD commit(s) ahead of main"
fi

# Gate 3: TypeScript compile
# 2026-09-17: default 2 GiB Node heap OOMs on this project's full type check
# (measured 72s with abort, vs 60s clean with 4 GiB). Bump to match Vercel.
echo "[3/22] running npx tsc --noEmit..."
if ! NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=8192" npx tsc --noEmit 2>&1 | tail -50; then
  echo "FAIL: TypeScript compile errors"
  exit 1
fi

# Gate 4: route collision check (catches the [slug]/[pillar] bug before push).
# Real collision = SAME parent path + SAME bracket segment name.
# Different parents with the same bracket name are NOT a collision in Next.js
# (e.g. /directory/[country] and /federations/[country] are distinct routes).
# The original version of this gate checked across all parents at the same
# depth, which flagged every legitimate shared bracket name as a collision
# and made every push fail. Fixed 2026-08-11.
echo "[4/22] checking for dynamic-segment collisions in next-app routes..."
TOTAL_BRACKETS=$(find src/app -mindepth 2 -maxdepth 3 -type d -name '\[*\]' 2>/dev/null | wc -l)
find src/app -mindepth 2 -maxdepth 3 -type d -name '\[*\]' 2>/dev/null | \
  awk -F/ '{
    n = split($0, parts, "/")
    parent = parts[3]
    for (i = 4; i < n; i++) parent = parent "/" parts[i]
    print parent "|" parts[n]
  }' | sort | uniq -c | awk '$1 > 1 { sub(/^[ ]*[0-9]+[ ]*/, ""); print }' > /tmp/pre-push-guard-gate4.txt
if [ -s /tmp/pre-push-guard-gate4.txt ]; then
  echo "FAIL: dynamic-segment collisions (same parent, same bracket name):"
  while IFS='|' read -r parent bracket; do
    [ -z "$parent" ] && continue
    echo "  - $parent/[$bracket]"
  done < /tmp/pre-push-guard-gate4.txt
  rm -f /tmp/pre-push-guard-gate4.txt
  exit 1
fi
rm -f /tmp/pre-push-guard-gate4.txt
echo "    no real collisions ($TOTAL_BRACKETS bracket routes checked)"

# Gate 5: Supabase column audit for team_workspaces.
# 2026-10-30: nine call sites still used the legacy `teams` column names
# (city / country / logo_url) against `team_workspaces`, whose columns were
# renamed to home_city / home_country / avatar_url during the workspace
# migration. PostgREST returns 42703 ("column does not exist"), and the
# fail-safe wrappers turned that into an EMPTY result set — the public claim
# page reported "No teams found" for a team that was live in the DB.
# tsc cannot catch this (the Supabase client is untyped), and HTTP 200 proves
# nothing. Only a schema-vs-code diff catches it.
echo "[5/22] auditing team_workspaces column references against live schema..."
if ! node scripts/_audit-team-workspace-columns.mjs 2>&1 | tail -40; then
  echo "FAIL: invalid team_workspaces column references (see above)"
  exit 1
fi

# Gate 5b: every explicit column select vs the LIVE schema.
# 2026-11-05: src/lib/owner-auth.ts selected `rinks.claimed_by_user_id`,
# a column that does not exist. Every rink-owner API (ice-listings,
# programming, staff, threads, contracts, events — 16 files) returned a
# misleading 404 because the 42703 was swallowed. The one-table check
# (Gate 5) only covered team_workspaces, so nothing else was audited.
#
# This generalises it to every table: all explicit column selects in src/
# are checked against the live PostgREST schema.
echo "[6/22] auditing every column select against the live schema..."
if ! node scripts/_audit-select-columns.mjs 2>&1 | tail -30; then
  echo "FAIL: code selects columns that do not exist in the live database."
  echo "      PostgREST returns 42703 for these; the route usually swallows it"
  echo "      and returns an empty result or a wrong 404."
  exit 1
fi

# Gate 6: RLS PII audit.
# 2026-10-30: the public Supabase key (shipped in the client bundle) could
# SELECT every row of `listing_submissions`, including submitter email
# addresses and our internal notes. The 2026-06-16 security audit fixed the
# same leak on contact_submissions and newsletter_subscribers but MISSED this
# third table, so it stayed open for ~4 months. This gate re-runs the audit
# against the LIVE database and tests BEHAVIOUR (can anon actually read it?)
# rather than policy definitions, because the two drift.
echo "[7/22] auditing RLS for publicly-readable submitter PII..."
if ! node scripts/_audit-rls-pii.mjs 2>&1 | tail -40; then
  echo "FAIL: public read exposes captured submitter contact data (see above)"
  exit 1
fi

# Gate 6b: RLS-disabled table audit.
# 2026-11-05 (Arnel forwarded the Supabase 2026-10-31 email): the advisor
# flagged `rls_disabled_in_public` on public.spatial_ref_sys. Gate 6 above
# audits a DIFFERENT class (anon-readable submitter PII) and never looked at
# `relrowsecurity`, so this class of finding had no automated guard. The fix
# written on 2026-10-10 (2026-10-10_security_advisor_fix.sql) was never
# actually applied — its REVOKE silently no-opped because the executing role
# (`postgres`) does not own the table (`supabase_admin` owns it).
#
# This gate FAILS until the anon/authenticated grants are revoked in the
# Supabase Dashboard SQL editor (which runs as supabase_admin). That is
# intentional: the exposure is real and must not be allowed to ship silently.
echo "[8/22] auditing for public tables exposed to anon WITHOUT RLS..."
if ! node scripts/_audit-rls-disabled.mjs 2>&1 | tail -40; then
  echo "FAIL: a public table is reachable by the anon role without RLS (see above)."
  echo "      If it is extension-owned (supabase_admin), run the REVOKE from the"
  echo "      Supabase Dashboard SQL Editor — the Management API cannot."
  exit 1
fi

# Gate 7: claim-funnel pricing-copy consistency.
# 2026-10-30 (Arnel-flagged): the claim search result card rendered
# "Claim & Verify — from $99/yr →" directly under a header that said
# "Claiming is free", and the sign-up page showed a $99 tier badged
# "Required". Claiming IS free — LISTING_CLAIMS_PER_TIER grants `free` ->
# 1 claim and `org_free` -> 1 claim. Paid tiers buy TOOLS, never the claim.
# Root cause: ENTITY_TO_TIER mapped claims to the PAID tier in two files.
# This gate checks the tier maps and the CTA labels so the copy cannot drift
# back into telling people claiming costs money.
echo "[9/22] auditing claim-funnel pricing copy for 'claiming is free' consistency..."
if ! node scripts/_audit-claim-pricing-copy.mjs 2>&1 | tail -40; then
  echo "FAIL: claim funnel shows a paid price as the cost of claiming (see above)"
  exit 1
fi

# Gate 8: claim-flow entity resolution.
# 2026-10-30 (Arnel-flagged): "I need to make sure the claim flow and
# functionality are working perfectly for teams, federations, etc. so we can
# proceed with outreach!" Checking that found FOUR real defects — none caught
# by tsc, the build, an HTTP 200, or any existing test:
#   1. POST /api/claims looked teams up in the legacy `teams` table, but the
#      public directory reads `team_workspaces`. A team listed through the
#      public directory could NEVER be claimed — the submit 500'd.
#   2. `team_workspaces` has no `claimable` column (PostgREST 42703).
#   3. `players` has no `name` column (PostgREST 42703).
#   4. The league page rendered a "Claim this league" CTA that 400s — and
#      the claims form silently turned `entity=league` into a RINK claim.
# This gate exercises the REAL production resolver against the LIVE database
# and asserts the structural rules no query can catch (league is not a
# self-serve claim type; federations are invite-only).
echo "[10/22] testing claim-flow entity resolution against the live database..."
if ! node scripts/_test-claim-flow.mjs 2>&1 | tail -40; then
  echo "FAIL: the claim flow cannot complete for one or more entity types (see above)"
  exit 1
fi

# Gate 9: dataset export integrity.
# 2026-11-06 (Arnel-flagged): the $499 dataset export silently served an EMPTY
# teams.csv (HTTP 200, total_records: 0) for ~30 minutes. Two compounding
# bugs: the extraFilters format 'visibility|public' was destructured as three
# parts, producing `visibility=eq.undefined` (matches zero rows), and the
# route returned partial data with HTTP 200 instead of failing loudly.
# Nothing in the build, tsc, or an HTTP-200 check caught either one.
# This gate asserts: export row counts equal the marketing counts, no
# private-visibility rows leak into the paid dataset, and sampled exported
# team slugs resolve on the public directory.
echo "[11/22] auditing the paid dataset export for count/privacy/404 defects..."
if ! node scripts/_audit-dataset-export.mjs 2>&1 | tail -40; then
  echo "FAIL: the paid dataset export does not match the advertised counts (see above)"
  exit 1
fi

# Gate 10: NHL abbrev -> team id map integrity.
# 2026-11-06 (Arnel data-integrity audit): the hardcoded NHL_ABBREV_TO_TEAMS_ID
# map held a stale UUID for MTL. The team's row had been replaced during the
# teams -> team_workspaces migration, so every NHL game involving Montreal
# failed with "home_team_id ... does not exist in teams table". The ingest
# kept running and reported success; the per-game errors scrolled past and
# NHL fixtures silently stopped refreshing. A stale UUID in a hardcoded map
# is invisible to tsc and to the build — only a live-DB check catches it.
echo "[12/22] auditing the NHL abbrev->team-id map against the live database..."
if ! node scripts/_audit-nhl-abbrev-map.mjs 2>&1 | tail -30; then
  echo "FAIL: a mapped NHL team id does not exist in the teams table (see above)"
  exit 1
fi

# Gate 13: team FK canonicality.
# 2026-11-06 (roster system, Phase 1): every team-referencing FK must point
# at the canonical `team_workspaces` table, not the legacy `teams`. If a FK
# drifts back, a club that exists only in team_workspaces (every club a
# federation creates from now on) cannot be referenced by a coach, a player,
# a passport or a payment — the roster blocker returns.
# Also fails if a stored team id stops resolving, or if a legacy lifecycle
# row (deactivated / merged / unclaimable) loses its team_workspaces
# counterpart, which would silently lose ownership state.
echo "[13/22] auditing team FK canonicality (every team id resolves to team_workspaces)..."
if ! node scripts/_audit-team-fk-canonical.mjs 2>&1 | tail -30; then
  echo "FAIL: team FKs are not canonical, or a stored team id does not resolve (see above)"
  exit 1
fi

# Gate 14: embedded relation columns.
# 2026-11-06 (roster system, Phase 1): repointing the team FKs from the
# legacy `teams` to `team_workspaces` broke every embed of the old relation,
# because PostgREST names an embedded relation after the FK's referenced
# table. The public routes went to HTTP 500 ("Could not find a
# relationship between 'players' and 'teams'"), and after the relation was
# renamed, to "column team_workspaces_1.logo_url does not exist" because
# `logo_url` is a legacy-`teams` column (on team_workspaces it is
# `avatar_url`).
#
# `tsc` cannot catch either: an embed is a string, and PostgREST only
# validates the relation and its columns at runtime. This gate extracts
# every embedded relation out of the app source and asks the live database
# to resolve it.
echo "[14/22] auditing embedded relation columns against the live schema..."
if ! node scripts/_audit-embed-columns.mjs 2>&1 | tail -30; then
  echo "FAIL: an embedded relation does not resolve against the live schema (see above)"
  exit 1
fi

# Gate 15: roster API + authorization.
# 2026-11-06 (roster system, Phase 2): the roster API is the write path
# behind everything the public roster shows. A bug there silently corrupts
# a club's roster and the public page has no way to report it — it renders
# whatever is in the database.
#
# This test proves, against the live DB:
#   - an anonymous or unrelated user has no authority
#   - the gate is BOTH role-scoped per team AND tier-gated:
#       org_free + no role       -> cannot view
#       org_plus + head_coach    -> can view and manage
#       org_free + head_coach    -> can view, cannot manage
#   - the roster write path round-trips (insert / read / update / delete)
#   - the database CHECK constraints reject invalid roles and positions
# Everything it creates is rolled back.
echo "[15/22] testing the roster API and its role + tier authorization..."
if ! npx tsx scripts/_test-roster-api.mjs 2>&1 | tail -30; then
  echo "FAIL: the roster API or its authorization failed (see above)"
  exit 1
fi

# Gate 15b: submission → listing creates a VISIBLE listing.
# 2026-11-11: `createListingFromSubmission` inserted teams into the LEGACY
# `teams` table. Since 2026-11-07 every public directory path reads
# `team_workspaces`, so an approved team submission created a row that
# never appeared on the site — an invisible listing that reported success.
#
# This test proves, against the live DB and the live site:
#   - the listing lands in the CANONICAL table with the columns the
#     directory actually reads (home_city, visibility, is_published)
#   - the public /directory/teams/<slug> URL returns 200 AND contains the
#     listing name (an HTTP 200 on a stale ISR page proves nothing)
#   - a second run is idempotent (no duplicate listing)
# Everything it creates is deleted at the end.
echo "[16/22] testing submission → listing creates a visible listing..."
if ! npx tsx scripts/_test-submission-to-listing.mjs 2>&1 | tail -30; then
  echo "FAIL: approving a submission did not create a visible listing (see above)"
  exit 1
fi

# Gate 16: Founding Member promotion integrity.
# 2026-11-07: the Founding Member promotion advertises "50% off the first
# year, first 50 new customers, renews at full price" on three public
# surfaces (first-visit popup, pricing banner, per-tier first-year price).
# If live Stripe drifts from those claims we advertise a discount we do not
# honour — a chargeback plus a support ticket.
#
# This gate asserts against the LIVE Stripe account:
#   - the coupon is valid, 50% off, duration 'once' (first annual payment
#     only), max_redemptions 50
#   - the promotion code is active, points at that coupon, caps at 50, and
#     has first_time_transaction = true (NEW CUSTOMERS ONLY, enforced by
#     Stripe rather than by a heuristic on our side)
#   - the promotion code id in src/lib/founding-promo.ts matches the live one
#   - every canonical subscription payment link allows promotion codes, and
#     the one-time dataset license link does NOT
#   - every eligible tier's price is an ANNUAL recurring price
echo "[17/22] verifying the Founding Member promotion against live Stripe..."
if ! node scripts/_audit-founding-promo.mjs 2>&1 | tail -30; then
  echo "FAIL: the Founding Member promotion does not match what the site advertises (see above)"
  exit 1
fi

# Gate 16b: Founding Member promotion BEHAVIOUR.
# 2026-11-07: the sibling gate proves the CONFIGURATION is right; this one
# proves it BEHAVES that way. Configuration can be correct and still behave
# wrong (wrong coupon duration, a missing first_time_transaction, a cap that
# is not enforced). This exercises the live Stripe objects and asserts the
# four promises:
#   1. first payment is 50% off
#   2. the renewal is at full price
#   3. an existing customer is refused the promotion
#   4. the redemption cap is enforced
# Everything it creates is deleted.
echo "[18/22] testing the Founding Member promotion behaviour..."
if ! node scripts/_test-founding-promo.mjs 2>&1 | tail -30; then
  echo "FAIL: the Founding Member promotion does not behave as advertised (see above)"
  exit 1
fi

# Gate 16c: Founding Member POPUP behaviour.
# 2026-11-07: the popup carries four behavioural requirements (states the
# three facts, mobile-friendly, easy to dismiss, never shown twice). A
# browser test caught a real defect here — the popup was reading the
# LEGACY founders key, which would have hidden the founding offer from
# every visitor who had already seen the previous, different popup. This
# gate locks that in.
echo "[19/22] testing the Founding Member popup behaviour..."
if ! node scripts/_test-founding-promo-popup.mjs 2>&1 | tail -30; then
  echo "FAIL: the Founding Member popup does not meet its behavioural requirements (see above)"
  exit 1
fi

# Gate 18: search suggestion hrefs must resolve to a REAL page.
# 2026-11-11: the search suggest API linked coaches to
# /directory/players/<uuid>, which rendered "Player Not Found" with HTTP
# 200 — a soft 404. The link went somewhere real, so no status-code check
# would ever have caught it.
#
# This gate asserts on the RENDERED TITLE of every suggestion URL: a page
# whose <title> says "Not Found" is a failure, even at HTTP 200.
echo "[20/22] auditing search suggestion hrefs resolve to real pages..."
if ! node scripts/_audit-search-hrefs.mjs 2>&1 | tail -40; then
  echo "FAIL: a search suggestion points at a page that renders 'Not Found' (see above)"
  exit 1
fi

# Gate 21: every directory count source must agree.
# 2026-11-11: the homepage used a SEPARATE RPC (get_home_page_data) that
# the Nov 6 canonicalization of get_directory_stats() never touched. It
# kept counting the legacy `teams` table, so the homepage advertised 2,613
# teams while every other page said 2,656 — and reported 1,419 cities /
# 78 countries against the canonical 687 / 85.
#
# "Three different numbers on three pages" is the same defect class as the
# November dataset-export incident. This gate proves the two RPCs return
# identical counts AND that each matches a direct canonical-table count.
echo "[21/22] auditing directory count consistency across every source..."
if ! node scripts/_audit-count-consistency.mjs 2>&1 | tail -30; then
  echo "FAIL: two directory count sources disagree (see above)"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────
# Gate 22: BUILD COST — do not add another full build on top of a
#            backlog, and never double-build the same commit.
#
# 2026-11-11 (Arnel): "Build time was way too expensive on previous
# vercel invoice, we need to put safeguards in place to get that under
# control and not waste so many builds."
#
# MEASURED: every build takes ~148s and re-prerenders 461 static pages.
# The cost driver is PUSH FREQUENCY, not build fatness:
#     2026-11-06: 18 builds  (~45 min)
#     2026-11-07:  8 builds  (~20 min)
#     2026-11-11:  7 builds  (~17 min)
#
# Two guards:
#   1. BACKLOG — if commits are already waiting on a Vercel build, this
#      push will queue behind them. Batching is cheaper: land the work,
#      then push once.
#   2. DAILY CAP — fail if the day already has more than MAX_DAILY builds.
#
# Skip the whole gate when the Vercel token is unavailable — a local
# machine must still be able to push.
# ─────────────────────────────────────────────────────────────────────────
VERCEL_TOKEN="${VERCEL_TOKEN:-$(python3 -c "
import json,os
p=os.path.expanduser('~/.openclaw/credentials/vercel.json')
try:
    print(json.load(open(p)).get('token',''))
except Exception:
    print('')
" 2>/dev/null || echo '')}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-prj_GVvqDaSS264FFo6q8LYAKGVe0bvM}"

if [ -n "$VERCEL_TOKEN" ]; then
  export VERCEL_TOKEN VERCEL_PROJECT_ID
  echo "[22/22] auditing Vercel build cost before spending another build..."
  if ! node scripts/_audit-build-cost.mjs --max-daily "${MAX_DAILY_BUILDS:-6}" 2>&1 | tail -25; then
    echo "FAIL: build budget exceeded (see above)"
    echo ""
    echo "  Every push = a full ~${BUILD_SECONDS:-148}s build re-prerendering 461 static pages."
    echo "  If you have unreviewed commits sitting on main, BATCH them: land the"
    echo "  fixes, run the gates once, push once."
    exit 1
  fi
else
  echo "[22/22] build-cost gate skipped (no Vercel token)"
fi

# ─────────────────────────────────────────────────────────────────────────
# Gate 23: PERSON IDENTITY — the central person identity must be
#            internally consistent, and no legacy source record lost.
#
# 2026-11-12 (Arnel authorized Phase 0 + Phase 1): five additive tables
# (persons, person_sources, person_roles, person_claims, person_aliases)
# and a backfill of 11,443 people from 6 legacy source tables.
#
# The tables are populated but NOTHING reads them yet — the existing
# directory resolution is untouched. That makes this gate the only
# tripwire: without it, a future migration could drop or duplicate a
# mapping and nothing would notice, because no app path depends on it yet.
#
# It also asserts the account layer is untouched: profiles, claims,
# managed_profiles and didit_sessions must keep their exact row counts.
# ─────────────────────────────────────────────────────────────────────────
echo "[23/23] auditing central person identity consistency..."
if ! node scripts/_audit-person-identity.mjs 2>&1 | tail -40; then
  echo "FAIL: person identity is inconsistent or a source record was lost (see above)"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────
# Gate 24: UNIFIED PUBLIC PROFILE — the person profile must never shadow
#            an account URL.
#
# 2026-11-12 (Arnel approved the unified /profile/ architecture): Phase 3
# assigns persons.slug / persons.public_id and populates person_aliases so
# /profile/<slug> resolves to a person.
#
# The resolution order in src/lib/unified-profile.ts puts the ACCOUNT check
# first, so an alias can never override a profiles.username. But that ordering
# lives in application code, and a code change can invert it. This gate
# asserts the INVARIANT directly against the live database, so an inverted
# order fails the push rather than shipping.
#
# It also asserts:
#   - no canonical alias points at a merged-away person
#   - every obsolete alias points at a SURVIVOR
#   - no account-only person has a public alias
#   - no alias path exposes an email, a phone number, or a test/Clerk id
#   - person_sources and person_roles counts are unchanged
# ─────────────────────────────────────────────────────────────────────────
echo "[24/24] auditing the unified public profile invariants..."
if ! node scripts/_audit-unified-profile.mjs 2>&1 | tail -40; then
  echo "FAIL: the unified profile can shadow an account URL, or the identity data drifted (see above)"
  exit 1
fi

echo ""
echo "=== ALL GATES PASSED ==="
echo "Safe to push: git push origin $BRANCH"
exit 0
