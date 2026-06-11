import './load-secrets.mjs';
// Re-seed iihf_member_nations + national_teams from authoritative Wikipedia source
// "List of members of the International Ice Hockey Federation"
// - Splits rows by section (Full members / Associate members / Affiliate members)
// - Parses {{IIHFteams|...}} template for team-type flags
// - Parses men's + women's rankings
// - Cross-checks against current DB to find status mismatches
//
// Usage: set -a && . ./.env && set +a && node scripts/reseed-iihf-wiki.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fetch the Wikipedia article source
const wikiUrl = 'https://en.wikipedia.org/w/api.php?action=parse&page=List_of_members_of_the_International_Ice_Hockey_Federation&format=json&prop=wikitext';
const res = await fetch(wikiUrl, { headers: { 'User-Agent': 'RinkStop-Bot/1.0' } });
const j = await res.json();
const wikitext = j.parse.wikitext['*'];

// Country code map (IOC flag templates)
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
  FRO: 'Faroe Islands', GRL: 'Greenland', ISL2: 'Iceland',
  NEP: 'Nepal', PAK: 'Pakistan', BRU: 'Brunei', INA: 'Indonesia',
  TKM: 'Turkmenistan', KGZ: 'Kyrgyzstan', TJK: 'Tajikistan',
  BGD: 'Bangladesh', SRI: 'Sri Lanka', PRK: 'North Korea',
};

// Extract sections
function parseSection(text, sectionTitle) {
  const header = `===${sectionTitle}===`;
  const startIdx = text.indexOf(header);
  if (startIdx === -1) return '';
  const searchFrom = startIdx + header.length;
  const endIdx = text.indexOf('===', searchFrom);
  return text.substring(startIdx, endIdx === -1 ? text.length : endIdx);
}

function parseRows(sectionText) {
  // Split by row separator
  const rows = [];
  const rowRe = /\n\|-(?:[^\n]*\n)?([\s\S]*?)(?=\n\|-|$)/g;
  let m;
  while ((m = rowRe.exec(sectionText)) !== null) {
    const rowContent = m[1] || '';
    if (rowContent.trim().startsWith('!') || rowContent.trim().startsWith('{{')) continue; // header
    if (rowContent.trim().length < 10) continue;
    rows.push(rowContent);
  }
  return rows;
}

function parseRow(row) {
  // Split by newlines starting with |
  const cells = row.split(/\n\|/).map(c => c.replace(/^\|?\s*/, '').trim()).filter(c => c.length > 0);
  if (cells.length < 4) return null;
  
  // First cell: {{FLAG}}
  const flagMatch = cells[0].match(/\{\{([A-Z]+)\}/);
  if (!flagMatch) return null;
  const ioc = flagMatch[1];
  const country = FLAGS_TO_COUNTRY[ioc] || null;
  if (!country) {
    // Log unmapped flags
    return { ioc, unmapped: true };
  }
  
  // Second cell: date
  const dateMatch = cells[1]?.match(/(\d{4})\|(\d{1,2})\|(\d{1,2})/);
  const dateJoined = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}` : null;
  
  // Third cell: organization (may be [[link|display]])
  const orgMatch = cells[2]?.match(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/);
  const organization = orgMatch ? (orgMatch[2] || orgMatch[1]) : (cells[2]?.replace(/\[\[|\]\]/g, '').trim() || null);
  
  // Fourth cell: teams {{IIHFteams|...}}
  const teamsCell = cells[3] || '';
  const hasMens = /men=y/.test(teamsCell);
  const hasU20 = /U20=y/.test(teamsCell);
  const hasU18 = /U18=y/.test(teamsCell);
  const hasWomens = /women=y/.test(teamsCell);
  const hasWU18 = /WU18=y/.test(teamsCell);
  const noTeams = /\{\{sort\|99\|—\}\}/.test(teamsCell);
  
  // Rankings (5th and 6th cells)
  function parseRank(cell) {
    if (!cell) return null;
    if (/sort\|99\|—/.test(cell) || /^\s*—\s*$/.test(cell)) return null;
    const m = cell.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }
  const mensR = parseRank(cells[5]);
  const womensR = parseRank(cells[6]);
  
  return {
    ioc,
    country,
    date_joined: dateJoined,
    organization,
    has_mens_team: hasMens && !noTeams,
    has_womens_team: hasWomens && !noTeams,
    has_mens_u20_team: hasU20,
    has_mens_u18_team: hasU18,
    has_womens_u18_team: hasWU18,
    mens_ranking: mensR,
    womens_ranking: womensR,
  };
}

// Process all three sections
const fullSection = parseSection(wikitext, 'Full members');
const associateSection = parseSection(wikitext, 'Associate members');
const affiliateSection = parseSection(wikitext, 'Affiliate members');

const fullRows = parseRows(fullSection).map(parseRow).filter(Boolean);
const assocRows = parseRows(associateSection).map(parseRow).filter(Boolean);
const affilRows = parseRows(affiliateSection).map(parseRow).filter(Boolean);

const unmapped = [
  ...fullRows.filter(r => r.unmapped),
  ...assocRows.filter(r => r.unmapped),
  ...affilRows.filter(r => r.unmapped),
];

console.log('=== Parsed rows ===');
console.log('Full members:', fullRows.length);
console.log('Associate members:', assocRows.length);
console.log('Affiliate members:', affilRows.length);
console.log('Total:', fullRows.length + assocRows.length + affilRows.length);
if (unmapped.length) {
  console.log('\n=== UNMAPPED FLAGS (need country names) ===');
  unmapped.forEach(u => console.log(`  ${u.ioc}`));
}

// Now compare with current DB to find status mismatches
console.log('\n=== Comparing with DB ===');
const { data: current } = await supabase.from('iihf_member_nations').select('country, iihf_status, mens_ranking, womens_ranking');

const currentByCountry = new Map();
(current || []).forEach(r => currentByCountry.set(r.country, r));

const wikiByCountry = new Map();
[
  ...fullRows.map(r => ({ ...r, iihf_status: 'full' })),
  ...assocRows.map(r => ({ ...r, iihf_status: 'associate' })),
  ...affilRows.map(r => ({ ...r, iihf_status: 'affiliate' })),
].forEach(r => {
  if (r.country) wikiByCountry.set(r.country, r);
});

const statusChanges = [];
const rankingChanges = [];
const newCountries = [];

for (const [country, wiki] of wikiByCountry) {
  const cur = currentByCountry.get(country);
  if (!cur) {
    newCountries.push(country);
    continue;
  }
  if (cur.iihf_status !== wiki.iihf_status) {
    statusChanges.push({ country, from: cur.iihf_status, to: wiki.iihf_status });
  }
  if (cur.mens_ranking !== wiki.mens_ranking) {
    rankingChanges.push({ country, type: 'mens', from: cur.mens_ranking, to: wiki.mens_ranking });
  }
  if (cur.womens_ranking !== wiki.womens_ranking) {
    rankingChanges.push({ country, type: 'womens', from: cur.womens_ranking, to: wiki.womens_ranking });
  }
}

console.log('\nStatus mismatches:', statusChanges.length);
statusChanges.forEach(s => console.log(`  ${s.country}: ${s.from} -> ${s.to}`));
console.log('\nRanking changes:', rankingChanges.length);
rankingChanges.slice(0, 20).forEach(r => console.log(`  ${r.country} (${r.type}): ${r.from} -> ${r.to}`));
if (rankingChanges.length > 20) console.log(`  ... and ${rankingChanges.length - 20} more`);
console.log('\nNew countries (not in DB):', newCountries);

// Apply status changes
if (statusChanges.length > 0) {
  console.log('\n=== Applying status changes ===');
  for (const change of statusChanges) {
    const { error } = await supabase
      .from('iihf_member_nations')
      .update({ iihf_status: change.to, updated_at: new Date().toISOString() })
      .eq('country', change.country);
    if (error) {
      console.log(`  ❌ ${change.country}: ${error.message}`);
    } else {
      console.log(`  ✅ ${change.country}: ${change.from} -> ${change.to}`);
    }
  }
}

// Apply ranking changes (only update if different)
if (rankingChanges.length > 0) {
  console.log('\n=== Applying ranking changes ===');
  for (const change of rankingChanges) {
    const update = change.type === 'mens' 
      ? { mens_ranking: change.to }
      : { womens_ranking: change.to };
    const { error } = await supabase
      .from('iihf_member_nations')
      .update({ ...update, ranking_as_of: '2025-05-26', updated_at: new Date().toISOString() })
      .eq('country', change.country);
    if (error) {
      console.log(`  ❌ ${change.country} (${change.type}): ${error.message}`);
    } else {
      console.log(`  ✅ ${change.country} (${change.type}): ${change.from} -> ${change.to}`);
    }
  }
}

// Now update the team-type flags on iihf_member_nations so we can show what teams a country has
console.log('\n=== Updating team-type flags ===');
for (const [country, wiki] of wikiByCountry) {
  const { error } = await supabase
    .from('iihf_member_nations')
    .update({
      has_mens_team: wiki.has_mens_team,
      has_womens_team: wiki.has_womens_team,
      has_mens_u20_team: wiki.has_mens_u20_team,
      has_mens_u18_team: wiki.has_mens_u18_team,
      has_womens_u18_team: wiki.has_womens_u18_team,
      date_joined: wiki.date_joined,
      organization: wiki.organization,
      updated_at: new Date().toISOString(),
    })
    .eq('country', country);
  if (error) {
    console.log(`  ❌ ${country}: ${error.message}`);
  }
}

console.log('\n=== Done ===');
