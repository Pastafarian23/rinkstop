import './load-secrets.mjs';
// Scrape most-recent IIHF tournament final standings for U20/U18/Women's categories.
// Source: Wikipedia tournament pages (cached HTML in /tmp).
// Output: ranking + country name + tournament name -> apply to national_teams table.
//
// Usage: set -a && . ./.env && set +a && node scripts/scrape-tournament-standings.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FLAGS_TO_COUNTRY = {
  ARM: 'Armenia', AUS: 'Australia', AUT: 'Austria', AZE: 'Azerbaijan',
  BLR: 'Belarus', BEL: 'Belgium', BIH: 'Bosnia and Herzegovina', BRA: 'Brazil',
  BUL: 'Bulgaria', CAN: 'Canada', CHN: 'China', TPE: 'Chinese Taipei',
  CRO: 'Croatia', CZE: 'Czech Republic', DEN: 'Denmark', EST: 'Estonia',
  FIN: 'Finland', FRA: 'France', GEO: 'Georgia', GER: 'Germany',
  GBR: 'United Kingdom', GRE: 'Greece', HUN: 'Hungary', ISL: 'Iceland',
  IND: 'India', IRL: 'Ireland', ISR: 'Israel', ITA: 'Italy',
  JPN: 'Japan', KAZ: 'Kazakhstan', KOR: 'Korea', KOS: 'Kosovo',
  KUW: 'Kuwait', LAT: 'Latvia', LTU: 'Lithuania', LUX: 'Luxembourg',
  MEX: 'Mexico', MDA: 'Moldova', MGL: 'Mongolia', MNE: 'Montenegro',
  MAR: 'Morocco', NED: 'Netherlands', NZL: 'New Zealand', NOR: 'Norway',
  PHI: 'Philippines', POL: 'Poland', POR: 'Portugal', QAT: 'Qatar',
  ROU: 'Romania', RUS: 'Russia', SRB: 'Serbia', SVK: 'Slovakia',
  SLO: 'Slovenia', RSA: 'South Africa', ESP: 'Spain', SUI: 'Switzerland',
  SWE: 'Sweden', THA: 'Thailand', TUN: 'Tunisia', TUR: 'Turkey',
  UKR: 'Ukraine', UAE: 'United Arab Emirates', USA: 'United States',
  UZB: 'Uzbekistan', BHR: 'Bahrain', KEN: 'Kenya', ALG: 'Algeria',
  HKG: 'Hong Kong', MAS: 'Malaysia', SGP: 'Singapore', MAC: 'Macau',
  CHI: 'Chile', COL: 'Colombia', CUB: 'Cuba', ECU: 'Ecuador',
  CRC: 'Costa Rica', JAM: 'Jamaica', PAN: 'Panama', PUR: 'Puerto Rico',
  VEN: 'Venezuela', ARG: 'Argentina', AND: 'Andorra', LIE: 'Liechtenstein',
  MLT: 'Malta', MON: 'Monaco', SMR: 'San Marino',
  FRO: 'Faroe Islands', GRL: 'Greenland',
  NEP: 'Nepal', PAK: 'Pakistan', BRU: 'Brunei', INA: 'Indonesia',
  TKM: 'Turkmenistan', KGZ: 'Kyrgyzstan', TJK: 'Tajikistan',
  BGD: 'Bangladesh', SRI: 'Sri Lanka', PRK: 'North Korea',
};

const COUNTRIES_TO_FLAGS = {};
for (const [flag, country] of Object.entries(FLAGS_TO_COUNTRY)) {
  COUNTRIES_TO_FLAGS[country] = flag;
}

import { readFile } from 'fs/promises';

async function fetchAndExtract(url, tournamentName) {
  console.log(`\n=== ${tournamentName} ===`);
  console.log(`  Fetching ${url}...`);
  const res = await fetch(url, { headers: { 'User-Agent': 'RinkStop-Bot/1.0' } });
  const html = await res.text();
  console.log(`  Got ${html.length} bytes`);

  // Find the final standings table - look for "Gold medal game" or "Final standings" heading
  // Then extract rows in order of placement
  
  // Pattern: find tables with team results, look for a Final Standings section
  // The table will have rows like: |1|{{CAN}}|Sweden|...|| for 1st place
  
  // Extract country + placement pairs by scanning for places like "|1|{{CAN}}" or "|1| [[Canada]]"
  const rankings = [];
  const seenFlags = new Set();
  
  // Match rows where first cell is a number (placement) and second cell has a flag
  const rowRe = /<tr[^>]*>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>\s*\{\{([A-Z]+)\}\}/g;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const place = parseInt(m[1], 10);
    const flag = m[2];
    if (seenFlags.has(flag)) continue; // skip duplicates
    seenFlags.add(flag);
    const country = FLAGS_TO_COUNTRY[flag];
    if (country) {
      rankings.push({ place, country, flag });
    }
  }

  console.log(`  Parsed ${rankings.length} placements`);
  return rankings;
}

async function fetchViaApi(title) {
  // Use MediaWiki API to get parsed wikitext (more reliable than scraping HTML)
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&format=json&prop=wikitext`;
  const res = await fetch(url, { headers: { 'User-Agent': 'RinkStop-Bot/1.0' } });
  const j = await res.json();
  return j.parse?.wikitext?.['*'] || '';
}

function parsePlacementsFromWikitext(wikitext, tournamentName) {
  // Find the Final standings section (uses Sports table template with team_order)
  const finalsIdx = wikitext.indexOf('Final standings');
  if (finalsIdx === -1) {
    console.log(`  ❌ No Final standings section found in ${tournamentName}`);
    return [];
  }
  const finals = wikitext.substring(finalsIdx, finalsIdx + 5000);
  
  // Extract team_order= USA, FIN, CZE, SWE, ...
  const orderMatch = finals.match(/team_order\s*=\s*([^\n]+)/);
  if (!orderMatch) {
    console.log(`  ❌ No team_order found in Final standings`);
    return [];
  }
  
  // Parse comma-separated IOC codes
  const order = orderMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  const placements = [];
  for (let i = 0; i < order.length; i++) {
    const flag = order[i];
    const country = FLAGS_TO_COUNTRY[flag];
    if (country) {
      placements.push({ place: i + 1, country, flag });
    } else {
      console.log(`  ⚠️ Unmapped flag: ${flag} at place ${i + 1}`);
    }
  }
  
  return placements;
}

// Fetch all 4 tournament pages
const tournaments = [
  { name: '2025 World Junior Championships (U20 Men)', title: '2025 World Junior Ice Hockey Championships', teamType: 'mens_u20' },
  { name: '2025 IIHF World U18 Championships (U18 Men)', title: '2025 IIHF World U18 Championships', teamType: 'mens_u18' },
  { name: '2025 IIHF U18 Women\'s World Championship (U18 Women)', title: "2025 IIHF U18 Women's World Championship", teamType: 'womens_u18' },
  { name: '2025 IIHF Women\'s World Championship (Senior Women)', title: "2025 IIHF Women's World Championship", teamType: 'womens' },
];

const allPlacements = [];

for (const t of tournaments) {
  console.log(`\n=== ${t.name} ===`);
  try {
    const wikitext = await fetchViaApi(t.title);
    console.log(`  Got ${wikitext.length} bytes of wikitext`);
    const placements = parsePlacementsFromWikitext(wikitext, t.name);
    console.log(`  Parsed ${placements.length} placements`);
    if (placements.length > 0) {
      console.log(`  Top 10: ${placements.slice(0, 10).map(p => `${p.place}.${p.country}`).join(', ')}`);
    }
    placements.forEach(p => allPlacements.push({ ...p, teamType: t.teamType, tournament: t.name }));
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }
}

console.log(`\n=== Total placements parsed: ${allPlacements.length} ===`);

// Now apply to national_teams table
// For each (country, team_type), find existing row and update ranking/ranking_label
let applied = 0;
let skipped = 0;

for (const p of allPlacements) {
  const rankingLabel = p.place === 1 ? `World #1 (Gold)` 
    : p.place === 2 ? `World #2 (Silver)` 
    : p.place === 3 ? `World #3 (Bronze)` 
    : `World #${p.place}`;

  // Check if a row exists for this country + team_type
  const { data: existing } = await supabase
    .from('national_teams')
    .select('id')
    .eq('country', p.country)
    .eq('team_type', p.teamType)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('national_teams')
      .update({ 
        ranking: p.place, 
        ranking_label: rankingLabel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) {
      console.log(`  ❌ ${p.country} (${p.teamType}): ${error.message}`);
      skipped++;
    } else {
      applied++;
    }
  } else {
    console.log(`  ⚠️ No row for ${p.country} (${p.teamType}) — placement: ${p.place}`);
    skipped++;
  }
}

console.log(`\n=== Applied: ${applied}, Skipped: ${skipped} ===`);

// Verify
console.log('\n=== Verification ===');
for (const t of ['mens_u20', 'mens_u18', 'womens_u18', 'womens']) {
  const { data } = await supabase
    .from('national_teams')
    .select('country, team_type, ranking, ranking_label')
    .eq('team_type', t)
    .not('ranking', 'is', null)
    .order('ranking', { ascending: true })
    .limit(5);
  console.log(`\n${t}:`);
  (data || []).forEach(d => console.log(`  ${d.country}: ${d.ranking_label}`));
}
