/**
 * Backfill NCAAH (NCAA Division I hockey) games from Highlightly.
 * NCAA is on the same endpoint as NHL (nhl.highlightly.net with league=NCAAH).
 *
 * Same fill-gaps-only logic as backfill-nhl-highlightly.js.
 *
 * Run: node scripts/backfill-ncaah-highlightly.js [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SB_KEY = '***REMOVED***';
const supabase = createClient(SUPABASE_URL, SB_KEY);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const API_KEY = '***REMOVED***';
const API_HOST = 'nhl-ncaah-api.p.rapidapi.com';
const API_BASE = 'https://nhl.highlightly.net';

// NCAA Division 1 Hockey league ID (verified in DB)
const NCAAH_LEAGUE_ID = '498c6b36-a83a-4e81-9829-a2f9ca3a03f8';

const args = process.argv.slice(2);
const fromArg = args.find(a => a.startsWith('--from='))?.split('=')[1] || '2024-10-01';
const toArg = args.find(a => a.startsWith('--to='))?.split('=')[1] || '2026-06-30';
const dryRun = args.includes('--dry-run');
const logFile = args.find(a => a.startsWith('--log='))?.split('=')[1];
if (logFile) fs.writeFileSync(logFile, `=== NCAAH backfill started ${new Date().toISOString()} ===\n`);
function log(m) { console.log(m); if (logFile) fs.appendFileSync(logFile, m + '\n'); }

async function fetchHl(date) {
  const r = await fetch(`${API_BASE}/matches?date=${date}&league=NCAAH&limit=100`, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST,
      'User-Agent': UA,
    }
  });
  if (!r.ok) return [];
  const j = await r.json();
  // Filter to only NCAA games (endpoint returns mixed NCAA + NHL games)
  return (j.data || []).filter(g => g.league === 'NCAA');
}

function parseScore(scoreStr) {
  if (!scoreStr) return [null, null];
  const parts = scoreStr.split(' - ').map(s => parseInt(s.trim(), 10));
  if (parts.length !== 2 || parts.some(isNaN)) return [null, null];
  return parts;
}

function dateRange(start, end) {
  const days = [];
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

// Known aliases (Highlightly mascot name -> our DB name)
const ALIASES = {
  // Long forms
  'UMass Lowell': 'University of Massachusetts Lowell',
  'UMass': 'University of Massachusetts Amherst',
  'Penn State': 'Pennsylvania State University',
  'UConn': 'University of Connecticut',
  'Miami (OH)': 'Miami University',
  'Lindenwood': 'Lindenwood University',
  'Stonehill': 'Stonehill College',
  'Long Island': 'Long Island University',
  'Augustana': 'Augustana University',
  'St. Thomas': 'St. Thomas University',
  'St. Cloud State': 'St. Cloud State University',
  'St. Lawrence': 'St. Lawrence University',
  'St. Bonaventure': 'St. Bonaventure University',
  "St. John's": "St. John's University",
  'RPI': 'Rensselaer Polytechnic Institute',
  'BC': 'Boston College',
  'BU': 'Boston University',
  'Maine': 'University of Maine',
  'Air Force': 'Air Force Academy',
  
  // Mascot-only forms (Highlightly often returns just the mascot)
  'Black Knights': 'Army West Point',
  'Crusaders': 'College of the Holy Cross',
  'Big Red': 'Cornell University',
  'Raiders': 'Colgate University',
  'River Hawks': 'University of Massachusetts Lowell',
  'Black Bears': 'University of Maine',
  'Crimson': 'Harvard University',
  'Golden Knights': 'Clarkson University',
  'Tigers': 'Princeton University',
  'Pioneers': 'University of Denver',
  'Fighting Hawks': 'University of North Dakota',
  'Mavericks': 'Minnesota State Mavericks',
  'Falcons': 'Air Force Academy',
  'Minutemen': 'University of Massachusetts Amherst',
  'Terriers': 'Boston University',
  'Bears': 'Brown University',
  'Bobcats': 'Quinnipiac University',
  'Big Green': 'Dartmouth College',
  'Dutchmen': 'Union College',
  'Huskies': 'Northeastern University',
  'Eagles': 'Boston College',
  'Friars': 'Providence College',
  'Engineers': 'Rensselaer Polytechnic Institute',
  'RedHawks': 'Miami University',
  'Red Hawks': 'Miami University',
  'Wildcats': 'University of New Hampshire',
  'Saints': 'St. Lawrence University',
  'Spartans': 'Michigan State University',
  'Wolverines': 'University of Michigan',
  'Buckeyes': 'Ohio State University',
  'Badgers': 'University of Wisconsin',
  'Gophers': 'University of Minnesota',
  'Bulldogs': 'University of Minnesota Duluth',
  'Huskies': 'Michigan Tech',
  'Lakers': 'Lake Superior State University',
  'Beavers': 'Bemidji State University',
  'Mavericks': 'Minnesota State Mavericks',
  'Sun Devils': 'Arizona State University',
  'Lions': 'Penn State Nittany Lions',
  'Nittany Lions': 'Pennsylvania State University',
  'Catamounts': 'University of Vermont',
  'Seawolves': 'Stony Brook University',
  'Warriors': 'Merrimack College',
  'Wolves': 'Northern Michigan University',
  'Titan': 'American International College',
  'Yellow Jackets': 'American International College',
  'Rangers': 'Colgate University',
  'Crimson': 'Harvard University',
  'Canton': 'SUNY Canton',
  'Mammoths': 'Amherst College',
  'Fighting Irish': 'University of Notre Dame',
  'Tommies': 'St. Thomas University',
  'Catamounts': 'Vermont',
  'Golden Griffins': 'Canisius',
  'Vermont Catamounts': 'Vermont',
  'Colonials': 'American International College',
  'Stonehill': 'Stonehill',
};

async function main() {
  const days = dateRange(fromArg, toArg);
  log(`\nNCAAH backfill: ${fromArg} to ${toArg} (${days.length} days)`);
  log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  
  // Build team_id -> name map
  const { data: teams } = await supabase.from('teams').select('id, name').eq('league_id', NCAAH_LEAGUE_ID);
  const nameToId = new Map();
  for (const t of teams || []) {
    const norm = t.name.toLowerCase()
      .replace(/[''`]/g, '')
      .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, ' ').trim();
    nameToId.set(norm, t.id);
  }
  for (const [alias, realName] of Object.entries(ALIASES)) {
    for (const t of teams || []) {
      if (t.name === realName) {
        const normAlias = alias.toLowerCase()
          .replace(/[''`]/g, '')
          .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/ç/g, 'c')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, ' ').trim();
        nameToId.set(normAlias, t.id);
        break;
      }
    }
  }
  log(`Loaded ${teams?.length || 0} teams from DB (with ${Object.keys(ALIASES).length} aliases)`);
  
  let totalHl = 0, dIns = 0, dUpd = 0, dPres = 0, dSkip = 0, dOrphan = 0;
  
  for (const date of days) {
    const hlGames = await fetchHl(date);
    if (hlGames.length === 0) continue;
    totalHl += hlGames.length;
    process.stdout.write(`  ${date}: ${hlGames.length} games  `);
    
    let ddIns = 0, ddUpd = 0, ddPres = 0, ddSkip = 0, ddOrphan = 0;
    
    for (const g of hlGames) {
      const homeName = g.homeTeam?.name || g.homeTeam?.displayName;
      const awayName = g.awayTeam?.name || g.awayTeam?.displayName;
      const normHome = (homeName || '').toLowerCase()
        .replace(/[''`]/g, '')
        .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, ' ').trim();
      const normAway = (awayName || '').toLowerCase()
        .replace(/[''`]/g, '')
        .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, ' ').trim();
      const homeId = nameToId.get(normHome);
      const awayId = nameToId.get(normAway);
      
      if (!homeId || !awayId) {
        let fuzzyH = null, fuzzyA = null;
        for (const [n, id] of nameToId) {
          if (n.includes(normHome) || normHome.includes(n)) fuzzyH = id;
          if (n.includes(normAway) || normAway.includes(n)) fuzzyA = id;
        }
        if (fuzzyH && fuzzyA) {
          const r = await processGame(g, fuzzyH, fuzzyA, dryRun);
          ddIns += r.ins; ddUpd += r.upd; ddPres += r.pres; ddSkip += r.skip;
          continue;
        }
        log(`\n    [orphan] ${awayName} @ ${homeName}`);
        ddOrphan++;
        continue;
      }
      
      const r = await processGame(g, homeId, awayId, dryRun);
      ddIns += r.ins; ddUpd += r.upd; ddPres += r.pres; ddSkip += r.skip;
    }
    
    dIns += ddIns; dUpd += ddUpd; dPres += ddPres; dSkip += ddSkip; dOrphan += ddOrphan;
    log(`(+${ddIns} new, ↻${ddUpd} upd, =${ddPres} preserved, ✗${ddSkip} skip, ?${ddOrphan} orphan)`);
    await new Promise(r => setTimeout(r, 100));
  }
  
  log(`\n--- NCAAH Summary ---`);
  log(`Total Highlightly games: ${totalHl}`);
  log(`Inserted: ${dIns}, Updated: ${dUpd}, Preserved: ${dPres}, Skipped: ${dSkip}, Orphan: ${dOrphan}`);
}

async function processGame(g, homeId, awayId, dryRun) {
  const scheduled = g.date;
  const [homeScore, awayScore] = parseScore(g.state?.score?.current);
  const status = g.state?.description === 'Finished' ? 'completed' : 'scheduled';
  
  const { data: existingList } = await supabase
    .from('fixtures')
    .select('id, home_score, away_score, status')
    .eq('league_id', NCAAH_LEAGUE_ID)
    .eq('scheduled_at', scheduled)
    .eq('home_team_id', homeId)
    .eq('away_team_id', awayId)
    .limit(1);
  const existing = existingList?.[0];
  
  if (existing) {
    const upd = {};
    if (existing.home_score === null && homeScore !== null) upd.home_score = homeScore;
    if (existing.away_score === null && awayScore !== null) upd.away_score = awayScore;
    if (existing.status === 'scheduled' && status === 'completed') upd.status = 'completed';
    if (Object.keys(upd).length === 0) return { ins: 0, upd: 0, pres: 1, skip: 0 };
    if (dryRun) return { ins: 0, upd: 1, pres: 0, skip: 0 };
    upd.updated_at = new Date().toISOString();
    const { error } = await supabase.from('fixtures').update(upd).eq('id', existing.id);
    if (error) return { ins: 0, upd: 0, pres: 0, skip: 1 };
    return { ins: 0, upd: 1, pres: 0, skip: 0 };
  } else {
    if (dryRun) return { ins: 1, upd: 0, pres: 0, skip: 0 };
    const { error } = await supabase.from('fixtures').insert({
      id: crypto.randomUUID(),
      league_id: NCAAH_LEAGUE_ID,
      home_team_id: homeId,
      away_team_id: awayId,
      scheduled_at: scheduled,
      home_score: homeScore,
      away_score: awayScore,
      status,
      game_data: g,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) return { ins: 0, upd: 0, pres: 0, skip: 1 };
    return { ins: 1, upd: 0, pres: 0, skip: 0 };
  }
}

main().catch(e => { console.error(e); process.exit(1); });
