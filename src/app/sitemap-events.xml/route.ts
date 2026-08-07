import { supabase } from '@/lib/supabase';
import { CANONICAL_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET() {
  const { data: events } = await supabase
    .from('rink_events')
    .select('slug, updated_at')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(5000);

  const urls = (events || []).map((e: any) => {
    return `  <url><loc>${CANONICAL_URL}/events/${escapeXml(e.slug)}</loc><lastmod>${e.updated_at}</lastmod></url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=3600',
    },
  });
}
