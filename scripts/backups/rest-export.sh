#!/usr/bin/env bash
# scripts/backups/rest-export.sh
#
# Daily backup via Supabase REST API + Management API.
# Works on Free plan (no pg_dump needed, no direct DB connection required).
#
# What it backs up:
#   - Schema dump via Management API
#   - Row counts via PostgREST count=exact
#   - Full data export of every critical table via PostgREST (JSON, gzipped)
#
# What it skips (Free plan limitations):
#   - pg_dump cannot run without the DB password, which is set in dashboard
#   - PITR is unavailable on Free plan
#
# Restore path: from a row JSON file, use PostgREST POST with auth header.
# Or use the schema dump + psql to a local Postgres.
#
# Cron: 0 5 * * * /root/.openclaw/workspace/rinkstop-platform/scripts/backups/rest-export.sh >> /var/log/rinkstop-backup.log 2>&1

set -euo pipefail

BACKUP_ROOT="/root/.openclaw/backups/rinkstop"
DATE="$(date -u +%Y-%m-%d)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${BACKUP_ROOT}/${DATE}"
mkdir -p "${BACKUP_DIR}"

# Load credentials.
CRED_FILE="/root/.openclaw/credentials/supabase.json"
SUPABASE_URL="$(jq -r '.url' "${CRED_FILE}")"
SERVICE_KEY="$(jq -r '.serviceRoleKey' "${CRED_FILE}")"
PAT="$(jq -r '.pat' "${CRED_FILE}")"

if [ -z "${SUPABASE_URL}" ] || [ -z "${SERVICE_KEY}" ]; then
  echo "[fatal] supabase.json missing required fields"
  exit 1
fi

log() { echo "[$(date -u +%H:%M:%SZ)] $*"; }

log "REST export backup start: ${BACKUP_DIR}"

# ---- 1. Schema dump via Management API ----
log "Fetching schema via Management API..."
SCHEMA_FILE="${BACKUP_DIR}/schema.sql"
SCHEMA_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query" \
  -H "Authorization: Bearer ${PAT}" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT '\''-- schema dump generated at ${TIMESTAMP}'\'' AS banner; SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='\''public'\'' ORDER BY table_name, ordinal_position;"}')
echo "${SCHEMA_RESP}" > "${SCHEMA_FILE}" 2>/dev/null || true

# ---- 2. Table list ----
log "Fetching list of public tables..."
TABLES=$(curl -s -X POST "https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query" \
  -H "Authorization: Bearer ${PAT}" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT table_name FROM information_schema.tables WHERE table_schema='\''public'\'' AND table_type='\''BASE TABLE'\'' ORDER BY table_name;"}' \
  | jq -r '.[] | .table_name')
TABLES_ARR=( $TABLES )
log "Found ${#TABLES_ARR[@]} tables"

# ---- 3. Per-table: row count + JSON dump ----
COUNTS_FILE="${BACKUP_DIR}/counts.json"
COUNTS_JSON="{\"date\":\"${DATE}\",\"timestamp\":\"${TIMESTAMP}\",\"tables\":{"
FIRST=1
DATA_DIR="${BACKUP_DIR}/data"
mkdir -p "${DATA_DIR}"

for table in "${TABLES_ARR[@]}"; do
  if [ $FIRST -eq 0 ]; then COUNTS_JSON+=","; fi
  FIRST=0

  # Row count via PostgREST.
  COUNT=$(curl -s -o /dev/null -D - \
    "${SUPABASE_URL}/rest/v1/${table}?select=id&limit=0" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Prefer: count=exact" \
    | grep -i '^content-range:' | tail -1 | sed 's/.*\///' | tr -d '\r' || echo 0)
  if [ -z "${COUNT}" ] || ! [[ "${COUNT}" =~ ^[0-9]+$ ]]; then
    COUNT=0
  fi
  COUNTS_JSON+="\"${table}\":${COUNT}"

  # Full data export. PostgREST caps at 1000 rows per request; paginate.
  if [ "${COUNT}" -gt 0 ]; then
    DATA_FILE="${DATA_DIR}/${table}.json"
    : > "${DATA_FILE}"
    OFFSET=0
    PAGE_SIZE=1000
    TOTAL_FETCHED=0

    # 2026-10-23 (disk-full incident): select=* on admin_audit_log produced a
    # 4GB file. That table holds 140k rows whose `diff` column stores the full
    # before/after JSON of edited post bodies — measured at 29-122KB per row.
    # The 100k-row cap was NOT enough: 100k x ~29KB is still ~3GB, which filled
    # the 25G host disk and killed the backup mid-run (and left the rest of the
    # scheduled jobs failing behind it).
    #
    # The audit log is a diagnostic, not business-critical data. We keep every
    # row's identity/action metadata but drop the oversized `diff` payload.
    # Restoring a row's exact before/after body is not something the backup
    # has ever been used for; the `admin_audit_log` rows themselves remain
    # queryable in the live database.
    SELECT_COLS="*"
    case "${table}" in
      admin_audit_log)
        SELECT_COLS="id,actor_user_id,actor_email,actor_role,action,entity_type,entity_id,entity_name,ip_address,user_agent,created_at"
        log "[info] ${table}: excluding the 'diff' column (it averages ~29-122KB/row and produced a 4GB export)"
        ;;
    esac

    # Hard cap on any single table's export file, as a last-resort guard so a
    # future table with an unexpectedly large row can never fill the disk.
    MAX_TABLE_BYTES=$((512 * 1024 * 1024))

    while true; do
      PAGE=$(curl -s "${SUPABASE_URL}/rest/v1/${table}?select=${SELECT_COLS}&offset=${OFFSET}&limit=${PAGE_SIZE}" \
        -H "apikey: ${SERVICE_KEY}" \
        -H "Authorization: Bearer ${SERVICE_KEY}")
      # Detect empty page.
      PAGE_LEN=$(echo "${PAGE}" | jq 'length' 2>/dev/null || echo 0)
      if [ "${PAGE_LEN}" -eq 0 ]; then break; fi
      # Every page goes to the SAME append-only JSONL sidecar. An earlier version
      # wrote offset 0 to ${DATA_FILE} and later pages to ${DATA_FILE}.jsonl,
      # then converted the sidecar over ${DATA_FILE} — which silently DISCARDED
      # the first page. The signature was exact: every multi-page table was
      # missing exactly 1,000 rows (rinks 1919->919, players 6352->5352), while
      # single-page tables (leagues 298, profiles 19) were correct.
      echo "${PAGE}" | jq -c '.[]' >> "${DATA_FILE}.jsonl"
      TOTAL_FETCHED=$((TOTAL_FETCHED + PAGE_LEN))
      if [ "${TOTAL_FETCHED}" -ge "${COUNT}" ]; then break; fi
      OFFSET=$((OFFSET + PAGE_SIZE))
      if [ "${OFFSET}" -gt 100000 ]; then
        log "[warn] ${table} export exceeded 100k rows, capping (exported ${TOTAL_FETCHED} of ${COUNT})"
        break
      fi
      # 2026-10-23 (disk-full incident): last-resort guard. If a table's export
      # grows past MAX_TABLE_BYTES, stop writing it and remove the partial
      # files so it can never fill the disk. A missing table is a recoverable
      # backup gap; a full disk takes down every other scheduled job on the host.
      #
      # The row count for this table stays in COUNTS_JSON as the REAL count — the
      # table exists and still has that many rows; we just did not copy its
      # (too large) payload to disk. That way the daily row-count diff still
      # reports accurately.
      FILE_BYTES=0
      if [ -f "${DATA_FILE}" ]; then
        FILE_BYTES=$(wc -c < "${DATA_FILE}")
      fi
      if [ -f "${DATA_FILE}.jsonl" ]; then
        JSONL_BYTES=$(wc -c < "${DATA_FILE}.jsonl")
        if [ "${JSONL_BYTES}" -gt "${FILE_BYTES}" ]; then FILE_BYTES="${JSONL_BYTES}"; fi
      fi
      if [ "${FILE_BYTES}" -gt "${MAX_TABLE_BYTES}" ]; then
        log "[alert] ${table} export exceeded ${MAX_TABLE_BYTES} bytes (${FILE_BYTES}); aborting this table to protect the disk"
        rm -f "${DATA_FILE}" "${DATA_FILE}.jsonl"
        break
      fi
    done

    # Convert the JSONL sidecar (if any pages were appended) into a single JSON
    # array, then remove the sidecar. A table that fit on a single page has no
    # sidecar and its .json file is already a valid array.
    if [ -f "${DATA_FILE}.jsonl" ]; then
      jq -s '.' "${DATA_FILE}.jsonl" > "${DATA_FILE}.tmp" \
        && mv "${DATA_FILE}.tmp" "${DATA_FILE}" \
        && rm -f "${DATA_FILE}.jsonl"
      if [ ! -f "${DATA_FILE}" ]; then
        log "[alert] ${table}: failed to assemble JSON array from page data; skipping this table"
        rm -f "${DATA_FILE}.tmp" "${DATA_FILE}.jsonl"
      fi
    fi

    if [ -f "${DATA_FILE}" ]; then
      gzip -9 -f "${DATA_FILE}"
    fi
  fi
done

COUNTS_JSON+="}}"
echo "${COUNTS_JSON}" | jq '.' > "${COUNTS_FILE}"

# ---- 4. Checksums ----
log "Computing checksums..."
( cd "${BACKUP_DIR}" && find . -type f \( -name '*.json' -o -name '*.sql' -o -name '*.gz' \) -exec sha256sum {} \; > sha256sums.txt )

# ---- 5. Compare to yesterday ----
log "Comparing row counts to previous backup..."
YESTERDAY_DIR="${BACKUP_ROOT}/$(date -u -d 'yesterday' +%Y-%m-%d)"
if [ -f "${YESTERDAY_DIR}/counts.json" ]; then
  DIFF_OUTPUT=$(diff <(jq -S '.tables' "${YESTERDAY_DIR}/counts.json") \
                   <(jq -S '.tables' "${COUNTS_FILE}") || true)
  if [ -n "${DIFF_OUTPUT}" ]; then
    log "[alert] Row count changes:"
    echo "${DIFF_OUTPUT}" > "${BACKUP_DIR}/row-count-diff.txt"
    cat "${BACKUP_DIR}/row-count-diff.txt"
  else
    log "No row count changes."
  fi
fi

# ---- 6. Retention 30 days ----
find "${BACKUP_ROOT}" -maxdepth 1 -type d -name '20??-??-??' -mtime +30 -exec rm -rf {} \; 2>/dev/null || true

log "Backup complete: ${BACKUP_DIR}"
du -sh "${BACKUP_DIR}"
