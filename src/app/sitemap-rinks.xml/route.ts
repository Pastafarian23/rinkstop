import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/sitemap-shared';

// Sub-sitemap for rink detail pages only.
// URLs here are the SAME slugs already emitted by the main /sitemap.xml
// (filtered by isHighQualityRink). Splitting them out gives Google a
// dedicated sitemap pipeline to crawl rink pages — the main sitemap index
// was the only thing crawling rink URLs, and it was timing out before
// all of them got discovered. Zero new pages, zero URL changes.

export const revalidate = 3600;

function isHighQualityRink(r: any): boolean {
  return !!(r.slug && r.city && r.country);
}

export async function GET() {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  const [r0, r1, r2] = await Promise.all([
    supabaseAdmin.from('rinks').select('slug, updated_at, city, country').eq('is_active', true).range(0, 999),
    supabaseAdmin.from('rinks').select('slug, updated_at, city, country').eq('is_active', true).range(1000, 1999),
    supabaseAdmin.from('rinks').select('slug, updated_at, city, country').eq('is_active', true).range(2000, 2999),
  ]);
  const rinks = [...(r0.data || []), ...(r1.data || []), ...(r2.data || [])].filter(isHighQualityRink);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rinks.map(r => `  <url>
    <loc>${baseUrl}/directory/rinks/${r.slug}</loc>
    <lastmod>${r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
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