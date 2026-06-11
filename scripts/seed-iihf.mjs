import './load-secrets.mjs';
// Generate seed SQL for iihf_member_nations + national_teams
// Source: Wikipedia scrape (/tmp/iihf-members.json)
// Re-classified: Table 2 = 62 full members, Table 3 = 22 associates, Table 4 = 11 former/suspended (skipped)
import { readFileSync, writeFileSync } from 'node:fs';

const members = JSON.parse(readFileSync('/tmp/iihf-members.json', 'utf-8'));

// Country name normalization to match rinks.country / teams.country in our DB
const NAME_MAP = {
  'Republic of Ireland': 'Ireland',
  'Czech Republic': 'Czech Republic',
  'Czechia': 'Czech Republic',
  'United Kingdom': 'United Kingdom',
  'Chinese Taipei': 'Taiwan',
  'Georgia (country)': 'Georgia',
};

// IOC country codes (3-letter)
const IOC = {
  'Armenia': 'ARM', 'Australia': 'AUS', 'Austria': 'AUT', 'Azerbaijan': 'AZE',
  'Belarus': 'BLR', 'Belgium': 'BEL', 'Bosnia and Herzegovina': 'BIH',
  'Bulgaria': 'BGR', 'Canada': 'CAN', 'China': 'CHN', 'Chinese Taipei': 'TPE',
  'Croatia': 'HRV', 'Czech Republic': 'CZE', 'Denmark': 'DNK', 'Estonia': 'EST',
  'Finland': 'FIN', 'France': 'FRA', 'Georgia': 'GEO', 'Germany': 'DEU',
  'United Kingdom': 'GBR', 'Hong Kong': 'HKG', 'Hungary': 'HUN', 'Iceland': 'ISL',
  'India': 'IND', 'Iran': 'IRN', 'Ireland': 'IRL', 'Israel': 'ISR',
  'Italy': 'ITA', 'Japan': 'JPN', 'Kazakhstan': 'KAZ', 'Kuwait': 'KWT',
  'Kyrgyzstan': 'KGZ', 'Latvia': 'LVA', 'Lithuania': 'LTU', 'Luxembourg': 'LUX',
  'Malaysia': 'MYS', 'Mexico': 'MEX', 'Mongolia': 'MNG', 'Netherlands': 'NLD',
  'New Zealand': 'NZL', 'North Korea': 'PRK', 'Norway': 'NOR', 'Philippines': 'PHL',
  'Poland': 'POL', 'Romania': 'ROU', 'Russia': 'RUS', 'Serbia': 'SRB',
  'Singapore': 'SGP', 'Slovakia': 'SVK', 'Slovenia': 'SVN', 'South Africa': 'ZAF',
  'South Korea': 'KOR', 'Spain': 'ESP', 'Sweden': 'SWE', 'Switzerland': 'SUI',
  'Thailand': 'THA', 'Turkey': 'TUR', 'Turkmenistan': 'TKM', 'Ukraine': 'UKR',
  'United Arab Emirates': 'ARE', 'United States': 'USA', 'Uzbekistan': 'UZB',
  'Algeria': 'DZA', 'Andorra': 'AND', 'Argentina': 'ARG', 'Bahrain': 'BHR',
  'Brazil': 'BRA', 'Chile': 'CHL', 'Colombia': 'COL', 'Greece': 'GRC',
  'Indonesia': 'IDN', 'Jamaica': 'JAM', 'Kenya': 'KEN', 'Lebanon': 'LBN',
  'Liechtenstein': 'LIE', 'Macau': 'MAC', 'Morocco': 'MAR', 'Nepal': 'NPL',
  'North Macedonia': 'MKD', 'Oman': 'OMN', 'Portugal': 'PRT', 'Puerto Rico': 'PRI',
  'Qatar': 'QAT', 'Tunisia': 'TUN',
};

// Determine team types from teams column
const hasTeam = (teamsStr, code) => teamsStr.toLowerCase().includes(code.toLowerCase());

// Parse date (e.g., "11 February 1938[H]" → "1938-02-11")
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
function parseDate(s) {
  if (!s) return null;
  // Strip footnote markers like [H], [101]
  const cleaned = s.replace(/\[[A-Z0-9]+\]/g, '').trim();
  const m = cleaned.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (m) {
    const day = parseInt(m[1]);
    const mon = MONTHS[m[2].toLowerCase()];
    const yr = parseInt(m[3]);
    if (mon && yr) {
      return `${yr}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  // Try year-only patterns
  const y = cleaned.match(/(\d{4})/);
  return y ? `${y[1]}-01-01` : null;
}

function parseRanking(s) {
  if (!s || s === '—' || s === '99' || s === '') return null;
  const n = parseInt(s);
  return isNaN(n) ? null : n;
}

// Country → slug
const countryToSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Filter to current members only (Table 2 = full, Table 3 = associate; skip Table 4 former)
const current = members.filter(m => m.section === 'Table 2' || m.section === 'Table 3');
console.log(`Current IIHF members: ${current.length}`);

// Build iihf_member_nations rows
const memberRows = current.map(m => {
  const country = NAME_MAP[m.country] || m.country;
  const ioc = IOC[country] || IOC[m.country] || null;
  const status = m.section === 'Table 2' ? 'full' : 'associate';
  return {
    country,
    iihf_status: status,
    ioc_code: ioc,
    date_joined: parseDate(m.dateJoined),
    organization: m.org,
    president: m.president || null,
    mens_ranking: parseRanking(m.mensRank),
    womens_ranking: parseRanking(m.womensRank),
    has_mens_team: hasTeam(m.teams, 'M,'),
    has_womens_team: hasTeam(m.teams, 'W'),
    has_u20_team: hasTeam(m.teams, 'M-U20'),
    has_u18_mens: hasTeam(m.teams, 'M-U18'),
    has_u18_womens: hasTeam(m.teams, 'W-U18'),
  };
});

// Build national_teams rows. Compute team types from raw Wikipedia data.
const teamRows = [];
for (const m of current) {
  const country = NAME_MAP[m.country] || m.country;
  const slugBase = countryToSlug(country);
  
  // Regex: 'W' that is NOT followed by '-U18'. The teams column format is consistent
  // (e.g. "M, M-U20, M-U18, W, W-U18, inline" or "M, M-U20, M-U18, W, W-U18, inline").
  const m_hasMen     = /(?:^|,\s*)M(?=,|$)/.test(m.teams);
  const m_hasWomen   = /(?:^|,\s*)W(?=,|$)/.test(m.teams);
  const m_hasU20     = hasTeam(m.teams, 'M-U20');
  const m_hasU18M    = hasTeam(m.teams, 'M-U18');
  const m_hasU18W    = hasTeam(m.teams, 'W-U18');
  
  const teamDefs = [
    { type: 'mens',       flag: m_hasMen,   name: `${country} Men's National Ice Hockey Team`,       rank: parseRanking(m.mensRank) },
    { type: 'womens',     flag: m_hasWomen, name: `${country} Women's National Ice Hockey Team`,     rank: parseRanking(m.womensRank) },
    { type: 'mens_u20',   flag: m_hasU20,   name: `${country} Men's U20 National Ice Hockey Team`,   rank: null },
    { type: 'mens_u18',   flag: m_hasU18M,  name: `${country} Men's U18 National Ice Hockey Team`,   rank: null },
    { type: 'womens_u18', flag: m_hasU18W,  name: `${country} Women's U18 National Ice Hockey Team`, rank: null },
  ];
  
  for (const t of teamDefs) {
    if (t.flag) {
      teamRows.push({
        country,
        team_type: t.type,
        team_name: t.name,
        ranking: t.rank,
        ranking_label: t.rank ? `World #${t.rank}` : 'Unranked',
        slug: `${slugBase}-${t.type.replace('_', '-')}`,
      });
    }
  }
}

console.log(`\niihf_member_nations rows: ${memberRows.length}`);
console.log(`national_teams rows: ${teamRows.length}`);

// Save JSON for next step
writeFileSync('/tmp/iihf-seed-members.json', JSON.stringify(memberRows, null, 2));
writeFileSync('/tmp/iihf-seed-teams.json', JSON.stringify(teamRows, null, 2));

// Quick check: countries in our rinks DB
const { createClient } = await import('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: rinks } = await s.from('rinks').select('country').eq('is_active', true);
const rinkCountries = new Set((rinks||[]).map(r=>r.country).filter(Boolean));
const inRinks = memberRows.filter(m => rinkCountries.has(m.country));
const notInRinks = memberRows.filter(m => !rinkCountries.has(m.country));
console.log(`\n${inRinks.length} IIHF members have rinks in our DB`);
console.log(`${notInRinks.length} don't (we won't link them but they're still seeded)`);
console.log('\nSample unmapped:', notInRinks.slice(0,5).map(m => m.country).join(', '));
