require('./load-secrets.cjs');
/**
 * scripts/sync-junior-rosters.js
 * Pulls OHL, WHL, QMJHL rosters from Wikipedia using auto-generated slugs.
 * Wikipedia has roster tables for most junior teams.
 * 
 * Slug format: "Team_Name" → wikipedia.org/wiki/Team_Name
 * Auto-converts common patterns: spaces → underscores, strips apostrophes/ampersands.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Junior league IDs
const JUNIOR_LEAGUES = {
  OHL:     'd767362d-c13b-4c7a-8c8c-27ec33990882',
  WHL:     '46f49db9-e63d-407d-a99c-802f87576ab2',
  QMJHL:   'deb6816a-ccaf-48bf-9f5e-5a7c3387f922',
};

// Manual overrides for teams whose Wikipedia names differ from DB names
const SLUG_OVERRIDES = {
  // OHL
  'Hamilton Bulldogs': 'Hamilton_Bulldogs_(OHL)',
  'Ottawa 67\'s': 'Ottawa_67\'s',
  'Sault Ste. Marie Greyhounds': 'Soo_Greyhounds',
  'Peterborough Petes': 'Peterborough_Petes',
  'Sudbury Wolves': 'Sudbury_Wolves',
  'Windsor Spitfires': 'Windsor_Spitfires',
  // WHL
  'Edmonton Oilers': 'Edmonton_Oilers_WHL',
  'Kelowna Rockets': 'Kelowna_Rockets',
  'Portland Winterhawks': 'Portland_Winterhawks',
  'Seattle Thunderbirds': 'Seattle_Thunderbirds',
  'Vancouver Giants': 'Vancouver_Giants',
  'Victoria Royals': 'Victoria_Royals',
  'Winnipeg ICE': 'Winnipeg_ICE_(ice_hockey)',
  // QMJHL
  'Baie-Comeau Drakkar': 'Baie-Comeau_Drakkar',
  'Blainville-Boisbriand Armada': 'Blainville-Boisbriand_Armada',
  'Cape Breton Eagles': 'Cape_Breton_Eagles',
  'Charlottetown Islanders': 'Charlottetown_Islanders',
  'Chicoutimi Saguenées': 'Chicoutimi_Saguenées',
  'Granby Prédateurs': 'Granby_Prédateurs',
  'Halifax Mooseheads': 'Halifax_Mooseheads',
  'Moncton Wildcats': 'Moncton_Wildcats',
  'Queébec Remparts': 'Quebec_Remparts',
  'Rimouski Océanic': 'Rimouski_Océanic',
  'Rouyn-Noranda Huskies': 'Rouyn-Noranda_Huskies',
  'Saint John Sea Dogs': 'Saint_John_Sea_Dogs',
  'Sherbrooke Phoenix': 'Sherbrooke_Phoenix',
  'Val-d\'Or Foreurs': 'Val-d\'Or_Foreurs',
  'Victoriaville Tigres': 'Victoriaville_Tigres',
};

function toWikiSlug(name) {
  if (SLUG_OVERRIDES[name]) return SLUG_OVERRIDES[name];
  return name
    .replace(/&/g, 'and')
    .replace(/'/g, '')
    .replace(/\./g, '')
    .replace(/ /g, '_');
}

async function scrapeWikipediaRoster(teamName) {
  const slug = toWikiSlug(teamName);
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`  HTTP ${res.status}`);
      return [];
    }
    const html = await res.text();
    return extractPlayersFromHtml(html);
  } catch (err) {
    console.warn(`  ${err.message}`);
    return [];
  }
}

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

function extractPlayersFromHtml(html) {
  const players = [];
  
  // Find all tables - look for ones with player name patterns
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = [...html.matchAll(tableRegex)];
  
  for (const table of tables) {
    const tableHtml = table[1];
    // Look for tables that have player names (column header containing "Player" or "Name")
    const headers = [...tableHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m => stripHtml(m[1]));
    const headerStr = headers.join('|').toLowerCase();
    
    // Check if this looks like a roster table
    if (!headerStr.includes('player') && !headerStr.includes('name') && !headerStr.includes('posit')) continue;
    
    // Extract data rows
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
    const rows = [...tableHtml.matchAll(rowRegex)];
    
    // Find column indices for our data
    const nameIdx = headers.findIndex(h => /player|name/i.test(h));
    const posIdx = headers.findIndex(h => /pos/i.test(h));
    const natIdx = headers.findIndex(h => /nat|country/i.test(h));
    const htIdx = headers.findIndex(h => /height|ht/i.test(h));
    const wtIdx = headers.findIndex(h => /weight|wt/i.test(h));
    const bdIdx = headers.findIndex(h => /birth|date|born/i.test(h));
    
    if (nameIdx === -1) continue;
    
    for (const row of rows) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => stripHtml(m[1]));
      if (cells.length < 3) continue;
      
      const nameCell = cells[nameIdx] || '';
      const nameMatch = nameCell.match(/^[A-Z][a-zA-ZÀ-ÿ\s'-]+ [A-Z][a-zA-ZÀ-ÿ\s'-]+/);
      if (!nameMatch) continue;
      
      const nameParts = nameMatch[0].trim().split(/\s+/);
      if (nameParts.length < 2) continue;
      const lastName = nameParts.pop();
      const firstName = nameParts.join(' ');
      
      const posCell = posIdx >= 0 ? (cells[posIdx] || '').trim() : '';
      const position = parsePosition(posCell);
      
      const natCell = natIdx >= 0 ? (cells[natIdx] || '').trim() : '';
      const nationality = parseNationality(natCell);
      
      const htCell = htIdx >= 0 ? (cells[htIdx] || '').trim() : '';
      const height_cm = parseHeight(htCell);
      
      const wtCell = wtIdx >= 0 ? (cells[wtIdx] || '').trim() : '';
      const weight_kg = parseWeight(wtCell);
      
      const bdCell = bdIdx >= 0 ? (cells[bdIdx] || '').trim() : '';
      const birth_date = parseBirthDate(bdCell);
      
      players.push({
        first_name: firstName,
        last_name: lastName,
        position: position,
        nationality: nationality,
        height_cm: height_cm,
        weight_kg: weight_kg,
        birth_date: birth_date,
      });
    }
    
    if (players.length > 0) break; // Found the roster table
  }
  
  return players;
}

function parsePosition(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t === 'c' || t.includes('center')) return 'center';
  if (t === 'lw' || t.includes('left wing')) return 'left_wing';
  if (t === 'rw' || t.includes('right wing')) return 'right_wing';
  if (t === 'd' || t.includes('defenc')) return 'defenseman';
  if (t === 'g' || t.includes('goalie') || t.includes('goaltender')) return 'goalie';
  return null;
}

function parseNationality(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('canada') || t.includes('canadian')) return 'CAN';
  if (t.includes('usa') || t.includes('united states') || t.includes('american')) return 'USA';
  if (t.includes('russia') || t.includes('russian')) return 'RUS';
  if (t.includes('finland') || t.includes('finnish')) return 'FIN';
  if (t.includes('sweden') || t.includes('swedish')) return 'SWE';
  if (t.includes('czech') || t.includes('czechia')) return 'CZE';
  if (t.includes('slovak')) return 'SVK';
  if (t.includes('german') || t.includes('germany')) return 'GER';
  if (t.includes('swiss') || t.includes('switzerland')) return 'SUI';
  if (t.includes('austria') || t.includes('austrian')) return 'AUT';
  if (t.includes('latvia') || t.includes('latvian')) return 'LAT';
  if (t.includes('belarus')) return 'BLR';
  if (t.includes('denmark') || t.includes('danish')) return 'DEN';
  if (t.includes('norway') || t.includes('norwegian')) return 'NOR';
  if (t.includes('kazakhstan')) return 'KAZ';
  return null;
}

function parseHeight(text) {
  if (!text) return null;
  // 6'2" or 6-2 or 188 cm
  const cmMatch = text.match(/(\d+)\s*cm/i);
  if (cmMatch) return parseInt(cmMatch[1]);
  const ftMatch = text.match(/(\d+)'(\d+)"/i) || text.match(/(\d+)-(\d+)/);
  if (ftMatch) {
    const ft = parseInt(ftMatch[1]);
    const inch = parseInt(ftMatch[2]);
    return Math.round((ft * 12 + inch) * 2.54);
  }
  return null;
}

function parseWeight(text) {
  if (!text) return null;
  const kgMatch = text.match(/(\d+)\s*kg/i);
  if (kgMatch) return parseInt(kgMatch[1]);
  const lbMatch = text.match(/(\d+)\s*lbs?/i);
  if (lbMatch) return Math.round(parseInt(lbMatch[1]) * 0.453592);
  return null;
}

function parseBirthDate(text) {
  if (!text) return null;
  // Try multiple date formats
  const patterns = [
    /(\d{4})-(\d{2})-(\d{2})/,           // 2001-04-07
    /([A-Z][a-z]{2})\.?\s*(\d{1,2}),?\s*(\d{4})/,  // Apr 7, 2001
    /(\d{1,2})\s*([A-Z][a-z]{2})\s*(\d{4})/,  // 7 Apr 2001
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      try {
        const d = new Date(m[0]);
        if (!isNaN(d)) return d.toISOString().split('T')[0];
      } catch (e) {}
    }
  }
  return null;
}

async function main() {
  console.log('=== Junior Roster Sync (Wikipedia) ===\n');

  // Get all junior league teams from DB
  const { data: ohlTeams } = await supabase.from('teams').select('id,name').eq('league_id', JUNIOR_LEAGUES.OHL);
  const { data: whlTeams } = await supabase.from('teams').select('id,name').eq('league_id', JUNIOR_LEAGUES.WHL);
  const { data: qmjhlTeams } = await supabase.from('teams').select('id,name').eq('league_id', JUNIOR_LEAGUES.QMJHL);

  const allTeams = [
    ...(ohlTeams||[]).map(t => ({ ...t, league: 'OHL', leagueId: JUNIOR_LEAGUES.OHL })),
    ...(whlTeams||[]).map(t => ({ ...t, league: 'WHL', leagueId: JUNIOR_LEAGUES.WHL })),
    ...(qmjhlTeams||[]).map(t => ({ ...t, league: 'QMJHL', leagueId: JUNIOR_LEAGUES.QMJHL })),
  ];

  console.log(`Teams: OHL ${ohlTeams?.length || 0}, WHL ${whlTeams?.length || 0}, QMJHL ${qmjhlTeams?.length || 0}\n`);

  let totalScraped = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalNoData = 0;

  for (const team of allTeams) {
    process.stdout.write(`[${team.league}] ${team.name}... `);
    
    const players = await scrapeWikipediaRoster(team.name);
    console.log(`${players.length} players`);

    if (players.length === 0) {
      totalNoData++;
      continue;
    }
    totalScraped += players.length;

    for (const p of players) {
      if (!p.first_name || !p.last_name) { totalErrors++; continue; }

      // Skip if already exists (by name+position)
      const { data: existing } = await supabase
        .from('players')
        .select('id')
        .eq('first_name', p.first_name)
        .eq('last_name', p.last_name)
        .eq('position', p.position || 'center')
        .limit(1);

      if (existing && existing.length > 0) { totalSkipped++; continue; }

      const { error } = await supabase.from('players').insert({
        first_name: p.first_name,
        last_name: p.last_name,
        position: p.position || null,
        nationality: p.nationality || null,
        height_cm: p.height_cm || null,
        weight_kg: p.weight_kg || null,
        birth_date: p.birth_date || null,
        team_id: team.id,
        league_id: team.leagueId,
        is_active: true,
      });

      if (error) {
        if (error.code === '23505') totalSkipped++;
        else { totalErrors++; }
      } else {
        totalInserted++;
        process.stdout.write('.');
      }
    }
  }

  console.log('\n=== RESULTS ===');
  console.log(`Teams with data:    ${allTeams.length - totalNoData} / ${allTeams.length}`);
  console.log(`Total players scraped: ${totalScraped}`);
  console.log(`New players inserted:  ${totalInserted}`);
  console.log(`Already in DB:          ${totalSkipped}`);
  console.log(`Errors:                 ${totalErrors}`);
  console.log(`\nNote: Run again after fixing slug overrides for teams with no data.`);
}

main().catch(console.error);