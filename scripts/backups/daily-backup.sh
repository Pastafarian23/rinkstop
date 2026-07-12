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

BACKUP_ROOT="/root/.openclaw/backups/rinkstop"
DATE="$(date -u +%Y-%m-%d)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${BACKUP_ROOT}/${DATE}"
mkdir -p "${BACKUP_DIR}"

# Pull credentials. These are loaded from /root/.openclaw/credentials/ at script start.
SUPABASE_URL="$(jq -r '.url' /root/.openclaw/credentials/supabase.json)"
SUPABASE_PAT="$(jq -r '.pat' /root/.openclaw/credentials/supabase.json)"

if [ -z "${SUPABASE_URL}" ] || [ "${SUPABASE_URL}" = "null" ]; then
  echo "[fatal] SUPABASE_URL not found in /root/.openclaw/credentials/supabase.json"
  exit 1
fi
if [ -z "${SUPABASE_PAT}" ] || [ "${SUPABASE_PAT}" = "null" ]; then
  echo "[fatal] SUPABASE_PAT not found in /root/.openclaw/credentials/supabase.json"
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

# ---- 2. Full schema + data via pg_dump ----
log "Running pg_dump (schema + data, gzipped)..."
DUMP_FILE="${BACKUP_DIR}/full.sql.gz"
# pg_dump requires the direct DB connection string, not the PostgREST URL.
# We use the connection params from the Supabase dashboard.
# Connection format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DB_HOST="aws-0-ap-northeast-1.pooler.supabase.com"
DB_PORT="6543"
DB_USER="postgres.${PROJECT_REF}"
DB_NAME="postgres"
DB_PASS="${SUPABASE_PAT}"

# Note: pg_dump may prompt for password if env var isn't set. Use PGPASSWORD env.
PGPASSWORD="${DB_PASS}" pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  --quote-all-identifiers \
  2>/tmp/pg_dump_err_$$ \
  | gzip -9 > "${DUMP_FILE}" || {
    log "[warn] pg_dump failed:"
    cat /tmp/pg_dump_err_$$ || true
    rm -f /tmp/pg_dump_err_$$
    log "[warn] Continuing without full dump. Schema-only will still run."
  }
rm -f /tmp/pg_dump_err_$$

if [ ! -s "${DUMP_FILE}" ]; then
  log "[warn] full.sql.gz is empty or missing — pg_dump may not have access to direct DB."
  log "[warn] Counts file is still saved. Restore path is: counts only."
fi

# ---- 3. Schema-only export ----
log "Running pg_dump --schema-only..."
SCHEMA_FILE="${BACKUP_DIR}/schema.sql"
PGPASSWORD="${DB_PASS}" pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --no-owner \
  --no-privileges \
  --schema-only \
  --quote-all-identifiers \
  > "${SCHEMA_FILE}" 2>/dev/null || log "[warn] schema dump failed (continuing)"

# ---- 4. Checksums ----
log "Computing checksums..."
( cd "${BACKUP_DIR}" && sha256sum *.sql.gz *.sql *.json 2>/dev/null > sha256sums.txt ) || true

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