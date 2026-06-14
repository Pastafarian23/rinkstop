#!/usr/bin/env bash
# Detached wrapper for the per-claim article verifier.
# Same pattern as the other detached wrappers.
# Reads up to 200 published articles, verifies them against the stats foundation.
# Result file at /tmp/verify-claims.result.json. Log at /tmp/verify-claims.log.

set -e

LOG_FILE="/tmp/verify-claims.log"
PID_FILE="/tmp/verify-claims.pid"
RESULT_FILE="/tmp/verify-claims.result.json"

cd /root/.openclaw/workspace/rinkstop-platform

# Spawn detached
setsid nohup env VERIFY_RESULT_FILE="$RESULT_FILE" \
  node scripts/stats/verify-article-claims.mjs --limit=200 \
  > "$LOG_FILE" 2>&1 </dev/null &

PID=$!
disown "$PID" 2>/dev/null || true
echo "$PID" > "$PID_FILE"
echo "Article verifier started, PID=$PID, log=$LOG_FILE, result=$RESULT_FILE"
