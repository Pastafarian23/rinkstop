import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl, isHighQualityLeague } from '@/lib/sitemap-shared';

// Sub-sitemap for league detail pages. Same URLs as the main /sitemap.xml
// for leagues — split out for dedicated crawl pipeline.

export const revalidate = 3600;

export async function GET() {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('slug, updated_at, country, level, website_url')
    .eq('is_active', true);

  const filtered = (leagues || []).filter(isHighQualityLeague);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${filtered.map(l => `  <url>
    <loc>${baseUrl}/directory/leagues/${l.slug}</loc>
    <lastmod>${l.updated_at ? new Date(l.updated_at).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}