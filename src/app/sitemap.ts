import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { provinceSlug } from '@/lib/ca-provinces';

const baseUrl = 'https://rinkstop.com';

// Cache the sitemap for 1 hour. Without this, the sitemap function runs on
// EVERY request (no static generation), executing 7 Supabase queries in
// parallel each time Google/Bing/etc. hit /sitemap.xml. That alone was
// responsible for thousands of function invocations per month on the
// Vercel Hobby plan. With revalidate=3600, the output is cached for 1h
// and only regenerated when stale.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Phase 1 SEO filter stats — track effectiveness
  const stats = { teams_total: 0, teams_indexed: 0, rinks_total: 0, rinks_indexed: 0,
                leagues_total: 0, leagues_indexed: 0, players_total: 0, players_indexed: 0,
                countries_total: 0, countries_indexed: 0 };

  // All 198 countries with their URL slugs
  const countries = [
    'united-states', 'canada', 'mexico', 'antigua-and-barbuda', 'bahamas', 'barbados', 'belize', 'costa-rica', 'cuba', 'dominica',
    'dominican-republic', 'el-salvador', 'grenada', 'guatemala', 'haiti', 'honduras', 'jamaica', 'nicaragua', 'panama',
    'saint-kitts-and-nevis', 'saint-lucia', 'saint-vincent-and-the-grenadines', 'trinidad-and-tobago',
    'argentina', 'bolivia', 'brazil', 'chile', 'colombia', 'ecuador', 'guyana', 'paraguay', 'peru', 'suriname', 'uruguay', 'venezuela',
    'albania', 'andorra', 'austria', 'belarus', 'belgium', 'bosnia-and-herzegovina', 'bulgaria', 'croatia', 'cyprus', 'czech-republic',
    'denmark', 'estonia', 'finland', 'france', 'georgia', 'germany', 'greece', 'hungary', 'iceland', 'ireland', 'italy', 'kosovo',
    'latvia', 'liechtenstein', 'lithuania', 'luxembourg', 'malta', 'moldova', 'monaco', 'montenegro', 'netherlands', 'north-macedonia',
    'norway', 'poland', 'portugal', 'romania', 'russia', 'san-marino', 'serbia', 'slovakia', 'slovenia', 'spain', 'sweden',
    'switzerland', 'ukraine', 'united-kingdom', 'vatican-city',
    'afghanistan', 'armenia', 'azerbaijan', 'bahrain', 'bangladesh', 'bhutan', 'brunei', 'cambodia', 'china', 'hong-kong',
    'india', 'indonesia', 'iran', 'iraq', 'israel', 'japan', 'jordan', 'kazakhstan', 'kuwait', 'kyrgyzstan', 'laos', 'lebanon',
    'malaysia', 'maldives', 'mongolia', 'myanmar', 'nepal', 'north-korea', 'oman', 'pakistan', 'palestine', 'philippines',
    'qatar', 'saudi-arabia', 'singapore', 'south-korea', 'sri-lanka', 'syria', 'taiwan', 'tajikistan', 'thailand', 'timor-leste',
    'turkey', 'turkmenistan', 'united-arab-emirates', 'uzbekistan', 'vietnam', 'yemen',
    'algeria', 'angola', 'benin', 'botswana', 'burkina-faso', 'burundi', 'cabo-verde', 'cameroon', 'central-african-republic',
    'chad', 'comoros', 'congo', 'democratic-republic-of-the-congo', 'djibouti', 'egypt', 'equatorial-guinea', 'eritrea',
    'eswatini', 'ethiopia', 'gabon', 'gambia', 'ghana', 'guinea', 'guinea-bissau', 'ivory-coast', 'kenya', 'lesotho', 'liberia',
    'libya', 'madagascar', 'malawi', 'mali', 'mauritania', 'mauritius', 'morocco', 'mozambique', 'namibia', 'niger', 'nigeria',
    'rwanda', 'sao-tome-and-principe', 'senegal', 'seychelles', 'sierra-leone', 'somalia', 'south-africa', 'south-sudan',
    'sudan', 'tanzania', 'togo', 'tunisia', 'uganda', 'zambia', 'zimbabwe',
    'australia', 'fiji', 'kiribati', 'marshall-islands', 'micronesia', 'nauru', 'new-zealand', 'palau', 'papua-new-guinea',
    'samoa', 'solomon-islands', 'tonga', 'tuvalu', 'vanuatu'
  ];

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/directory`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/directory/teams`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/directory/rinks`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/directory/leagues`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/directory/games`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/news`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/tools/hockey-cost-calculator`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/tools/hockey-stick-size-calculator`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/tools/hockey-glove-size-calculator`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/tools/hockey-skate-size-calculator`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/tools/junior-eligibility-checker`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/tools/hockey-goalie-gear-sizer`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/draft/nhl/2026`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/advertise`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/directory/international`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/directory/international/iihf`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/directory/international/world-championships`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/directory/international/olympics`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/directory/countries`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/cookies`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/partner`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/rankings`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/hockey-travel`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/gear-brands`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/directory/nhl`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/learn`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/ice-rinks-near-me`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ];

  // Country slugs to exclude from sitemap: countries with NO real hockey content
  // (Antigua, Bahamas, Barbados, Belize, Caribbean nations, Pacific islands, etc.)
  // These pages exist for completeness but have <10 rinks and are essentially empty.
  const COUNTRY_EXCLUDE_SLUGS = new Set([
    'antigua-and-barbuda', 'bahamas', 'barbados', 'belize', 'costa-rica', 'cuba',
    'dominica', 'dominican-republic', 'el-salvador', 'grenada', 'guatemala', 'haiti',
    'honduras', 'jamaica', 'nicaragua', 'panama', 'saint-kitts-and-nevis',
    'saint-lucia', 'saint-vincent-and-the-grenadines', 'trinidad-and-tobago',
    'vatican-city', 'liechtenstein', 'san-marino', 'monaco', 'andorra', 'malta',
    'fiji', 'kiribati', 'marshall-islands', 'micronesia', 'nauru', 'palau',
    'samoa', 'solomon-islands', 'tonga', 'tuvalu', 'vanuatu', 'comoros',
    'seychelles', 'cabo-verde', 'sao-tome-and-principe', 'maldives', 'bhutan',
  ]);
  const filteredCountrySlugs = countries.filter(c => !COUNTRY_EXCLUDE_SLUGS.has(c));
  stats.countries_total = countries.length;
  stats.countries_indexed = filteredCountrySlugs.length;

  const countryUrls: MetadataRoute.Sitemap = filteredCountrySlugs.map(c => ({
    url: `${baseUrl}/directory/${c}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Fetch dynamic content from Supabase using admin client
  if (!supabaseAdmin) {
    return [...staticPages, ...countryUrls];
  }

  const [teamsResult, rinksResult, leaguesResult, postsResult, playersResult, caRinksResult, ukRinksResult] = await Promise.all([
    // Phase 1 SEO: select fields needed for quality filter. See isHighQualityTeam() below.
    supabaseAdmin.from('teams').select('slug, updated_at, country, city, league_id, division, logo_url, website_url').eq('is_active', true),
    supabaseAdmin.from('rinks').select('slug, updated_at, city, country, province_state').eq('is_active', true),
    supabaseAdmin.from('leagues').select('slug, updated_at, country, level, website_url').eq('is_active', true),
    supabaseAdmin.from('posts').select('slug, updated_at').eq('status', 'published'),
    supabaseAdmin.from('players').select('id, updated_at, first_name, last_name, position, team_id, nationality, headshot_url').eq('is_active', true).order('updated_at', { ascending: false }).limit(500),
    supabaseAdmin.from('rinks').select('city, province_state').eq('country', 'Canada').eq('is_active', true).not('city', 'is', null).not('province_state', 'is', null),
    supabaseAdmin.from('rinks').select('city').eq('country', 'United Kingdom').eq('is_active', true).not('city', 'is', null),
  ]);

  // ─── Phase 1 SEO: quality filters ─────────────────────────────────────────────
  // Pages below the threshold are NOT included in the sitemap. They remain
  // accessible to users but Google won't waste crawl budget indexing them.
  // Goal: stop indexing thin/duplicate pages that hurt domain authority.
  //
  // Log stats so we can track filter effectiveness over time.

  function isHighQualityTeam(t: any): boolean {
    // Team must have: slug + at least 1 of (country, city, league, division, logo, website).
    // Country alone is not required: many real teams (Savannah Ghost Pirates,
    // Seattle Thunderbirds, Slovenia national team) have NULL country but real
    // league + logo, and Google is indexing them. We do still require SOME
    // quality signal so we don't add 1,439 placeholder rows to the sitemap.
    if (!t.slug) return false;
    return !!(t.country || t.city || t.league_id || t.division || t.logo_url || t.website_url);
  }
  function isHighQualityRink(r: any): boolean {
    return !!(r.slug && r.city && r.country);
  }
  function isHighQualityLeague(l: any): boolean {
    return !!(l.slug && (l.country || l.level || l.website_url));
  }
  function isHighQualityPlayer(p: any): boolean {
    // Player must have: name + team + at least 1 of (position, nationality, headshot)
    if (!(p.first_name || p.last_name)) return false;
    if (!p.team_id) return false;
    return !!(p.position || p.nationality || p.headshot_url);
  }

  const filteredTeams = (teamsResult.data || []).filter(isHighQualityTeam);
  const filteredRinks = (rinksResult.data || []).filter(isHighQualityRink);
  const filteredLeagues = (leaguesResult.data || []).filter(isHighQualityLeague);
  const filteredPlayers = (playersResult.data || []).filter(isHighQualityPlayer);

  stats.teams_total = (teamsResult.data || []).length;
  stats.teams_indexed = filteredTeams.length;
  stats.rinks_total = (rinksResult.data || []).length;
  stats.rinks_indexed = filteredRinks.length;
  stats.leagues_total = (leaguesResult.data || []).length;
  stats.leagues_indexed = filteredLeagues.length;
  stats.players_total = (playersResult.data || []).length;
  stats.players_indexed = filteredPlayers.length;

  const teamUrls: MetadataRoute.Sitemap = filteredTeams.map(t => ({
    url: `${baseUrl}/directory/teams/${t.slug}`,
    lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const rinkUrls: MetadataRoute.Sitemap = filteredRinks.map(r => ({
    url: `${baseUrl}/directory/rinks/${r.slug}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const leagueUrls: MetadataRoute.Sitemap = filteredLeagues.map(l => ({
    url: `${baseUrl}/directory/leagues/${l.slug}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const postUrls: MetadataRoute.Sitemap = (postsResult.data || []).map(p => ({
    url: `${baseUrl}/news/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const playerUrls: MetadataRoute.Sitemap = filteredPlayers.map(p => ({
    url: `${baseUrl}/directory/players/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // CA city subroutes: /directory/canada/{province_slug}/{city_slug}
  const caCities = new Set<string>();
  (caRinksResult.data || []).forEach((r: { city: string; province_state: string }) => {
    const citySlug = r.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const provSlug = provinceSlug(r.province_state);
    caCities.add(`/directory/canada/${provSlug}/${citySlug}`);
  });
  const caCityUrls: MetadataRoute.Sitemap = [...caCities].map(path => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // UK city subroutes: /directory/united-kingdom/{city_slug}
  const ukCities = new Set<string>();
  (ukRinksResult.data || []).forEach((r: { city: string }) => {
    const citySlug = r.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    ukCities.add(`/directory/united-kingdom/${citySlug}`);
  });
  const ukCityUrls: MetadataRoute.Sitemap = [...ukCities].map(path => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // US city subroutes: /directory/united-states/{state_slug}/{city_slug}
  // These complement the US state pages and the universal locations routes.
  // Only emit a URL for rinks that have a real province_state so we can
  // resolve the state slug.
  const usStateAbbrToSlug: Record<string, string> = {
    AL: 'alabama', AK: 'alaska', AZ: 'arizona', AR: 'arkansas', CA: 'california',
    CO: 'colorado', CT: 'connecticut', DE: 'delaware', FL: 'florida', GA: 'georgia',
    HI: 'hawaii', ID: 'idaho', IL: 'illinois', IN: 'indiana', IA: 'iowa',
    KS: 'kansas', KY: 'kentucky', LA: 'louisiana', ME: 'maine', MD: 'maryland',
    MA: 'massachusetts', MI: 'michigan', MN: 'minnesota', MS: 'mississippi', MO: 'missouri',
    MT: 'montana', NE: 'nebraska', NV: 'nevada', NH: 'new-hampshire', NJ: 'new-jersey',
    NM: 'new-mexico', NY: 'new-york', NC: 'north-carolina', ND: 'north-dakota', OH: 'ohio',
    OK: 'oklahoma', OR: 'oregon', PA: 'pennsylvania', RI: 'rhode-island', SC: 'south-carolina',
    SD: 'south-dakota', TN: 'tennessee', TX: 'texas', UT: 'utah', VT: 'vermont',
    VA: 'virginia', WA: 'washington', WV: 'west-virginia', WI: 'wisconsin', WY: 'wyoming',
    DC: 'district-of-columbia',
  };
  const usCities = new Set<string>();
  (filteredRinks || []).forEach((r: { country: string; city: string; province_state?: string }) => {
    if (r.country !== 'United States' || !r.city || !r.province_state) return;
    const stateSlug = usStateAbbrToSlug[r.province_state];
    if (!stateSlug) return;
    const citySlug = r.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!citySlug) return;
    usCities.add(`/directory/united-states/${stateSlug}/${citySlug}`);
  });
  const usCityUrls: MetadataRoute.Sitemap = [...usCities].map(path => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Universal city subroutes: /directory/locations/{country_slug}/{city_slug}
  // This is the broadest SEO net — covers every (country, city) combo in the DB,
  // including non-US/CA/UK countries that don't have a dedicated /country/{city} route.
  // We use the country slug from the existing /directory/{country} pattern.
  const COUNTRY_SLUG_OVERRIDES: Record<string, string> = {
    'United States': 'united-states',
    'United Kingdom': 'united-kingdom',
    'United Arab Emirates': 'united-arab-emirates',
    'New Zealand': 'new-zealand',
    'South Korea': 'south-korea',
    'Czech Republic': 'czechia',
    'Russian Federation': 'russia',
    'Russian Federation (Russia)': 'russia',
  };
  function countryToSlug(name: string): string {
    if (COUNTRY_SLUG_OVERRIDES[name]) return COUNTRY_SLUG_OVERRIDES[name];
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  const universalCities = new Set<string>();
  (filteredRinks || []).forEach((r: { country: string; city: string }) => {
    if (!r.country || !r.city) return;
    const countrySlug = countryToSlug(r.country);
    const citySlug = r.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!citySlug || !countrySlug) return;
    universalCities.add(`/directory/locations/${countrySlug}/${citySlug}`);
  });
  const universalCityUrls: MetadataRoute.Sitemap = [...universalCities].map(path => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.55,
  }));

  // US state pages
  const usStates = [
    'alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia',
    'hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland',
    'massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new-hampshire','new-jersey',
    'new-mexico','new-york','north-carolina','north-dakota','ohio','oklahoma','oregon','pennsylvania','rhode-island','south-carolina',
    'south-dakota','tennessee','texas','utah','vermont','virginia','washington','west-virginia','wisconsin','wyoming',
  ];
  const usStateUrls: MetadataRoute.Sitemap = usStates.map(slug => ({
    url: `${baseUrl}/directory/united-states/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const all = [...staticPages, ...countryUrls, ...usStateUrls, ...usCityUrls, ...universalCityUrls, ...teamUrls, ...rinkUrls, ...leagueUrls, ...postUrls, ...playerUrls, ...caCityUrls, ...ukCityUrls];

  // Log filter effectiveness — Vercel picks this up in logs
  console.log('[sitemap] Phase 1 SEO filter:', JSON.stringify({
    ...stats,
    excluded_teams: stats.teams_total - stats.teams_indexed,
    excluded_rinks: stats.rinks_total - stats.rinks_indexed,
    excluded_countries: stats.countries_total - stats.countries_indexed,
    total_urls: all.length,
    us_cities: usCities.size,
    ca_cities: caCities.size,
    uk_cities: ukCities.size,
    universal_cities: universalCities.size,
    percent_kept: ((all.length / 2966) * 100).toFixed(1) + '%',
  }));

  return all;
}