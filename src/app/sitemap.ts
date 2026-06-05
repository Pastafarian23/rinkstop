import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

const baseUrl = 'https://rinkstop.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
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

  const countryUrls: MetadataRoute.Sitemap = countries.map(c => ({
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
    supabaseAdmin.from('teams').select('slug, updated_at').eq('is_active', true),
    supabaseAdmin.from('rinks').select('slug, updated_at').eq('is_active', true),
    supabaseAdmin.from('leagues').select('slug, updated_at').eq('is_active', true),
    supabaseAdmin.from('posts').select('slug, updated_at').eq('status', 'published'),
    supabaseAdmin.from('players').select('id, updated_at').eq('is_active', true).order('updated_at', { ascending: false }).limit(500),
    supabaseAdmin.from('rinks').select('city, province_state').eq('country', 'Canada').eq('is_active', true).not('city', 'is', null).not('province_state', 'is', null),
    supabaseAdmin.from('rinks').select('city').eq('country', 'United Kingdom').eq('is_active', true).not('city', 'is', null),
  ]);

  const teamUrls: MetadataRoute.Sitemap = (teamsResult.data || []).map(t => ({
    url: `${baseUrl}/directory/teams/${t.slug}`,
    lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const rinkUrls: MetadataRoute.Sitemap = (rinksResult.data || []).map(r => ({
    url: `${baseUrl}/directory/rinks/${r.slug}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const leagueUrls: MetadataRoute.Sitemap = (leaguesResult.data || []).map(l => ({
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

  const playerUrls: MetadataRoute.Sitemap = (playersResult.data || []).map(p => ({
    url: `${baseUrl}/directory/players/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // CA city subroutes: /directory/canada/{province_slug}/{city_slug}
  const caCities = new Set<string>();
  (caRinksResult.data || []).forEach((r: { city: string; province_state: string }) => {
    const citySlug = r.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const provSlug = r.province_state.toLowerCase();
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

  return [...staticPages, ...countryUrls, ...usStateUrls, ...teamUrls, ...rinkUrls, ...leagueUrls, ...postUrls, ...playerUrls, ...caCityUrls, ...ukCityUrls];
}