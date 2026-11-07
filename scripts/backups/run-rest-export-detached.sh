#!/usr/bin/env bash
# scripts/backups/run-rest-export-detached.sh
#
# Fire-and-forget wrapper around rest-export.sh.
# Spawns the export fully detached (setsid + nohup, stdin closed) so the
# process reparents to init (PPID 1) and survives the calling turn ending.
# Bails if a backup is already running so two fires can never overlap on
# the same output directory.
#
# Operational signal is unchanged: rest-export.sh logs its own
# "Backup complete:" line and size to /var/log/rinkstop-backup.log.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
EXPORT_SCRIPT="${SCRIPT_DIR}/rest-export.sh"
LOG_FILE="/var/log/rinkstop-backup.log"
PID_FILE="/root/.openclaw/backups/rinkstop/.export.pid"

mkdir -p "$(dirname "${PID_FILE}")"

# --- Bail if a backup is already running ---
if [ -f "${PID_FILE}" ]; then
  EXISTING_PID="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [ -n "${EXISTING_PID}" ] && kill -0 "${EXISTING_PID}" 2>/dev/null; then
    echo "backup already running (PID ${EXISTING_PID})"
    exit 0
  fi
  rm -f "${PID_FILE}"
fi

# Second guard: match on the running process list.
RUNNING_PID="$(pgrep -f 'bash .*scripts/backups/rest-export\.sh' | head -1 || true)"
if [ -n "${RUNNING_PID}" ]; then
  echo "backup already running (PID ${RUNNING_PID})"
  exit 0
fi

touch "${LOG_FILE}" 2>/dev/null || true

# --- Spawn fully detached ---
setsid nohup bash "${EXPORT_SCRIPT}" >> "${LOG_FILE}" 2>&1 < /dev/null &
NEW_PID=$!
echo "${NEW_PID}" > "${PID_FILE}"

sleep 1
if ! kill -0 "${NEW_PID}" 2>/dev/null; then
  echo "backup failed to launch (PID ${NEW_PID} exited immediately)"
  rm -f "${PID_FILE}"
  exit 1
fi

echo "backup launched: PID=${NEW_PID}"
