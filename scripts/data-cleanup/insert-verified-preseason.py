#!/usr/bin/env python3
"""
insert-verified-preseason.py

2026-09-14: Reads the verified NHL.com 2026-27 preseason dataset
(data/nhl-preseason-2026-27.json), resolves each (away_team, home_team) pair
against the live `teams` table and each venue against the live `rinks` table,
then POSTs every resolved row as a fixture.

This script is the INSERT half of the cleanup. The shell driver
cleanup-preseason-fixtures.sh handles snapshot + DELETE; this script
is called by it after the window is empty.

Output: emits `inserted_rows=N skipped_rows=N failed_rows=N` on stdout
so the shell driver can grep the result.
"""
import json
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path


def main(cred_file: str, dataset_file: str) -> int:
    cred = json.loads(Path(cred_file).read_text())
    base_url = cred["url"]
    key = cred["serviceRoleKey"]

    ds = json.loads(Path(dataset_file).read_text())
    games = ds["games"]

    # ---- Pull active NHL teams only (32) ----
    # The teams table contains historical (defunct) franchises mixed in.
    # We only want current 32 active teams for the preseason insert.
    print(f"Loading active NHL teams from {base_url} ...", file=sys.stderr)
    team_by_short = {}
    team_by_arena = {}
    team_by_id = {}
    CURRENT_NHL_LEAGUE = "2b5f2b9d-84b9-4edb-8373-a732b72f4e40"
    # The current 32 active franchises by canonical name
    ACTIVE_FRANCHISES = {
        'Anaheim Ducks', 'Boston Bruins', 'Buffalo Sabres', 'Calgary Flames',
        'Carolina Hurricanes', 'Chicago Blackhawks', 'Colorado Avalanche',
        'Columbus Blue Jackets', 'Dallas Stars', 'Detroit Red Wings',
        'Edmonton Oilers', 'Florida Panthers', 'Los Angeles Kings',
        'Minnesota Wild', 'Montréal Canadiens', 'Nashville Predators',
        'New Jersey Devils', 'New York Islanders', 'New York Rangers',
        'Ottawa Senators', 'Philadelphia Flyers', 'Pittsburgh Penguins',
        'San Jose Sharks', 'Seattle Kraken', 'St. Louis Blues',
        'Tampa Bay Lightning', 'Toronto Maple Leafs', 'Utah Mammoth',
        'Vancouver Canucks', 'Vegas Golden Knights', 'Washington Capitals',
        'Winnipeg Jets',
    }
    LIMIT = 200
    offset = 0
    while True:
        req = urllib.request.Request(
            f"{base_url}/rest/v1/teams?select=id,name&league_id=eq.{CURRENT_NHL_LEAGUE}&is_active=eq.true&limit={LIMIT}&offset={offset}",
            headers={"apikey": key, "Authorization": f"Bearer {key}"}
        )
        batch = json.loads(urllib.request.urlopen(req, timeout=30).read())
        if not batch:
            break
        for t in batch:
            # Defensive filter: only record if name is in the active set
            if t["name"] not in ACTIVE_FRANCHISES:
                continue
            team_by_id[t["id"]] = t["name"]
            nick = t["name"].split()[-1]
            team_by_short[nick] = t["id"]
            team_by_short[t["name"]] = t["id"]
            if t["name"] == "Montréal Canadiens":
                team_by_short["Montreal Canadiens"] = t["id"]
        if len(batch) < LIMIT:
            break
        offset += LIMIT
    # Aliases for newspaper-abbreviated names that differ from DB canonical
    team_by_short.setdefault("NY Islanders", team_by_short.get("New York Islanders"))
    team_by_short.setdefault("NY Rangers", team_by_short.get("New York Rangers"))
    team_by_short.setdefault("Montreal Canadiens", team_by_short.get("Montréal Canadiens"))
    print(f"  loaded {len(team_by_id)} active NHL teams (with {len(team_by_short)} name aliases)", file=sys.stderr)
    if len(team_by_id) != 32:
        print(f"  WARN: expected 32 active NHL teams, found {len(team_by_id)}", file=sys.stderr)

    # ---- Search rinks for preseason venues ----
    # We'll do substring matching because rink name spellings differ
    # between NHL.com release and rink table entries.
    print(f"Loading rinks from {base_url} ...", file=sys.stderr)
    rinks = []
    offset = 0
    while True:
        req = urllib.request.Request(
            f"{base_url}/rest/v1/rinks?select=id,name,city,province_state,country,slug&limit={LIMIT}&offset={offset}",
            headers={"apikey": key, "Authorization": f"Bearer {key}"}
        )
        batch = json.loads(urllib.request.urlopen(req, timeout=60).read())
        if not batch:
            break
        rinks.extend(batch)
        if len(batch) < LIMIT:
            break
        offset += LIMIT
    print(f"  loaded {len(rinks)} rinks", file=sys.stderr)

    # Build rink lookup: (city_name, state_abbrev) -> rink_id, plus by venue name
    rink_by_location = {}
    rink_by_name = {}
    rink_by_city_name = {}
    for r in rinks:
        city = (r.get("city") or "").lower()
        state = (r.get("province_state") or "").lower()
        key_loc = (city, state)
        # First-row wins per (city,state); multiple rinks per city skip
        rink_by_location.setdefault(key_loc, r)
        rink_by_name[(r.get("name") or "").lower()] = r
        rink_by_city_name.setdefault(city, []).append(r)

    # ---- Resolve games ----
    NHL_LEAGUE_ID = "2b5f2b9d-84b9-4edb-8373-a732b72f4e40"
    inserted = 0
    skipped = 0
    failed = 0
    skipped_details = []

    for g in games:
        # Resolve team names (DB uses canonical names like "Dallas Stars",
        # "Boston Bruins" — our dataset uses same convention).
        away_id = team_by_short.get(g["away_team"])
        home_id = team_by_short.get(g["home_team"])
        if not away_id:
            # Try short-nick fallback: "Maple Leafs" -> need to look up
            # by city prefix
            for nick, tid in team_by_short.items():
                if nick.startswith(g["away_team"]) or g["away_team"].startswith(nick):
                    away_id = tid
                    break
        if not home_id:
            for nick, tid in team_by_short.items():
                if nick.startswith(g["home_team"]) or g["home_team"].startswith(nick):
                    home_id = tid
                    break
        if not away_id or not home_id:
            skipped += 1
            skipped_details.append(f"no team match: {g['away_team']} @ {g['home_team']}")
            continue

        # Resolve venue
        venue_name = g["venue"]
        city = g["city"]
        state = g["state_or_province"]
        rink_row = None
        # 1. Direct name match (case-insensitive)
        rink_row = rink_by_name.get(venue_name.lower())
        # 2. City+state
        if not rink_row:
            rink_row = rink_by_location.get((city.lower(), state.lower()))
        # 3. City only (last resort)
        if not rink_row:
            city_only = rink_by_city_name.get(city.lower())
            if city_only and len(city_only) == 1:
                rink_row = city_only[0]
        rink_id = rink_row["id"] if rink_row else None

        if not rink_id:
            skipped += 1
            skipped_details.append(f"no rink match: {venue_name} ({city}, {state})")
            continue

        # Build scheduled_at: convert "2026-09-19" + "19:00" ET to ISO
        # ET = -04:00 (EDT in September)
        scheduled_at = f"{g['date']}T{g['start_time_et']}:00-04:00"

        # Build the fixture row
        new_fixture = {
            "scheduled_at": scheduled_at,
            "status": "scheduled",
            "home_team_id": home_id,
            "away_team_id": away_id,
            "league_id": NHL_LEAGUE_ID,
            "venue_id": rink_id,
            "season": "2026-27",
            "home_score": None,
            "away_score": None,
        }

        # POST
        req = urllib.request.Request(
            f"{base_url}/rest/v1/fixtures",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            data=json.dumps(new_fixture).encode(),
            method="POST"
        )
        try:
            urllib.request.urlopen(req, timeout=30).read()
            inserted += 1
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            failed += 1
            print(f"  FAIL: {g['game_id']} {body[:200]}", file=sys.stderr)
        # brief throttle to avoid hammering
        if (inserted + failed) % 25 == 0:
            time.sleep(0.05)

    print(f"inserted_rows={inserted} skipped_rows={skipped} failed_rows={failed}")
    if skipped_details:
        print(f"--- Skipped reasons ---", file=sys.stderr)
        for s in skipped_details[:30]:
            print(f"  {s}", file=sys.stderr)
        if len(skipped_details) > 30:
            print(f"  ... and {len(skipped_details) - 30} more", file=sys.stderr)
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: insert-verified-preseason.py <cred-file> <dataset-file>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
