#!/usr/bin/env python3
"""Seed NHL rosters from ESPN API into Supabase players table."""
import json, time, urllib.request

SUPABASE_URL = "https://yszheonqyyskkjoxoexk.supabase.co"
SUPABASE_KEY = "***REMOVED***"  # service role

TEAMS = [
    ("Anaheim Ducks",     "ANA", "219a6bb2-1103-4e27-931e-5de440e59f84"),
    ("Boston Bruins",      "BOS", "ae6d0878-1ac2-4c13-afc8-890c6647b668"),
    ("Buffalo Sabres",     "BUF", "5a510c0e-1058-460d-8237-09855dfa98f4"),
    ("Calgary Flames",     "CGY", "626458da-d2d4-4a4f-816b-f3796b84cfc4"),
    ("Carolina Hurricanes","CAR", "e4977c12-28b3-4756-a788-cf86b40fc237"),
    ("Chicago Blackhawks",  "CHI", "553a6b7b-6416-4b74-a9b3-fa15d06d52ab"),
    ("Colorado Avalanche", "COL", "f453fd29-12e4-4897-8f8a-ecf23d6a4122"),
    ("Columbus Blue Jackets","CLB","6ca5c5f0-3c27-4cd5-8457-78fc3ba45344"),
    ("Dallas Stars",       "DAL", "4c61f05e-8d34-40be-b0a8-adf37e14435c"),
    ("Detroit Red Wings",  "DET", "f3fa0794-ee39-4991-af45-961cb3e8f404"),
    ("Edmonton Oilers",    "EDM", "5b487d74-5e9c-43c8-b104-35185fc93350"),
    ("Florida Panthers",   "FLA", "7772070c-6c9b-4ca0-a442-dfe5b8beabcb"),
    ("Los Angeles Kings",  "LA",   "df9b5d1e-c5d9-46af-a524-99de500e95bf"),
    ("Minnesota Wild",     "MIN", "d3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe"),
    ("Montréal Canadiens", "MTL", "dfa8a4b4-01b9-4f53-9a5d-6ca34302d074"),
    ("Nashville Predators","NSH", "2d3d8a64-c0d7-4b8e-a327-a1201cc92f72"),
    ("New Jersey Devils",  "NJ",   "486e6592-5873-48a0-8cdd-8411c8eb1105"),
    ("New York Islanders", "NYI", "acc8b466-ef9b-4d81-8ea5-6f13fc180d9e"),
    ("New York Rangers",   "NYR", "2869d1cd-d8f4-4ffb-9726-30bdfdbc14d3"),
    ("Ottawa Senators",    "OTT", "a1f8b7f1-f7ea-42ee-9861-0eb0addf437d"),
    ("Philadelphia Flyers", "PHI", "cf53124a-dbb5-4588-9cb2-2f6054918f99"),
    ("Pittsburgh Penguins", "PIT", "4b75202e-b11b-4574-8ae6-7447f962cb55"),
    ("San Jose Sharks",    "SJ",  "16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10"),
    ("Seattle Kraken",     "SEA", "bf324536-424b-4a3d-b486-1347aa735aae"),
    ("St. Louis Blues",     "STL", "7efc04e6-6a75-4b1f-a0da-3966d6e7359c"),
    ("Tampa Bay Lightning", "TB",  "2f4c6364-2139-4e57-97ad-e01dc55418fa"),
    ("Toronto Maple Leafs", "TOR", "bac49d62-fd43-48f5-8811-090ec8f4c76d"),
    ("Utah Hockey Club",   "UTA", "3b80d876-f931-4740-a47f-0ed15c0e410f"),
    ("Vancouver Canucks",   "VAN", "dc828fd7-65ae-4c1d-92ea-66975eb38fce"),
    ("Vegas Golden Knights","VGK", "cf05f5b0-6605-465f-86f3-a6f1710afc20"),
    ("Washington Capitals", "WSH", "2df72ff0-5a54-4663-91eb-13bb2a2830aa"),
    ("Winnipeg Jets",       "WPG", "88d85b2b-7a91-4679-b1d4-e45d73e3838f"),
]

POSITION_MAP = {
    "Centers": "center", "Left Wings": "left_wing", "Right Wings": "right_wing",
    "Defensemen": "defense", "Goalies": "goalie",
}

def insert_players(players):
    """Batch insert players into Supabase."""
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/players",
        data=json.dumps(players).encode(),
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  Insert error: {e}")
        return []

def clear_team_players(team_id):
    """Remove existing players for a team."""
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/players?team_id=eq.{team_id}",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        method="DELETE",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status
    except Exception as e:
        return f"error: {e}"

def fetch_roster(espn_code):
    """Fetch roster from ESPN API."""
    url = f"https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/{espn_code}/roster"
    try:
        with urllib.request.urlopen(urllib.request.Request(url), timeout=15) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  Fetch error for {espn_code}: {e}")
        return {}

def main():
    total_players = 0
    for team_name, espn_code, team_id in TEAMS:
        print(f"\n[{team_name}]")
        resp = fetch_roster(espn_code)
        athletes = resp.get("athletes", [])
        if not athletes:
            print(f"  No roster data")
            continue

        # Clear existing players for this team
        clear_team_players(team_id)

        batch = []
        for group in athletes:
            pos_key = group.get("position", "")
            pos_db = POSITION_MAP.get(pos_key, "forward")
            for a in group.get("items", []):
                dob = a.get("dateOfBirth", "")[:10] if a.get("dateOfBirth") else None
                headshot = None
                links = a.get("links", []) or []
                for link in links:
                    if isinstance(link, dict) and link.get("rel", []) and "playercard" in link.get("rel", []):
                        href = link.get("href", "")
                        headshot = href.replace("{size}", "500x500") if "{size}" in href else href
                        break

                batch.append({
                    "first_name": a.get("firstName", ""),
                    "last_name": a.get("lastName", ""),
                    "position": pos_db,
                    "jersey_number": a.get("jersey") or None,
                    "nationality": a.get("nationality", "") or None,
                    "headshot_url": headshot,
                    "shoots": a.get("battingStats", [{}])[0].get("hand", "") if a.get("battingStats") else None,
                    "height_cm": round(float(a.get("height", 0)) * 2.54) if a.get("height") else None,
                    "weight_kg": round(float(a.get("weight", 0)) * 0.453592) if a.get("weight") else None,
                    "birth_date": dob,
                    "team_id": team_id,
                    "is_active": True,
                })

        if batch:
            inserted = insert_players(batch)
            count = len(inserted) if isinstance(inserted, list) else len(batch)
            print(f"  Inserted {count} players")
            total_players += len(batch)
            time.sleep(1)  # be gentle with the API

    print(f"\n\nDone. Total players seeded: {total_players}")

if __name__ == "__main__":
    main()