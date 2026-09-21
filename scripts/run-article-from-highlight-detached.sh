#!/usr/bin/env bash
# run-article-from-highlight-detached.sh
#
# Detached wrapper for the article-from-highlight orchestrator.
#
# Spawns scripts/article-from-highlight/orchestrate.mjs with --auto so it
# finds candidate highlights, fetches YouTube transcripts (the LLM fact
# source), and drafts new articles into posts with status='draft' (the
# audit pipeline promotes them to 'published' once verified).
#
# Why detached: the orchestrator spawns `kilo run --auto` internally
# for the LLM step, which can take 2-5 min per highlight. The cron's
# exec call has a 300s timeout, but individual articles can take longer
# when the LLM is slow. Same pattern as run-rewrite-archived-detached.sh.
#
# Usage:
#   ./run-article-from-highlight-detached.sh              # dry-run (no drafts)
#   ./run-article-from-highlight-detached.sh --execute    # actually draft
#   ./run-article-from-highlight-detached.sh --since=168  # custom window (hours)
#
# Default since-hours is 168 (7 days) — wider than the 24h the previous
# cron used, so 2-7 day-old highlights get covered. Adjust --since=N
# to widen further.
#
# Writes:
#   /root/.openclaw/workspace/rinkstop-platform/logs/article-from-highlight/afh-${TS}.log
#   /root/.openclaw/workspace/rinkstop-platform/logs/article-from-highlight/afh-latest.log  (symlink)
#   /tmp/article-from-highlight.pid

set -u

# Pre-flight dependency check (2026-09-20 safeguard):
# The article-from-highlight pipeline silently broke twice when
# youtube-transcript-api was uninstalled (system Python reinstalls wipe
# site-packages; the orchestrator thought the script was OK because
# python3 exit code 0 was returned with ok:false JSON, which it logged as
# "skip"). Hard-fail the wrapper if the tier-1 or tier-2 transcript source
# is unavailable, instead of spawning a 10-min detached run that produces
# zero drafts and reports "ok".
DEP_FAIL=0
python3 -c 'import youtube_transcript_api' 2>/dev/null || { echo 'FATAL: youtube-transcript-api not importable. Install with: pip install --break-system-packages -r scripts/article-from-highlight/requirements.txt'; DEP_FAIL=1; }
python3 -c 'import yt_dlp' 2>/dev/null || { echo 'FATAL: yt-dlp not importable. Install with: pip install --break-system-packages -r scripts/article-from-highlight/requirements.txt'; DEP_FAIL=1; }
if [ "$DEP_FAIL" = "1" ]; then
  # Write a clear marker so the cron agent can surface it in Telegram.
  mkdir -p /root/.openclaw/workspace/rinkstop-platform/logs/article-from-highlight
  TS_FAIL="$(date -u +%Y%m%dT%H%M%SZ)"
  echo 'article-from-highlight wrapper aborted: missing Python dependencies. Install scripts/article-from-highlight/requirements.txt and re-run.' > "/root/.openclaw/workspace/rinkstop-platform/logs/article-from-highlight/afh-${TS_FAIL}.log"
  ln -sfn "/root/.openclaw/workspace/rinkstop-platform/logs/article-from-highlight/afh-${TS_FAIL}.log" /root/.openclaw/workspace/rinkstop-platform/logs/article-from-highlight/afh-latest.log
  exit 2
fi

MODE_FLAG="${1:-}"
# Extract --since=N if present, default 168 (7 days)
SINCE_HOURS=168
for arg in "$@"; do
  case "$arg" in
    --since=*) SINCE_HOURS="${arg#--since=}" ;;
  esac
done

TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="/root/.openclaw/workspace/rinkstop-platform/logs/article-from-highlight"
LOG_FILE="$LOG_DIR/afh-${TS}.log"
LATEST_LOG="$LOG_DIR/afh-latest.log"
PID_FILE="/tmp/article-from-highlight.pid"

mkdir -p "$LOG_DIR"

# Reuse an in-flight run — don't double-spawn
if [ -f "$PID_FILE" ]; then
  EXISTING_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$EXISTING_PID" ] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "article-from-highlight already running (PID $EXISTING_PID, log: $LATEST_LOG)"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# Symlink "latest" for the cron agent to pick up
ln -sfn "$LOG_FILE" "$LATEST_LOG"

cd /root/.openclaw/workspace/rinkstop-platform

# Spawn fully detached. The orchestrator takes --auto, --limit, --since-hours
# and optionally --dry-run / --skip-llm. --limit defaults to 3 highlights
# per run; for a backfill, pass --limit=20 to process more.
setsid nohup bash -c "
  echo '=== Article-from-highlight orchestrator ==='
  echo 'mode=${MODE_FLAG:-dry-run}  since-hours=${SINCE_HOURS}'
  node scripts/article-from-highlight/orchestrate.mjs --auto --since-hours=${SINCE_HOURS} --limit=20 --use-web-recap ${MODE_FLAG} 2>&1
  echo '=== Done ==='
" > "$LOG_FILE" 2>&1 </dev/null &
PID=$!
disown "$PID" 2>/dev/null || true
echo "$PID" > "$PID_FILE"

# Give node a moment to actually start so the PID is valid
sleep 1
if ! kill -0 "$PID" 2>/dev/null; then
  echo "article-from-highlight failed to start — see $LOG_FILE" >&2
  rm -f "$PID_FILE"
  exit 1
fi

echo "article-from-highlight started pid=$PID mode=${MODE_FLAG:-dry-run} since-hours=${SINCE_HOURS}"
echo "log: $LOG_FILE"
exit 0
