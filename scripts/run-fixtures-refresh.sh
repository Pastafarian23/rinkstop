#!/bin/bash
# run-fixtures-refresh.sh
#
# Daily fixtures refresh for RinkStop. 2026-11-06 (Arnel data-integrity audit).
#
# Why this wrapper exists:
#   The daily-scores orchestrator (`_daily-scores-all-leagues.cjs`) had NO
#   cron. It was only ever run by hand. That meant:
#     - the HockeyTech fallback added to it (the only working source for
#       QMJHL / OHL / WHL / AHL / USHL now that Highlightly is dead) would
#       never have run automatically
#     - no league's fixtures were being refreshed on any schedule
#     - the freshness audit result file was a day stale, so staleness was
#       invisible
#
#   This wrapper is designed to be a cron `command` payload:
#     exit 0 = healthy, exit non-zero = failure (the cron failure-alert path
#     fires, no model call, no main-session wake).
#
# Steps:
#   1. Run the unified daily-scores orchestrator (NHL.com + Highlightly +
#      HockeyTech fallback).
#   2. Run the HockeyTech ingest for the Canadian junior leagues. The
#      orchestrator only calls HockeyTech when Highlightly produced nothing
#      for a league, so this direct run guarantees the junior schedules stay
#      populated even if Highlightly comes back with partial coverage.
#   3. Run the freshness audit and fail if any league that HAS fixtures is
#      stale or in a gap.
#
# The HockeyTech feed rate limits at roughly one call per 25-30s per key, so
# the ingest takes several minutes. It is run detached and polled.

set -u

SCRIPT_DIR="/root/.openclaw/workspace/rinkstop-platform"
LOG_DIR="/root/.openclaw/workspace/logs"
LOG_FILE="$LOG_DIR/fixtures-refresh.log"
PID_FILE="/tmp/fixtures-refresh.pid"

mkdir -p "$LOG_DIR"

# --- Reuse an in-flight run ------------------------------------------------
if [ -f "$PID_FILE" ]; then
  EXISTING="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$EXISTING" ] && kill -0 "$EXISTING" 2>/dev/null; then
    echo "Already running (PID $EXISTING) — nothing to do."
    exit 0
  fi
  rm -f "$PID_FILE"
fi

cd "$SCRIPT_DIR"

echo "=== Fixtures refresh started: $(date -Is) ===" >>"$LOG_FILE"

# --- 1. Unified daily scores orchestrator (detached) ----------------------
bash scripts/run-daily-scores-all-leagues.sh >>"$LOG_FILE" 2>&1

# --- 2. HockeyTech ingest for the Canadian junior leagues (detached) ------
# The HockeyTech feed is the ONLY working source for these now that
# Highlightly is dead. Without this the schedules go stale again.
HT_LOG="$LOG_DIR/hockeytech-ingest.log"
setsid nohup bash -c "set -a; source .env; set +a; node scripts/_ingest-hockeytech-schedules.mjs" \
  </dev/null >>"$HT_LOG" 2>&1 &
HT_PID=$!
disown "$HT_PID" 2>/dev/null || true
echo "$HT_PID" > "$PID_FILE"
echo "HockeyTech ingest started in background (PID $HT_PID)" >>"$LOG_FILE"

# Poll for up to 25 minutes (the feed rate limit makes a full 5-league run
# take ~20 min).
for _ in $(seq 1 150); do
  if ! kill -0 "$HT_PID" 2>/dev/null; then
    break
  fi
  sleep 10
done

if kill -0 "$HT_PID" 2>/dev/null; then
  echo "WARNING: HockeyTech ingest still running after 25 min — not failing the run." >>"$LOG_FILE"
else
  rm -f "$PID_FILE"
  # Fail loudly if the ingest hit upsert errors.
  HT_ERRORS="$(grep -c 'upsert error' "$HT_LOG" 2>/dev/null || echo 0)"
  if [ "$HT_ERRORS" -gt 0 ]; then
    echo "FAIL: HockeyTech ingest reported $HT_ERRORS upsert errors — see $HT_LOG" >&2
    exit 1
  fi
  echo "HockeyTech ingest completed with 0 upsert errors." >>"$LOG_FILE"
fi

# --- 3. Freshness audit ----------------------------------------------------
node scripts/_freshness-audit.cjs >>"$LOG_FILE" 2>&1

RESULT="/tmp/freshness-audit-result.json"
if [ ! -f "$RESULT" ]; then
  echo "FAIL: freshness audit produced no result file" >&2
  exit 1
fi

# Fail if any league that actually has fixtures is stale or in a gap.
# Leagues with ZERO fixtures are not a failure — there are 298 leagues in the
# table and most have never had data (that is a coverage question, not a
# pipeline failure).
#
# NOTE: the audit emits UPPERCASE statuses ('OK', 'STALE', 'GAP', 'empty').
# The comparison is case-normalised on purpose — a lowercase comparison
# silently matches nothing and this gate would never fail.
STALE_COUNT="$(python3 -c "
import json
d=json.load(open('$RESULT'))
bad=[l for l in d['leagues'] if str(l.get('status','')).upper() in ('STALE','GAP') and l.get('total',0)>0]
print(len(bad))
")"

echo "Leagues with fixtures that are stale or in a gap: $STALE_COUNT" >>"$LOG_FILE"

if [ "$STALE_COUNT" -gt 0 ]; then
  python3 -c "
import json
d=json.load(open('$RESULT'))
for l in d['leagues']:
    if str(l.get('status','')).upper() in ('STALE','GAP') and l.get('total',0)>0:
        print('  -', l['name'], '|', l['status'], '| total=', l['total'], '| last=', l.get('last_updated'))
" >&2
  echo "FAIL: $STALE_COUNT league(s) with fixtures are stale or in a gap — see $LOG_FILE" >&2
  exit 1
fi

echo "=== Fixtures refresh OK: $(date -Is) ===" >>"$LOG_FILE"
exit 0
