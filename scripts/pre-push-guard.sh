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
echo "[1/15] checking working tree..."
if [ -n "$(git status --porcelain)" ]; then
  echo "FAIL: working tree has uncommitted changes"
  git status -sb
  exit 1
fi

# Gate 2: branch is ahead of main (we're pushing new work)
echo "[2/15] checking branch is ahead of main..."
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
echo "[3/15] running npx tsc --noEmit..."
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
echo "[4/15] checking for dynamic-segment collisions in next-app routes..."
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
echo "[5/15] auditing team_workspaces column references against live schema..."
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
echo "[6/15] auditing every column select against the live schema..."
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
echo "[7/15] auditing RLS for publicly-readable submitter PII..."
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
echo "[8/15] auditing for public tables exposed to anon WITHOUT RLS..."
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
echo "[9/15] auditing claim-funnel pricing copy for 'claiming is free' consistency..."
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
echo "[10/15] testing claim-flow entity resolution against the live database..."
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
echo "[11/15] auditing the paid dataset export for count/privacy/404 defects..."
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
echo "[12/15] auditing the NHL abbrev->team-id map against the live database..."
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
echo "[13/15] auditing team FK canonicality (every team id resolves to team_workspaces)..."
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
echo "[14/15] auditing embedded relation columns against the live schema..."
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
echo "[15/15] testing the roster API and its role + tier authorization..."
if ! npx tsx scripts/_test-roster-api.mjs 2>&1 | tail -30; then
  echo "FAIL: the roster API or its authorization failed (see above)"
  exit 1
fi

echo ""
echo "=== ALL GATES PASSED ==="
echo "Safe to push: git push origin $BRANCH"
exit 0
