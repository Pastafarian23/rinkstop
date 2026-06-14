#!/usr/bin/env bash
# run-rewrite-archived-detached.sh
#
# Detached wrapper for the two rewrite scripts:
#   1. rewrite-archived-with-real-data.mjs       (NHL — NHL.com source)
#   2. rewrite-archived-multi-league.mjs          (everything else)
#
# Both scripts:
#   - Take 1-10 minutes depending on backlog size
#   - Are idempotent (already-published posts get skipped)
#   - Print a Summary line at the end
#
# Why detached: the cron LLM agent's exec call has a 120-300s timeout
# depending on the cron. The rewrite needs 5-10 min. Same pattern as
# run-highlights-sync-detached.sh.
#
# Usage:
#   ./run-rewrite-archived-detached.sh           # dry-run
#   ./run-rewrite-archived-detached.sh --execute # actually rewrite
#
# Writes:
#   /root/.openclaw/workspace/rinkstop-platform/logs/rewrite/rewrite-${TS}.log
#   /root/.openclaw/workspace/rinkstop-platform/logs/rewrite/rewrite-latest.log  (symlink)
#   /tmp/rewrite-archived.pid

set -u

MODE_FLAG="${1:-}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="/root/.openclaw/workspace/rinkstop-platform/logs/rewrite"
LOG_FILE="$LOG_DIR/rewrite-${TS}.log"
LATEST_LOG="$LOG_DIR/rewrite-latest.log"
PID_FILE="/tmp/rewrite-archived.pid"

mkdir -p "$LOG_DIR"

# Reuse an in-flight rewrite — don't double-spawn
if [ -f "$PID_FILE" ]; then
  EXISTING_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$EXISTING_PID" && kill -0 "$EXISTING_PID" 2>/dev/null ]; then
    echo "rewrite-archived already running (PID $EXISTING_PID, log: $LOG_FILE)"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# Symlink "latest" for the cron agent to pick up
ln -sfn "$LOG_FILE" "$LATEST_LOG"

cd /root/.openclaw/workspace/rinkstop-platform

# Spawn fully detached. Both scripts run sequentially. The combined
# runtime is ~10 min in the worst case (200 articles to process).
setsid nohup bash -c "
  echo '=== Phase 1: NHL rewriter (NHL.com source) ==='
  node scripts/article-from-highlight/rewrite-archived-with-real-data.mjs --league=NHL --limit=200 ${MODE_FLAG} 2>&1
  echo '=== Phase 2: Multi-league rewriter (HockeyTech, NCAA, KHL, IIHF) ==='
  node scripts/article-from-highlight/rewrite-archived-multi-league.mjs --limit=200 ${MODE_FLAG} 2>&1
  echo '=== Done ==='
" > "$LOG_FILE" 2>&1 </dev/null &
PID=$!
disown "$PID" 2>/dev/null || true
echo "$PID" > "$PID_FILE"

# Give node a moment to actually start so the PID is valid
sleep 1
if ! kill -0 "$PID" 2>/dev/null; then
  echo "rewrite-archived failed to start — see $LOG_FILE" >&2
  rm -f "$PID_FILE"
  exit 1
fi

echo "rewrite-archived started pid=$PID mode=${MODE_FLAG:-dry-run}"
echo "log: $LOG_FILE"
exit 0
