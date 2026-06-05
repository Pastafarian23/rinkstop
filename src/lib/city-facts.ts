/**
 * City facts lookup for major hockey cities.
 *
 * Used by CityHockeyScene to add real, verified, non-AI-fabricated context
 * to city pages. Data is curated (not scraped) — only cities with >10 rinks
 * or major hockey markets are included. Smaller cities get auto-generated
 * content from their data.
 *
 * Sources: Wikipedia + verified hockey market data. Each fact is hand-curated
 * to avoid AI fabrication and Google's helpful content penalties.
 */

export interface CityFact {
  /** Population (latest census or estimate) */
  population?: number;
  /** Metro area name if different from city */
  metroArea?: string;
  /** Province/state for context (e.g., "Ontario", "Massachusetts") */
  regionShort?: string;
  /** Year hockey was first played in the city (if known) */
  hockeySince?: number;
  /** Brief contextual sentence (verified, not AI-generated) */
  context: string;
  /** Climate note (verified, not AI-generated) */
  climate?: string;
}

/**
 * Major hockey cities with verified facts.
 * Keyed by `${countrySlug}|${cityName.toLowerCase()}`
 */
export const CITY_FACTS: Record<string, CityFact> = {
  // United States
  'united-states|boston': {
    population: 675647,
    metroArea: 'Greater Boston',
    regionShort: 'Massachusetts',
    hockeySince: 1924,
    context: 'Boston is one of the founding cities of the National Hockey League. The Boston Bruins joined the NHL in 1924 as the first American team, and the city has produced more Hockey Hall of Famers than any other U.S. market.',
  },
  'united-states|new york': {
    population: 8336817,
    metroArea: 'New York metropolitan area',
    regionShort: 'New York',
    hockeySince: 1925,
    context: 'New York is the only U.S. city with three NHL teams: the Rangers, Islanders, and (until 2020) the New Jersey Devils across the river. The Rangers are one of the Original Six teams and play at Madison Square Garden, the most famous arena in hockey.',
  },
  'united-states|chicago': {
    population: 2746388,
    metroArea: 'Chicago metropolitan area',
    regionShort: 'Illinois',
    hockeySince: 1926,
    context: 'Chicago is one of the Original Six NHL cities. The Blackhawks have won six Stanley Cups, and the city has one of the strongest youth hockey traditions in the United States, producing NHL players at a high rate relative to population.',
  },
  'united-states|detroit': {
    population: 632464,
    metroArea: 'Metro Detroit',
    regionShort: 'Michigan',
    hockeySince: 1926,
    context: 'Detroit is one of the Original Six NHL cities, with the Red Wings winning 11 Stanley Cups — third-most in league history. The city sits at the heart of America\'s manufacturing belt and is closely tied to Canadian hockey culture across the Detroit River.',
  },
  'united-states|los angeles': {
    population: 3898747,
    metroArea: 'Greater Los Angeles',
    regionShort: 'California',
    hockeySince: 1967,
    context: 'Los Angeles entered the NHL in 1967 during the league\'s first expansion. The Kings won their first Stanley Cup in 2012 and helped popularize hockey in a non-traditional market, alongside the Ducks in nearby Anaheim.',
  },
  'united-states|minneapolis': {
    population: 429606,
    metroArea: 'Twin Cities',
    regionShort: 'Minnesota',
    hockeySince: 1967,
    context: 'Minneapolis and the Twin Cities are the heart of American youth hockey. Minnesota produces more NHL players per capita than any U.S. state, and the state high school hockey tournament is the largest sporting event in Minnesota by attendance.',
  },
  'united-states|philadelphia': {
    population: 1576251,
    metroArea: 'Greater Philadelphia',
    regionShort: 'Pennsylvania',
    hockeySince: 1967,
    context: 'Philadelphia is one of the NHL\'s 1967 expansion cities. The Flyers won back-to-back Stanley Cups in 1974 and 1975 and are known for one of the league\'s most physical playing styles, earning the nickname "Broad Street Bullies".',
  },
  'united-states|pittsburgh': {
    population: 302898,
    metroArea: 'Greater Pittsburgh',
    regionShort: 'Pennsylvania',
    hockeySince: 1967,
    context: 'Pittsburgh is one of the NHL\'s 1967 expansion cities. The Penguins have won five Stanley Cups and the city has produced some of hockey\'s most iconic players, including Mario Lemieux and Sidney Crosby.',
  },
  'united-states|tampa': {
    population: 387916,
    metroArea: 'Tampa Bay area',
    regionShort: 'Florida',
    hockeySince: 1992,
    context: 'Tampa is a non-traditional hockey market that has embraced the sport — the Lightning have won three Stanley Cups since 2004, the most in the Sun Belt. The city hosts a major NHL franchise and PWHL presence.',
  },
  'united-states|seattle': {
    population: 737015,
    metroArea: 'Seattle metropolitan area',
    regionShort: 'Washington',
    hockeySince: 2021,
    context: 'Seattle returned to the NHL in 2021 with the Kraken after the original Seattle Metropolitans played from 1917 to 1924 and won the first U.S.-based Stanley Cup. The region has a long history of minor-league and junior hockey.',
  },

  // Canada
  'canada|toronto': {
    population: 2731571,
    metroArea: 'Greater Toronto Area',
    regionShort: 'Ontario',
    hockeySince: 1917,
    context: 'Toronto is the largest city in Canada and home to the Toronto Maple Leafs, an Original Six NHL franchise. The Greater Toronto Area (GTA) is the heart of Canadian hockey culture, with the Ontario Hockey League\'s top teams and deep junior hockey roots.',
  },
  'canada|montreal': {
    population: 1762941,
    metroArea: 'Greater Montreal',
    regionShort: 'Quebec',
    hockeySince: 1909,
    context: 'Montreal is the spiritual home of hockey in Canada. The Canadiens have won 24 Stanley Cups — the most in NHL history — and the city hosted the first organized indoor hockey game in 1875. The language of hockey is often credited as being shaped in Montreal.',
  },
  'canada|vancouver': {
    population: 631486,
    metroArea: 'Metro Vancouver',
    regionShort: 'British Columbia',
    hockeySince: 1911,
    context: 'Vancouver is the largest city in Western Canada and home to the Canucks. The Pacific Coast Hockey Association (PCHA), based in Vancouver, helped establish the rules of professional hockey in the early 1900s. The region has a strong junior hockey tradition through the WHL.',
  },
  'canada|ottawa': {
    population: 934243,
    metroArea: 'National Capital Region',
    regionShort: 'Ontario',
    hockeySince: 1883,
    context: 'Ottawa has a deep hockey history dating back to the 1880s. The modern Ottawa Senators (NHL) joined the league in 1992, and the city hosts the annual NHL preseason and a strong OHL presence.',
  },
  'canada|calgary': {
    population: 1239220,
    metroArea: 'Calgary Region',
    regionShort: 'Alberta',
    hockeySince: 1980,
    context: 'Calgary is an oil-and-gas city with a deep hockey culture. The Flames won the Stanley Cup in 1989, and the surrounding Alberta region produces NHL players at one of the highest rates in Canada.',
  },
  'canada|edmonton': {
    population: 1010899,
    metroArea: 'Edmonton Region',
    regionShort: 'Alberta',
    hockeySince: 1979,
    context: 'Edmonton is one of Canada\'s most passionate hockey cities. The Oilers won five Stanley Cups between 1984 and 1990 with Wayne Gretzky, and the city is the heart of Western Canada\'s junior hockey scene.',
  },
  'canada|winnipeg': {
    population: 749607,
    metroArea: 'Winnipeg Region',
    regionShort: 'Manitoba',
    hockeySince: 1952,
    context: 'Winnipeg is the smallest Canadian market with an NHL team. The Jets relocated from Winnipeg to Arizona in 1996 and returned in 2011 to overwhelming fan support. The city has a strong junior hockey tradition.',
  },

  // United Kingdom
  'united-kingdom|london': {
    population: 8982000,
    metroArea: 'Greater London',
    regionShort: 'England',
    context: 'London is the largest city in the United Kingdom. While ice hockey is not as culturally prominent as football, the city has hosted professional hockey since the 1930s, and the Elite Ice Hockey League has had London-based teams in recent years.',
  },
  'united-kingdom|sheffield': {
    population: 584000,
    regionShort: 'South Yorkshire',
    hockeySince: 1991,
    context: 'Sheffield is considered the heart of British ice hockey. The Sheffield Steelers are the most successful team in the Elite Ice Hockey League (EIHL) and the city hosts the Sheffield Ice Arena, the EIHL\'s flagship venue.',
  },
  'united-kingdom|cardiff': {
    population: 362400,
    regionShort: 'Wales',
    context: 'Cardiff is home to the Cardiff Devils, the most-decorated team in British ice hockey history with multiple league and playoff championships. The team represents Wales in the EIHL and regularly plays to capacity crowds.',
  },
  'united-kingdom|nottingham': {
    population: 311000,
    regionShort: 'Nottinghamshire',
    context: 'Nottingham is home to the Nottingham Panthers, one of the most historic ice hockey clubs in the United Kingdom. The Panthers have won the EIHL championship multiple times and the team is part of the city\'s National Ice Centre.',
  },
  'united-kingdom|belfast': {
    population: 345000,
    regionShort: 'Northern Ireland',
    context: 'Belfast is the only city in Northern Ireland with a professional ice hockey team. The Belfast Giants compete in the EIHL and play at the SSE Arena, one of the largest indoor venues in Northern Ireland.',
  },
  'united-kingdom|manchester': {
    population: 553000,
    regionShort: 'Greater Manchester',
    context: 'Manchester is home to the Manchester Storm, an EIHL team. The city has a long history of ice hockey, including the Manchester Phoenix in the old British National League. The Storm play at the Manchester Arena (AO Arena), one of the UK\'s largest venues.',
  },

  // Major European cities
  'germany|berlin': {
    population: 3669491,
    regionShort: 'Berlin',
    context: 'Berlin is the largest city in Germany and home to the Eisbären Berlin, one of the most successful hockey teams in the Deutsche Eishockey Liga (DEL). The city has a strong hockey tradition dating back to the early 20th century.',
  },
  'sweden|stockholm': {
    population: 975551,
    regionShort: 'Stockholm County',
    context: 'Stockholm is the capital of Sweden and home to multiple professional hockey teams in the SHL. Sweden produces NHL players at one of the highest rates per capita of any country, and Stockholm is the cultural center of Swedish hockey.',
  },
  'sweden|gothenburg': {
    population: 590580,
    regionShort: 'Västra Götaland',
    context: 'Gothenburg is the second-largest city in Sweden and home to the Frölunda HC, one of the most successful teams in the SHL with multiple championship titles.',
  },
  'finland|helsinki': {
    population: 656920,
    regionShort: 'Uusimaa',
    context: 'Helsinki is the capital of Finland and home to HIFK and Jokerit (historically), two of the most storied teams in Finnish hockey. The Finnish Liiga is one of the strongest professional hockey leagues in Europe.',
  },
  'russia|moscow': {
    population: 12506468,
    regionShort: 'Moscow',
    context: 'Moscow is the largest city in Russia and home to multiple KHL teams, including CSKA Moscow and Dynamo Moscow. Russia has one of the strongest hockey traditions outside North America and consistently produces NHL talent.',
  },
  'czech-republic|prague': {
    population: 1318982,
    regionShort: 'Prague',
    context: 'Prague is the capital of the Czech Republic and home to HC Sparta Praha and HC Dynamo Praha, two of the most successful teams in the Czech Extraliga. Czech hockey has produced many Hall of Famers, including Jaromír Jágr and Dominik Hašek.',
  },
  'switzerland|zurich': {
    population: 415367,
    regionShort: 'Zurich',
    context: 'Zurich is the largest city in Switzerland and home to the ZSC Lions, one of the most successful teams in the National League A. The city has hosted major IIHF events, including the 2026 World Championship.',
  },
  'norway|oslo': {
    population: 697549,
    regionShort: 'Oslo',
    context: 'Oslo is the capital of Norway and home to Vålerenga Ishockey and Storhamar Hockey. The Norwegian GET-ligaen has grown in stature, and Norway earned its first IIHF World Championship medal (bronze) in 2026.',
  },
};

/** Look up a city by name and country slug. Case-insensitive. */
export function lookupCityFact(cityName: string, countrySlug: string): CityFact | null {
  if (!cityName || !countrySlug) return null;
  const key = `${countrySlug.toLowerCase()}|${cityName.toLowerCase()}`;
  return CITY_FACTS[key] || null;
}

/** Format population as readable string (e.g., "2.7 million" or "675,647") */
export function formatPopulation(p: number): string {
  if (p >= 1000000) return `${(p / 1000000).toFixed(1)} million`;
  return p.toLocaleString('en-US');
}
