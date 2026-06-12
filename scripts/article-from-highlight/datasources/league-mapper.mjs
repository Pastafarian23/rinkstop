/**
 * League mapper: maps Highlightly league_name strings to (a) our internal
 * league_id, (b) the source adapter to use, and (c) country_slug for
 * cross-link. Built 2026-06-12 to support multi-league article re-write.
 *
 * Highlightly league names we see in the wild:
 *   - "NHL" → 2b5f2b9d-84b9-4edb-8373-a732b72f4e40 (National Hockey League)
 *   - "AHL" → b05d6d26-d5d6-4cfd-a48b-f5646fa7d611 (American Hockey League)
 *   - "OHL" → (Ontario Hockey League — HockeyTech-backed)
 *   - "WHL" → 46f49db9-e63d-407d-a99c-802f87576ab2 (Western Hockey League — Canadian major junior)
 *   - "QMJHL" / "LHJMQ" → deb6816a-ccaf-48bf-9f5e-5a7c3387f922 (Quebec Major Junior Hockey League)
 *   - "ECHL" → (HockeyTech)
 *   - "KHL" → a08f6dac-eb1f-48b6-a11b-56fbb5642752 (Kontinental Hockey League)
 *   - "VHL" → (Vysshaya Hokkeynaya Liga — Russia 2nd tier, KHL mobile API serves this)
 *   - "MHL" → (Molodezhnaya Hokkeynaya Liga — Russia junior, KHL mobile API)
 *   - "SHL" → 69d4de0c-b072-4f52-8950-eb728acdc7f9 (Swedish Hockey League)
 *   - "Hockey Allsvenskan" → (Sweden 2nd tier)
 *   - "Liiga" → 59d8bbfc-2010-424b-8022-22d5bb53faaa (Finnish Liiga)
 *   - "DEL" → (Deutsche Eishockey Liga — Germany)
 *   - "National League" → e6aedcba-b94e-4ac8-89e5-537dcf8f1526 (Swiss National League)
 *   - "Memorial Cup" → (CHL championship)
 *   - "SPHL" → (Southern Professional Hockey)
 *   - "IIHF" / "World Championship" → (IIHF WC, IIHF API)
 *
 * The internal league_id values were captured from the live leagues table
 * on 2026-06-12. They must be re-checked if the league table is reseeded.
 */

const LEAGUE_MAP = {
  // Name keys (lowercased, with various aliases)
  'nhl': { id: '2b5f2b9d-84b9-4edb-8373-a732b72f4e40', name: 'National Hockey League', shortName: 'NHL', source: 'nhlcom', country: 'usa' },
  'national hockey league': { id: '2b5f2b9d-84b9-4edb-8373-a732b72f4e40', name: 'National Hockey League', shortName: 'NHL', source: 'nhlcom', country: 'usa' },
  
  'ahl': { id: 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611', name: 'American Hockey League', shortName: 'AHL', source: 'hockeytech', country: 'usa' },
  'american hockey league': { id: 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611', name: 'American Hockey League', shortName: 'AHL', source: 'hockeytech', country: 'usa' },
  
  'ohl': { id: null, name: 'Ontario Hockey League', shortName: 'OHL', source: 'hockeytech', country: 'canada' },
  'ontario hockey league': { id: null, name: 'Ontario Hockey League', shortName: 'OHL', source: 'hockeytech', country: 'canada' },
  
  'whl': { id: '46f49db9-e63d-407d-a99c-802f87576ab2', name: 'Western Hockey League', shortName: 'WHL', source: 'hockeytech', country: 'canada' },
  'western hockey league': { id: '46f49db9-e63d-407d-a99c-802f87576ab2', name: 'Western Hockey League', shortName: 'WHL', source: 'hockeytech', country: 'canada' },
  
  'qmjhl': { id: 'deb6816a-ccaf-48bf-9f5e-5a7c3387f922', name: 'Quebec Major Junior Hockey League', shortName: 'QMJHL', source: 'hockeytech', country: 'canada' },
  'lhjmq': { id: 'deb6816a-ccaf-48bf-9f5e-5a7c3387f922', name: 'Quebec Major Junior Hockey League', shortName: 'QMJHL', source: 'hockeytech', country: 'canada' },
  'quebec major junior hockey league': { id: 'deb6816a-ccaf-48bf-9f5e-5a7c3387f922', name: 'Quebec Major Junior Hockey League', shortName: 'QMJHL', source: 'hockeytech', country: 'canada' },
  
  'echl': { id: null, name: 'ECHL', shortName: 'ECHL', source: 'hockeytech', country: 'usa' },
  
  'khl': { id: 'a08f6dac-eb1f-48b6-a11b-56fbb5642752', name: 'Kontinental Hockey League', shortName: 'KHL', source: 'thesportsdb', country: 'russia' },
  'kontinental hockey league': { id: 'a08f6dac-eb1f-48b6-a11b-56fbb5642752', name: 'Kontinental Hockey League', shortName: 'KHL', source: 'thesportsdb', country: 'russia' },
  
  'vhl': { id: null, name: 'VHL', shortName: 'VHL', source: 'thesportsdb', country: 'russia' },
  'mhl': { id: null, name: 'MHL', shortName: 'MHL', source: 'thesportsdb', country: 'russia' },
  
  'shl': { id: '69d4de0c-b072-4f52-8950-eb728acdc7f9', name: 'Swedish Hockey League', shortName: 'SHL', source: 'thesportsdb', country: 'sweden' },
  'swedish hockey league': { id: '69d4de0c-b072-4f52-8950-eb728acdc7f9', name: 'Swedish Hockey League', shortName: 'SHL', source: 'thesportsdb', country: 'sweden' },
  
  'hockey allsvenskan': { id: null, name: 'Hockey Allsvenskan', shortName: 'Allsvenskan', source: 'thesportsdb', country: 'sweden' },
  'allsvenskan': { id: null, name: 'Hockey Allsvenskan', shortName: 'Allsvenskan', source: 'thesportsdb', country: 'sweden' },
  
  'liiga': { id: '59d8bbfc-2010-424b-8022-22d5bb53faaa', name: 'Liiga', shortName: 'Liiga', source: 'thesportsdb', country: 'finland' },
  'sm-liiga': { id: '356b87b0-3792-4e4e-93cb-5c1d04c570a3', name: 'SM-liiga', shortName: 'Liiga', source: 'thesportsdb', country: 'finland' },
  
  'del': { id: null, name: 'DEL', shortName: 'DEL', source: 'thesportsdb', country: 'germany' },
  'deutsche eishockey liga': { id: null, name: 'DEL', shortName: 'DEL', source: 'thesportsdb', country: 'germany' },
  
  'national league': { id: 'e6aedcba-b94e-4ac8-89e5-537dcf8f1526', name: 'Swiss National League', shortName: 'NL', source: 'thesportsdb', country: 'switzerland' },
  'swiss national league': { id: 'e6aedcba-b94e-4ac8-89e5-537dcf8f1526', name: 'Swiss National League', shortName: 'NL', source: 'thesportsdb', country: 'switzerland' },
  
  'memorial cup': { id: null, name: 'Memorial Cup', shortName: 'Memorial Cup', source: 'thesportsdb', country: 'canada' },
  'canadian memorial cup': { id: null, name: 'Memorial Cup', shortName: 'Memorial Cup', source: 'thesportsdb', country: 'canada' },
  
  'sphl': { id: null, name: 'SPHL', shortName: 'SPHL', source: 'thesportsdb', country: 'usa' },
  'southern professional hockey': { id: null, name: 'SPHL', shortName: 'SPHL', source: 'thesportsdb', country: 'usa' },
  'american sphl': { id: null, name: 'SPHL', shortName: 'SPHL', source: 'thesportsdb', country: 'usa' },
  
  'iihf': { id: null, name: 'IIHF', shortName: 'IIHF', source: 'iihf', country: null },
  'world championship': { id: null, name: 'IIHF World Championship', shortName: 'IIHF WC', source: 'iihf', country: null },
  'iihf world championship': { id: null, name: 'IIHF World Championship', shortName: 'IIHF WC', source: 'iihf', country: null },
  
  'ncaa': { id: '498c6b36-a83a-4e81-9829-a2f9ca3a03f8', name: 'NCAA Division 1 Men\'s Hockey', shortName: 'NCAA', source: 'ncaa', country: 'usa' },
  'ncaa division 1 men\'s hockey': { id: '498c6b36-a83a-4e81-9829-a2f9ca3a03f8', name: 'NCAA Division 1 Men\'s Hockey', shortName: 'NCAA', source: 'ncaa', country: 'usa' },
  
  'chl': { id: '16e6d71d-907b-4b4e-bd1f-fc8147a3daa1', name: 'Canadian Hockey League', shortName: 'CHL', source: 'highlightly', country: 'canada' },
  'canadian hockey league': { id: '16e6d71d-907b-4b4e-bd1f-fc8147a3daa1', name: 'Canadian Hockey League', shortName: 'CHL', source: 'highlightly', country: 'canada' },
};

/**
 * Look up a league by its Highlightly league_name (or any of the alias keys).
 * Returns { id, name, source, country } or null.
 */
export function mapLeague(highlightlyLeagueName) {
  if (!highlightlyLeagueName) return null;
  const key = String(highlightlyLeagueName).trim().toLowerCase();
  return LEAGUE_MAP[key] || null;
}

/**
 * Map league_name from a highlight record (which can be a string, JSON
 * string, or object) to our internal mapping.
 */
export function mapHighlightLeague(leagueRaw) {
  if (!leagueRaw) return null;
  let name = leagueRaw;
  if (typeof leagueRaw === 'string') {
    const t = leagueRaw.trim();
    if (t.startsWith('{')) {
      try { name = JSON.parse(t).name; } catch { name = t; }
    }
  } else if (typeof leagueRaw === 'object') {
    name = leagueRaw.name;
  }
  return mapLeague(name);
}
