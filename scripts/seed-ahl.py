#!/usr/bin/env python3
"""
scripts/seed-ahl.py
Seeds AHL game data from HockeyTech API into Supabase.
"""

import load_secrets
import os, urllib.request, json, time, datetime, uuid, re

SUPABASE_URL  = os.environ['NEXT_PUBLIC_SUPABASE_URL']
ANON_KEY     = os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']
AHL_LEAGUE_ID = 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611'
SEASON       = '90'

# HockeyTech team city name (lowercase) → Supabase team city key (lowercase)
HT_CITY_MAP = {
    'abbotsford':             'abbotsford',
    'bakersfield':            'bakersfield',
    'belleville':             'belleville',
    'bridgeport':              'bridgeport',
    'calgary':               'stockton',         # displaced team
    'charlotte':              'charlotte',
    'chicago':                'rosemont',          # Chicago Wolves (Rosemont, IL)
    'cleveland':              'cleveland',
    'coachella valley':       'palm desert',
    'colorado':               'loveland',
    'grand rapids':           'grand rapids',
    'hartford':               'hartford',
    'hershey':                'hershey',
    'iowa':                   'des moines',
    'laval':                  'laval',
    'lehigh valley':          'allentown',
    'manitoba':               'winnipeg',
    'milwaukee':              'milwaukee',
    'ontario':                'ontario',
    'providence':              'providence',
    'rochester':              'rochester',
    'san diego':              'stockton',         # displaced team
    'san jose':               'san jose',
    'santa clara':            'santa clara',
    'springfield':            'springfield',
    'syracuse':               'syracuse',
    'texas':                  'cedar park',
    'toronto':                'toronto (coca-cola coliseum)',
    'tucson':                 'tucson',
    'utica':                  'utica',
    'wilkes-barre/scranton':  'wilkes-barre',
    'rockford':               'rosemont',          # Rockford IceHogs
    'henderson':              'ontario',            # Henderson Silver Knights
};


def get_team_map():
    headers = {'apikey': ANON_KEY, 'Authorization': f'Bearer {ANON_KEY}'}
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/teams?select=id,name,city&league_id=eq.{AHL_LEAGUE_ID}',
        headers=headers)
    resp = urllib.request.urlopen(req, timeout=10)
    teams = json.loads(resp.read())
    m = {}
    for t in teams:
        c = (t['city'] or '').strip().lower()
        m[c] = t['id']
        simple = c.split('(')[0].strip()
        m[simple] = t['id']
    return m


def parse_date(date_str):
    """Parse 'Thu, Mar 19' → datetime."""
    months = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,
              'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}
    m = re.search(r'(\w+),\s+(\w+)\s+(\d+)', date_str)
    if not m:
        return None
    mon = months.get(m.group(2))
    day = int(m.group(3))
    if mon is None:
        return None
    year = 2024 if mon >= 10 else 2025
    return datetime.datetime(year, mon, day, 19, 0, 0)


def fetch_month(month_num):
    """Fetch AHL schedule for month (1-12)."""
    ms = f'{month_num:02d}'
    url = (
        f'https://lscluster.hockeytech.com/feed/index.php'
        f'?feed=statviewfeed&view=schedule&season={SEASON}&team=-1'
        f'&client_code=ahl&league_id=4&site_id=3'
        f'&key=ccb91f29d6744675&location=homeaway&date=&month={ms}'
    )
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, timeout=15)
    raw = resp.read().decode('utf-8')

    # Response: ([{...}]) — strip outer parens
    stripped = raw.strip()
    if stripped.startswith('(['):
        stripped = stripped[1:]
    if stripped.endswith('])'):
        stripped = stripped[:-1]

    data = json.loads(stripped)
    games = []
    for section in data[0].get('sections', []):
        for row in section.get('data', []):
            r = row.get('row', {})
            if not r.get('game_id'):
                continue
            games.append({
                'game_id':      r['game_id'],
                'date':         r.get('date_with_day'),
                'home':         r.get('home_team_city'),
                'away':         r.get('visiting_team_city'),
                'home_score':   r.get('home_goal_count'),
                'away_score':   r.get('visiting_goal_count'),
                'status':       r.get('game_status'),
            })
    return games


def upsert_fixture(fixture):
    """Insert one fixture via Supabase REST."""
    headers = {
        'apikey': ANON_KEY,
        'Authorization': f'Bearer {ANON_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/fixtures',
        data=json.dumps(fixture).encode(),
        headers=headers,
        method='POST'
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status in (200, 201)
    except urllib.error.HTTPError as e:
        if e.code == 409:
            return None  # already exists, skip
        print(f'  HTTP {e.code}: {e.read()[:200]}')
        return False


def main():
    print('Loading AHL team IDs...')
    team_map = get_team_map()
    print(f'  {len(team_map)} city→team mappings loaded')

    # Build list of (month_num, year) pairs for Oct 2024 – Apr 2025
    months = []
    d = datetime.date(2024, 10, 1)
    end = datetime.date(2025, 4, 30)
    while d <= end:
        months.append((d.month, d.year))
        d = (d.replace(day=28) + datetime.timedelta(days=32)).replace(day=1)

    total_inserted = 0
    total_skipped  = 0
    total_errors   = 0

    for month_num, year in months:
        month_label = f'{year}-{month_num:02d}'
        print(f'\n── {month_label} ──')
        try:
            games = fetch_month(month_num)
            print(f'  {len(games)} games fetched')
        except Exception as e:
            print(f'  Fetch error: {e}')
            continue

        for g in games:
            home_key = HT_CITY_MAP.get((g['home'] or '').lower().strip())
            away_key = HT_CITY_MAP.get((g['away'] or '').lower().strip())

            home_team_id = team_map.get(home_key) if home_key else None
            away_team_id = team_map.get(away_key) if away_key else None

            scheduled = parse_date(g['date'] or '')
            if not scheduled:
                continue

            status_raw = (g['status'] or '').lower()
            status = 'completed' if 'final' in status_raw else 'scheduled'

            fixture = {
                'id':            uuid.uuid4().hex,
                'home_team_id':  home_team_id,
                'away_team_id':  away_team_id,
                'league_id':     AHL_LEAGUE_ID,
                'venue_id':      None,
                'scheduled_at':  scheduled.isoformat(),
                'home_score':    int(g['home_score']) if g['home_score'] else None,
                'away_score':    int(g['away_score']) if g['away_score'] else None,
                'status':        status,
                'season':        '2024-25',
                'game_data': json.dumps({
                    'ahl_game_id': str(g['game_id']),
                    'status':      g['status'],
                    'overtime':    'ot' in status_raw or 'so' in status_raw,
                }),
            }

            result = upsert_fixture(fixture)
            if result is True:
                total_inserted += 1
            elif result is None:
                total_skipped += 1
            else:
                total_errors += 1

        time.sleep(0.3)

    print(f'''
════════════════════════════════════
  AHL seeding complete
  Inserted : {total_inserted}
  Skipped   : {total_skipped}
  Errors    : {total_errors}
════════════════════════════════════''')


if __name__ == '__main__':
    main()