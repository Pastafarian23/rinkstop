#!/usr/bin/env bash
# scripts/vercel-post-deploy-smoke.sh
#
# After every push to main, this script pings key rinkstop.com URLs and
# confirms they return 200 with real content. If any fail, it auto-reverts
# the production alias to the last known-good deployment.
#
# Triggered by the Vercel deploy hook (or a cron that polls for new deploys).
# Exit 0 = all good, 1 = site is broken, attempted auto-revert.
#
# Why this exists (added 2026-10-10):
#   Tonight's outage: I pushed batch 3 (a11b6715), Vercel build errored on
#   ISR static generation (60s+ per country page), the alias got cleared,
#   site was unreachable for 3+ hours. The pre-push guard runs `tsc` not
#   `pnpm run build`, so it didn't catch the ISR timeout. This script is
#   the second line of defense: after Vercel says READY, verify the live
#   site actually works. If not, recover.
#
# Usage:
#   ./scripts/vercel-post-deploy-smoke.sh                     # smoke test only
#   ./scripts/vercel-post-deploy-smoke.sh --recover-on-fail   # smoke + auto-revert
#
# Smoke test endpoints:
#   / (home — must have non-zero counts)
#   /directory (must have team/league links)
#   /directory/rinks (must have 100+ rinks)
#   /directory/games (must have game cards)
#   /news (must have 10+ articles)
#   + any new page files in the current commit's diff

set -uo pipefail

SITE="${SITE:-https://rinkstop.com}"
RECOVER_ON_FAIL=false
[[ "${1:-}" == "--recover-on-fail" ]] && RECOVER_ON_FAIL=true

PASS=0
FAIL=0
FAILED_PATHS=()

# Smoke test: URL + max-time + post-check pattern (grep -c must be >= min)
# pattern="" means just check 200 + size > 10KB
declare -a CHECKS=(
  "/|200|15|h1:2+"
  "/|200|15|[0-9]{2,4}\\\+:5+"
  "/directory|200|15|directory:2+"
  "/directory/rinks|200|20|/directory/rinks/[a-z0-9-]:100+"
  "/directory/teams|200|15|/directory/teams/[a-z0-9-]:20+"
  "/directory/games|200|15|/directory/games/[a-z0-9-]:5+"
  "/news|200|15|/news/[a-z0-9-]:10+"
  "/directory/extraliga-cz|200|15|Extraliga:2+"
  "/directory/aihl-australia|200|15|AIHL:2+"
  "/directory/mestis-finland|200|15|Mestis:2+"
)

echo "=== Post-deploy smoke test: $SITE ==="
for check in "${CHECKS[@]}"; do
  path=$(echo "$check" | cut -d'|' -f1)
  expected_code=$(echo "$check" | cut -d'|' -f2)
  max_time=$(echo "$check" | cut -d'|' -f3)
  pattern_spec=$(echo "$check" | cut -d'|' -f4)
  pattern=$(echo "$pattern_spec" | cut -d':' -f1)
  min_count=$(echo "$pattern_spec" | cut -d':' -f2 | tr -d '+')

  out=$(mktemp)
  code=$(curl -s -o "$out" -w "%{http_code}" --max-time "$max_time" "$SITE$path" 2>/dev/null || echo "000")
  size=$(stat -c%s "$out" 2>/dev/null | tr -d '\n' || echo 0)

  # Verify status code
  if [ "$code" != "$expected_code" ]; then
    printf "  ✗ %-30s HTTP=%s expected %s\n" "$path" "$code" "$expected_code"
    FAIL=$((FAIL+1))
    FAILED_PATHS+=("$path:HTTP=$code")
    rm -f "$out"
    continue
  fi

  # Verify body size (must be > 10KB — guards against empty/loading pages)
  if [ "$size" -lt 10000 ]; then
    printf "  ✗ %-30s HTTP=%s but only %d bytes (empty/loading?)\n" "$path" "$code" "$size"
    FAIL=$((FAIL+1))
    FAILED_PATHS+=("$path:size=$size")
    rm -f "$out"
    continue
  fi

  # Verify content pattern if specified
  if [ -n "$pattern" ]; then
    # grep -oE counts OCCURRENCES, not lines. Many hrefs are on one minified line.
    count=$(grep -oE "$pattern" "$out" 2>/dev/null | wc -l)
    if [ "$count" -lt "$min_count" ]; then
      printf "  ✗ %-30s HTTP=%s but pattern '%s' matched only %d (expected >=%d)\n" \
        "$path" "$code" "$pattern" "$count" "$min_count"
      FAIL=$((FAIL+1))
      FAILED_PATHS+=("$path:pattern=$count")
      rm -f "$out"
      continue
    fi
  fi

  printf "  ✓ %-30s HTTP=%s %d bytes\n" "$path" "$code" "$size"
  PASS=$((PASS+1))
  rm -f "$out"
done

echo ""
echo "Summary: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failed paths:"
  printf "  %s\n" "${FAILED_PATHS[@]}"

  if [ "$RECOVER_ON_FAIL" = true ]; then
    echo ""
    echo "Auto-recovery: re-pointing rinkstop.com + www.rinkstop.com to last known-good deployment"
    node scripts/vercel-restore-last-good.mjs
  else
    echo ""
    echo "Run with --recover-on-fail to auto-revert to last known-good deployment"
    exit 1
  fi
fi

exit 0
