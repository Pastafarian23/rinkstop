// Sub-sitemap for national federation pages: /federations/{country-slug}
//
// 2026-10-29: the 84 country federation pages existed and rendered, but NONE
// of them was in any sitemap (verified against the live /sitemap.xml and
// every sub-sitemap). The federation page is a high-intent surface
// ("hockey federation <country>"), so this was pure discovery loss.
//
// The URL set is derived from the SAME static reference table the federation
// page itself uses (`src/lib/federations.ts` → countryName → countryToSlug),
// and filtered against the LIVE `federations` table so we only list
// countries that actually have a row.
//
// Why the static table and not the DB name: the DB `federations.name` is the
// federation's own name ("Ice Hockey Association of India"), which is NOT
// the country name. The URL segment is the country slug, and the canonical
// URL on the page is built from the static table's countryName. Using the
// static table here guarantees the sitemap URLs match the page's own
// canonical URLs byte-for-byte.
//
// Cached 1h like the other sub-sitemaps. One DB query per refresh.

import { baseUrl } from '@/lib/sitemap-shared';
import { supabaseAdmin } from '@/lib/supabase';
import { countryToSlug } from '@/lib/country-page';
import { FEDERATIONS } from '@/lib/federations';

export const revalidate = 3600;

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('federations')
    .select('country_code')
    .eq('is_active', true)
    .not('country_code', 'is', null);

  const liveCodes = new Set(
    (data || []).map((r) => (r.country_code || '').toUpperCase()).filter(Boolean),
  );

  const seen = new Set<string>();
  const urls: string[] = [];

  for (const f of FEDERATIONS) {
    const code = f.countryCode.toUpperCase();
    if (!liveCodes.has(code)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    urls.push(`${baseUrl}/federations/${countryToSlug(f.countryName)}`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (loc) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  if (error) {
    console.error('[sitemap-federations] DB read failed:', error);
  }
  console.log(`[sitemap-federations] ${urls.length} federation URLs`);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
