import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/sitemap-shared';

// Sub-sitemap for city/location pages: /directory/locations/{country}/{city}
// Same URLs as the location section of the main /sitemap.xml — split out
// for dedicated crawl pipeline. Page handler reads from rinks table; we
// dedupe (country, city) combos to one URL per pair.

export const revalidate = 3600;

const COUNTRY_SLUG_OVERRIDES: Record<string, string> = {
  'United States': 'united-states',
  'United Kingdom': 'united-kingdom',
  'United Arab Emirates': 'united-arab-emirates',
  'New Zealand': 'new-zealand',
  'South Korea': 'south-korea',
  'Czech Republic': 'czech-republic',
  'Russian Federation': 'russia',
  'Russian Federation (Russia)': 'russia',
};

function countryToSlug(name: string): string {
  if (COUNTRY_SLUG_OVERRIDES[name]) return COUNTRY_SLUG_OVERRIDES[name];
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET() {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  const [r0, r1, r2] = await Promise.all([
    supabaseAdmin.from('rinks').select('city, country').eq('is_active', true).range(0, 999),
    supabaseAdmin.from('rinks').select('city, country').eq('is_active', true).range(1000, 1999),
    supabaseAdmin.from('rinks').select('city, country').eq('is_active', true).range(2000, 2999),
  ]);
  const rinks = [...(r0.data || []), ...(r1.data || []), ...(r2.data || [])];

  const universalCities = new Set<string>();
  rinks.forEach((r: { country: string; city: string }) => {
    if (!r.country || !r.city) return;
    const countrySlug = countryToSlug(r.country);
    const citySlug = r.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!citySlug || !countrySlug) return;
    universalCities.add(`/directory/locations/${countrySlug}/${citySlug}`);
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...universalCities].map(path => `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.55</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}