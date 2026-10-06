#!/usr/bin/env bash
# Article-from-highlight cron runner (bash-direct, no LLM in critical path).
#
# Replaces the previous agentTurn payload on cron d6241628 (which was using
# a kilo/minimax model that kept hitting rate-limits and failing with
# "Agent couldn't generate a response"). The LLM lives inside the
# orchestrator; this script is the cron's bash-direct equivalent of the
# previous agentTurn's 4 steps.
#
#   1. Bail if another run is already in-flight (PID file check).
#   2. Spawn the detached orchestrator wrapper.
#   3. Poll the log until the run finishes (or 10 min timeout).
#   4. Post to RinkStop Ops only when drafts > 0 OR new failures appear.

RINKSTOP_PLATFORM_DIR="/root/.openclaw/workspace/rinkstop-platform"
LOG_DIR="$RINKSTOP_PLATFORM_DIR/logs/article-from-highlight"
LATEST_LOG="$LOG_DIR/afh-latest.log"
PID_FILE="/tmp/article-from-highlight.pid"
OPS_CHAT="-5043773858"   # RinkStop Ops Telegram
TIMEOUT_S=600            # 10 min — orchestrator can take 5-10 min when LLM is slow
POLL_INTERVAL_S=10

mkdir -p "$LOG_DIR"

# Step 1 — bail if a previous run is still in-flight
if [ -f "$PID_FILE" ]; then
  EXISTING_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$EXISTING_PID" ] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "article-from-highlight already running (PID $EXISTING_PID, log: $LATEST_LOG)"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# Step 2 — spawn detached wrapper
bash "$RINKSTOP_PLATFORM_DIR/scripts/run-article-from-highlight-detached.sh" --execute --since=168
WRAPPER_RC=$?
if [ "$WRAPPER_RC" -ne 0 ]; then
  echo "wrapper exited rc=$WRAPPER_RC"
  /root/.openclaw/bin/openclaw message send --channel telegram --target "$OPS_CHAT" \
    --text "article-from-highlight wrapper aborted (rc=$WRAPPER_RC). Check $LATEST_LOG" \
    2>&1 || true
  exit $WRAPPER_RC
fi

# Step 3 — wait for the detached run to finish (poll for PID exit)
START=$(date +%s)
while true; do
  ELAPSED=$(( $(date +%s) - START ))
  if [ "$ELAPSED" -gt "$TIMEOUT_S" ]; then
    echo "timeout waiting for orchestrator after ${ELAPSED}s"
    break
  fi
  if [ -f "$PID_FILE" ]; then
    P="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -z "$P" ] || ! kill -0 "$P" 2>/dev/null; then
      sleep 2
      break
    fi
  fi
  sleep "$POLL_INTERVAL_S"
done

# Step 4 — parse totals, post only when meaningful
DRAFTS_INSERTED=$(grep -c "inserted draft" "$LATEST_LOG" 2>/dev/null || echo "0")
DRAFTS_DRAFTED=$(grep -c "Drafted" "$LATEST_LOG" 2>/dev/null || echo "0")
FAILURES=$(grep -cE "FATAL|ERROR|error" "$LATEST_LOG" 2>/dev/null || echo "0")

if [ "$DRAFTS_INSERTED" -eq 0 ] && [ "$DRAFTS_DRAFTED" -eq 0 ] && [ "$FAILURES" -eq 0 ]; then
  echo "no drafts, no failures — silent exit"
  exit 0
fi

SUMMARY="article-from-highlight: drafted=$DRAFTS_DRAFTED inserted=$DRAFTS_INSERTED failures=$FAILURES. Log: $LATEST_LOG"
/root/.openclaw/bin/openclaw message send --channel telegram --target "$OPS_CHAT" \
  --text "$SUMMARY" 2>&1 || true
echo "$SUMMARY"
exit 0