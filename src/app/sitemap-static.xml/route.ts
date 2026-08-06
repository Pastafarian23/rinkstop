import { baseUrl } from '@/lib/sitemap-shared';

// Sub-sitemap for static pages (homepage, directory index, country pages,
// guides, federations, standings, tools, blog, news). Same URLs as the
// static section of the main /sitemap.xml — split out for dedicated crawl
// pipeline. No DB query — all paths are hardcoded.

export const revalidate = 3600;

const countries = [
  'united-states', 'canada', 'mexico', 'argentina', 'brazil', 'chile', 'colombia', 'cuba',
  'peru', 'venezuela', 'austria', 'belgium', 'czech-republic', 'denmark', 'finland',
  'france', 'germany', 'hungary', 'iceland', 'ireland', 'italy', 'luxembourg',
  'netherlands', 'norway', 'poland', 'portugal', 'romania', 'russia', 'slovakia',
  'spain', 'sweden', 'switzerland', 'ukraine', 'united-kingdom', 'china', 'india',
  'indonesia', 'iran', 'iraq', 'israel', 'japan', 'kazakhstan', 'malaysia', 'mongolia',
  'pakistan', 'philippines', 'qatar', 'saudi-arabia', 'singapore', 'south-korea',
  'taiwan', 'thailand', 'turkey', 'united-arab-emirates', 'vietnam', 'algeria',
  'egypt', 'kenya', 'morocco', 'nigeria', 'south-africa', 'tunisia', 'australia',
  'new-zealand',
];

const usStates = [
  'alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia',
  'hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland',
  'massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new-hampshire','new-jersey',
  'new-mexico','new-york','north-carolina','north-dakota','ohio','oklahoma','oregon','pennsylvania','rhode-island','south-carolina',
  'south-dakota','tennessee','texas','utah','vermont','virginia','washington','west-virginia','wisconsin','wyoming',
];

const staticUrls: { url: string; changeFreq: 'daily' | 'weekly' | 'monthly' | 'yearly'; priority: number }[] = [
  { url: `${baseUrl}`, changeFreq: 'daily', priority: 1.0 },
  { url: `${baseUrl}/directory`, changeFreq: 'daily', priority: 0.9 },
  { url: `${baseUrl}/directory/teams`, changeFreq: 'daily', priority: 0.8 },
  { url: `${baseUrl}/directory/rinks`, changeFreq: 'weekly', priority: 0.8 },
  { url: `${baseUrl}/directory/leagues`, changeFreq: 'daily', priority: 0.8 },
  { url: `${baseUrl}/directory/games`, changeFreq: 'hourly' as any, priority: 0.9 },
  { url: `${baseUrl}/news`, changeFreq: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/tools/hockey-cost-calculator`, changeFreq: 'monthly', priority: 0.7 },
  { url: `${baseUrl}/tools/hockey-stick-size-calculator`, changeFreq: 'monthly', priority: 0.7 },
  { url: `${baseUrl}/tools/hockey-glove-size-calculator`, changeFreq: 'monthly', priority: 0.7 },
  { url: `${baseUrl}/tools/hockey-skate-size-calculator`, changeFreq: 'monthly', priority: 0.7 },
  { url: `${baseUrl}/tools/junior-eligibility-checker`, changeFreq: 'monthly', priority: 0.7 },
  { url: `${baseUrl}/tools/hockey-goalie-gear-sizer`, changeFreq: 'monthly', priority: 0.7 },
  { url: `${baseUrl}/draft/nhl/2026`, changeFreq: 'yearly', priority: 0.6 },
  { url: `${baseUrl}/about`, changeFreq: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/privacy`, changeFreq: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/terms`, changeFreq: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/advertise`, changeFreq: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/directory/international`, changeFreq: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/directory/international/iihf`, changeFreq: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/directory/international/world-championships`, changeFreq: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/directory/international/olympics`, changeFreq: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/directory/countries`, changeFreq: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/cookies`, changeFreq: 'yearly', priority: 0.3 },
  { url: `${baseUrl}/partner`, changeFreq: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/faq`, changeFreq: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/contact`, changeFreq: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/guides`, changeFreq: 'weekly', priority: 0.6 },
  { url: `${baseUrl}/rankings`, changeFreq: 'weekly', priority: 0.6 },
  { url: `${baseUrl}/hockey-travel`, changeFreq: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/gear-brands`, changeFreq: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/directory/nhl`, changeFreq: 'daily', priority: 0.9 },
  { url: `${baseUrl}/learn`, changeFreq: 'weekly', priority: 0.7 },
  { url: `${baseUrl}/ice-rinks-near-me`, changeFreq: 'monthly', priority: 0.7 },
];

export async function GET() {
  const countryUrls = countries.map(c => ({ url: `${baseUrl}/directory/${c}`, changeFreq: 'monthly' as const, priority: 0.7 }));
  const usStateUrls = usStates.map(s => ({ url: `${baseUrl}/directory/united-states/${s}`, changeFreq: 'monthly' as const, priority: 0.5 }));

  const all = [...staticUrls, ...countryUrls, ...usStateUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(u => `  <url>
    <loc>${u.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${u.changeFreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}