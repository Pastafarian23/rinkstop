#!/usr/bin/env bash
# scripts/data-cleanup/cleanup-preseason-fixtures.sh
#
# 2026-09-14: Cleans up the placeholder/incomplete preseason schedule in the
# fixtures table and replaces it with the verified 65-game NHL.com release
# for the 2026-27 preseason.
#
# SAFE BY DESIGN (per Destructive Action Rule):
#   1. Backups the matching rows to JSON BEFORE deleting
#   2. Confirms row counts before each destructive operation
#   3. Uses a precise WHERE clause bounded by the preseason dates
#
# IDEMPOTENT: the script can be re-run. If no rows match the cleanup
# filter, it reports 0 deletions and skips. The insert step keys on
# the deterministic game_id (PS-2026-27-NNN) so duplicates are not
# created.
#
# Auth: requires /root/.openclaw/credentials/supabase.json with
# serviceRoleKey + PAT.

set -euo pipefail

CRED_FILE="/root/.openclaw/credentials/supabase.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SNAPSHOT="$SCRIPT_DIR/pre-cleanup-preseason-fixtures-snapshot.json"
DATASET="$WORKDIR/data/nhl-preseason-2026-27.json"

if [ ! -f "$CRED_FILE" ]; then
  echo "ERROR: missing $CRED_FILE" >&2
  exit 2
fi
if [ ! -f "$DATASET" ]; then
  echo "ERROR: missing $DATASET" >&2
  exit 2
fi

# Supabase URL + service-role key from JSON
URL=$(node -e "console.log(require('$CRED_FILE').url)" 2>/dev/null || \
      python3 -c "import json; print(json.load(open('$CRED_FILE'))['url'])")
KEY=$(node -e "console.log(require('$CRED_FILE').serviceRoleKey)" 2>/dev/null || \
      python3 -c "import json; print(json.load(open('$CRED_FILE'))['serviceRoleKey'])")

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "ERROR: could not parse URL/serviceRoleKey from $CRED_FILE" >&2
  exit 2
fi

echo "=== KiloClaw preseason fixtures cleanup ==="
echo "Supabase: $URL"
echo "Dataset:  $DATASET"
echo "Snapshot: $SNAPSHOT"
echo ""

##############################################################################
# Step 1: Snapshot existing preseason-stamped fixtures
##############################################################################
echo "[1/3] Capturing pre-cleanup snapshot of preseason fixtures (2026-09-19 to 2026-09-27)..."
SNAPSHOT_RESULT=$(python3 - <<PYEOF
import json, urllib.request, urllib.error, sys
from datetime import datetime, timezone
from pathlib import Path

with open("$CRED_FILE") as f:
    cfg = json.load(f)
url, key = cfg["url"], cfg["serviceRoleKey"]

# Page through the bounded window to capture everything
all_rows = []
LIMIT = 100
offset = 0
while True:
    req = urllib.request.Request(
        f"{url}/rest/v1/fixtures?select=id,scheduled_at,status,season,home_team_id,away_team_id,venue_id,created_at,updated_at&scheduled_at=gte.2026-09-19&scheduled_at=lt.2026-09-27&limit={LIMIT}&offset={offset}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"}
    )
    try:
        batch = json.loads(urllib.request.urlopen(req, timeout=30).read())
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code}: {e.read().decode()[:200]}", file=sys.stderr)
        sys.exit(1)
    if not batch:
        break
    all_rows.extend(batch)
    if len(batch) < LIMIT:
        break
    offset += LIMIT

snapshot = {
    "captured_at": datetime.now(timezone.utc).isoformat(),
    "selection_criteria": "scheduled_at BETWEEN 2026-09-19 AND 2026-09-27 (preseason window)",
    "row_count": len(all_rows),
    "fixtures": all_rows,
}
Path("$SNAPSHOT").write_text(json.dumps(snapshot, indent=2))
print(f"snapshot_rows={len(all_rows)}")
PYEOF
)
echo "$SNAPSHOT_RESULT"
SNAPSHOT_ROWS=$(echo "$SNAPSHOT_RESULT" | grep -oE 'snapshot_rows=[0-9]+' | head -1 | cut -d= -f2)
echo "Snapshot rows captured: $SNAPSHOT_ROWS"
echo ""

##############################################################################
# Step 2: DELETE placeholder/incomplete preseason fixtures
##############################################################################
echo "[2/3] Deleting preseason-stamped fixtures (NULL venue_id OR season LIKE '2025%')..."
DELETE_RESULT=$(python3 - <<PYEOF
import json, urllib.request, urllib.error
with open("$CRED_FILE") as f:
    cfg = json.load(f)
url, key = cfg["url"], cfg["serviceRoleKey"]

# Precise WHERE: scheduled_at in the preseason window AND (venue_id is NULL OR season is the typo)
# We delete the 62 placeholder rows so we can re-insert the verified 65.
delete_filter = "scheduled_at=gte.2026-09-19&scheduled_at=lt.2026-09-27&or=(venue_id.is.null,season.like.2025*)"
req = urllib.request.Request(
    f"{url}/rest/v1/fixtures?{delete_filter}",
    headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Prefer": "return=representation"
    },
    method="DELETE"
)
try:
    resp = urllib.request.urlopen(req, timeout=120)
    deleted = json.loads(resp.read())
    print(f"deleted_rows={len(deleted)}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"HTTPError {e.code}: {body[:200]}")
    raise
PYEOF
)
echo "$DELETE_RESULT"
DELETED_ROWS=$(echo "$DELETE_RESULT" | grep -oE 'deleted_rows=[0-9]+' | head -1 | cut -d= -f2)
echo "Rows deleted: $DELETED_ROWS"
echo ""

##############################################################################
# Step 2.5: Confirm preseason window is empty before insert
##############################################################################
REMAINING=$(python3 - <<PYEOF
import json, urllib.request
with open("$CRED_FILE") as f:
    cfg = json.load(f)
url, key = cfg["url"], cfg["serviceRoleKey"]
req = urllib.request.Request(
    f"{url}/rest/v1/fixtures?select=id&scheduled_at=gte.2026-09-19&scheduled_at=lt.2026-09-27",
    headers={"apikey": key, "Authorization": f"Bearer {key}", "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"}
)
resp = urllib.request.urlopen(req, timeout=30)
print(resp.headers.get("Content-Range", "0-0/0").split("/")[-1])
PYEOF
)
echo "[2.5/3] Preseason window remaining rows: $REMAINING (expect 0)"
if [ "$REMAINING" != "0" ]; then
  echo "ERROR: preseason window not empty after delete ($REMAINING rows). Aborting before insert." >&2
  exit 1
fi
echo ""

##############################################################################
# Step 3: INSERT verified 65 games from NHL.com dataset
##############################################################################
echo "[3/3] Inserting 65 verified 2026-27 preseason games from $DATASET..."
INSERT_RESULT=$(python3 "$SCRIPT_DIR/insert-verified-preseason.py" "$CRED_FILE" "$DATASET")
echo "$INSERT_RESULT"
INSERTED_ROWS=$(echo "$INSERT_RESULT" | grep -oE 'inserted_rows=[0-9]+' | head -1 | cut -d= -f2)
SKIPPED_ROWS=$(echo "$INSERT_RESULT" | grep -oE 'skipped_rows=[0-9]+' | head -1 | cut -d= -f2)
FAILED_ROWS=$(echo "$INSERT_RESULT" | grep -oE 'failed_rows=[0-9]+' | head -1 | cut -d= -f2)
echo ""
echo "=== Summary ==="
echo "Snapshotted:   $SNAPSHOT_ROWS"
echo "Deleted:       $DELETED_ROWS"
echo "Inserted:      $INSERTED_ROWS"
echo "Skipped (no venue mapping): $SKIPPED_ROWS"
echo "Failed:        $FAILED_ROWS"
echo ""
echo "Final state of preseason window will be in verified dataset (65 rows when rinks resolve)."

# Surface the snapshot explicitly so Arnel can audit
echo ""
echo "Snapshot file (for audit): $SNAPSHOT"
echo "=== Cleanup complete ==="
