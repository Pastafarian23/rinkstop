// src/app/feed/route.ts
// RSS 2.0 feed of latest 50 published articles.
// Wired up 2026-08-11 as the primary ingestion surface for Google Publisher
// Center. The legacy /feed endpoint previously returned 404 — articles can't
// flow into Publisher Center without it.
//
// URL: https://rinkstop.com/feed
// Content-Type: application/rss+xml; charset=utf-8
// Cache: 1h s-maxage, 24h stale-while-revalidate (Vercel edge).

import { supabaseAdmin } from '@/lib/supabase';

const SITE_URL = 'https://rinkstop.com';
const SITE_TITLE = 'RinkStop';
const SITE_DESCRIPTION =
  "The world's hockey directory — news, scores, and evergreen guides for ice hockey at every level.";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCdata(s: string): string {
  // CDATA can't contain ']]>'. We split if we see that sequence.
  return s.replace(/\]\]>/g, ']]]]><![CDATA[>');
}

interface FeedPost {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  content?: string;
  content_html?: string;
  author_name?: string;
  published_at?: string;
  updated_at?: string;
  category?: string;
  og_image_url?: string;
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select(
      'id, slug, title, subtitle, content, content_html, author_name, published_at, updated_at, category, og_image_url',
    )
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(50);

  const posts: FeedPost[] = !error && Array.isArray(data) ? (data as FeedPost[]) : [];

  const lastBuild = posts[0]?.published_at
    ? new Date(posts[0].published_at).toUTCString()
    : new Date().toUTCString();

  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/news/${p.slug}`;
      const summary = p.subtitle || stripHtml(p.content_html || p.content || '');
      const description = summary.slice(0, 5000);
      const pubDate = p.published_at ? new Date(p.published_at).toUTCString() : '';
      const authorName = p.author_name || 'RinkStop';
      const category = p.category || 'Hockey';
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>noreply@rinkstop.com (${escapeXml(authorName)})</author>
      <category>${escapeXml(category)}</category>
      <description><![CDATA[${escapeCdata(description)}]]></description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}/feed" rel="self" type="application/rss+xml" />
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuild>
    <managingEditor>arnel@rinkstop.com (Arnel Larracas)</managingEditor>
    <webMaster>arnel@rinkstop.com (Arnel Larracas)</webMaster>
    <copyright>Copyright ${new Date().getFullYear()} RinkStop</copyright>
    <image>
      <url>${SITE_URL}/rinkstoplogo.png</url>
      <title>${escapeXml(SITE_TITLE)}</title>
      <link>${SITE_URL}</link>
      <width>600</width>
      <height>60</height>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export const revalidate = 3600;
