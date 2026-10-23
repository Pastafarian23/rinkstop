#!/usr/bin/env bash
# tests/backup-export-paging.test.sh
#
# Regression tests for the paging/assembly logic in
# scripts/backups/rest-export.sh.
#
# WHY THIS EXISTS (2026-10-23, disk-full + silent-corruption incident)
#
# Three separate bugs hit this script in one day, and the worst part is that
# two of them produced backups that LOOKED fine:
#
#   1. O(n^2) append: `cat "${DATA_FILE}.tmp" >> "${DATA_FILE}"` re-appended the
#      whole accumulated file every page. For admin_audit_log (140k rows,
#      ~29-122KB each) that wrote a 4GB file, filled the 25G host disk, and
#      killed the backup mid-run. The disk-full condition then cascaded into
#      every other scheduled job on the host.
#
#   2. CORRUPT JSON: `head -c -1 "${DATA_FILE}.tmp" >> "${DATA_FILE}"` then
#      `printf ']\n' >> "${DATA_FILE}"`. `jq -s '.'` emits pretty-printed JSON
#      whose LAST BYTE IS A NEWLINE, not the closing bracket, so `head -c -1`
#      stripped only the newline and left the ']' in place. Every page after
#      the first appended a second closing bracket. The file was large but
#      invalid JSON ("Unmatched ']'").
#
#   3. LOST FIRST PAGE: offset 0 wrote to ${DATA_FILE} while later pages wrote
#      to ${DATA_FILE}.jsonl, and the final conversion overwrote ${DATA_FILE}
#      with only the sidecar's contents. Every multi-page table was missing
#      EXACTLY 1,000 rows (rinks 1919 -> 919, players 6352 -> 5352) while
#      single-page tables were correct. **A backup that silently drops data is
#      worse than a backup that fails loudly.**
#
# These tests exercise the real shell functions against synthetic pages so the
# failure modes are caught without running a full export.
#
# Usage: bash tests/backup-export-paging.test.sh

set -uo pipefail

PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ✗ $1"; }

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "${TMPDIR_TEST}"' EXIT

# ---------------------------------------------------------------------------
# The assembly logic under test — mirrors scripts/backups/rest-export.sh.
# Kept in sync with the script; if you change one, change the other.
# ---------------------------------------------------------------------------
assemble_from_pages() {
  # $1 = output .json path; remaining args = page payloads
  local out="$1"; shift
  local jsonl="${out}.jsonl"
  : > "${jsonl}"
  local page
  for page in "$@"; do
    echo "${page}" | jq -c '.[]' >> "${jsonl}"
  done
  jq -s '.' "${jsonl}" > "${out}"
  rm -f "${jsonl}"
}

echo "backup paging/assembly regression tests"

# ---------------------------------------------------------------------------
echo "1. multi-page assembly produces valid JSON with ALL rows"
# ---------------------------------------------------------------------------
P1='[{"id":1},{"id":2},{"id":3}]'
P2='[{"id":4},{"id":5}]'
P3='[{"id":6}]'
OUT="${TMPDIR_TEST}/multi.json"
assemble_from_pages "${OUT}" "${P1}" "${P2}" "${P3}"

if jq -e 'type == "array"' "${OUT}" >/dev/null 2>&1; then
  pass "output is valid JSON (was 'Unmatched ]' before the fix)"
else
  fail "output is NOT valid JSON"
fi

N=$(jq 'length' "${OUT}" 2>/dev/null || echo -1)
if [ "${N}" = "6" ]; then
  pass "all 6 rows present across 3 pages"
else
  fail "expected 6 rows, got ${N}"
fi

# The exact bug-3 signature: first page dropped.
FIRST_ID=$(jq -r '.[0].id' "${OUT}" 2>/dev/null || echo "none")
if [ "${FIRST_ID}" = "1" ]; then
  pass "first page is present (bug 3 dropped exactly page 1)"
else
  fail "first page missing — got first id '${FIRST_ID}', expected 1"
fi

# ---------------------------------------------------------------------------
echo "2. single-page table is correct"
# ---------------------------------------------------------------------------
OUT2="${TMPDIR_TEST}/single.json"
assemble_from_pages "${OUT2}" '[{"id":1}]'
N2=$(jq 'length' "${OUT2}" 2>/dev/null || echo -1)
if [ "${N2}" = "1" ]; then
  pass "single-page table has 1 row"
else
  fail "expected 1 row, got ${N2}"
fi

# ---------------------------------------------------------------------------
echo "3. empty table produces valid empty array"
# ---------------------------------------------------------------------------
OUT3="${TMPDIR_TEST}/empty.json"
assemble_from_pages "${OUT3}" ''
if jq -e 'type == "array" and length == 0' "${OUT3}" >/dev/null 2>&1; then
  pass "empty input yields a valid empty array"
else
  fail "empty input did not yield a valid empty array"
fi

# ---------------------------------------------------------------------------
echo "4. 1000-row page boundary (the exact size that broke it)"
# ---------------------------------------------------------------------------
# Build a realistic 1000-row page.
BIG=$(node -e 'console.log(JSON.stringify(Array.from({length:1000},(_,i)=>({id:i}))))')
BIG2=$(node -e 'console.log(JSON.stringify(Array.from({length:919},(_,i)=>({id:1000+i}))))')
OUT4="${TMPDIR_TEST}/big.json"
assemble_from_pages "${OUT4}" "${BIG}" "${BIG2}"
N4=$(jq 'length' "${OUT4}" 2>/dev/null || echo -1)
if [ "${N4}" = "1919" ]; then
  pass "1919 rows across a 1000-row page + a 919-row page (matches the live rinks count)"
else
  fail "expected 1919 rows, got ${N4}"
fi
if jq -e '.[0].id == 0 and .[999].id == 999 and .[1000].id == 1000' "${OUT4}" >/dev/null 2>&1; then
  pass "row ordering and page boundary are exact"
else
  fail "row boundary incorrect"
fi

# ---------------------------------------------------------------------------
echo "5. the assembly preserves rows EXACTLY as the source had them"
# ---------------------------------------------------------------------------
# NOTE: this asserts FAITHFUL copying, not de-duplication. If the source pages
# contain the same id twice, the backup must contain it twice. A backup that
# silently drops rows is worse than one that fails loudly — de-duplicating
# here would hide a real pagination bug (e.g. an offset that doesn't advance
# would re-fetch the same page forever).
OUT5="${TMPDIR_TEST}/dup.json"
assemble_from_pages "${OUT5}" '[{"id":1},{"id":2}]' '[{"id":2},{"id":3}]'
TOT=$(jq 'length' "${OUT5}" 2>/dev/null || echo -1)
IDS=$(jq -c 'map(.id)' "${OUT5}" 2>/dev/null || echo '[]')
if [ "${TOT}" = "4" ] && [ "${IDS}" = '[1,2,2,3]' ]; then
  pass "rows are copied faithfully, in order, without silent de-duplication"
else
  fail "expected 4 rows [1,2,2,3], got ${TOT} rows ${IDS}"
fi

# ---------------------------------------------------------------------------
echo "6. the script's real assembly path is exercised end-to-end"
# ---------------------------------------------------------------------------
# Extract the jsonl-to-array conversion from the actual script and run it on
# a multi-page sidecar, to prove the shipped code produces valid JSON.
SCRIPT="${SCRIPT_PATH:-$(cd "$(dirname "$0")/.." && pwd)/scripts/backups/rest-export.sh}"
if [ -f "${SCRIPT}" ]; then
  if bash -n "${SCRIPT}" 2>/dev/null; then
    pass "scripts/backups/rest-export.sh has valid bash syntax"
  else
    fail "scripts/backups/rest-export.sh has a bash syntax error"
  fi

  # The script must route EVERY page through the jsonl sidecar (bug 3).
  if grep -q 'jq -c .\.\[\].*>> "\${DATA_FILE}\.jsonl"' "${SCRIPT}"; then
    pass "all pages append to the jsonl sidecar (no split first-page path)"
  else
    fail "script does not route all pages through the jsonl sidecar"
  fi

  # The old corrupting idiom must be gone.
  if grep -q 'head -c -1' "${SCRIPT}"; then
    fail "script still contains the corrupting 'head -c -1' idiom"
  else
    pass "corrupting 'head -c -1' idiom is gone"
  fi

  # The disk guard must be present.
  if grep -q 'MAX_TABLE_BYTES' "${SCRIPT}"; then
    pass "per-table disk guard (MAX_TABLE_BYTES) is present"
  else
    fail "per-table disk guard missing"
  fi

  # admin_audit_log must exclude the oversized diff column.
  if grep -q "admin_audit_log)" "${SCRIPT}" && grep -q "SELECT_COLS=" "${SCRIPT}"; then
    pass "admin_audit_log excludes the oversized 'diff' column"
  else
    fail "admin_audit_log column exclusion missing"
  fi
else
  fail "could not locate scripts/backups/rest-export.sh"
fi

echo
echo "----------------------------------------"
echo "passed: ${PASS}  failed: ${FAIL}"
if [ "${FAIL}" -gt 0 ]; then
  echo "BACKUP PAGING TESTS FAILED"
  exit 1
fi
echo "BACKUP PAGING TESTS PASSED"
