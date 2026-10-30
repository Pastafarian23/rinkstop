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
echo "[1/7] checking working tree..."
if [ -n "$(git status --porcelain)" ]; then
  echo "FAIL: working tree has uncommitted changes"
  git status -sb
  exit 1
fi

# Gate 2: branch is ahead of main (we're pushing new work)
echo "[2/7] checking branch is ahead of main..."
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
echo "[3/7] running npx tsc --noEmit..."
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
echo "[4/7] checking for dynamic-segment collisions in next-app routes..."
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
echo "[5/7] auditing team_workspaces column references against live schema..."
if ! node scripts/_audit-team-workspace-columns.mjs 2>&1 | tail -40; then
  echo "FAIL: invalid team_workspaces column references (see above)"
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
echo "[6/7] auditing RLS for publicly-readable submitter PII..."
if ! node scripts/_audit-rls-pii.mjs 2>&1 | tail -40; then
  echo "FAIL: public read exposes captured submitter contact data (see above)"
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
echo "[7/7] auditing claim-funnel pricing copy for 'claiming is free' consistency..."
if ! node scripts/_audit-claim-pricing-copy.mjs 2>&1 | tail -40; then
  echo "FAIL: claim funnel shows a paid price as the cost of claiming (see above)"
  exit 1
fi

echo ""
echo "=== ALL GATES PASSED ==="
echo "Safe to push: git push origin $BRANCH"
exit 0
