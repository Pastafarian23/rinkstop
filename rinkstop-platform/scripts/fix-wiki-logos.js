const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://yszheonqyyskkjoxoexk.supabase.co', 'sb_secret_fJ-ROIi_4NWVvtJQ2GDnhA_NWMutFxA');

async function main() {
  // Step 1: Add logo_source column
  // Supabase doesn't allow direct DDL via REST, but we can use the management API
  // Instead, let's just track source in a separate tracking approach
  // For now, mark Wikipedia-sourced logos by including 'wiki' in the URL

  const wikiLogos = {
    // AHL teams - Wikipedia Commons
    'Bakersfield Condors': 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Bakersfield_Condors.svg/200px-Bakersfield_Condors.svg.png',
    'Belleville Senators': 'https://upload.wikimedia.org/wikipedia/en/thumb/9/95/Belleville_Senators_logo.svg/200px-Belleville_Senators_logo.svg.png',
    'Iowa Wild': 'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Iowa_Wild.svg/200px-Iowa_Wild.svg.png',
    'Laval Rocket': 'https://upload.wikimedia.org/wikipedia/en/thumb/3/37/Laval_Rocket.svg/200px-Laval_Rocket.svg.png',
    'Manitoba Moose': 'https://upload.wikimedia.org/wikipedia/en/thumb/1/11/Manitoba_Moose.svg/200px-Manitoba_Moose.svg.png',
    'Milwaukee Admirals': 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d1/Milwaukee_Admirals.svg/200px-Milwaukee_Admirals.svg.png',
    'Ontario Reign': 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3c/Ontario_Reign.svg/200px-Ontario_Reign.svg.png',
    'Rochester Americans': 'https://upload.wikimedia.org/wikipedia/en/thumb/e/ed/Rochester_Americans.svg/200px-Rochester_Americans.svg.png',
    'Santa Clara Roadrunners': 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tucson_Roadrunners.svg/200px-Tucson_Roadrunners.svg.png',
    'Stockton Heat': 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d6/Stockton_Heat.svg/200px-Stockton_Heat.svg.png',
    'Syracuse Crunch': 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6e/Syracuse_Crunch.svg/200px-Syracuse_Crunch.svg.png',
    'Texas Stars': 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Texas_Stars.svg/200px-Texas_Stars.svg.png',
    'Tucson Roadrunners': 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tucson_Roadrunners.svg/200px-Tucson_Roadrunners.svg.png',
    'Abbotsford Canucks': 'https://upload.wikimedia.org/wikipedia/en/thumb/f/fc/Abbotsford_Canucks.svg/200px-Abbotsford_Canucks.svg.png',
    // KHL teams
    'Traktor Chelyabinsk': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/52/Traktor_Chelyabinsk.svg/200px-Traktor_Chelyabinsk.svg.png',
    'Amur Khabarovsk': 'https://upload.wikimedia.org/wikipedia/en/thumb/9/96/Amur_Khabarovsk.svg/200px-Amur_Khabarovsk.svg.png',
    'Salavat Yulaev Ufa': 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d7/Salavat_Yulaev_Ufa.svg/200px-Salavat_Yulaev_Ufa.svg.png',
    'HC Lada Togliatti': 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f3/Lada_Togliatti.svg/200px-Lada_Togliatti.svg.png',
    'Sibir Novosibirsk': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5f/Sibir_Novosibirsk.svg/200px-Sibir_Novosibirsk.svg.png',
    // ECHL teams
    'Adirondack Thunder': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Adirondack_Thunder.svg/200px-Adirondack_Thunder.svg.png',
    'Atlanta Gladiators': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/51/Atlanta_Gladiators.svg/200px-Atlanta_Gladiators.svg.png',
    'Greenville Swamp Rabbits': 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Greenville_Swamp_Rabbits.svg/200px-Greenville_Swamp_Rabbits.svg.png',
    'Norfolk Admirals': 'https://upload.wikimedia.org/wikipedia/en/thumb/a/ab/Norfolk_Admirals.svg/200px-Norfolk_Admirals.svg.png',
    'Orlando Solar Bears': 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Orlando_Solar_Bears.svg/200px-Orlando_Solar_Bears.svg.png',
    'Reading Royals': 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3c/Reading_Royals.svg/200px-Reading_Royals.svg.png',
    'Worcester Railers': 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4f/Worcester_Railers.svg/200px-Worcester_Railers.svg.png',
    // Swiss
    'HC Sierre-Annecy': 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e6/HC_Sierre_Sion.svg/200px-HC_Sierre_Sion.svg.png',
    'HCfR Bruins': 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d7/HC_Fribourg-Gotteron.svg/200px-HC_Fribourg-Gotteron.svg.png',
    // Czech
    'HC Dynamo Pardubice': 'https://upload.wikimedia.org/wikipedia/en/thumb/a/af/HC_Pardubice.svg/200px-HC_Pardubice.svg.png',
    'HC Zubr Přerov': 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/HC_Zubr_Perov.svg/200px-HC_Zubr_Perov.svg.png',
    'Bílí Tygři Liberec': 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b8/Bili_Tygri_Liberec.svg/200px-Bili_Tygri_Liberec.svg.png',
    // Test
    'Test Team': null,
    'Test Team Debug': null,
  };

  // Get remaining teams
  const { data: noLogo } = await supabase.from('teams').select('id, name, league_id').is('logo_url', null);
  const { data: leagues } = await supabase.from('leagues').select('id, name');
  const leagueMap = {};
  for (const l of leagues) leagueMap[l.id] = l.name;

  const focusLeagues = ['American Hockey League','Kontinental Hockey League','ECHL',
    'Swedish Hockey League','Finnish Liiga','Deutsche Eishockey Liga','Czech Extraliga',
    'National League (Switzerland)','Ontario Hockey League','Western Hockey League',
    'Quebec Major Junior Hockey League','United States Hockey League'];

  const focus = noLogo.filter(t => focusLeagues.includes(leagueMap[t.league_id]));
  console.log('Remaining focus teams: ' + focus.length);

  let updated = 0;
  const applied = [];
  const notFound = [];
  const skipped = [];

  for (const team of focus) {
    const logoUrl = wikiLogos[team.name];
    if (logoUrl) {
      await supabase.from('teams').update({ logo_url: logoUrl }).eq('id', team.id);
      updated++;
      applied.push(team.name);
    } else if (team.name.includes('Test')) {
      skipped.push(team.name + ' (debug/test team)');
    } else {
      notFound.push(team.name + ' (' + leagueMap[team.league_id] + ')');
    }
  }

  console.log('\nUpdated with wiki logos: ' + updated);
  applied.forEach(n => console.log('  ✓ ' + n));
  console.log('\nNot found in wiki mapping: ' + notFound.length);
  notFound.forEach(n => console.log('  ✗ ' + n));
  console.log('\nSkipped: ' + skipped.length);
  skipped.forEach(n => console.log('  - ' + n));

  const { data: withLogos } = await supabase.from('teams').select('id').not('logo_url', 'is', null);
  console.log('\nTotal with logos: ' + (withLogos?.length || 0));
}

main().catch(e => console.error(e));