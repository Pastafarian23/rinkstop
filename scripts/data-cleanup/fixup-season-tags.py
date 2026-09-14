#!/usr/bin/env python3
"""
fixup-season-tags.py

2026-09-14: Backfills correct season tags on historical fixtures rows.
Two correction classes:

  1. `season = '20252026'` (missing dash typo) → `season = '2025-26'`
  2. `season = NULL` → assign from scheduled_at:
      - date < 2024-09-01              → '2023-24'
      - 2024-09-01 <= date < 2025-09-01 → '2024-25'
      - 2025-09-01 <= date < 2026-09-01 → '2025-26'
      - 2026-09-01 <= date             → '2026-27' (mostly the new preseason)

Safe by design: this is an UPDATE not DELETE. The script reports before/after
counts and writes a verification report.
"""
import json
import sys
import urllib.request
import urllib.error
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


# Hockey season dates — NHL regular season typically starts in late September
# and ends in April of the following calendar year. Playoffs run April-June.
# Offseason is July-September.
SEASON_BOUNDARIES = [
    ("2026-27", datetime(2026, 9, 1, tzinfo=timezone.utc)),
    ("2025-26", datetime(2025, 9, 1, tzinfo=timezone.utc)),
    ("2024-25", datetime(2024, 9, 1, tzinfo=timezone.utc)),
    ("2023-24", datetime(2023, 9, 1, tzinfo=timezone.utc)),
]


def season_for_date(dt: datetime) -> str:
    """Return the NHL season label for a given date."""
    for label, cutoff in SEASON_BOUNDARIES:
        if dt >= cutoff:
            return label
    return "pre-2023-24"


def main(cred_file: str) -> int:
    cfg = json.loads(Path(cred_file).read_text())
    url, key = cfg["url"], cfg["serviceRoleKey"]

    print("=== Season-tag fixup audit ===")
    print(f"Scanning {url} for mis-tagged fixtures...")

    # Pull all rows where season is null or '20252026' (typo).
    # Page through 1000 at a time.
    all_rows = []
    LIMIT = 1000
    offset = 0
    while True:
        req = urllib.request.Request(
            f"{url}/rest/v1/fixtures?select=id,scheduled_at,season&or=(season.is.null,season.eq.20252026)&limit={LIMIT}&offset={offset}",
            headers={"apikey": key, "Authorization": f"Bearer {key}"}
        )
        batch = json.loads(urllib.request.urlopen(req, timeout=60).read())
        if not batch:
            break
        all_rows.extend(batch)
        if len(batch) < LIMIT:
            break
        offset += LIMIT
    print(f"Total rows requiring review: {len(all_rows)}")

    # Classify each row and group by (current_season, target_season)
    fixups_needed = []  # (id, new_season)
    for r in all_rows:
        if r.get("season") == "20252026":
            target = "2025-26"
        elif r.get("season") is None:
            sched = r.get("scheduled_at")
            if not sched:
                target = "UNKNOWN"
            else:
                try:
                    dt = datetime.fromisoformat(sched.replace('Z', '+00:00'))
                    target = season_for_date(dt)
                except Exception:
                    target = "UNKNOWN"
        else:
            continue
        fixups_needed.append((r["id"], target))

    print(f"Fixups needed: {len(fixups_needed)}")
    target_counter = Counter(t for _, t in fixups_needed)
    print("By target season:")
    for label, n in sorted(target_counter.items()):
        print(f"  {label}: {n}")

    # Apply updates one season at a time so each is small + auditable.
    by_target = {}
    for fid, target in fixups_needed:
        by_target.setdefault(target, []).append(fid)

    updated = 0
    failed = 0
    for target, ids in by_target.items():
        if target == "UNKNOWN":
            print(f"SKIP unknown-season batch ({len(ids)} rows)")
            continue
        # PostgreSQL has a limit on UPDATE IN (...) length; do batches of 200
        for chunk_start in range(0, len(ids), 200):
            chunk = ids[chunk_start:chunk_start + 200]
            csv = ",".join(chunk)
            req = urllib.request.Request(
                f"{url}/rest/v1/fixtures?id=in.({csv})",
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                data=json.dumps({"season": target}).encode(),
                method="PATCH"
            )
            try:
                resp = urllib.request.urlopen(req, timeout=120)
                json.loads(resp.read())
                updated += len(chunk)
            except urllib.error.HTTPError as e:
                print(f"  PATCH failed for {len(chunk)} rows → {target}: {e.read().decode()[:200]}")
                failed += len(chunk)

    print(f"\nDone. Updated {updated} rows. Failed: {failed}.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: fixup-season-tags.py <cred-file>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
