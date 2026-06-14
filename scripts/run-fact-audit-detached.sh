#!/usr/bin/env bash
# run-fact-audit-detached.sh
#
# Detached wrapper for audit-published-articles.mjs.
# Same pattern as run-highlights-sync-detached.sh (the working one):
#   - cron/agent turn kicks this off
#   - script returns ~1s later (the audit keeps running independently)
#   - audit writes a JSON result file + a human-readable log
#   - cron completion wake picks up the result file
#
# Usage:
#   ./run-fact-audit-detached.sh           # dry-run (no archiving)
#   ./run-fact-audit-detached.sh --execute # actually archive bad articles
#
# Why this version (2026-06-14):
# The old version spawned a bash watcher in a nohup setsid subshell, but the
# parent shell still held open job-control state and the cron LLM's exec
# timeout (300s) tripped before the agent turn could return. The fix mirrors
# the working highlights pattern: no inline watcher here. The audit itself
# writes the result file when it finishes, so the watcher is redundant.

set -u

MODE_FLAG="${1:-}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="/root/.openclaw/workspace/rinkstop-platform/logs/fact-audit"
LOG_FILE="$LOG_DIR/audit-${TS}.log"
RESULT_FILE="$LOG_DIR/audit-${TS}.result.json"
LATEST_LOG="$LOG_DIR/audit-latest.log"
LATEST_RESULT="$LOG_DIR/audit-latest.result.json"
PID_FILE="/tmp/fact-audit.pid"

mkdir -p "$LOG_DIR"

# Reuse an in-flight audit — don't double-spawn
if [ -f "$PID_FILE" ]; then
  EXISTING_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$EXISTING_PID" ] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "fact-audit already running (PID $EXISTING_PID, log: $LOG_FILE)"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# Symlink "latest" for the cron agent to pick up immediately
ln -sfn "$LOG_FILE" "$LATEST_LOG"

cd /root/.openclaw/workspace/rinkstop-platform

# Spawn fully detached. The audit script itself writes the result file when
# it completes (added in audit-published-articles.mjs) — no watcher needed.
setsid nohup env FACT_AUDIT_RESULT_FILE="$RESULT_FILE" \
  node scripts/article-from-highlight/audit-published-articles.mjs $MODE_FLAG \
  > "$LOG_FILE" 2>&1 </dev/null &
PID=$!
disown "$PID" 2>/dev/null || true
echo "$PID" > "$PID_FILE"

# Give node a moment to actually start so the PID is valid
sleep 1
if ! kill -0 "$PID" 2>/dev/null; then
  echo "fact-audit failed to start — see $LOG_FILE" >&2
  rm -f "$PID_FILE"
  exit 1
fi

echo "fact-audit started pid=$PID mode=${MODE_FLAG:-dry-run}"
echo "log: $LOG_FILE"
echo "result: $RESULT_FILE"
exit 0
