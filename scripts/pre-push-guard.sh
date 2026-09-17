#!/usr/bin/env bash
# Pre-push guard for RinkStop
# Runs 4 gates before any push to origin. If any gate fails, the script exits
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
echo "[1/4] checking working tree..."
if [ -n "$(git status --porcelain)" ]; then
  echo "FAIL: working tree has uncommitted changes"
  git status -sb
  exit 1
fi

# Gate 2: branch is ahead of main (we're pushing new work)
echo "[2/4] checking branch is ahead of main..."
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
echo "[3/4] running npx tsc --noEmit..."
if ! npx tsc --noEmit 2>&1 | tail -50; then
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
echo "[4/4] checking for dynamic-segment collisions in next-app routes..."
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

echo ""
echo "=== ALL GATES PASSED ==="
echo "Safe to push: git push origin $BRANCH"
exit 0
