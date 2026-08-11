#!/usr/bin/env bash
# Pre-push guard for RinkStop
# Runs 5 gates before any push to origin. If any gate fails, the script exits
# non-zero and the push is blocked. Designed to catch the class of bugs that
# caused the 2026-08-11 prod 500: Next.js dynamic-segment collisions, build
# errors, and route collisions.
#
# Usage: ./scripts/pre-push-guard.sh [branch-name]
# Exit: 0 if all gates pass, 1 otherwise.

set -euo pipefail

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
echo "=== pre-push guard: branch=$BRANCH ==="

cd "$(git rev-parse --show-toplevel)"

# Gate 1: working tree state
echo "[1/5] checking working tree..."
if [ -n "$(git status --porcelain)" ]; then
  echo "FAIL: working tree has uncommitted changes"
  git status -sb
  exit 1
fi

# Gate 2: branch is ahead of main (we're pushing new work)
echo "[2/5] checking branch is ahead of main..."
AHEAD=$(git rev-list --count main..HEAD 2>/dev/null || echo 0)
if [ "$AHEAD" -eq 0 ]; then
  echo "FAIL: branch is not ahead of main; nothing to push"
  exit 1
fi
echo "    branch is $AHEAD commit(s) ahead of main"

# Gate 3: TypeScript compile
echo "[3/5] running npx tsc --noEmit..."
if ! npx tsc --noEmit 2>&1 | tail -50; then
  echo "FAIL: TypeScript compile errors"
  exit 1
fi

# Gate 4: Next.js build (this catches the [slug]/[pillar] collision class)
echo "[4/5] running pnpm build (this takes 60-120s)..."
if ! pnpm build 2>&1 | tail -30; then
  echo "FAIL: pnpm build failed"
  echo "Common cause: dynamic-segment collisions like [slug] vs [pillar] at the same depth"
  exit 1
fi

# Gate 5: route collision check (catches the [slug]/[pillar] bug before push).
# Real collision = SAME parent path + SAME bracket segment name.
# Different parents with the same bracket name are NOT a collision in Next.js
# (e.g. /directory/[country] and /federations/[country] are distinct routes).
# The original version of this gate checked across all parents at the same
# depth, which flagged every legitimate shared bracket name as a collision
# and made every push fail. Fixed 2026-08-11.
echo "[5/5] checking for dynamic-segment collisions in next-app routes..."
TOTAL_BRACKETS=$(find src/app -mindepth 2 -maxdepth 3 -type d -name '\[*\]' 2>/dev/null | wc -l)
find src/app -mindepth 2 -maxdepth 3 -type d -name '\[*\]' 2>/dev/null | \
  awk -F/ '{
    n = split($0, parts, "/")
    parent = parts[3]
    for (i = 4; i < n; i++) parent = parent "/" parts[i]
    print parent "|" parts[n]
  }' | sort | uniq -c | awk '$1 > 1 { sub(/^[ ]*[0-9]+[ ]*/, ""); print }' > /tmp/pre-push-guard-gate5.txt
if [ -s /tmp/pre-push-guard-gate5.txt ]; then
  echo "FAIL: dynamic-segment collisions (same parent, same bracket name):"
  while IFS='|' read -r parent bracket; do
    [ -z "$parent" ] && continue
    echo "  - $parent/[$bracket]"
  done < /tmp/pre-push-guard-gate5.txt
  rm -f /tmp/pre-push-guard-gate5.txt
  exit 1
fi
rm -f /tmp/pre-push-guard-gate5.txt
echo "    no real collisions ($TOTAL_BRACKETS bracket routes checked)"

echo ""
echo "=== ALL GATES PASSED ==="
echo "Safe to push: git push origin $BRANCH"
exit 0
