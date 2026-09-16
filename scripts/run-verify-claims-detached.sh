#!/usr/bin/bash
# Detached wrapper for the article accuracy audit + verifier.
# Runs the full audit pipeline on ALL 688 highlight articles (not just 200).
# Alerts to RinkStop Ops if any FAIL articles found (or if FAIL count grew
# since the previous run).
#
# Result file at /tmp/audit-result.json. Log at /tmp/audit.log.

set -e

LOG_FILE="/tmp/audit.log"
PID_FILE="/tmp/audit.pid"
RESULT_FILE="/tmp/audit-result.json"
PREV_FAIL_FILE="/tmp/audit-prev-fail-count.txt"

cd /root/.openclaw/workspace/rinkstop-platform

# Spawn detached
setsid nohup env \
  AUDIT_RESULT_FILE="$RESULT_FILE" \
  AUDIT_PREV_FAIL_FILE="$PREV_FAIL_FILE" \
  node scripts/_audit-nightly.cjs \
  > "$LOG_FILE" 2>&1 </dev/null &

PID=$!
disown "$PID" 2>/dev/null || true
echo "$PID" > "$PID_FILE"
echo "Article audit started, PID=$PID, log=$LOG_FILE, result=$RESULT_FILE"
