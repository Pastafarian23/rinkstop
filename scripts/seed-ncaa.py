#!/usr/bin/env python3
"""Seed NCAA Division 1 teams and arenas from Wikipedia data."""
import load_secrets
import json, re, urllib.request, time
import os

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']

def api(path, method="GET", data=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json")
    if data:
        req.data = json.dumps(data, ensure_ascii=False).encode("utf-8")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            if resp.status in (200, 201):
                return json.loads(body) if body else {"_created": True}
            return {"error": f"HTTP {resp.status}"}
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}"}

def slugify(text):
    if not text: return ""
    import unicodedata
    normalized = unicodedata.normalize('NFD', text)
    ascii_str = ''.join(c for c in normalized if not unicodedata.combining(c))
    ascii_str = ascii_str.replace('œ', 'oe').replace('Œ', 'OE')
    ascii_str = re.sub(r"[^a-z0-9]+", "-", ascii_str.lower())
    return re.sub(r"-+", "-", ascii_str).strip("-")

NCAA_TEAMS = [
    {"name": "University of Denver", "city": "Denver", "state": "CO", "arena": "Ball Arena", "conf": "NCHC"},
    {"name": "University of North Dakota", "city": "Grand Forks", "state": "ND", "arena": "Ralph Engelstad Arena", "conf": "NCHC"},
    {"name": "University of Minnesota Duluth", "city": "Duluth", "state": "MN", "arena": "Amsoil Arena", "conf": "NCHC"},
    {"name": "St. Cloud State University", "city": "St. Cloud", "state": "MN", "arena": "Herb Brooks National Hockey Center", "conf": "NCHC"},
    {"name": "Colorado College", "city": "Colorado Springs", "state": "CO", "arena": "Ed Robson Arena", "conf": "NCHC"},
    {"name": "University of Nebraska Omaha", "city": "Omaha", "state": "NE", "arena": "Baxter Arena", "conf": "NCHC"},
    {"name": "Miami University", "city": "Oxford", "state": "OH", "arena": "Steve Cady Arena", "conf": "NCHC"},
    {"name": "Western Michigan University", "city": "Kalamazoo", "state": "MI", "arena": "Lawson Arena", "conf": "NCHC"},
    {"name": "Arizona State University", "city": "Tempe", "state": "AZ", "arena": "Mullett Arena", "conf": "NCHC"},
    {"name": "University of Minnesota", "city": "Minneapolis", "state": "MN", "arena": "Mariucci Arena", "conf": "Big Ten"},
    {"name": "University of Wisconsin", "city": "Madison", "state": "WI", "arena": "Kohl Center", "conf": "Big Ten"},
    {"name": "University of Michigan", "city": "Ann Arbor", "state": "MI", "arena": "Yost Ice Arena", "conf": "Big Ten"},
    {"name": "Michigan State University", "city": "East Lansing", "state": "MI", "arena": "Munn Ice Arena", "conf": "Big Ten"},
    {"name": "Ohio State University", "city": "Columbus", "state": "OH", "arena": "Value City Arena", "conf": "Big Ten"},
    {"name": "Pennsylvania State University", "city": "University Park", "state": "PA", "arena": "Pegula Ice Arena", "conf": "Big Ten"},
    {"name": "University of Notre Dame", "city": "South Bend", "state": "IN", "arena": "Compton Family Ice Arena", "conf": "Big Ten"},
    {"name": "Boston College", "city": "Chestnut Hill", "state": "MA", "arena": "Conte Forum", "conf": "Hockey East"},
    {"name": "Boston University", "city": "Boston", "state": "MA", "arena": "Walter Brown Arena", "conf": "Hockey East"},
    {"name": "University of Maine", "city": "Orono", "state": "ME", "arena": "Cross Insurance Arena", "conf": "Hockey East"},
    {"name": "Northeastern University", "city": "Boston", "state": "MA", "arena": "Matthews Arena", "conf": "Hockey East"},
    {"name": "University of Massachusetts Amherst", "city": "Amherst", "state": "MA", "arena": "Mullins Center", "conf": "Hockey East"},
    {"name": "University of Massachusetts Lowell", "city": "Lowell", "state": "MA", "arena": "JFK Coliseum", "conf": "Hockey East"},
    {"name": "Providence College", "city": "Providence", "state": "RI", "arena": "Friedman Arena", "conf": "Hockey East"},
    {"name": "University of Connecticut", "city": "Storrs", "state": "CT", "arena": "Mark Freitas Ice Forum", "conf": "Hockey East"},
    {"name": "University of New Hampshire", "city": "Durham", "state": "NH", "arena": "Whittemore Center Arena", "conf": "Hockey East"},
    {"name": "Merrimack College", "city": "North Andover", "state": "MA", "arena": "Jacks Abby Ice Arena", "conf": "Hockey East"},
    {"name": "Quinnipiac University", "city": "Hamden", "state": "CT", "arena": "M&T Bank Arena", "conf": "ECAC"},
    {"name": "Clarkson University", "city": "Potsdam", "state": "NY", "arena": "Cheel Arena", "conf": "ECAC"},
    {"name": "Colgate University", "city": "Hamilton", "state": "NY", "arena": "Class of 1965 Arena", "conf": "ECAC"},
    {"name": "Cornell University", "city": "Ithaca", "state": "NY", "arena": "Lynah Rink", "conf": "ECAC"},
    {"name": "Dartmouth College", "city": "Hanover", "state": "NH", "arena": "Thompson Arena", "conf": "ECAC"},
    {"name": "Harvard University", "city": "Cambridge", "state": "MA", "arena": "Bright-Landry Hockey Center", "conf": "ECAC"},
    {"name": "Princeton University", "city": "Princeton", "state": "NJ", "arena": "Baker Rink", "conf": "ECAC"},
    {"name": "Union College", "city": "Schenectady", "state": "NY", "arena": "Frank B. W. 'Bill' Arcade Arena", "conf": "ECAC"},
    {"name": "Yale University", "city": "New Haven", "state": "CT", "arena": "Ingalls Rink", "conf": "ECAC"},
    {"name": "Brown University", "city": "Providence", "state": "RI", "arena": "Meehan Auditorium", "conf": "ECAC"},
    {"name": "Rensselaer Polytechnic Institute", "city": "Troy", "state": "NY", "arena": "Houston Field House", "conf": "ECAC"},
    {"name": "St. Lawrence University", "city": "Canton", "state": "NY", "arena": "Marty Hoffman Arena", "conf": "ECAC"},
    {"name": "Minnesota State University", "city": "Mankato", "state": "MN", "arena": "Mayo Clinic Health System Event Center", "conf": "CCHA"},
    {"name": "Bowling Green State University", "city": "Bowling Green", "state": "OH", "arena": "Bowling Green State Ice Arena", "conf": "CCHA"},
    {"name": "Ferris State University", "city": "Big Rapids", "state": "MI", "arena": "Ewigleben Arena", "conf": "CCHA"},
    {"name": "University of Alaska Fairbanks", "city": "Fairbanks", "state": "AK", "arena": "Carlson Center", "conf": "CCHA"},
    {"name": "Lake Superior State University", "city": "Sault Ste. Marie", "state": "MI", "arena": "Taffy Abel Arena", "conf": "CCHA"},
    {"name": "Northern Michigan University", "city": "Marquette", "state": "MI", "arena": "Berry Events Center", "conf": "CCHA"},
    {"name": "Bemidji State University", "city": "Bemidji", "state": "MN", "arena": "Sanford Center", "conf": "CCHA"},
    {"name": "St. Thomas University", "city": "Minneapolis", "state": "MN", "arena": "St. Thomas Ice Arena", "conf": "CCHA"},
    {"name": "Augustana University", "city": "Sioux Falls", "state": "SD", "arena": "Eliasek Arena", "conf": "CCHA"},
    {"name": "Air Force Academy", "city": "Colorado Springs", "state": "CO", "arena": "Cadet Ice Arena", "conf": "AHA"},
    {"name": "American International College", "city": "Springfield", "state": "MA", "arena": "Olympia Ice Arena", "conf": "AHA"},
    {"name": "Army West Point", "city": "West Point", "state": "NY", "arena": "MacLean Hall", "conf": "AHA"},
    {"name": "Bentley University", "city": "Waltham", "state": "MA", "arena": "Bentley Arena", "conf": "AHA"},
    {"name": "Canisius College", "city": "Buffalo", "state": "NY", "arena": "Koessler Athletic Center", "conf": "AHA"},
    {"name": "College of the Holy Cross", "city": "Worcester", "state": "MA", "arena": "Hart Center", "conf": "AHA"},
    {"name": "Mercyhurst University", "city": "Erie", "state": "PA", "arena": "Mercyhurst Ice Center", "conf": "AHA"},
    {"name": "Niagara University", "city": "Lewiston", "state": "NY", "arena": "Hockey House", "conf": "AHA"},
    {"name": "Robert Morris University", "city": "Pittsburgh", "state": "PA", "arena": "Island Sports Center", "conf": "AHA"},
    {"name": "RIT", "city": "Rochester", "state": "NY", "arena": "Gene Polisseni Center", "conf": "AHA"},
    {"name": "Sacred Heart University", "city": "Fairfield", "state": "CT", "arena": "Marty McGowan Arena", "conf": "AHA"},
]

def main():
    result = api("leagues?slug=eq.ncaa-division-1-hockey&select=id")
    if isinstance(result, list) and len(result) > 0:
        league_id = result[0]["id"]
        print(f"NCAA League exists: {league_id}")
    else:
        result = api("leagues", method="POST", data={
            "name": "NCAA Division 1 Men's Hockey",
            "slug": "ncaa-division-1-hockey",
            "level": "amateur",
            "country": "United States",
        })
        if "id" in result:
            league_id = result["id"]
            print(f"NCAA League created: {league_id}")
        else:
            result2 = api("leagues?slug=eq.ncaa-division-1-hockey&select=id")
            if isinstance(result2, list) and len(result2) > 0:
                league_id = result2[0]["id"]
            else:
                print(f"FAILED to create NCAA league: {result}")
                return

    arenas_cache = {}
    existing = api("rinks?select=id,name&limit=500")
    if isinstance(existing, list):
        for a in existing:
            arenas_cache[a["name"]] = a["id"]

    seen = {}
    for t in NCAA_TEAMS:
        if t["name"] not in seen:
            seen[t["name"]] = t
    teams_list = list(seen.values())

    teams_created = 0
    arenas_created = 0
    for team in teams_list:
        team_slug = slugify(team["name"])
        existing = api(f"teams?slug=eq.{team_slug}&select=id")
        if isinstance(existing, list) and len(existing) > 0:
            print(f"  TEAM EXISTS: {team['name']}")
        else:
            result = api("teams", method="POST", data={
                "name": team["name"], "slug": team_slug, "league_id": league_id,
                "city": team["city"], "country": "United States", "division": team["conf"],
            })
            if "_created" in result or "id" in result:
                teams_created += 1
                print(f"  TEAM CREATED: {team['name']} ({team['conf']})")
            else:
                print(f"  TEAM ERROR: {team['name']}: {result}")

        arena_name = team["arena"].strip()
        if not arena_name:
            continue
        arena_slug = slugify(arena_name)
        if arena_name in arenas_cache:
            pass
        else:
            result = api("rinks", method="POST", data={
                "name": arena_name, "slug": arena_slug,
                "city": team["city"], "province_state": team["state"], "country": "United States",
            })
            if "_created" in result or "id" in result:
                arenas_created += 1
                arenas_cache[arena_name] = result.get("id", "created")
                print(f"    ARENA CREATED: {arena_name}")
            else:
                e2 = api(f"rinks?slug=eq.{arena_slug}&select=id")
                if isinstance(e2, list) and len(e2) > 0:
                    arenas_cache[arena_name] = e2[0]["id"]

        time.sleep(0.05)

    print(f"\nDone: {teams_created} teams, {arenas_created} arenas created")

if __name__ == "__main__":
    main()