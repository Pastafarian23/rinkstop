require('./load-secrets.cjs');
/**
 * Backfill CHL (WHL/OHL/QMJHL) games from Highlightly hockey endpoint.
 * Same fill-gaps-only logic as backfill-nhl-highlightly.js.
 *
 * Uses the hockey.highlightly.net endpoint with host hockey-highlights-api.p.rapidapi.com.
 * League IDs: WHL=4188, OHL=3337, QMJHL=5039
 *
 * Run: node scripts/backfill-chl-highlightly.js [--league=whl|ohl|qmjhl] [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SB_KEY);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const API_KEY = process.env.HIGHLIGHTLY_API_KEY;
const API_HOST = 'hockey-highlights-api.p.rapidapi.com';
const API_BASE = 'https://hockey.highlightly.net';

const LEAGUES = {
  whl:   { id: '46f49db9-e63d-407d-a99c-802f87576ab2', hlId: 4188, name: 'WHL' },
  ohl:   { id: 'd767362d-c13b-4c7a-8c8c-27ec33990882', hlId: 3337, name: 'OHL' },
  qmjhl: { id: 'deb6816a-ccaf-48bf-9f5e-5a7c3387f922', hlId: 5039, name: 'QMJHL' },
};

const args = process.argv.slice(2);
const leagueArg = args.find(a => a.startsWith('--league='))?.split('=')[1];
const fromArg = args.find(a => a.startsWith('--from='))?.split('=')[1] || '2024-09-01';
const toArg = args.find(a => a.startsWith('--to='))?.split('=')[1] || '2026-06-30';
const dryRun = args.includes('--dry-run');
const logFile = args.find(a => a.startsWith('--log='))?.split('=')[1];
if (logFile) fs.writeFileSync(logFile, `=== CHL backfill started ${new Date().toISOString()} ===\n`);
function log(m) { console.log(m); if (logFile) fs.appendFileSync(logFile, m + '\n'); }

const leagueKeys = leagueArg ? [leagueArg] : Object.keys(LEAGUES);

async function fetchHl(date, leagueHlId) {
  const r = await fetch(`${API_BASE}/matches?date=${date}&limit=100`, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST,
      'User-Agent': UA,
    }
  });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.data || []).filter(g => g.league?.id === leagueHlId);
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

async function main() {
  const days = dateRange(fromArg, toArg);
  log(`\nCHL backfill: ${fromArg} to ${toArg} (${days.length} days)`);
  log(`Leagues: ${leagueKeys.join(', ')}`);
  log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

  for (const lk of leagueKeys) {
    const L = LEAGUES[lk];
    if (!L) { log(`Unknown league: ${lk}`); continue; }
    log(`\n=== ${L.name} (${L.id}) ===`);
    
    // Build team_id -> name map (filtered to active teams, excluding U20/U18/national teams for QMJHL)
    let teamQuery = supabase.from('teams').select('id, name').eq('league_id', L.id);
    if (lk === 'qmjhl') {
      // For QMJHL, only use teams without U20/U18 or country names
      teamQuery = teamQuery.not('name', 'ilike', '%U20%').not('name', 'ilike', '%U18%')
        .not('name', 'ilike', '%U17%').not('name', 'ilike', '%Junior%')
        .neq('name', 'Western').neq('name', 'Thunderbirds');
    } else if (lk === 'whl') {
      // Filter out the placeholder "Western" (which is wrong) and "Blain-Bois Brisbane" (misattributed QMJHL)
      teamQuery = teamQuery.neq('name', 'Western').neq('name', 'Blain-Bois Brisbane');
    } else if (lk === 'ohl') {
      // Both Sault Ste. Marie Greyhounds and Soo Greyhounds are in DB - keep both, alias map will handle
      // No filter needed
    }
    const { data: teams } = await teamQuery;
    const idToName = new Map();
    const nameToId = new Map();
    
    // Known aliases (Highlightly name -> our name)
    const aliases = {
      'Soo Greyhounds': 'Sault Ste. Marie Greyhounds',
      'Ottawa 67s': "Ottawa 67's",
      'Chicoutimi Saguenéens': 'Chicoutimi Saguenees',
    };
    
    // Teams to skip in matching (misattributed by Highlightly)
    const skipHlTeams = new Set(['Brampton Beast', 'Blain-Bois Brisbane']);
    
    for (const t of teams || []) {
      idToName.set(t.id, t.name);
      const norm = t.name.toLowerCase()
        .replace(/[''`]/g, '')  // straight + curly apostrophe
        .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s-]/g, '')  // strip any remaining special chars
        .replace(/\s+/g, ' ').trim();
      nameToId.set(norm, t.id);
    }
    for (const [alias, realName] of Object.entries(aliases)) {
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
    log(`  Loaded ${teams?.length || 0} teams from DB (with ${Object.keys(aliases).length} aliases)`);
    
    let totalHl = 0, totalDb = 0, dIns = 0, dUpd = 0, dPres = 0, dSkip = 0, dOrphan = 0;
    
    for (const date of days) {
      const hlGames = await fetchHl(date, L.hlId);
      if (hlGames.length === 0) continue;
      totalHl += hlGames.length;
      process.stdout.write(`  ${date}: ${hlGames.length} games  `);
      
      let ddIns = 0, ddUpd = 0, ddPres = 0, ddSkip = 0, ddOrphan = 0;
      
      for (const g of hlGames) {
        const homeName = g.homeTeam?.name;
        const awayName = g.awayTeam?.name;
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
        
        if (skipHlTeams.has(homeName) || skipHlTeams.has(awayName)) {
          process.stdout.write(`skip `);
          continue;
        }
        
        if (!homeId || !awayId) {
          // Try substring match
          let fuzzyH = null, fuzzyA = null;
          for (const [n, id] of nameToId) {
            if (n.includes(normHome) || normHome.includes(n)) fuzzyH = id;
            if (n.includes(normAway) || normAway.includes(n)) fuzzyA = id;
          }
          if (fuzzyH && fuzzyA) {
            // Use fuzzy match
            await processGame(g, fuzzyH, fuzzyA, L, date, dryRun)
              .then(r => { ddIns += r.ins; ddUpd += r.upd; ddPres += r.pres; ddSkip += r.skip; })
              .catch(() => { ddSkip++; });
            continue;
          }
          log(`\n    [orphan] ${awayName} @ ${homeName} — team not in DB (norm: ${normAway} @ ${normHome})`);
          ddOrphan++;
          continue;
        }
        
        await processGame(g, homeId, awayId, L, date, dryRun)
          .then(r => { ddIns += r.ins; ddUpd += r.upd; ddPres += r.pres; ddSkip += r.skip; })
          .catch(e => { log(`\n    [err] ${awayName}@${homeName}: ${e.message}`); ddSkip++; });
      }
      
      dIns += ddIns; dUpd += ddUpd; dPres += ddPres; dSkip += ddSkip; dOrphan += ddOrphan;
      log(`(+${ddIns} new, ↻${ddUpd} upd, =${ddPres} preserved, ✗${ddSkip} skip, ?${ddOrphan} orphan)`);
      await new Promise(r => setTimeout(r, 100));
    }
    
    log(`\n--- ${L.name} Summary ---`);
    log(`Total Highlightly games: ${totalHl}`);
    log(`Inserted: ${dIns}, Updated: ${dUpd}, Preserved: ${dPres}, Skipped: ${dSkip}, Orphan: ${dOrphan}`);
  }
}

async function processGame(g, homeId, awayId, L, date, dryRun) {
  const scheduled = g.date;
  const [homeScore, awayScore] = parseScore(g.state?.score?.current);
  const status = g.state?.description === 'Finished' ? 'completed' : 'scheduled';
  
  // Check existing
  const { data: existingList } = await supabase
    .from('fixtures')
    .select('id, home_score, away_score, status')
    .eq('league_id', L.id)
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
    // No existing fixture — but we have 1921 fixtures with team_ids, so most should match
    if (dryRun) return { ins: 0, upd: 0, pres: 0, skip: 0 };
    const { error } = await supabase.from('fixtures').insert({
      id: crypto.randomUUID(),
      league_id: L.id,
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
