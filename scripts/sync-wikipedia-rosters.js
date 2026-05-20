/**
 * scripts/sync-wikipedia-rosters.js
 * Scrapes player rosters from Wikipedia for European leagues.
 * Covers: SHL, Swiss NL, Finnish Liiga, KHL
 * 
 * Wikipedia team pages have consistent roster tables with:
 * - Player name, position, nationality, age/birth year
 * - Jersey numbers
 * 
 * Run: node scripts/sync-wikipedia-rosters.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yszheonqyyskkjoxoexk.supabase.co',
  '***REMOVED***'
);

// League configs
const LEAGUES = {
  SHL: {
    id: '69d4de0c-b072-4f52-8950-eb728acdc7f9',
    name: 'Swedish Hockey League',
    slugOverrides: {
      'Frolunda Indians': 'Frolunda_Indians',
      'Frolunda HC': 'Frolunda_Indians',
      ' Växjö Lakers': 'V%C3%A4xj%C3%B6_Lakers',
      'Luleå HF': 'Lule%C3%A5_HF',
      'Skellefteå AIK': 'Skellefte%C3%A5_AIK',
      'Örebro HK': '%C3%96rebro_HK',
      'Linköping HC': 'Link%C3%B6ping_HC',
      'Brynas IF': 'Brynas_IF',
      'HV71': 'HV71',
      'IK Oskarshamn': 'IK_Oskarshamn',
      'Malmö Redhawks': 'Malm%C3%B6_Redhawks',
      'Södertälje SK': 'S%C3%B6dert%C3%A4lje_SK',
      'Vita Möta': 'Vita_M%C3%B6ta',
    },
  },
  SWISS_NL: {
    id: '3465d1c5-c7af-4510-bed6-d43d294876a7',
    name: 'National League (Switzerland)',
    slugOverrides: {
      'HCfR Bruins': 'HCfR_Bruins',
      'HC Sierre-Annecy': 'HC_Sierre-Annecy',
    },
  },
  FINNISH_LIIIGA: {
    id: '59d8bbfc-2010-424b-8022-22d5bb53faaa',
    name: 'Finnish Liiga',
    slugOverrides: {
      'HPK Hämeenlinna': 'HPK_H%C3%A4meenlinna',
      'JYP Jyväskylä': 'JYP_Jyv%C3%A4skyl%C3%A4',
      'KalPa Kuopio': 'KalPa_Kuopio',
      'Kärpät Oulu': 'K%C3%A4rp%C3%A4t_Oulu',
      'KooKoo Kouvola': 'KooKoo_Kouvola',
      'Lukko Rauma': 'Lukko_Rauma',
      'Pelicans Lahti': 'Pelicans_Lahti',
      'SaiPa Lappeenranta': 'SaiPa_Lappeenranta',
      'Sport Vaasa': 'Sport_Vaasa',
      'Tappara Tampere': 'Tappara_Tampere',
      'Ilves Tampere': 'Ilves_Tampere',
      'Jukurit Mikkeli': 'Jukurit_Mikkelin',
    },
  },
  KHL: {
    id: 'a08f6dac-eb1f-48b6-a11b-56fbb5642752',
    name: 'Kontinental Hockey League',
    slugOverrides: {
      'SKA Saint Petersburg': 'SKA_Saint_Petersburg',
      'Dinamo Riga': 'Dinamo_Riga',
      'CSKA Moscow': 'CSKA_Moscow',
      'Torpedo Nizhny Novgorod': 'Torpedo_Nizhny_Novgorod',
      'Amur Khabarovsk': 'Amur_Khabarovsk',
      'Admiral Vladivostok': 'Admiral_Vladivostok',
    },
  },
};

// Map nationality text to ISO codes
function parseNationality(text) {
  if (!text) return null;
  const t = text.toUpperCase();
  if (t.includes('CANADA') || t.includes('CANADIAN')) return 'CAN';
  if (t.includes('USA') || t.includes('UNITED STATES') || t.includes('AMERICAN')) return 'USA';
  if (t.includes('RUSSIA') || t.includes('RUSSIAN')) return 'RUS';
  if (t.includes('FINLAND') || t.includes('FINNISH')) return 'FIN';
  if (t.includes('SWEDEN') || t.includes('SWEDISH')) return 'SWE';
  if (t.includes('CZECH') || t.includes('CZECHIA')) return 'CZE';
  if (t.includes('SLOVAK') || t.includes('SLOVEN')) return 'SVK';
  if (t.includes('GERMAN') || t.includes('GERMANY')) return 'GER';
  if (t.includes('SWISS') || t.includes('SWITZERLAND')) return 'SUI';
  if (t.includes('AUSTRIA') || t.includes('AUSTRIAN')) return 'AUT';
  if (t.includes('LATVIA') || t.includes('LATVIAN')) return 'LAT';
  if (t.includes('BELARUS')) return 'BLR';
  if (t.includes('DENMARK') || t.includes('DANISH')) return 'DEN';
  if (t.includes('NORWAY') || t.includes('NORWEGIAN')) return 'NOR';
  if (t.includes('KAZAKHSTAN')) return 'KAZ';
  if (t.includes('FRANCE') || t.includes('FRENCH')) return 'FRA';
  if (t.includes('BRITAIN') || t.includes('GREAT BRITAIN') || t.includes('BRITISH')) return 'GBR';
  return null;
}

function parsePosition(text) {
  if (!text) return null;
  const t = text.toUpperCase();
  if (t === 'C' || t.includes('CENTER')) return 'center';
  if (t === 'LW' || t.includes('LEFT WING')) return 'left_wing';
  if (t === 'RW' || t.includes('RIGHT WING')) return 'right_wing';
  if (t === 'D' || t.includes('DEFENCE') || t.includes('DEFENCEMAN')) return 'defenseman';
  if (t === 'G' || t.includes('GOALIE') || t.includes('GOALTENDER')) return 'goalie';
  return null;
}

function parseAge(ageStr) {
  // Age as of 2024-2025 season
  if (!ageStr) return null;
  const m = ageStr.match(/\d+/);
  if (m) {
    const age = parseInt(m[0]);
    if (age >= 16 && age <= 45) return (2025 - age).toString();
  }
  return null;
}

function toWikiSlug(name, overrides) {
  if (overrides[name]) return overrides[name];
  return name
    .replace(/&/g, 'and')
    .replace(/'/g, '')
    .replace(/\./g, '')
    .replace(/ /g, '_');
}

async function scrapeTeam(teamName, leagueSlug) {
  const overrides = LEAGUES[leagueSlug].slugOverrides;
  const slug = toWikiSlug(teamName, overrides);
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return extractPlayers(html, teamName);
  } catch (err) {
    return [];
  }
}

function extractPlayers(html, teamName) {
  const players = [];
  
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = [...html.matchAll(tableRegex)];
  
  // Find the best roster table
  let bestTable = null;
  let bestScore = 0;
  
  for (const table of tables) {
    const t = table[1];
    const allText = t.replace(/<[^>]*>/g, ' ');
    
    // Score by hockey indicators
    const nameMatches = allText.match(/\b[A-Z][a-zA-ZÀ-ÿ]+ [A-Z][a-zA-ZÀ-ÿ]+\b/g) || [];
    // Filter out common non-name patterns
    const realNames = nameMatches.filter(n => 
      !/^(The|Team|Season|Playoffs|GP|W|L|T|OT|Pts|Pct|GF|GA)$/.test(n)
    );
    
    const ageMatches = allText.match(/\b(19[5-9]\d|200[0-9])\b/g) || [];
    const posIndicators = (allText.match(/\b(C|LW|RW|D|G|Center|Left|Right|Defence|Goalie|Goaltender)\b/gi) || []).length;
    
    const score = realNames.length * 2 + ageMatches.length + posIndicators;
    if (score > bestScore) { bestScore = score; bestTable = t; }
  }
  
  if (!bestTable) return [];
  
  const rows = [...bestTable.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  if (rows.length < 2) return [];
  
  // Find header row and get column indices
  let headerCells = [];
  let headerIdx = -1;
  let nameIdx = -1, posIdx = -1, natIdx = -1, ageIdx = -1, shootsIdx = -1;
  
  for (let i = 0; i < Math.min(rows.length, 3); i++) {
    const cells = [...rows[i][1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
      .map(m => m[1].replace(/<[^>]*>/g, '').replace(/&#160;/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase());
    
    nameIdx = cells.findIndex(c => /PLAYER|NAME/i.test(c));
    posIdx = cells.findIndex(c => /POS/i.test(c) || /POSIT/i.test(c));
    natIdx = cells.findIndex(c => /NAT|COUNTRY|NATIONALITY/i.test(c));
    ageIdx = cells.findIndex(c => /AGE|BORN|DATE/i.test(c));
    shootsIdx = cells.findIndex(c => /S\/C|SHOOTS|CATCH/i.test(c));
    
    if (nameIdx >= 0) { headerCells = cells; headerIdx = i; break; }
  }
  
  if (headerIdx < 0) return [];
  
  // Extract player data from each row
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cells = [...rows[i][1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
      .map(m => m[1].replace(/<[^>]*>/g, '').replace(/&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim());
    
    if (cells.length < 2) continue;
    
    // Get name (usually first substantial text cell)
    let nameCell = cells[nameIdx] || '';
    // Clean up captaincy markers etc
    nameCell = nameCell.replace(/\s*\([A-Z]\s*\)+$/, '').trim();
    const nameMatch = nameCell.match(/^([A-Z][a-zA-ZÀ-ÿ\s'-]+ [A-Z][a-zA-ZÀ-ÿ\s'-]+)/);
    if (!nameMatch) continue;
    
    const nameParts = nameMatch[1].trim().split(/\s+/);
    if (nameParts.length < 2) continue;
    const lastName = nameParts.pop();
    const firstName = nameParts.join(' ');
    
    const position = parsePosition(cells[posIdx] || '');
    const nationality = parseNationality(cells[natIdx] || '');
    const ageStr = cells[ageIdx] || '';
    const birthYear = parseAge(ageStr);
    const shoots = cells[shootsIdx] || '';
    
    if (!firstName || !lastName) continue;
    
    players.push({
      first_name: firstName,
      last_name: lastName,
      position: position,
      nationality: nationality,
      birth_date: birthYear ? `${birthYear}-01-01` : null,
      shoots: /L|LEFT/i.test(shoots) ? 'L' : (/R|RIGHT/i.test(shoots) ? 'R' : null),
      catches: null,
    });
  }
  
  return players;
}

async function main() {
  console.log('=== Wikipedia Roster Sync ===\n');

  // Get all teams for each league
  const leagueResults = {};
  
  for (const [leagueKey, league] of Object.entries(LEAGUES)) {
    console.log(`\n--- ${league.name} ---`);
    
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('league_id', league.id);
    
    console.log(`Teams in DB: ${teams?.length || 0}`);
    
    let totalScraped = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let teamsWithData = 0;
    
    for (const team of (teams || [])) {
      process.stdout.write(`[${team.name}] `);
      
      const players = await scrapeTeam(team.name, leagueKey);
      
      if (players.length === 0) {
        console.log('0 players');
        continue;
      }
      
      teamsWithData++;
      totalScraped += players.length;
      console.log(`${players.length} players`);
      
      for (const p of players) {
        if (!p.first_name || !p.last_name) { totalErrors++; continue; }
        
        // Check if player already exists
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
          slug: (p.first_name + '-' + p.last_name).toLowerCase().replace(/[^a-z0-9]/g, '-'),
          position: p.position || null,
          nationality: p.nationality || null,
          birth_date: p.birth_date || null,
          shoots: p.shoots || null,
          catches: p.catches || null,
          team_id: team.id,
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
    
    leagueResults[leagueKey] = {
      teamsWithData,
      totalScraped,
      totalInserted,
      totalSkipped,
      totalErrors,
    };
    
    console.log(`\n${league.name}: ${totalScraped} scraped, ${totalInserted} inserted, ${totalSkipped} existing, ${totalErrors} errors`);
    console.log(`Teams with data: ${teamsWithData} / ${teams?.length || 0}`);
  }

  // Summary
  console.log('\n\n=== FINAL SUMMARY ===');
  let grandScraped = 0, grandInserted = 0, grandSkipped = 0, grandErrors = 0;
  for (const [key, r] of Object.entries(leagueResults)) {
    console.log(`${LEAGUES[key].name}: ${r.totalScraped} scraped, ${r.totalInserted} inserted, ${r.totalSkipped} existing, ${r.totalErrors} errors`);
    grandScraped += r.totalScraped;
    grandInserted += r.totalInserted;
    grandSkipped += r.totalSkipped;
    grandErrors += r.totalErrors;
  }
  console.log(`\nTOTAL: ${grandScraped} scraped, ${grandInserted} new, ${grandSkipped} existing, ${grandErrors} errors`);
  
  // Final count
  const { count } = await supabase.from('players').select('*', { count: 'exact', head: true });
  console.log(`Total players in DB: ${count}`);
}

main().catch(console.error);