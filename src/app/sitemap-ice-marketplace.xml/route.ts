// Sub-sitemap for the ice marketplace.
//
// Lists the marketplace hub + every city hub where we have at least
// one active rink. Drives the per-city SEO surface for queries like
// "open ice in [city]".
//
// Two URL shapes:
//   - US/CA: /ice-marketplace/{country}/{province}/{city}
//   - Other: /ice-marketplace/{country}/{city}
//
// We dedupe by (country, province_or_null, city) so each city hub
// appears once even if multiple rinks exist there. Province is read
// from the rinks table (some are tagged with full state name, some
// with abbreviation; we normalize later if needed).

import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/sitemap-shared';

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

const US_STATE_ABBR: Record<string, string> = {
  'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar', 'california': 'ca',
  'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de', 'florida': 'fl', 'georgia': 'ga',
  'hawaii': 'hi', 'idaho': 'id', 'illinois': 'il', 'indiana': 'in', 'iowa': 'ia',
  'kansas': 'ks', 'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md',
  'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms', 'missouri': 'mo',
  'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv', 'new-hampshire': 'nh', 'new-jersey': 'nj',
  'new-mexico': 'nm', 'new-york': 'ny', 'north-carolina': 'nc', 'north-dakota': 'nd', 'ohio': 'oh',
  'oklahoma': 'ok', 'oregon': 'or', 'pennsylvania': 'pa', 'rhode-island': 'ri', 'south-carolina': 'sc',
  'south-dakota': 'sd', 'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut', 'vermont': 'vt',
  'virginia': 'va', 'washington': 'wa', 'west-virginia': 'wv', 'wisconsin': 'wi', 'wyoming': 'wy',
  'district-of-columbia': 'dc',
};

const US_STATE_FULL: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

const CA_PROVINCE_FULL: Record<string, string> = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon',
};

function countryToSlug(name: string): string {
  if (COUNTRY_SLUG_OVERRIDES[name]) return COUNTRY_SLUG_OVERRIDES[name];
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cityToSlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function provinceToSlug(countrySlug: string, province: string | null): string | null {
  if (!province) return null;
  if (countrySlug === 'united-states') {
    // Convert "AL" → "alabama", "Alabama" → "alabama"
    const full = US_STATE_FULL[province] || province;
    return full.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  if (countrySlug === 'canada') {
    const full = CA_PROVINCE_FULL[province] || province;
    return full.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  return province.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET() {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  // Page through the rinks table — we want every active city, not just
  // ones with current listings. The marketplace hub still surfaces
  // "Browse all rinks" even when there are no open ice slots.
  const cities = new Map<string, { url: string; lastmod: string }>();
  const pageSize = 1000;
  const maxPages = 5;
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const r = await supabaseAdmin
      .from('rinks')
      .select('city, country, province_state, updated_at')
      .eq('is_active', true)
      .range(from, to);
    const rows = r.data || [];
    if (rows.length === 0) break;
    for (const row of rows) {
      if (!row.city || !row.country) continue;
      const countrySlug = countryToSlug(row.country);
      if (!countrySlug) continue;
      const provinceSlug = provinceToSlug(countrySlug, row.province_state);
      const citySlug = cityToSlug(row.city);
      const path = provinceSlug
        ? `/ice-marketplace/${countrySlug}/${provinceSlug}/${citySlug}`
        : `/ice-marketplace/${countrySlug}/${citySlug}`;
      const lastmod = row.updated_at || new Date().toISOString();
      const key = path;
      const existing = cities.get(key);
      if (!existing || existing.lastmod < lastmod) {
        cities.set(key, { url: `${baseUrl}${path}`, lastmod });
      }
    }
    if (rows.length < pageSize) break;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(cities.values()).map(({ url, lastmod }) => `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date(lastmod).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
