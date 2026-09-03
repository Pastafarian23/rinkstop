// /feed/msn.xml — MSN-optimized RSS 2.0 feed
//
// Format requirements (per Microsoft support docs):
//   - Valid RSS 2.0
//   - Each item must have: title, link, description, pubDate, guid, author
//   - Optional but recommended: content:encoded (HTML), category, enclosure (for images)
//   - Document file size <= 524 KB
//   - HTML must be valid, characters properly encoded
//   - All links must be valid (canonical, no 404s)
//
// Reuses the supabaseAdmin posts query from sitemap-news.xml but emits
// a proper RSS 2.0 document instead of a sitemap index entry.
//
// This is the feed MSN Partner Hub will ingest for auto-publishing.

import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/sitemap-shared';

export const revalidate = 3600; // Refresh hourly

// XML-safe escape
function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Strip HTML for description; keep first 280 chars
function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

export async function GET() {
  if (!supabaseAdmin) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><error>supabaseAdmin unavailable</error>', {
      status: 503,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  // Pull the 100 most recent published posts that look like news (have published_at)
  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select(
      'id, slug, title, subtitle, content, content_html, author_name, author_role, published_at, updated_at, category, tags, reading_time_minutes, seo_title, seo_description, og_image_url, pillar_slug, subpillar_slug'
    )
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(100);

  if (!posts || posts.length === 0) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><error>no published posts</error>', {
      status: 503,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  const lastBuildDate = new Date().toUTCString();

  const items = (posts as any[])
    .filter((p) => p.slug && p.title && p.published_at)
    .map((p) => {
      const url = `${baseUrl}/news/${p.slug}`;
      const pubDate = new Date(p.published_at).toUTCString();
      const description = p.seo_description || p.subtitle || stripHtml(p.content || p.content_html);
      const author = p.author_name || 'RinkStop';
      const category = p.category || p.tags?.[0] || 'Hockey';
      const image = p.og_image_url
        ? `<enclosure url="${esc(p.og_image_url)}" type="image/jpeg" length="0"/>`
        : '';
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <description>${esc(description)}</description>
      <author>${esc(author)}</author>
      <category>${esc(category)}</category>
      <pubDate>${pubDate}</pubDate>
      ${image}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>RinkStop Hockey News</title>
    <link>${baseUrl}/news</link>
    <atom:link href="${baseUrl}/feed/msn.xml" rel="self" type="application/rss+xml"/>
    <description>Latest hockey news, scores, draft coverage, and original reporting on the global hockey scene. Published by RinkStop, the open hockey directory.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <managingEditor>arnel@rinkstop.com (Arnel Larracas)</managingEditor>
    <webMaster>arnel@rinkstop.com (Arnel Larracas)</webMaster>
    <copyright>Copyright ${new Date().getFullYear()} RinkStop</copyright>
    <image>
      <url>${baseUrl}/rinkstoplogo.png</url>
      <title>RinkStop</title>
      <link>${baseUrl}</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
