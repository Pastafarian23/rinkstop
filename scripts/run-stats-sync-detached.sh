#!/usr/bin/env bash
# Detached wrapper for the game-stats sync.
# Mirrors run-fact-audit-detached.sh / run-rewrite-archived-detached.sh:
#   - setsid + nohup + disown so the script runs independent of the LLM agent
#   - exits in ~1s, work runs in background
#   - PID file at /tmp/stats-sync.pid
#   - log file at /tmp/stats-sync.log
#   - result file at /tmp/stats-sync.result.json (written by the sync itself)
#
# Cron calls this. The cron timeout (300s) only sees the wrapper, not the sync.
# The sync typically takes 1-2 minutes for ~150 fixtures.

set -e

LOG_FILE="/tmp/stats-sync.log"
PID_FILE="/tmp/stats-sync.pid"
RESULT_FILE="/tmp/stats-sync.result.json"

# Run from the rinkstop-platform root
cd /root/.openclaw/workspace/rinkstop-platform

# Spawn detached
setsid nohup env SYNC_RESULT_FILE="$RESULT_FILE" \
  node scripts/stats/sync-game-stats.mjs --limit=300 --days=30 \
  > "$LOG_FILE" 2>&1 </dev/null &

PID=$!
disown "$PID" 2>/dev/null || true
echo "$PID" > "$PID_FILE"
echo "Stats sync started, PID=$PID, log=$LOG_FILE, result=$RESULT_FILE"
