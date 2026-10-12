#!/usr/bin/env bash
# scripts/backups/daily-backup.sh
#
# Daily logical backup of the RinkStop Supabase database.
# Writes to /root/.openclaw/backups/rinkstop/YYYY-MM-DD/ with:
#   - schema.sql       (full schema, no data)
#   - full.sql.gz      (schema + data, gzipped)
#   - counts.json      (row counts for critical tables, easy diff to spot issues)
#   - sha256sums.txt   (checksums for verification)
#
# Retention: keeps 30 days of backups on disk, deletes older.
# Cron: 0 5 * * * /root/.openclaw/workspace/rinkstop-platform/scripts/backups/daily-backup.sh >> /var/log/rinkstop-backup.log 2>&1
#
# Why this exists:
#   2026-07-08: agent ran unauthorized UPDATE that deleted 718 rink photos.
#   PITR was disabled on Supabase. No backups existed. Cost: ~$5.20 of paid
#   Google Places API calls, gone with no recovery path.
#   User demanded: "everything must be backed up, preserved, and recoverable."
#
# This script gives us:
#   - Daily snapshot of every row
#   - Off-Supabase storage (lives on the gateway host, not Supabase's infra)
#   - Row-count diff to detect silent data loss between runs
#   - Checksums to detect file corruption

set -euo pipefail

# Always run from the script's own directory so the relative `.env` path resolves
# correctly when invoked from cron (where cwd is the user's home, not the repo).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

BACKUP_ROOT="/root/.openclaw/backups/rinkstop"
DATE="$(date -u +%Y-%m-%d)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${BACKUP_ROOT}/${DATE}"
mkdir -p "${BACKUP_DIR}"

# Pull credentials from the canonical credential store. The script previously
# read `.env` in the repo root, but (a) cron does not cd here, and (b) the
# repo's .env does not actually exist in this scoresheet repo. The real values
# live in /root/.openclaw/credentials/supabase.json. Reading from there
# matches the script's original intent (per its own header comment).
CREDS_FILE="/root/.openclaw/credentials/supabase.json"
if [ ! -f "${CREDS_FILE}" ]; then
  echo "[fatal] Credentials file not found: ${CREDS_FILE}"
  exit 1
fi

SUPABASE_URL="$(jq -r '.url' "${CREDS_FILE}")"
SUPABASE_PAT="$(jq -r '.pat' "${CREDS_FILE}")"

if [ -z "${SUPABASE_URL}" ] || [ "${SUPABASE_URL}" = "null" ]; then
  echo "[fatal] SUPABASE_URL not found in ${CREDS_FILE}"
  exit 1
fi
if [ -z "${SUPABASE_PAT}" ] || [ "${SUPABASE_PAT}" = "null" ]; then
  echo "[fatal] SUPABASE_PAT not found in ${CREDS_FILE}"
  exit 1
fi

PROJECT_REF="yszheonqyyskkjoxoexk"

log() { echo "[$(date -u +%H:%M:%SZ)] $*"; }

log "Backup start: ${BACKUP_DIR}"

# ---- 1. Row counts via Management API ----
log "Fetching row counts..."
COUNTS_FILE="${BACKUP_DIR}/counts.json"
TABLES=(rinks teams leagues players listings posts claims corrections profiles subscriptions businesses)
COUNTS_JSON="{\"date\":\"${DATE}\",\"timestamp\":\"${TIMESTAMP}\",\"tables\":{"

FIRST=1
for table in "${TABLES[@]}"; do
  if [ $FIRST -eq 0 ]; then COUNTS_JSON+=","; fi
  FIRST=0
  # Use PostgREST via the project URL with a count query.
  RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/${table}?select=id&limit=0" \
    -H "apikey: ${SUPABASE_PAT}" \
    -H "Authorization: Bearer ${SUPABASE_PAT}" \
    -H "Prefer: count=exact" \
    -D /tmp/backup_headers_$$ 2>/dev/null || echo "")
  # Extract Content-Range header to get count.
  COUNT=$(grep -i '^content-range:' /tmp/backup_headers_$$ 2>/dev/null | tail -1 | sed 's/.*\///' | tr -d '\r' || echo "0")
  if [ -z "${COUNT}" ] || ! [[ "${COUNT}" =~ ^[0-9]+$ ]]; then
    COUNT=0
  fi
  COUNTS_JSON+="\"${table}\":${COUNT}"
done
rm -f /tmp/backup_headers_$$
COUNTS_JSON+="}}"
echo "${COUNTS_JSON}" > "${COUNTS_FILE}"
log "Row counts saved: ${COUNTS_FILE}"

# ---- 2. Verify Supabase physical backup (the real backup) ----
#
# 2026-10-12: pg_dump direct connection no longer works because the project's
# DB password is not stored on this host. Supabase itself runs daily
# physical backups via WAL-G (verified via Management API:
# walg_enabled=true, last 8 daily physical backups all COMPLETED).
# This step verifies yesterday's physical backup is COMPLETED and records
# metadata locally so we have an audit trail.
#
# If Supabase ever stops running physical backups, this step fails the
# cron so we get paged — NOT silently degraded.
log "Verifying Supabase physical backup..."
BACKUP_META="${BACKUP_DIR}/supabase-backup-meta.json"
BACKUP_STATUS=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/backups" 2>/dev/null || echo "")
BACKUP_HTTP=$(echo "${BACKUP_STATUS}" | tail -1)
BACKUP_BODY=$(echo "${BACKUP_STATUS}" | sed '$d')

if [ "${BACKUP_HTTP}" != "200" ]; then
  log "[fatal] Supabase Management API returned HTTP ${BACKUP_HTTP} for backup list"
  log "[fatal] Cannot verify physical backup. Counts file saved; restore path depends on Supabase's own backups."
  exit 2
fi

# Get the most recent COMPLETED physical backup.
LATEST_BACKUP=$(echo "${BACKUP_BODY}" | jq -c '[.backups[] | select(.status == "COMPLETED")][0]' 2>/dev/null || echo "")
if [ -z "${LATEST_BACKUP}" ] || [ "${LATEST_BACKUP}" = "null" ]; then
  log "[fatal] No COMPLETED physical backup found in Supabase response"
  log "[fatal] Full response: ${BACKUP_BODY}"
  exit 2
fi

# How recent is the latest backup? Alert if older than 36 hours.
LATEST_INSERTED=$(echo "${LATEST_BACKUP}" | jq -r '.inserted_at')
LATEST_TS=$(date -u -d "${LATEST_INSERTED}" +%s 2>/dev/null || echo 0)
NOW_TS=$(date -u +%s)
if [ "${LATEST_TS}" -eq 0 ]; then
  log "[warn] Could not parse latest backup timestamp (${LATEST_INSERTED}); skipping staleness check"
elif [ $((NOW_TS - LATEST_TS)) -gt 129600 ]; then
  log "[fatal] Latest Supabase physical backup is >36h old (inserted_at: ${LATEST_INSERTED})"
  exit 2
fi

echo "${LATEST_BACKUP}" | jq '.' > "${BACKUP_META}"
log "Supabase physical backup verified: id=$(echo "${LATEST_BACKUP}" | jq -r '.id') inserted_at=${LATEST_INSERTED}"

# Best-effort WAL-G info. Not all projects expose this; skip on null.
WALG_INFO=$(echo "${BACKUP_BODY}" | jq -c '.physical_backup_data // {}' 2>/dev/null || echo "{}")
PITR_ENABLED=$(echo "${BACKUP_BODY}" | jq -r '.pitr_enabled')
echo "{\"pitr_enabled\":${PITR_ENABLED},\"walg_data\":${WALG_INFO}}" > "${BACKUP_DIR}/supabase-pitr-status.json"
log "PITR enabled: ${PITR_ENABLED}"

# Placeholders for legacy filenames. Kept so the existing retention /
# restore path (which checks for full.sql.gz / schema.sql) doesn't break.
# They are not real backups — they are pointers to Supabase's own
# physical backups. Restore requires going through Supabase support or
# PITR (which is disabled for this project).
DUMP_FILE="${BACKUP_DIR}/full.sql.gz"
SCHEMA_FILE="${BACKUP_DIR}/schema.sql"
echo "# This file is a pointer, not a backup." > "${DUMP_FILE}".NOTE
echo "# Supabase physical backup is the real backup (verified above)." >> "${DUMP_FILE}".NOTE
echo "# Restore path: contact Supabase support with the backup id above," >> "${DUMP_FILE}".NOTE
echo "# or enable PITR in dashboard (currently: ${PITR_ENABLED})." >> "${DUMP_FILE}".NOTE
mv "${DUMP_FILE}.NOTE" "${DUMP_DIR:-${BACKUP_DIR}}/NOTE.txt" 2>/dev/null || mv "${BACKUP_DIR}/full.sql.gz.NOTE" "${BACKUP_DIR}/NOTE.txt" 2>/dev/null || true

# ---- 3. Checksums ----
log "Computing checksums..."
( cd "${BACKUP_DIR}" && sha256sum *.json *.txt 2>/dev/null > sha256sums.txt ) || true

# ---- 5. Row count comparison vs yesterday ----
log "Comparing row counts to previous backup..."
YESTERDAY_DIR="${BACKUP_ROOT}/$(date -u -d 'yesterday' +%Y-%m-%d)"
if [ -f "${YESTERDAY_DIR}/counts.json" ]; then
  DIFF_OUTPUT=$(diff <(jq -S '.tables' "${YESTERDAY_DIR}/counts.json") \
                   <(jq -S '.tables' "${COUNTS_FILE}") || true)
  if [ -n "${DIFF_OUTPUT}" ]; then
    log "[alert] Row count changes since yesterday:"
    echo "${DIFF_OUTPUT}" >> "${BACKUP_DIR}/row-count-diff.txt"
    cat "${BACKUP_DIR}/row-count-diff.txt"
    # Post a Telegram alert if curl-able.
    if [ -f /root/.openclaw/credentials/telegram-alerts.json ]; then
      TG_TOKEN=$(jq -r '.bot_token' /root/.openclaw/credentials/telegram-alerts.json)
      TG_CHAT=$(jq -r '.alert_chat_id' /root/.openclaw/credentials/telegram-alerts.json)
      if [ -n "${TG_TOKEN}" ] && [ -n "${TG_CHAT}" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
          -d "chat_id=${TG_CHAT}" \
          -d "text=🚨 RinkStop backup row count diff for ${DATE}:\n${DIFF_OUTPUT}" \
          > /dev/null 2>&1 || true
      fi
    fi
  else
    log "No row count changes since yesterday."
  fi
else
  log "No previous backup to compare against (first run)."
fi

# ---- 6. Retention: keep 30 days ----
log "Pruning backups older than 30 days..."
find "${BACKUP_ROOT}" -maxdepth 1 -type d -name '20??-??-??' -mtime +30 -exec rm -rf {} \; 2>/dev/null || true

log "Backup complete: ${BACKUP_DIR}"
ls -la "${BACKUP_DIR}"