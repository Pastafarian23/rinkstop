#!/bin/bash
# run-daily-scores-all-leagues.sh
#
# Detached wrapper for the unified daily scores orchestrator. Runs the
# right source for each league and emits a JSON report for the cron delivery.
#
# Per Arnel's 2026-09-21 'all leagues, always verified, never gaps' directive.
#
# Why detached: orchestrator can take 2-5 min for a 7-day backfill when
# scanning stale fixtures across all 11+ leagues. The cron's exec call
# has a 300s timeout — without detachment, mid-run kills would lose
# partial results.

set -u

SCRIPT_DIR="/root/.openclaw/workspace/rinkstop-platform"
LOG_DIR="/root/.openclaw/workspace/logs"
LOG_FILE="$LOG_DIR/daily-scores-all-leagues.log"
PID_FILE="/tmp/daily-scores-all-leagues.pid"
DAYS="${DAILY_SCORES_ALL_LEAGUES_DAYS:-7}"

mkdir -p "$LOG_DIR"

# Reuse an in-flight run
if [ -f "$PID_FILE" ]; then
  EXISTING="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$EXISTING" ] && kill -0 "$EXISTING" 2>/dev/null; then
    echo "Already running (PID $EXISTING)"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

cd "$SCRIPT_DIR"
setsid nohup bash -c "set -a; source .env; set +a; node scripts/_daily-scores-all-leagues.cjs --days=$DAYS" \
  </dev/null >>"$LOG_FILE" 2>&1 &
PID=$!
disown "$PID" 2>/dev/null || true
echo "$PID" > "$PID_FILE"

sleep 1
if ! kill -0 "$PID" 2>/dev/null; then
  echo "Daily scores failed to start — see $LOG_FILE" >&2
  rm -f "$PID_FILE"
  exit 1
fi

echo "Daily scores started in background (PID $PID, days=$DAYS)"
echo "Log: $LOG_FILE"
