#!/bin/bash
# scores-ingest-cron.sh — system cron entry point for daily scores ingest.
# 2026-10-16 (Piece E Part 1.1, Arnel 01:16): replace the failing agent-run
# cron (5b6615f2) with a plain system cron. No AI model involved. The detached
# wrapper at /root/.openclaw/workspace/scripts/run-scores-ingest-detached.sh
# handles PID file, log rotation, in-flight reuse, and exits 0/1 based on
# whether the inner script launched.
#
# Log location: /var/log/rinkstop-scores.log (also rotated by the wrapper
# into /root/.openclaw/workspace/logs/scores-ingest.log).
#
# Schedule: 0 7 * * * UTC daily (07:00 UTC, after Euro games finish, before
# US NHL evening games). See /etc/cron.d/rinkstop-scores for the cron entry.
set -u

LOG_DIR="/var/log"
LOG_FILE="$LOG_DIR/rinkstop-scores.log"
mkdir -p "$LOG_DIR"

# Load env (same as the detached wrapper)
ENV_FILE="/root/.openclaw/workspace/rinkstop-platform/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# Delegate to the existing detached wrapper. It returns 0 if started OK, 1 if
# failed to start. We append a "cron envelope" line to the log so Arnel can
# tell the cron-run apart from a manual run.
{
  echo ""
  echo "===== system-cron invocation at $(date -u +%Y-%m-%dT%H:%M:%SZ) ====="
  bash /root/.openclaw/workspace/scripts/run-scores-ingest-detached.sh
  RC=$?
  echo "===== system-cron finished with exit $RC at $(date -u +%Y-%m-%dT%H:%M:%SZ) ====="
  exit $RC
} >> "$LOG_FILE" 2>&1
