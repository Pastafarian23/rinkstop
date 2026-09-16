#!/bin/bash
# Detached wrapper for the audit-validated auto-publisher.
# Reads draft posts, runs audit pipeline, publishes if verified.
# Result file at /tmp/auto-publish-result.json. Log at /tmp/auto-publish.log.

set -e

LOG_FILE="/tmp/auto-publish.log"
PID_FILE="/tmp/auto-publish.pid"
RESULT_FILE="/tmp/auto-publish-result.json"

cd /root/.openclaw/workspace/rinkstop-platform

# Spawn detached
setsid nohup env PUBLISH_RESULT_FILE="$RESULT_FILE" \
  node scripts/auto-publish-audit-validated.cjs \
  > "$LOG_FILE" 2>&1 </dev/null &

PID=$!
disown "$PID" 2>/dev/null || true
echo "$PID" > "$PID_FILE"
echo "Auto-publish started, PID=$PID, log=$LOG_FILE, result=$RESULT_FILE"
