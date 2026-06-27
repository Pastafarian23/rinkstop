#!/usr/bin/env bash
# scripts/ship-check.sh
# Verifies that every import in a staged file resolves to either a tracked
# file in git HEAD or a package in package.json.

set -e
cd "$(git rev-parse --show-toplevel)"

STAGED=$(git diff --cached --name-only)
if [[ -z "$STAGED" ]]; then
  echo "No staged files. Stage with 'git add' first."
  exit 1
fi

echo "=== Staged files ==="
echo "$STAGED"
echo

# Extract just the import paths (without "from " or quotes).
# Only look at added (+) or removed (-) lines — context lines are ignored.
IMPORTS=$(git diff --cached -- $STAGED \
  | grep -E "^[+-].*from ['\"]" \
  | grep -oE "from ['\"]@/[^'\"]+['\"]|from ['\"]\.\.?/[^'\"]+['\"]|from ['\"]next[^'\"]*['\"]|from ['\"]react[^'\"]*['\"]" \
  | sed -E "s|from ['\"]([^'\"]+)['\"]|\1|" \
  | sort -u)

if [[ -z "$IMPORTS" ]]; then
  echo "No module imports found in staged changes."
  exit 0
fi

echo "Imports to verify:"
echo "$IMPORTS"
echo

FAIL=0
while IFS= read -r clean; do
  [[ -z "$clean" ]] && continue
  found="no"
  resolution="$clean"

  # @ alias → src/
  if [[ "$clean" == @/* ]]; then
    resolution="src/${clean:2}"
  fi

  # Try .tsx / .ts in HEAD
  for ext in tsx ts; do
    if git ls-tree HEAD --name-only -r 2>/dev/null | grep -qx "${resolution}.${ext}"; then
      found="yes (.${ext} in HEAD)"
      break
    fi
  done

  # If not in HEAD, check if it's being ADDED in this commit
  if [[ "$found" == "no" ]]; then
    for ext in tsx ts; do
      if grep -qx "${resolution}.${ext}" <<< "$STAGED"; then
        found="yes (.${ext} being added in this commit)"
        break
      fi
    done
  fi

  # npm packages
  if [[ "$found" == "no" ]]; then
    pkg=$(echo "$clean" | cut -d/ -f1)
    if grep -qE "\"${pkg}\":" package.json 2>/dev/null; then
      found="yes (npm package)"
    fi
  fi

  if [[ "$found" == "no" ]]; then
    echo "FAIL: '${clean}' → ${resolution} — NOT TRACKED"
    FAIL=1
  else
    echo "OK   '${clean}' → ${resolution} (${found})"
  fi
done <<< "$IMPORTS"

echo
if [[ "$FAIL" == "0" ]]; then
  echo "=== SHIP GATE: PASSED ==="
  exit 0
else
  echo "=== SHIP GATE: FAILED — DO NOT COMMIT ==="
  exit 1
fi
