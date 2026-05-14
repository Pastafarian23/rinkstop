#!/usr/bin/env node
/**
 * RinkStop Phase 1 Data Import
 * Sources: NHL official API (free, no key required)
 * Strategy: Plain POST inserts, duplicates ignored via PostgreSQL ON CONFLICT
 */

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_KEY = 'sb_secret_fJ-ROIi_4NWVvtJQ2GDnhA_NWMutFxA';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function fetchNHL(path) {
  const res = await fetch(`https://api.nhle.com/stats/rest/en/${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function fetchNHLWeb(path) {
  const res = await fetch(`https://api-web.nhle.com/v1/${path}`);
  if (!res.ok) throw new Error(`web ${path} → ${res.status}`);
  return res.json();
}

async function upsert(table, rows) {
  if (!rows.length) return { ok: true, count: 0 };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res.ok && res.status !== 409) {
    const err = await res.text();
    throw new Error(`${table}: ${res.status} — ${err.slice(0, 200)}`);
  }
  return { ok: true, count: rows.length };
}

async function count(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, { headers });
  const d = await res.json();
  return Array.isArray(d) ? d.length : 0;
}

async function getId(table, filter) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}&select=id`, { headers });
  const d = await res.json();
  return Array.isArray(d) && d.length ? d[0].id : null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Seed Data ───────────────────────────────────────────────────────────────
const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

const EXTRA_LEAGUES = [
  { name: 'American Hockey League',                  slug: 'ahl',    country: 'USA/Canada',    level: 'professional', website_url: 'https://theahl.com' },
  { name: 'Kontinental Hockey League',               slug: 'khl',   country: 'Russia',        level: 'professional', website_url: 'https://khl.ru' },
  { name: 'Swedish Hockey League',                   slug: 'shl',   country: 'Sweden',        level: 'professional', website_url: 'https://shl.se' },
  { name: 'Finnish Liiga',                            slug: 'liiga', country: 'Finland',      level: 'professional', website_url: 'https://liiga.fi' },
  { name: 'Deutsche Eishockey Liga',                 slug: 'del',   country: 'Germany',       level: 'professional', website_url: 'https://del.org' },
  { name: 'National League (Switzerland)',             slug: 'nl-ch', country: 'Switzerland',   level: 'professional', website_url: 'https://nationalleague.ch' },
  { name: 'Czech Extraliga',                          slug: 'extraliga-cz', country: 'Czech Republic', level: 'professional', website_url: 'https://hokej.cz' },
  { name: 'ECHL',                                      slug: 'echl',  country: 'USA/Canada',    level: 'professional', website_url: 'https://echl.com' },
  { name: 'Ontario Hockey League',                    slug: 'ohl',  country: 'Canada',        level: 'junior',      website_url: 'https://ontariohockeyleague.com' },
  { name: 'Western Hockey League',                    slug: 'whl',  country: 'Canada/USA',    level: 'junior',      website_url: 'https://whl.ca' },
  { name: 'Quebec Major Junior Hockey League',        slug: 'qmjhl', country: 'Canada',       level: 'junior',      website_url: 'https://lhjmq.qc.ca' },
  { name: 'IIHF World Championship',                  slug: 'iihf-worlds', country: 'International', level: 'professional', website_url: 'https://iihf.com' },
  { name: 'Asia League Ice Hockey',                  slug: 'asia-league', country: 'Asia',    level: 'professional', website_url: 'https://asia-league.com' },
  { name: 'Philippine Ice Hockey Association',        slug: 'piha', country: 'Philippines',    level: 'amateur',     website_url: 'https://piha.ph' },
];

const NHL_TEAMS = [
  { tricode:'ANA', name:'Anaheim Ducks',           city:'Anaheim',       state:'CA', arena:'Honda Center',             capacity:17174 },
  { tricode:'BOS', name:'Boston Bruins',            city:'Boston',        state:'MA', arena:'TD Garden',              capacity:17850 },
  { tricode:'BUF', name:'Buffalo Sabres',           city:'Buffalo',        state:'NY', arena:'KeyBank Center',         capacity:19070 },
  { tricode:'CGY', name:'Calgary Flames',           city:'Calgary',       state:'AB', arena:'Scotiabank Saddledome',  capacity:19289 },
  { tricode:'CAR', name:'Carolina Hurricanes',      city:'Raleigh',       state:'NC', arena:'PNC Arena',              capacity:19722 },
  { tricode:'CHI', name:'Chicago Blackhawks',       city:'Chicago',       state:'IL', arena:'United Center',         capacity:19717 },
  { tricode:'COL', name:'Colorado Avalanche',       city:'Denver',        state:'CO', arena:'Ball Arena',             capacity:18007 },
  { tricode:'CBJ', name:'Columbus Blue Jackets',    city:'Columbus',      state:'OH', arena:'Nationwide Arena',       capacity:18500 },
  { tricode:'DAL', name:'Dallas Stars',             city:'Dallas',        state:'TX', arena:'American Airlines Center',capacity:18532 },
  { tricode:'DET', name:'Detroit Red Wings',        city:'Detroit',       state:'MI', arena:'Little Caesars Arena',  capacity:19515 },
  { tricode:'EDM', name:'Edmonton Oilers',          city:'Edmonton',      state:'AB', arena:'Rogers Place',          capacity:18347 },
  { tricode:'FLA', name:'Florida Panthers',         city:'Sunrise',       state:'FL', arena:'Amerant Bank Arena',     capacity:19250 },
  { tricode:'LAK', name:'Los Angeles Kings',        city:'Los Angeles',   state:'CA', arena:'Crypto.com Arena',      capacity:18230 },
  { tricode:'MIN', name:'Minnesota Wild',            city:'Saint Paul',   state:'MN', arena:'Xcel Energy Center',    capacity:18064 },
  { tricode:'MTL', name:'Montréal Canadiens',       city:'Montreal',     state:'QC', arena:'Bell Centre',           capacity:21302 },
  { tricode:'NSH', name:'Nashville Predators',      city:'Nashville',    state:'TN', arena:'Bridgestone Arena',     capacity:17159 },
  { tricode:'NJD', name:'New Jersey Devils',         city:'Newark',       state:'NJ', arena:'Prudential Center',     capacity:16514 },
  { tricode:'NYI', name:'New York Islanders',       city:'Elmont',        state:'NY', arena:'UBS Arena',             capacity:17113 },
  { tricode:'NYR', name:'New York Rangers',         city:'New York',     state:'NY', arena:'Madison Square Garden',  capacity:18006 },
  { tricode:'OTT', name:'Ottawa Senators',          city:'Ottawa',       state:'ON', arena:'Canadian Tire Centre',   capacity:18652 },
  { tricode:'PHI', name:'Philadelphia Flyers',      city:'Philadelphia', state:'PA', arena:'Wells Fargo Center',    capacity:19543 },
  { tricode:'PIT', name:'Pittsburgh Penguins',      city:'Pittsburgh',   state:'PA', arena:'PPG Paints Arena',      capacity:18387 },
  { tricode:'STL', name:'St. Louis Blues',          city:'St. Louis',   state:'MO', arena:'Enterprise Center',    capacity:18096 },
  { tricode:'SJS', name:'San Jose Sharks',          city:'San Jose',     state:'CA', arena:'SAP Center',             capacity:17562 },
  { tricode:'SEA', name:'Seattle Kraken',            city:'Seattle',     state:'WA', arena:'Climate Pledge Arena',  capacity:17100 },
  { tricode:'TBL', name:'Tampa Bay Lightning',       city:'Tampa',       state:'FL', arena:'Amalie Arena',          capacity:19092 },
  { tricode:'TOR', name:'Toronto Maple Leafs',      city:'Toronto',     state:'ON', arena:'Scotiabank Arena',      capacity:18819 },
  { tricode:'UTA', name:'Utah Hockey Club',         city:'Salt Lake City',state:'UT', arena:'Delta Center',        capacity:18306 },
  { tricode:'VAN', name:'Vancouver Canucks',        city:'Vancouver',    state:'BC', arena:'Rogers Arena',          capacity:18910 },
  { tricode:'VGK', name:'Vegas Golden Knights',    city:'Las Vegas',   state:'NV', arena:'T-Mobile Arena',         capacity:17500 },
  { tricode:'WSH', name:'Washington Capitals',      city:'Washington',  state:'DC', arena:'Capital One Arena',     capacity:18573 },
  { tricode:'WPG', name:'Winnipeg Jets',             city:'Winnipeg',    state:'MB', arena:'Canada Life Centre',     capacity:15321 },
];

const BRANDS = [
  { name:'Bauer',     slug:'bauer',     category:'skates',    country_of_origin:'Canada',       website_url:'https://bauer.com',          description:'Premier hockey equipment manufacturer founded in 1927.' },
  { name:'CCM',       slug:'ccm',       category:'skates',    country_of_origin:'Canada',       website_url:'https://ccmhockey.com',      description:'Canada Cycle & Motor Co. — hockey brand since 1899.' },
  { name:'Warrior',   slug:'warrior',   category:'sticks',   country_of_origin:'USA',         website_url:'https://warriorsports.com',  description:'High-performance hockey sticks and equipment.' },
  { name:'Easton',    slug:'easton',    category:'sticks',   country_of_origin:'USA',         website_url:'https://eastonsports.com',   description:'Pioneer in composite stick technology.' },
  { name:'Vaughn',    slug:'vaughn',    category:'pads',     country_of_origin:'USA',         website_url:'https://vaughnhockey.com',   description:'Specialist goalie equipment manufacturer.' },
  { name:"Brian's",   slug:'brians',    category:'pads',     country_of_origin:'Canada',      website_url:'https://brianshockey.com',  description:'Custom goalie equipment made in Canada.' },
  { name:'True',      slug:'true',      category:'skates',   country_of_origin:'Canada',      website_url:'https://truesports.com',     description:'Custom skates and sticks — official NHL supplier.' },
  { name:'Sherwood',  slug:'sherwood',  category:'sticks',  country_of_origin:'Canada',      website_url:'https://sherwoodhockey.com', description:'Classic Canadian hockey stick brand.' },
  { name:'Graf',      slug:'graf',      category:'skates',   country_of_origin:'Switzerland',  website_url:'https://graf-skates.com',  description:'Swiss precision skate manufacturer.' },
  { name:'Tackla',    slug:'tackla',    category:'apparel',  country_of_origin:'Finland',    website_url:'https://tackla.com',        description:'Finnish hockey apparel and equipment.' },
  { name:'Bauer Goalie',slug:'bauer-goalie',category:'pads', country_of_origin:'Canada',     website_url:'https://bauer.com/goalie',  description:'Bauer goalie equipment line.' },
  { name:'Champion',  slug:'champion', category:'apparel',  country_of_origin:'USA',        website_url:'https://championsports.com', description:'Hockey apparel and equipment brand.' },
];

const POS_MAP = { C:'center', L:'left_wing', R:'right_wing', D:'defenseman', G:'goalie' };

async function main() {
  console.log('🏒 RinkStop Phase 1 Import\n');

  let c = await count('leagues'); console.log(`① Current leagues: ${c}`);

  // ── Leagues ───────────────────────────────────────────────────────────────
  if (c === 1) {
    await upsert('leagues', EXTRA_LEAGUES);
    console.log(`② Inserted ${EXTRA_LEAGUES.length} extra leagues`);
  }

  // ── NHL Arenas → Rinks ──────────────────────────────────────────────────
  c = await count('rinks');
  console.log(`\n③ Current rinks: ${c}`);
  if (c === 0) {
    const rinks = NHL_TEAMS.map(t => ({
      name: t.arena, slug: slug(t.arena),
      city: t.city, province_state: t.state,
      country: ['AB','BC','MB','ON','QC'].includes(t.state) ? 'Canada' : 'USA',
      capacity: t.capacity, ice_size: 'NHL', surface_type: 'ice', is_active: true,
    }));
    await upsert('rinks', rinks);
    console.log(`   ✓ ${rinks.length} NHL arenas inserted`);
  } else {
    console.log('   ⏩ rinks already populated, skipping');
  }

  // ── NHL Teams ───────────────────────────────────────────────────────────
  c = await count('teams');
  console.log(`\n④ Current teams: ${c}`);
  if (c === 0) {
    const teamRows = NHL_TEAMS.map(t => ({
      name: t.name, slug: slug(t.name), league_id: NHL_LEAGUE_ID,
      city: t.city,
      country: ['AB','BC','MB','ON','QC'].includes(t.state) ? 'Canada' : 'USA',
      logo_url: `https://assets.nhle.com/logos/nhl/svg/${t.tricode}_light.svg`,
      website_url: `https://nhl.com/${t.tricode.toLowerCase()}`,
      is_active: true,
    }));
    await upsert('teams', teamRows);
    console.log(`   ✓ ${teamRows.length} NHL teams inserted`);
  } else {
    console.log('   ⏩ teams already populated, skipping');
  }

  // ── Rosters ──────────────────────────────────────────────────────────────
  const playerCount = await count('players');
  console.log(`\n⑤ Current players: ${playerCount}`);
  if (playerCount < 100) {
    console.log('   Fetching rosters from NHL API...');
    let total = 0, errors = 0;
    for (const team of NHL_TEAMS) {
      try {
        const data = await fetchNHLWeb(`roster/${team.tricode}/20242025`);
        const all = [...(data.forwards||[]), ...(data.defensemen||[]), ...(data.goalies||[])];
        if (!all.length) { console.log(`   ? ${team.tricode}: no roster`); continue; }

        const teamSlug = slug(team.name);
        const teamId  = await getId('teams', `slug=eq.${teamSlug}`);
        if (!teamId) { console.log(`   ! ${team.tricode}: no team id`); continue; }

        const rows = all.map(p => {
          const fn = p.firstName?.default || '';
          const ln = p.lastName?.default  || '';
          return {
            first_name:   fn,
            last_name:    ln,
            slug:         slug(`${fn}-${ln}-${team.tricode}`),
            team_id:      teamId,
            position:     POS_MAP[p.positionCode] || null,
            jersey_number: p.sweaterNumber || null,
            headshot_url: p.headshot || null,
            is_active:    true,
          };
        });

        await upsert('players', rows);
        total += rows.length;
        process.stdout.write(`   ✓ ${team.tricode} (${rows.length} players)\n`);
        await sleep(120);
      } catch(e) {
        console.log(`   ✗ ${team.tricode}: ${e.message}`);
        errors++;
      }
    }
    console.log(`\n   Players added: ${total} | Errors: ${errors}`);
  } else {
    console.log('   ⏩ players already populated, skipping');
  }

  // ── Brands ──────────────────────────────────────────────────────────────
  c = await count('brands');
  console.log(`\n⑥ Current brands: ${c}`);
  if (c === 0) {
    await upsert('brands', BRANDS.map(b => ({ ...b, is_active: true })));
    console.log(`   ✓ ${BRANDS.length} brands inserted`);
  } else {
    console.log('   ⏩ brands already populated, skipping');
  }

  // ── Final ───────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('✅ Import Complete!');
  console.log('════════════════════════════════════════');
  for (const t of ['leagues','teams','players','rinks','brands']) {
    const n = await count(t);
    console.log(`  ${t}: ${n}`);
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });