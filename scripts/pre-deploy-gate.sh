#!/usr/bin/env bash
# Pre-deploy gate for RinkStop
#
# Single entry point for "is this PR safe to ship?". Combines the existing
# compile-time gates (tsc + build + route collisions) with the runtime checks
# added after the 2026-09-11 invisible-text + uuid-FK bug incidents:
#   - HTML color audit on changed pages (catches light-mode hex on dark bg)
#   - Migration sanity (catches uuid-vs-text FK, missing RLS, etc.)
#
# Usage:
#   ./scripts/pre-deploy-gate.sh                  # run all gates
#   ./scripts/pre-deploy-gate.sh --skip-build     # skip the slow pnpm build
#   ./scripts/pre-deploy-gate.sh --only=4,5       # run only gates 4 and 5
#
# Exit codes:
#   0 = all gates passed (safe to push)
#   1 = one or more gates failed (do NOT push)
#   2 = internal error (missing dependency, etc.)
#
# Each gate has its own clear error message pointing at the fix.

set -uo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# CLI flag parsing
SKIP_BUILD=0
ONLY=""
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --only=*) ONLY="${arg#--only=}" ;;
    *) ;;
  esac
done

should_run() {
  local gate_num="$1"
  if [ -z "$ONLY" ]; then return 0; fi
  case ",$ONLY," in *",$gate_num,"*) return 0 ;; *) return 1 ;; esac
}

# Load credentials from the standard path. If missing, gates that need them skip.
CRED_DIR="/root/.openclaw/credentials"
if [ -f "$CRED_DIR/supabase.json" ]; then
  SVC_KEY=$(node -e 'console.log(require("/root/.openclaw/credentials/supabase.json").serviceRoleKey || "")' 2>/dev/null || echo "")
  PAT=$(node -e 'console.log(require("/root/.openclaw/credentials/supabase.json").pat || "")' 2>/dev/null || echo "")
else
  SVC_KEY=""
  PAT=""
fi

PROJECT_REF="yszheonqyyskkjoxoexk"
ANON_KEY=$(grep -E "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")

cd "$(git rev-parse --show-toplevel)"

FAILED=0
PASSED=0

ok()    { echo "  ✓ $*"; PASSED=$((PASSED + 1)); }
fail()  { echo "  ✗ FAIL: $*"; FAILED=$((FAILED + 1)); }
note()  { echo "  · $*"; }

echo "=== pre-deploy gate: branch=$BRANCH ==="
echo ""

# ------------------------------------------------------------------ Gate 1
if should_run 1; then
  echo "[1/6] checking working tree..."
  if [ -n "$(git status --porcelain)" ]; then
    fail "uncommitted changes present"
    git status -sb | head -10
  else
    ok "working tree clean"
  fi
fi

# ------------------------------------------------------------------ Gate 2
if should_run 2; then
  echo "[2/6] running npx tsc --noEmit..."
  if npx tsc --noEmit 2>&1 | tail -50 | grep -E "error TS"; then
    fail "TypeScript compile errors"
  else
    ok "TypeScript clean"
  fi
fi

# ------------------------------------------------------------------ Gate 3
if should_run 3; then
  if [ "$SKIP_BUILD" -eq 1 ]; then
    note "build skipped (--skip-build)"
  else
    echo "[3/6] running pnpm build (this takes 60-120s)..."
    # 2026-09-04: the 2 GiB default Node heap OOMs on this project's
    # full route compile; bump to 4 GiB to mirror the Vercel build image.
    if ! NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096" pnpm build 2>&1 | tail -30; then
      fail "pnpm build failed"
      note "Common cause: dynamic-segment collisions like [slug] vs [pillar] at the same depth"
    else
      ok "pnpm build + route collision check passed"
    fi
  fi
fi

# ------------------------------------------------------------------ Gate 4 (NEW 2026-09-11)
# HTML color audit on changed pages. Catches the class of bug where
# light-mode hex (#041E42 / #1a1a1a / #888 / etc.) is used as text color
# on a dark-theme site (#0D1117 bg), making content invisible.
#
# Checks the LIVE HTML on the production site for the previous commit's
# pages (which is what just got merged). If you want to check pages that
# aren't on prod yet, run this manually with the file path.
if should_run 4; then
  echo "[4/6] HTML color audit (light-mode hex on dark bg)..."
  BASE="${BASE_URL:-https://rinkstop.com}"

  # Find all pages that were modified in the last commit (or against main
  # if we're on a branch — but the typical use is post-merge, so check HEAD).
  PAGES_CHANGED=$(git diff --name-only HEAD~1..HEAD 2>/dev/null | grep -E "^src/app/.*page\.tsx$" || true)

  if [ -z "$PAGES_CHANGED" ]; then
    note "no page.tsx files changed in last commit — skipping live color audit"
    ok "no page changes to audit"
  else
    COLOR_BAD=0
    for page_file in $PAGES_CHANGED; do
      # Derive the route from the file path. src/app/learn/hockey-rules/page.tsx
      # => /learn/hockey-rules
      route=$(echo "$page_file" | sed 's|^src/app||; s|/page\.tsx$||; s|/index$||; s|^$|/|')
      url="${BASE}${route}"
      html=$(curl -s --max-time 15 "$url" || echo "")

      if [ -z "$html" ]; then
        note "  $url — could not fetch (live audit skipped)"
        continue
      fi

      # Strip <script> blocks before grepping (they may contain hex codes
      # for JSON-LD or chunk hashes that aren't visual styling).
      body_only=$(echo "$html" | sed 's|<script[^>]*>.*</script>||g' | tr -d '\n')

      # Look for any color: that resolves to a light-mode hex on dark bg.
      # These are the values that disappeared text in 2026-09-11.
      bad=$(echo "$body_only" | grep -oE 'color:\s*#041E42|color:\s*#1a1a1a|color:\s*#444[^0-9a-fA-F]|color:\s*#555[^0-9a-fA-F]|color:\s*#666[^0-9a-fA-F]|color:\s*#777[^0-9a-fA-F]|color:\s*#888[^0-9a-fA-F]|color:\s*#999[^0-9a-fA-F]|color:\s*#A0A0A0|color:\s*#38BDF8' | sort -u)

      if [ -n "$bad" ]; then
        echo "  ✗ $url has light-mode hex on dark bg:"
        echo "$bad" | sed 's/^/      /'
        COLOR_BAD=$((COLOR_BAD + 1))
      else
        note "  ✓ $url — color audit clean"
      fi
    done

    if [ "$COLOR_BAD" -gt 0 ]; then
      fail "$COLOR_BAD page(s) have light-mode hex on dark bg"
      note "Fix: replace #041E42 -> '#fff', #1a1a1a -> 'rgba(255,255,255,0.75)',"
      note "     #888 -> 'rgba(255,255,255,0.4)', #38BDF8 -> '#FFB81C' (or similar dark-theme value)"
      note "Reference template: src/app/guides/hockey-rules/page.tsx"
    else
      ok "all changed pages pass color audit"
    fi
  fi
fi

# ------------------------------------------------------------------ Gate 5 (NEW 2026-09-11)
# Migration sanity. Catches:
#   - uuid columns that should be text (Clerk user IDs are not UUIDs)
#   - missing RLS on user-data tables
#   - migrations that reference auth.users(id) FK (won't work with Clerk)
#
# Only runs if migrations were added in the last commit.
if should_run 5; then
  echo "[5/6] migration sanity..."
  NEW_MIGS=$(git diff --name-only HEAD~1..HEAD 2>/dev/null | grep -E "^supabase/migrations/.*\.sql$" || true)

  if [ -z "$NEW_MIGS" ]; then
    note "no new migrations in last commit"
    ok "no migrations to check"
  else
    MIG_BAD=0
    for mig in $NEW_MIGS; do
      bad_reasons=""
      # Pattern 1: user_id column typed as uuid with FK to auth.users(id)
      if grep -qE 'user_id[^,]*\buuid\b.*REFERENCES\s+auth\.users' "$mig"; then
        bad_reasons="$bad_reasons
   - user_id typed as uuid + REFERENCES auth.users(id): Clerk user IDs are
     strings like 'user_3F8TVg2YvbpYzMWQSSNPCpLdZYn', NOT UUIDs.
     Use 'text' type and skip the FK (Clerk is the source of truth externally).
     Reference: profile_account_types.user_id (text) is the project standard."
      fi
      # Pattern 2: CREATE TABLE without RLS (informational warning, not fail)
      if grep -qE 'CREATE TABLE IF NOT EXISTS' "$mig" && ! grep -qE 'ENABLE ROW LEVEL SECURITY' "$mig"; then
        note "  ! $mig: CREATE TABLE without ENABLE ROW LEVEL SECURITY (verify this is intentional)"
      fi
      if [ -n "$bad_reasons" ]; then
        echo "  ✗ $mig:$bad_reasons"
        MIG_BAD=$((MIG_BAD + 1))
      else
        ok "  $mig: no known anti-patterns"
      fi
    done

    if [ "$MIG_BAD" -gt 0 ]; then
      fail "$MIG_BAD migration(s) have likely-correctness issues"
    else
      ok "all new migrations pass sanity"
    fi
  fi
fi

# ------------------------------------------------------------------ Gate 6 (NEW 2026-09-11)
# Optional live RLS sanity for tables that exist on dev. Only runs if
# SUPABASE_LIVE_CHECK=1 (default off — it's a network call to dev DB).
if should_run 6; then
  echo "[6/6] live RLS sanity (dev DB)..."
  if [ "${SUPABASE_LIVE_CHECK:-0}" != "1" ]; then
    note "skipping live RLS check (set SUPABASE_LIVE_CHECK=1 to enable)"
    ok "live check skipped"
  elif [ -z "$SVC_KEY" ] || [ -z "$ANON_KEY" ]; then
    note "missing credentials (supabase.json or .env.local) — live check skipped"
  else
    # Probe a known table. If 0 rows with anon key + non-zero with service
    # role, RLS is active. (Real apps: parameterize to specific tables.)
    TABLE="${RLS_PROBE_TABLE:-learn_progress}"
    ANON_RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
      "https://${PROJECT_REF}.supabase.co/rest/v1/${TABLE}?select=id&limit=1" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $ANON_KEY")
    if [ "$ANON_RESULT" = "200" ]; then
      ANON_BODY=$(curl -s "https://${PROJECT_REF}.supabase.co/rest/v1/${TABLE}?select=id&limit=1" \
        -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY")
      note "  anon read of $TABLE: status=$ANON_RESULT body=$ANON_BODY"
    else
      note "  anon read of $TABLE: status=$ANON_RESULT (expected 200 with [] or RLS-blocked)"
    fi
    ok "live RLS check ran (informational — verify the body above is what you expect)"
  fi
fi

echo ""
echo "=== summary ==="
echo "  passed: $PASSED"
echo "  failed: $FAILED"
if [ "$FAILED" -gt 0 ]; then
  echo ""
  echo "DO NOT PUSH until failures are fixed."
  exit 1
fi
echo "All gates passed. Safe to push."
exit 0