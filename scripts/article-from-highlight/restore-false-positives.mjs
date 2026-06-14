// Restore the 24 false-positive archived articles (article score was correct,
// audit picked the wrong game due to ±1 day window). Sets status back to 'published'.
import { readFileSync, existsSync } from 'fs';
const ENV_FILE = '/root/.openclaw/workspace/rinkstop-platform/.env';
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const execute = process.argv.includes('--execute');

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NHL_TEAMS = {
  'Anaheim Ducks':'ANA','Ducks':'ANA','Boston Bruins':'BOS','Bruins':'BOS',
  'Buffalo Sabres':'BUF','Sabres':'BUF','Calgary Flames':'CGY','Flames':'CGY',
  'Carolina Hurricanes':'CAR','Hurricanes':'CAR','Chicago Blackhawks':'CHI','Blackhawks':'CHI',
  'Colorado Avalanche':'COL','Avalanche':'COL','Columbus Blue Jackets':'CBJ','Blue Jackets':'CBJ',
  'Dallas Stars':'DAL','Stars':'DAL','Detroit Red Wings':'DET','Red Wings':'DET',
  'Edmonton Oilers':'EDM','Oilers':'EDM','Florida Panthers':'FLA','Panthers':'FLA',
  'Los Angeles Kings':'LAK','Kings':'LAK','Minnesota Wild':'MIN','Wild':'MIN',
  'Montreal Canadiens':'MTL','Canadiens':'MTL','Montréal Canadiens':'MTL','Canadiens':'MTL',
  'Nashville Predators':'NSH','Predators':'NSH','New Jersey Devils':'NJD','Devils':'NJD',
  'New York Islanders':'NYI','Islanders':'NYI','New York Rangers':'NYR','Rangers':'NYR',
  'Ottawa Senators':'OTT','Senators':'OTT','Philadelphia Flyers':'PHI','Flyers':'PHI',
  'Pittsburgh Penguins':'PIT','Penguins':'PIT','San Jose Sharks':'SJS','Sharks':'SJS',
  'Seattle Kraken':'SEA','Kraken':'SEA','St. Louis Blues':'STL','Blues':'STL',
  'St Louis Blues':'STL','Tampa Bay Lightning':'TBL','Lightning':'TBL',
  'Toronto Maple Leafs':'TOR','Maple Leafs':'TOR','Utah Mammoth':'UTA','Mammoth':'UTA',
  'Vancouver Canucks':'VAN','Canucks':'VAN','Vegas Golden Knights':'VGK','Golden Knights':'VGK',
  'Washington Capitals':'WSH','Capitals':'WSH','Winnipeg Jets':'WPG','Jets':'WPG',
};

function teamsToAbbrev(teams) {
  const abbrevs = new Set();
  for (const t of teams) {
    const noThe = t.replace(/^the\s+/i, '').trim();
    if (NHL_TEAMS[noThe]) abbrevs.add(NHL_TEAMS[noThe]);
    const last = noThe.split(/\s+/).pop();
    if (NHL_TEAMS[last]) abbrevs.add(NHL_TEAMS[last]);
  }
  return abbrevs;
}

async function fetchJSON(url, timeoutMs = 8000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function getNhlGameOnDate(homeAbbr, awayAbbr, date) {
  const j = await fetchJSON(`https://api-web.nhle.com/v1/schedule/${date}`);
  if (!j) return null;
  for (const day of (j.gameWeek || [])) {
    if (day.date !== date) continue;
    for (const g of (day.games || [])) {
      if ((g.homeTeam?.abbrev === homeAbbr && g.awayTeam?.abbrev === awayAbbr) ||
          (g.homeTeam?.abbrev === awayAbbr && g.awayTeam?.abbrev === homeAbbr)) {
        return {
          home: g.homeTeam?.abbrev,
          away: g.awayTeam?.abbrev,
          homeScore: g.homeTeam?.score,
          awayScore: g.awayTeam?.score,
        };
      }
    }
  }
  return null;
}

const { data: arch } = await sb.from('posts')
  .select('id, title, highlight_id')
  .eq('status', 'archived')
  .not('highlight_id', 'is', null)
  .order('updated_at', { ascending: false });

const { data: hls } = await sb.from('highlight_backups')
  .select('id, home_team_name, away_team_name, match_date, league_name')
  .in('id', arch.map(a => a.highlight_id).filter(Boolean));
const hlMap = new Map((hls || []).map(h => [h.id, h]));

const toRestore = [];
for (const p of arch) {
  const h = hlMap.get(p.highlight_id);
  if (!h) continue;
  const titleMatch = p.title.match(/(\d+)[-–](\d+)/);
  if (!titleMatch) continue;
  const homeAbbr = NHL_TEAMS[h.home_team_name] || NHL_TEAMS[h.home_team_name?.split(/\s+/).pop()];
  const awayAbbr = NHL_TEAMS[h.away_team_name] || NHL_TEAMS[h.away_team_name?.split(/\s+/).pop()];
  if (!homeAbbr || !awayAbbr) continue;
  const d0 = new Date((h.match_date || '').slice(0, 10) + 'T00:00:00Z');
  const dates = [];
  for (let off = -1; off <= 1; off++) {
    const d = new Date(d0);
    d.setUTCDate(d0.getUTCDate() + off);
    dates.push(d.toISOString().slice(0, 10));
  }
  let game = null;
  for (const d of dates) {
    game = await getNhlGameOnDate(homeAbbr, awayAbbr, d);
    if (game) break;
  }
  if (!game) continue;
  const gameScore = `${game.awayScore}-${game.homeScore}`;
  const titleScore = `${titleMatch[1]}-${titleMatch[2]}`;
  const matches = (gameScore === titleScore) || (`${game.homeScore}-${game.awayScore}` === titleScore);
  if (matches) {
    toRestore.push({ id: p.id, title: p.title, titleScore, gameScore });
  }
}

console.log(`\n=== Restore plan ===`);
console.log(`Articles to restore (false positives): ${toRestore.length}`);
for (const r of toRestore) {
  console.log(`  ${r.title} | title=${r.titleScore} | nhl=${r.gameScore}`);
}

if (execute) {
  console.log(`\nRestoring ${toRestore.length} articles...`);
  for (const r of toRestore) {
    const { error } = await sb.from('posts').update({ status: 'published' }).eq('id', r.id);
    if (error) console.log(`  ERROR: ${r.title} - ${error.message}`);
    else console.log(`  ✓ ${r.title}`);
  }
  console.log(`\nDone. ${toRestore.length} articles restored.`);
} else {
  console.log(`\nDRY RUN. Run with --execute to actually restore.`);
}
