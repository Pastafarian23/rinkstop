#!/usr/bin/env bash
# run-needs-review-digest-detached.sh
#
# Detached wrapper for needs-review-digest.mjs.
# Same pattern as run-fact-audit-detached.sh / run-rewrite-archived-detached.sh:
#   - cron agent turn kicks this off
#   - script returns ~1s later (the digest runs independently)
#   - digest posts directly to Telegram (no result file needed)
#
# Cron: 8am America/Chicago (after 4am fact-audit and 7am rewrite-architect).

set -u

TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="/root/.openclaw/workspace/rinkstop-platform/logs/needs-review-digest"
LOG_FILE="$LOG_DIR/digest-${TS}.log"
LATEST_LOG="$LOG_DIR/digest-latest.log"
PID_FILE="/tmp/needs-review-digest.pid"

mkdir -p "$LOG_DIR"

# Reuse an in-flight run — don't double-spawn
if [ -f "$PID_FILE" ]; then
  EXISTING_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$EXISTING_PID" ] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "needs-review-digest already running (PID $EXISTING_PID)"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

ln -sfn "$LOG_FILE" "$LATEST_LOG"

cd /root/.openclaw/workspace/rinkstop-platform

# Load .env so SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are set
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

setsid nohup \
  node scripts/article-from-highlight/needs-review-digest.mjs "$@" \
  > "$LOG_FILE" 2>&1 </dev/null &
PID=$!
disown "$PID" 2>/dev/null || true
echo "$PID" > "$PID_FILE"

# Give node a moment to actually start so the PID is valid.
# The script is short (single Supabase count + optional Telegram post).
# We don't wait for completion — the agent turn needs to return in ~1s.
sleep 1
if kill -0 "$PID" 2>/dev/null; then
  echo "needs-review-digest started pid=$PID"
elif ! wait "$PID" 2>/dev/null && [ ! -f "$LOG_FILE" ]; then
  echo "needs-review-digest failed to start — see $LOG_FILE" >&2
  rm -f "$PID_FILE"
  exit 1
else
  # Process finished already (script is short). Log file is the source of truth.
  echo "needs-review-digest completed (was pid=$PID); see $LOG_FILE"
fi
echo "log: $LOG_FILE"
exit 0
