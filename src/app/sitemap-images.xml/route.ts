// /sitemap-images.xml
//
// Image sitemap for Bing Image Search, AI image citation, and Google Images.
// Format: https://www.sitemaps.org/protocol.html#image
//
// Pulls og_image_url from all published posts and joins it with the article URL
// so each <image> has both <loc> (the article containing the image) and
// <image:loc> (the image itself).
//
// Refresh: 1h ISR cache. Same pattern as /sitemap-news.xml.

import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/sitemap-shared';

export const revalidate = 3600;

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  // 2026-09-03 PR #198: also pull rink cover photos into the image sitemap.
  // Per Layer 4 of aggressive growth plan — image search traffic is
  // currently underutilized. 775 of 1,000 returned rinks have cover photos;
  // emitting them in the sitemap gives Bing/Google a discovery path.
  // Runs in parallel with the posts query so no extra latency.
  const [{ data: posts }, { data: rinks }] = await Promise.all([
    supabaseAdmin
      .from('posts')
      .select('slug, title, og_image_url, updated_at, pillar_slug, subpillar_slug, seo_title, seo_description')
      .eq('status', 'published')
      .not('og_image_url', 'is', null)
      .not('og_image_url', 'eq', '')
      .order('updated_at', { ascending: false })
      .limit(5000),
    supabaseAdmin
      .from('rinks')
      .select('slug, name, cover_photo_url, city, province_state, country, updated_at')
      .eq('is_active', true)
      .not('cover_photo_url', 'is', null)
      .not('cover_photo_url', 'eq', '')
      .order('updated_at', { ascending: false })
      .limit(3000),
  ]);

  if ((!posts || posts.length === 0) && (!rinks || rinks.length === 0)) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"></urlset>', {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  // Post images (existing — YouTube thumbnails, etc.)
  const postEntries = (posts || [])
    .filter((p) => p.slug && p.og_image_url)
    .map((p) => {
      const articleUrl = `${baseUrl}/news/${p.slug}`;
      const imageUrl = p.og_image_url.startsWith('http')
        ? p.og_image_url
        : `${baseUrl}${p.og_image_url}`;
      const title = p.seo_title || p.title || 'RinkStop article image';
      return `  <url>
    <loc>${esc(articleUrl)}</loc>
    <image:image>
      <image:loc>${esc(imageUrl)}</image:loc>
      <image:title>${esc(title)}</image:title>
    </image:image>
  </url>`;
    });

  // Rink cover photos (new — Google Places API photos for each rink)
  const rinkEntries = (rinks || [])
    .filter((r) => r.slug && r.cover_photo_url)
    .map((r) => {
      const rinkUrl = `${baseUrl}/directory/rinks/${r.slug}`;
      const location = [r.city, r.province_state, r.country].filter(Boolean).join(', ');
      const title = location
        ? `${r.name} exterior — ${location} indoor ice rink`
        : `${r.name} exterior — indoor ice rink`;
      return `  <url>
    <loc>${esc(rinkUrl)}</loc>
    <image:image>
      <image:loc>${esc(r.cover_photo_url)}</image:loc>
      <image:title>${esc(title)}</image:title>
    </image:image>
  </url>`;
    });

  const entries = [...postEntries, ...rinkEntries].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
