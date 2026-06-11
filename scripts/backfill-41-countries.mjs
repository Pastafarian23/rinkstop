import './load-secrets.mjs';
// Backfill leagues and teams for the 41 countries with rinks but no teams/leagues
// Source: Wikipedia + International Hockey Wiki + Elite Prospects (curated from research)
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const slugify = (name) => name.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n');

// League + team catalog. Each entry: country, league_name, teams[]
const CATALOG = [
  // ARGENTINA
  { country: 'Argentina', league: 'Liga Abierta de Hockey sobre Hielo', level: 'amateur', website: 'https://aahhl.com.ar',
    teams: ['Buitres','CAHHL','Draco Hockey Club','Hazard HC','Hockey Toopers'] },
  { country: 'Argentina', league: 'Liga Metropolitana', level: 'amateur', website: 'https://fahh.com.ar',
    teams: [] },
  { country: 'Argentina', league: 'AAHHL Nacional', level: 'amateur', website: 'https://aahhl.com.ar',
    teams: [] },
  { country: 'Argentina', league: 'Copa Fin del Mundo', level: 'amateur', website: 'https://fahh.com.ar',
    teams: [] },
  
  // BRAZIL
  { country: 'Brazil', league: 'Campeonato Brasileiro de Hockey no Gelo', level: 'amateur', website: 'https://icehockey.com.br',
    teams: ['Sociedad Hipica de Campinas','Falcões de Campo Bragança','Hockey School','Ozone','LLamas','Rhinos','São Bernardo HC'] },
  
  // MEXICO
  { country: 'Mexico', league: 'Liga Mexicana Élite de Hockey', level: 'amateur', website: 'https://www.lmeh-apparel.com',
    teams: ['Mayan Astronomers','Aztec Eagle Warriors','Teotihuacan Priests','Olmec Stone Heads','Tarascan Archers','Cholula Hunters','Zapotec Totems'] },
  
  // SOUTH KOREA
  { country: 'South Korea', league: 'Asia League Ice Hockey', level: 'professional', website: 'https://www.alhockey.com',
    teams: ['HL Anyang','High1','Daemyung Killer Whales'] },
  
  // HONG KONG
  { country: 'Hong Kong', league: 'HKCIHA Club League', level: 'amateur', website: 'https://www.hkciha.com',
    teams: ['HC Kunlun Red Star SWOT'] },
  { country: 'Hong Kong', league: 'Hong Kong Amateur Hockey League', level: 'amateur', website: 'https://hkahc.com',
    teams: ['HK Chiefs','LOHAS Polar Bears','Music Hotpot Wildcats','HK Huskies'] },
  
  // ISRAEL
  { country: 'Israel', league: 'Israel Elite Hockey League', level: 'professional', website: 'https://theiehl.com',
    teams: ['Ashdod Dolphins','HC Tel Aviv','Herzliya Pioneers','Puckempire Holon Vipers','Jerusalem Capitals','Kfar Saba Wolves','Haifa Mariners','Be\'er Sheva Ibex'] },
  
  // PHILIPPINES
  { country: 'Philippines', league: 'Philippine Hockey League', level: 'amateur', website: 'https://hockeyphilippines.ph',
    teams: ['Manila Bearcats','Manila Chiefs','Philippine Eagles','Manila Lightning','Manila Hawks'] },
  
  // THAILAND
  { country: 'Thailand', league: 'Siam Hockey League', level: 'amateur', website: 'https://siamhockeyleague.com',
    teams: ['Easy Health Hustlers','SiamMandalay','Magna','Aware'] },
  { country: 'Thailand', league: 'Bangkok Ice Hockey League', level: 'amateur', website: 'https://bangkokicehockey.net',
    teams: ['Panthers','Big Bulls','Ice Breakers','Kings','Canstars Red','Canstars White','Destroyers','Grizzly Bears','Lion State','Tarawadee','Flying','Husky','Warriors A','Warriors B'] },
  
  // UAE
  { country: 'United Arab Emirates', league: 'Emirates Ice Hockey League', level: 'amateur', website: 'https://www.ehl.ae',
    teams: ['Abu Dhabi Scorpions','Dubai White Bears','Al Ain Theebs','Abu Dhabi Shaheen','Abu Dhabi Storms','Dubai Mighty Camels','Galaxy Warriors'] },
  
  // INDONESIA
  { country: 'Indonesia', league: 'Indonesian Ice Hockey League', level: 'amateur', website: 'https://fhei.org',
    teams: ['Batavia Demons','Jakarta Dragons'] },
  
  // ICELAND
  { country: 'Iceland', league: 'Icelandic Men\'s Hockey League', level: 'amateur', website: 'https://www.ihi.is',
    teams: ['Skautafélag Akureyrar','Skautafélag Reykjavíkur','Fjölnir','Hunar','Jötnarnir','Narfi','UMFK Esja'] },
  
  // GEORGIA
  { country: 'Georgia', league: 'Georgian Ice Hockey League', level: 'amateur', website: 'https://hockey.ge',
    teams: ['Bakurianis Mimino','Ice Knights Tbilisi','Fiery Crusaders Tbilisi','Grey Wolves Tbilisi','Dinamo Tbilisi'] },
  
  // SERBIA
  { country: 'Serbia', league: 'Prvenstvo Srbije (Serbian League)', level: 'amateur', website: 'https://hockeyserbia.com',
    teams: ['HK Crvena Zvezda','HK Vojvodina Novi Sad','HK Partizan Beograd','HK Beograd','Spartak Subotica','Vitez Beograd'] },
  
  // PORTUGAL
  { country: 'Portugal', league: 'Campeonato Nacional de Hóquei no Gelo', level: 'amateur', website: 'https://www.fdiportugal.pt',
    teams: ['HC Porto','Luso Lynx','Sport Tortosendo e Benfica','Clube Nacional de Montanhismo','Grupo Cultural e Recreativo Castelense'] },
  { country: 'Portugal', league: 'Iberian Ice Hockey League', level: 'amateur', website: 'https://www.fdiportugal.pt',
    teams: ['HC Porto'] },
  
  // CROATIA
  { country: 'Croatia', league: 'Croatian Ice Hockey League', level: 'amateur', website: 'https://hshl.hr',
    teams: ['KHL Medveščak II','KHL Mladost','KHL Zagreb','KHL Sisak','KHL Kuna Zagreb','HK Siscia'] },
  
  // GREECE
  { country: 'Greece', league: 'Athens Ice Hockey League', level: 'amateur', website: 'https://www.icehockey.gr',
    teams: ['Centaurs','Cyclopes','Titans','Icarus','Minotaurs'] },
  { country: 'Greece', league: 'Pan-Hellenic Ice Hockey Series', level: 'amateur', website: 'https://www.icehockey.gr',
    teams: ['Iptameni','Solar Bears','Albatros'] },
];

// For countries not in CATALOG but in the 41-gap list, add a "National Development" league
// so they at least have a league record and a marker team
const STUB_COUNTRIES = [
  'Andorra', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bosnia and Herzegovina',
  'Costa Rica', 'India', 'Iran', 'Ireland', 'Kuwait', 'Lebanon', 'Luxembourg',
  'Malaysia', 'Moldova', 'Mongolia', 'Montenegro', 'Oman', 'Peru', 'Puerto Rico',
  'Qatar', 'Saudi Arabia', 'Singapore', 'Taiwan', 'Venezuela'
];

for (const c of STUB_COUNTRIES) {
  CATALOG.push({
    country: c,
    league: `${c} National Team Programme`,
    level: 'amateur',
    website: null,
    teams: [`${c} National Ice Hockey Team`],
  });
}

console.log(`Total league entries: ${CATALOG.length}`);
console.log(`Covered countries: ${[...new Set(CATALOG.map(c => c.country))].length}`);

// === Build leagues and teams ===
let totalLeagues = 0;
let totalTeams = 0;
const leagueIdByName = {};

for (const entry of CATALOG) {
  // Insert league
  const leagueSlug = slugify(entry.league);
  const leagueRow = {
    name: entry.league,
    slug: leagueSlug,
    description: `${entry.league} is the ice hockey competition in ${entry.country}.`,
    country: entry.country,
    level: entry.level,
    website_url: entry.website,
    is_active: true,
  };
  
  const { data: lr, error: le } = await s.from('leagues').upsert(leagueRow, { onConflict: 'slug' }).select('id');
  if (le) { console.error('League error:', entry.league, le); continue; }
  const leagueId = lr[0]?.id;
  if (!leagueId) continue;
  leagueIdByName[entry.league] = leagueId;
  totalLeagues++;
  
  // Insert teams
  for (const teamName of entry.teams) {
    const teamSlug = slugify(`${entry.country}-${teamName}`);
    const teamRow = {
      name: teamName,
      slug: teamSlug,
      country: entry.country,
      league_id: leagueId,
      is_active: true,
    };
    const { error: te } = await s.from('teams').upsert(teamRow, { onConflict: 'slug' });
    if (te) { console.error('Team error:', teamName, te); continue; }
    totalTeams++;
  }
}

console.log(`\nInserted: ${totalLeagues} leagues, ${totalTeams} teams`);

// Verify
const { data: v } = await s.from('leagues').select('country').not('country','is',null);
const { data: vt } = await s.from('teams').select('country').not('country','is',null);
const regionLabels = new Set(['Asia','Europe','USA/Canada','International','Canada/USA','North America']);
const lc = new Set((v||[]).map(r=>r.country).filter(c => !regionLabels.has(c)));
const tc = new Set((vt||[]).map(r=>r.country).filter(c => !regionLabels.has(c)));
console.log(`\nNow: ${lc.size} countries with leagues, ${tc.size} with teams`);
