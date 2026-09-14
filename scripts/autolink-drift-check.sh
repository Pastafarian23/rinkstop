#!/usr/bin/env bash
# scripts/autolink-drift-check.sh
#
# Drift detector for the autolink audit mirror.
#
# WHY THIS EXISTS (2026-09-14, Arnel-flagged during full QC audit):
# scripts/_autolink-audit.mjs is a hand-mirrored copy of src/lib/autolink.ts.
# If they drift apart, the audit becomes a false ground-truth — it can pass
# while production is buggy, or fail while production is correct.
#
# This script extracts the four gate definitions from both files and diffs
# them. Exits non-zero on any drift. Designed to be wired into the pre-deploy
# gate as part 3.5 (between import-resolution and visual QC).
#
# Usage:
#   bash scripts/autolink-drift-check.sh           # exits 0 = no drift, 1 = drift
#
# Gates checked:
#   1. STOPWORDS set          (literal entries between `[` and `]`)
#   2. MIN_OCCURRENCES const  (numeric literal after `MIN_OCCURRENCES =`)
#   3. LONG_FORM_LEAGUES map  (key/value pairs between `([` and `])`)
#   4. escapeRegex function body (escape pattern between `{` and `}`)
#
# What this does NOT check (intentional — would couple too tightly):
#   - autolinkContent() body: algorithm changes are expected; the audit mirror
#     is updated in the same PR when algorithm changes. The four gates above
#     are the parts that drift silently if a maintainer forgets.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

SRC="src/lib/autolink.ts"
AUDIT="scripts/_autolink-audit.mjs"

# Sanity: both files must exist
if [ ! -f "$SRC" ]; then
  echo "FATAL: $SRC not found (cwd: $(pwd))" >&2
  exit 2
fi
if [ ! -f "$AUDIT" ]; then
  echo "FATAL: $AUDIT not found (cwd: $(pwd))" >&2
  exit 2
fi

extract_block() {
  # $1 = file, $2 = start marker, $3 = end marker
  # Extracts the text BETWEEN (and including) start/end markers.
  awk -v start="$2" -v end="$3" '
    $0 ~ start { flag=1; print; next }
    flag && $0 ~ end { print; flag=0; exit }
    flag { print }
  ' "$1"
}

# --- Gate 1: STOPWORDS ---
# In .ts:   const STOPWORDS = new Set<string>([ ... ]);
# In .mjs:  const STOPWORDS = new Set([ ... ]);
# Extract only entries that look like array elements (followed by a comma).
# This avoids false positives from inline comments that quote strings.
extract_stopwords() {
  awk '
    /^const STOPWORDS/ { flag=1; next }
    flag && /^\]/ { flag=0; exit }
    flag { print }
  ' "$1" | grep -oE "'[^']+'\s*," | sed -E "s/'([^']+)'.*/\1/" | sort -u
}
SRC_STOPWORDS=$(extract_stopwords "$SRC")
AUDIT_STOPWORDS=$(extract_stopwords "$AUDIT")

# --- Gate 2: MIN_OCCURRENCES ---
# Matches: const MIN_OCCURRENCES = 2;
SRC_MIN=$(grep -oE "MIN_OCCURRENCES\s*=\s*[0-9]+" "$SRC" | head -1 | grep -oE "[0-9]+")
AUDIT_MIN=$(grep -oE "MIN_OCCURRENCES\s*=\s*[0-9]+" "$AUDIT" | head -1 | grep -oE "[0-9]+")

# --- Gate 3: LONG_FORM_LEAGUES ---
# Extract `'Long Name', 'SHORT'` pairs from both files.
SRC_LONG=$(grep -oE "\['[^']+',\s*'[^']+'\]" "$SRC" | sort -u)
AUDIT_LONG=$(grep -oE "\['[^']+',\s*'[^']+'\]" "$AUDIT" | sort -u)

# --- Gate 4: escapeRegex body ---
# Extract everything between `function escapeRegex(str) {` and the closing `}`.
SRC_ESC=$(awk '
  /function escapeRegex/ { flag=1; next }
  flag && /^}/ { flag=0; exit }
  flag { print }
' "$SRC")
AUDIT_ESC=$(awk '
  /function escapeRegex/ { flag=1; next }
  flag && /^}/ { flag=0; exit }
  flag { print }
' "$AUDIT")

# --- Diff + report ---
EXIT_CODE=0
echo "=== autolink drift check ($(date -u +%Y-%m-%dT%H:%M:%SZ)) ==="
echo "src:  $SRC"
echo "audit: $AUDIT"
echo ""

# Gate 1
if [ "$SRC_STOPWORDS" = "$AUDIT_STOPWORDS" ]; then
  COUNT=$(echo "$SRC_STOPWORDS" | wc -l)
  echo "  [OK]  STOPWORDS: $COUNT entries match"
else
  echo "  [FAIL] STOPWORDS drift detected:"
  diff <(echo "$SRC_STOPWORDS") <(echo "$AUDIT_STOPWORDS") | head -30
  EXIT_CODE=1
fi

# Gate 2
if [ "$SRC_MIN" = "$AUDIT_MIN" ] && [ -n "$SRC_MIN" ]; then
  echo "  [OK]  MIN_OCCURRENCES: $SRC_MIN"
else
  echo "  [FAIL] MIN_OCCURRENCES drift: src='$SRC_MIN' audit='$AUDIT_MIN'"
  EXIT_CODE=1
fi

# Gate 3
if [ "$SRC_LONG" = "$AUDIT_LONG" ]; then
  COUNT=$(echo "$SRC_LONG" | wc -l)
  echo "  [OK]  LONG_FORM_LEAGUES: $COUNT entries match"
else
  echo "  [FAIL] LONG_FORM_LEAGUES drift detected:"
  diff <(echo "$SRC_LONG") <(echo "$AUDIT_LONG") | head -30
  EXIT_CODE=1
fi

# Gate 4
SRC_ESC_NORMALIZED=$(echo "$SRC_ESC" | tr -s ' ' | sort)
AUDIT_ESC_NORMALIZED=$(echo "$AUDIT_ESC" | tr -s ' ' | sort)
if [ "$SRC_ESC_NORMALIZED" = "$AUDIT_ESC_NORMALIZED" ]; then
  echo "  [OK]  escapeRegex body: match"
else
  echo "  [FAIL] escapeRegex drift detected:"
  diff <(echo "$SRC_ESC") <(echo "$AUDIT_ESC") | head -20
  EXIT_CODE=1
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "All 4 gates match. No drift. Safe to ship."
else
  echo "DRIFT DETECTED in one or more gates. DO NOT SHIP."
  echo "Fix: update scripts/_autolink-audit.mjs to mirror src/lib/autolink.ts (or vice versa)."
fi

exit $EXIT_CODE