import './load-secrets.mjs';
// Scrape IIHF men's senior division assignments for 2025.
// Source: Wikipedia tournament pages. Each division's Final standings
// list of teams tells us which countries play at that level.
//
// Divisions (most recent 2025):
// - 2025 IIHF World Championship (Top Division, 16 teams)
// - 2025 IIHF World Championship Division I (split into IA and IB, 12 teams)
// - 2025 IIHF World Championship Division II (split into IIA and IIB, 12 teams)
// - 2025 IIHF World Championship Division III (8 teams)
// - 2025 IIHF World Championship Division IV (8 teams)
//
// Output: writes mens_division (text) and mens_division_rank (int) to iihf_member_nations.

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

async function fetchWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&format=json&prop=wikitext`;
  const res = await fetch(url, { headers: { 'User-Agent': 'RinkStop-Bot/1.0' } });
  const j = await res.json();
  return j.parse?.wikitext?.['*'] || '';
}

function extractTeamOrder(wikitext) {
  // Find Final standings or first Sports table
  let idx = wikitext.indexOf('Final standings');
  if (idx === -1) {
    // Fall back to first team_order
    const fallback = wikitext.match(/team_order\s*=\s*([^\n]+)/);
    if (fallback) {
      return fallback[1].split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }
  const section = wikitext.substring(idx, idx + 3000);
  
  // Pattern 1: |team_order= USA, FIN, CZE, ...
  const orderMatch = section.match(/team_order\s*=\s*([^\n]+)/);
  if (orderMatch) {
    return orderMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  
  // Pattern 2: |team1=USA |team2=SUI |team3=SWE |...
  const teamNums = section.match(/\|team\d+\s*=\s*([A-Z]+)/g);
  if (teamNums) {
    return teamNums.map(s => {
      const m = s.match(/\|team\d+\s*=\s*([A-Z]+)/);
      return m ? m[1] : null;
    }).filter(Boolean);
  }
  
  return [];
}

// Fetch divisions. Note: Division I/II may have Group A/B so each may have 2 team_orders
// (one for the page, or one per group). The "Final standings" usually has 1 team_order with all teams.
const divisions = [
  { label: 'Top Division', rank: 1, title: '2025 IIHF World Championship', group: null },
  { label: 'Division I A', rank: 2, title: '2025 IIHF World Championship Division I', group: 'A' },
  { label: 'Division I B', rank: 3, title: '2025 IIHF World Championship Division I', group: 'B' },
  { label: 'Division II A', rank: 4, title: '2025 IIHF World Championship Division II', group: 'A' },
  { label: 'Division II B', rank: 5, title: '2025 IIHF World Championship Division II', group: 'B' },
  { label: 'Division III A', rank: 6, title: '2025 IIHF World Championship Division III', group: 'A' },
  { label: 'Division III B', rank: 7, title: '2025 IIHF World Championship Division III', group: 'B' },
  { label: 'Division IV', rank: 8, title: '2025 IIHF World Championship Division IV', group: null },
];

const assignments = []; // { country, division, division_rank }
let fetchCount = 0;
const wikitextCache = new Map();

for (const div of divisions) {
  if (!wikitextCache.has(div.title)) {
    console.log(`Fetching ${div.title}...`);
    wikitextCache.set(div.title, await fetchWikitext(div.title));
    fetchCount++;
  }
  const wt = wikitextCache.get(div.title);
  
  if (div.group) {
    // The Division I/II pages use <section begin=X /> ... <section end=X />
    // markers to delimit the two groups. Find each begin/end and parse the
    // team_order inside the delimited block.
    const letter = div.group;
    const beginRe = new RegExp(`<section begin=${letter} />`, 'i');
    const endRe = new RegExp(`<section end=${letter} />`, 'i');
    const beginMatch = wt.match(beginRe);
    const endMatch = wt.match(endRe);
    if (!beginMatch || !endMatch) {
      console.log(`  ${div.label}: NO section markers for ${letter}`);
      continue;
    }
    const section = wt.substring(beginMatch.index, endMatch.index);
    const orderMatch = section.match(/team_order\s*=\s*([^\n]+)/);
    if (orderMatch) {
      const flags = orderMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      flags.forEach((flag, i) => {
        const country = FLAGS_TO_COUNTRY[flag];
        if (country) {
          assignments.push({ country, division: div.label, division_rank: i + 1 });
        }
      });
      console.log(`  ${div.label}: ${flags.length} teams`);
    } else {
      console.log(`  ${div.label}: NO team_order in Group ${letter} section`);
    }
  } else {
    const flags = extractTeamOrder(wt);
    flags.forEach((flag, i) => {
      const country = FLAGS_TO_COUNTRY[flag];
      if (country) {
        assignments.push({ country, division: div.label, division_rank: i + 1 });
      }
    });
    console.log(`  ${div.label}: ${flags.length} teams`);
  }
}

console.log(`\nTotal division assignments: ${assignments.length}`);
console.log(`Fetched ${fetchCount} unique pages`);

// Apply to iihf_member_nations
let applied = 0;
let skipped = 0;

for (const a of assignments) {
  const update = {
    mens_division: a.division,
    mens_division_rank: a.division_rank,
    division_as_of: '2025',
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('iihf_member_nations')
    .update(update)
    .eq('country', a.country);
  if (error) {
    if (error.message.includes('column') || error.code === '42703') {
      console.log(`  ❌ Column missing — need to run migration first`);
      console.log(`  Error: ${error.message}`);
      skipped++;
      break;
    }
    console.log(`  ❌ ${a.country}: ${error.message}`);
    skipped++;
  } else {
    applied++;
  }
}

console.log(`\nApplied: ${applied}, Skipped: ${skipped}`);

// Verification
console.log('\n=== Division distribution ===');
const { data: dist } = await supabase
  .from('iihf_member_nations')
  .select('mens_division')
  .not('mens_division', 'is', null);
const counts = {};
(dist || []).forEach(r => { counts[r.mens_division] = (counts[r.mens_division] || 0) + 1; });
console.log(counts);

// Sample
const { data: samples } = await supabase
  .from('iihf_member_nations')
  .select('country, mens_division, mens_division_rank, mens_ranking')
  .not('mens_division', 'is', null)
  .in('country', ['Switzerland', 'USA', 'Canada', 'Sweden', 'Finland', 'Iceland', 'Mongolia', 'Philippines'])
  .order('mens_division_rank');
console.log('\nSample countries:');
(samples || []).forEach(s => console.log(`  ${s.country}: ${s.mens_division} #${s.mens_division_rank} (rank ${s.mens_ranking})`));
