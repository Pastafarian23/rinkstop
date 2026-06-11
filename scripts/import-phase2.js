require('./load-secrets.cjs');
/**
 * Phase 2 Import — Leagues + Teams
 * Imports 12 leagues and ~200 teams into Supabase.
 * Run: node scripts/import-phase2.js
 *
 * Issues resolved:
 * - leagues table has no short_name column → look up by name
 * - teams table has no province_state column → append state to city
 * - leagues.level must be one of: professional, junior, amateur, youth, recreational
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SB_KEY);

// ─── League definitions ────────────────────────────────────────────────────────
const LEAGUES = [
  { name: 'American Hockey League',             level: 'professional', website: 'https://theahl.com',           country: 'USA/Canada' },
  { name: 'Kontinental Hockey League',            level: 'professional', website: 'https://www.khl.ru',          country: 'Russia' },
  { name: 'Swedish Hockey League',               level: 'professional', website: 'https://www.shl.se',          country: 'Sweden' },
  { name: 'SM-liiga',                            level: 'professional', website: 'https://www.liiga.fi',        country: 'Finland' },
  { name: 'Deutsche Eishockey Liga',             level: 'professional', website: 'https://www.del.org',        country: 'Germany' },
  { name: 'Swiss National League',               level: 'professional', website: 'https://www.nationalleague.ch', country: 'Switzerland' },
  { name: 'Czech Extraliga',                    level: 'professional', website: 'https://www.hokej.cz',       country: 'Czech Republic' },
  { name: 'ECHL',                                 level: 'professional', website: 'https://www.echl.com',      country: 'USA' },
  { name: 'Ontario Hockey League',                level: 'junior',       website: 'https://www.ohl.ca',         country: 'Canada' },
  { name: 'Western Hockey League',               level: 'junior',       website: 'https://whl.ca',             country: 'Canada' },
  { name: 'Quebec Major Junior Hockey League',   level: 'junior',       website: 'https://lhjmq.qc.ca',        country: 'Canada' },
  { name: 'IIHF World Championships',            level: 'amateur',       website: 'https://www.iihf.com',        country: 'International' },
];

// ─── Team data (cleaned) ─────────────────────────────────────────────────────

const AHL_TEAMS = [
  'Abbottford Canucks','Bakersfield Condors','Belleville Senators',
  'Bridgeport Islanders','Charlotte Checkers','Chicago Wolves',
  'Cleveland Monsters','Coachella Valley Firebirds','Colorado Eagles',
  'Grand Rapids Griffins','Hartford Wolf Pack','Hershey Bears',
  'Iowa Wild','Laval Rocket','Lehigh Valley Phantoms',
  'Manitoba Moose','Milwaukee Admirals','Nashville Predators',
  'Ontario Reign','Providence Bruins','Rochester Americans',
  'San Jose Barracuda','Santa Clara Roadrunners','Springfield Thunderbirds',
  'Stockton Heat','Syracuse Crunch','Texas Stars',
  'Toronto Marlies','Tucson Roadrunners','Utica Comets',
  'Vancouver Canucks','Wilkes-Barre/Scranton Penguins'
].map(n => ({ name: n }));

const KHL_TEAMS = [
  'AK Bars Kazan','Avangard Omsk','SKA Saint Petersburg',
  'CSKA Moscow','Dynamo Moscow','Jokerit Helsinki',
  'Lokomotiv Yaroslavl','Metallurg Magnitogorsk','Neftekhimik Nizhnekamsk',
  'Spartak Moscow','Torpedo Nizhny Novgorod','Traktor Chelyabinsk',
  'Vitiaz Podolsk','Amur Khabarovsk','Kunlun Red Star',
  'Admiral Vladivostok','Severstal Cherepovets','Dinamo Minsk',
  'Dynamo Riga','Slovan Bratislava','HC Sochi','Salavat Yulaev Ufa'
].map(n => ({ name: n }));

const SHL_TEAMS = [
  'Frolunda Indians','Växjö Lakers','Skellefteå AIK',
  'Luleå HF','HV71','Leksands IF',
  'Frölunda HC','Brynas IF','Örebro HK',
  'Linköping HC','Malmö Redhawks','IK Oskarshamn',
  'Vita Möta','Södertälje SK'
].map(n => ({ name: n }));

const LIIIGA_TEAMS = [
  'JYP Jyväskylä','KalPa Kuopio','Kärpät Oulu',
  'HIFK Helsinki','HPK Hämeenlinna','Ilves Tampere',
  'Jukurit Mikkeli','KooKoo Kouvola','Lukko Rauma',
  'Pelicans Lahti','SaiPa Lappeenranta','Sport Vaasa',
  'Tappara Tampere','TPS Turku','Ässät Pori'
].map(n => ({ name: n }));

const DEL_TEAMS = [
  'Eisbären Berlin','ERC Ingolstadt','Red Bull München',
  'Kölner Haie','Düsseldorfer EG','Frankfurt',
  'Fischtown Pinguins Bremerhaven','Straubing Tigers','Grizzlys Wolfsburg',
  'Iserlohn Roosters','Adler Mannheim','Nürnberg Ice Tigers',
  'Schwenninger Wild Wings','Eisbären München','Augsburger Panther'
].map(n => ({ name: n }));

const SWISS_TEAMS = [
  'HC Davos','SC Bern','ZSC Lions Zürich',
  'EV Zug','HC Lausanne','Genève-Servette HC',
  'HC Ambri-Piotta','HC Lugano','HC Biel-Bienne',
  'EHC Kloten','HC Sierre-Annecy','Lausanne HC',
  'HCfR Bruins'
].map(n => ({ name: n }));

const CZECH_TEAMS = [
  'HC Sparta Praha','HC Kometa Brno','HC Oceláři Třinec',
  'HC Škoda Plzeň','HC Vítkovice Ridera','Bílí Tygři Liberec',
  'HC Olomouc','HC Dynamo Pardubice','HC Karlovy Vary',
  'Mountfield HK','Rytíři Kladno','HC Litvínov',
  'HC Zubr Přerov','HC Energie Karlovy Vary'
].map(n => ({ name: n }));

const ECHL_TEAMS = [
  { name: 'Adirondack Thunder',       city: 'Glens Falls, NY' },
  { name: 'Allen Americans',           city: 'Allen, TX' },
  { name: 'Atlanta Gladiators',        city: 'Duluth, GA' },
  { name: 'Brampton Fold',            city: 'Brampton, ON' },
  { name: 'Cincinnati Cyclones',       city: 'Cincinnati, OH' },
  { name: 'Florida Everblades',        city: 'Estero, FL' },
  { name: 'Fort Wayne Komets',        city: 'Fort Wayne, IN' },
  { name: 'Greenville Swamp Rabbits',  city: 'Greenville, SC' },
  { name: 'Idaho Steelheads',         city: 'Boise, ID' },
  { name: 'Indy Fuel',               city: 'Indianapolis, IN' },
  { name: 'Iowa Heartlanders',         city: 'Des Moines, IA' },
  { name: 'Kansas City Mavericks',    city: 'Kansas City, MO' },
  { name: 'Maine Mariners',           city: 'Portland, ME' },
  { name: 'Newfoundland Growlers',    city: "St. John's, NL" },
  { name: 'Norfolk Admirals',          city: 'Norfolk, VA' },
  { name: 'Orlando Solar Bears',      city: 'Orlando, FL' },
  { name: 'Peoria Rivermen',          city: 'Peoria, IL' },
  { name: 'Reading Royals',           city: 'Reading, PA' },
  { name: 'Saint John Flames',        city: 'Saint John, NB' },
  { name: 'Savannah Ghost Pirates',  city: 'Savannah, GA' },
  { name: 'SC Kalamazoo',            city: 'Kalamazoo, MI' },
  { name: 'South Carolina Stingrays', city: 'North Charleston, SC' },
  { name: 'Toledo Walleye',           city: 'Toledo, OH' },
  { name: 'Tulsa Oilers',            city: 'Tulsa, OK' },
  { name: 'Utah Grizzlies',          city: 'West Valley City, UT' },
  { name: 'Wheeling Nailers',         city: 'Wheeling, WV' },
  { name: 'Wichita Thunder',          city: 'Wichita, KS' },
  { name: 'Worcester Railers',        city: 'Worcester, MA' },
].map(t => ({ name: t.name, city: t.city }));

const OHL_TEAMS = [
  'Barrie Colts','Belleville Bulls','Guelph Storm',
  'Hamilton Bulldogs','Kingston Frontenacs','Kitchener Rangers',
  'London Knights','Mississauga Steelheads','Niagara IceDogs',
  'North Bay Battalion','Oshawa Generals',"Ottawa 67's",
  'Owen Sound Attack','Peterborough Petes','Saginaw Spirit',
  'Sault Ste. Marie Greyhounds','Sudbury Wolves',
  'Thunderbirds',"Windsor Spitfires"
].map(n => ({ name: n }));

const WHL_TEAMS = [
  'Blain-Bois Brisbane','Brandon Wheat Kings','Calgary Hitmen',
  'Edmonton Oilers','Everett Silvertips','Kamloops Blazers',
  'Kelowna Rockets','Lethbridge Hurricanes','London Knights',
  'Medicine Hat Tigers','Moose Jaw Warriors','Portland Winterhawks',
  'Prince Albert Raiders','Prince George Cougars','Red Deer Rebels',
  'Saskatoon Blades','Seattle Thunderbirds','Spokane Chiefs',
  'Tri-City Americans','Vancouver Giants','Victoria Royals',
  'Wenatchee Wild','Winnipeg ICE'
].map(n => ({ name: n }));

const QMJHL_TEAMS = [
  'Acadie-Bathurst Titan',"Baie-Comeau Drakkar",'Blainville-Armstrong',
  'Cape Breton Eagles','Charlottetown Islanders','Chicoutimi Saguenées',
  'Drummondville Voltigeurs','Gatineau Olympiques','Granby Prédateurs',
  'Halifax Mooseheads',"Laval Rocket",'Moncton Wildcats',
  'Québec Remparts','Rimouski Océanic','Rouyn-Noranda Huskies',
  'Saint John Sea Dogs','Sherbrooke Phoenix',"Val-d'Or Foreurs",
  'Victoriaville Tigres'
].map(n => ({ name: n }));

const IIHF_TEAMS = [
  'Canada','USA','Russia','Sweden','Finland',
  'Czech Republic','Switzerland','Germany','Slovakia',
  'Latvia','Denmark','Norway','France','Italy',
  'Kazakhstan','Austria','Great Britain','Poland',
  'Hungary','Slovenia','Japan','South Korea',
  'China','Netherlands'
].map(n => ({ name: n }));

const TEAM_MAP = {
  'American Hockey League':       AHL_TEAMS,
  'Kontinental Hockey League':    KHL_TEAMS,
  'Swedish Hockey League':         SHL_TEAMS,
  'SM-liiga':                     LIIIGA_TEAMS,
  'Deutsche Eishockey Liga':      DEL_TEAMS,
  'Swiss National League':        SWISS_TEAMS,
  'Czech Extraliga':              CZECH_TEAMS,
  'ECHL':                         ECHL_TEAMS,
  'Ontario Hockey League':        OHL_TEAMS,
  'Western Hockey League':        WHL_TEAMS,
  'Quebec Major Junior Hockey League': QMJHL_TEAMS,
  'IIHF World Championships':     IIHF_TEAMS,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function generateId() { return crypto.randomUUID(); }
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

async function getLeagueId(name) {
  const { data } = await supabase.from('leagues').select('id').ilike('name', name).limit(1);
  return data?.[0]?.id || null;
}

async function upsertLeague(league) {
  const existing = await getLeagueId(league.name);
  if (existing) return existing;
  const { error } = await supabase.from('leagues').insert({
    name: league.name,
    slug: slugify(league.name),
    country: league.country,
    level: league.level,
    website_url: league.website,
    is_active: true,
  });
  if (error && !error.message.includes('duplicate') && !error.message.includes('23505')) {
    console.log(`  League error: ${error.message}`);
  }
  return await getLeagueId(league.name);
}

async function upsertTeam(team, leagueId) {
  const { error } = await supabase.from('teams').insert({
    name: team.name,
    slug: slugify(team.name),
    city: team.city || null,
    country: team.country || null,
    league_id: leagueId,
  });
  if (error && !error.message.includes('duplicate') && !error.message.includes('23505')) {
    console.log(`  Team error [${team.name}]: ${error.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Phase 2 Import ===');

  // Insert leagues
  for (const league of LEAGUES) {
    const id = await upsertLeague(league);
    if (id) console.log(`  ✓ ${league.name}`);
    await sleep(200);
  }

  // Insert teams per league
  let grandTotal = 0;
  for (const [leagueName, teams] of Object.entries(TEAM_MAP)) {
    const leagueId = await getLeagueId(leagueName);
    if (!leagueId) { console.log(`  ! League not found: ${leagueName}`); continue; }
    let count = 0;
    for (const team of teams) {
      await upsertTeam(team, leagueId);
      count++;
    }
    grandTotal += count;
    console.log(`  ✓ ${leagueName}: ${count} teams`);
    await sleep(200);
  }

  console.log(`\n=== Done: ${grandTotal} teams across ${LEAGUES.length} leagues ===`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });