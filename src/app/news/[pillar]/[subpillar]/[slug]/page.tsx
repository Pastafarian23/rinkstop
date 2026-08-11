// src/app/news/[pillar]/[subpillar]/[slug]/page.tsx
// Safety net for 4-segment article URLs where the fourth segment is a post
// slug rather than a real subpillar slug (e.g.
// /news/nhl/draft/post-lottery-nhl-draft-...).
//
// V2: 2026-08-11 — added getFullPostBySlug fallback to fix 404 on deep
// links that were hitting notFound because no route existed for 4-segment
// article URLs.
//
// Routing logic:
// 1. If [slug] is a known subpillar under [pillar], render the subpillar
//    listing (rare -- only happens if someone bookmarked a hypothetical
//    4-segment canonical URL).
// 2. Otherwise treat [slug] as a post slug and render FullArticle.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import FullArticle, { type FullPost } from '@/components/FullArticle';

const supabase = supabaseAdmin;

const PILLAR_LABELS: Record<string, string> = {
  highvolumecontent: 'Highlights & Guides',
  high_volume_content: 'Highlights & Guides',
  highlights: 'Highlights',
  guides: 'Guides',
  blog: 'Blog',
  nhl: 'NHL',
  international: 'International',
  womens: 'Women\u2019s Hockey',
  business: 'Business of Hockey',
};

const SUBPILLAR_LABELS: Record<string, string> = {
  highlights: 'Highlights',
  guides: 'Guides',
  blog: 'Blog',
  draft: 'Draft',
  analysis: 'Analysis',
  playoffs: 'Playoffs',
  pwhl: 'PWHL',
  business: 'Business',
  recruiting: 'Recruiting',
};

const KNOWN_SUBPILLARS = new Set(Object.keys(SUBPILLAR_LABELS));

async function getPostsBySubpillar(pillarSlug: string, subpillarSlug: string, limit = 30) {
  const { data } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, published_at, category, pillar, subpillar, pillar_slug, subpillar_slug, reading_time_minutes, author_name')
    .eq('status', 'published')
    .eq('pillar_slug', pillarSlug)
    .eq('subpillar_slug', subpillarSlug)
    .order('published_at', { ascending: false })
    .limit(limit);
  return (data as any[]) || [];
}

async function getFullPostBySlug(slug: string): Promise<FullPost | null> {
  // NOTE: only select columns that exist on the posts table.
  // As of 2026-08-11: country_label / state_label / city_label were removed
  // (we now use only the *_slug variants). Including them in the select
  // makes PostgREST throw 42703 ("column does not exist") and the page
  // silently falls through to notFound() — which is what caused the 4-segment
  // article URLs to return 404 in production. See also getPostsBySubpillar
  // below for the same fix.
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select(
      'id, slug, title, subtitle, content, content_html, author_name, author_role, published_at, category, tags, reading_time_minutes, seo_title, seo_description, og_image_url, updated_at, view_count, country_slug, state_slug, city_slug',
    )
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.error('[getFullPostBySlug] supabaseAdmin error for slug=', slug, 'error=', error.message);
  }
  const row = (data as FullPost | null);
  if (row) return row;
  const { data: alt, error: altError } = await supabase
    .from('posts')
    .select(
      'id, slug, title, subtitle, content, content_html, author_name, author_role, published_at, category, tags, reading_time_minutes, seo_title, seo_description, og_image_url, updated_at, view_count, country_slug, state_slug, city_slug',
    )
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();
  if (altError) {
    console.error('[getFullPostBySlug] supabase fallback error for slug=', slug, 'error=', altError.message);
  }
  return (alt as FullPost | null);
}

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ pillar: string; subpillar: string; slug: string }> }) {
  const { pillar, subpillar, slug } = await params;
  const pillarLabel = PILLAR_LABELS[pillar] || pillar;

  // Prefer article metadata if this is a post slug.
  const post = await getFullPostBySlug(slug);
  if (post) {
    const stripSuffix = (s: string) => s.replace(/\s*\|\s*RinkStop\s*$/, '');
    const blogTitle = stripSuffix(post.seo_title || post.title);
    const seoDesc = post.seo_description || post.subtitle || (post.content || '').replace(/<[^>]*>/g, '').substring(0, 160);
    const ogImage = post.og_image_url || `https://rinkstop.com/og?title=${encodeURIComponent(post.title)}`;
    return {
      title: blogTitle,
      description: seoDesc,
      authors: [{ name: post.author_name || 'Arnel Larracas' }],
      openGraph: {
        type: 'article',
        title: blogTitle,
        description: seoDesc,
        url: `https://rinkstop.com/news/${post.slug}`,
        publishedTime: post.published_at,
        modifiedTime: post.updated_at || post.published_at,
        authors: [post.author_name || 'Arnel Larracas'],
        images: [ogImage],
        tags: post.tags || [],
      },
      twitter: {
        card: 'summary_large_image',
        title: blogTitle,
        description: seoDesc,
        images: [ogImage],
      },
      alternates: { canonical: `https://rinkstop.com/news/${post.slug}` },
      other: {
        'article:published_time': post.published_at || '',
        'article:modified_time': post.updated_at || post.published_at || '',
        'article:author': post.author_name || 'Arnel Larracas',
        'article:section': post.category || 'Hockey',
        ...(post.tags && post.tags.length > 0 ? { 'article:tag': post.tags.join(',') } : {}),
      },
    };
  }

  const subpillarLabel = SUBPILLAR_LABELS[subpillar] || subpillar;
  return {
    title: `${subpillarLabel} — ${pillarLabel} News`,
    description: `${subpillarLabel} stories from the ${pillarLabel.toLowerCase()} pillar.`,
    alternates: { canonical: `https://rinkstop.com/news/${pillar}/${subpillar}/${slug}` },
  };
}

export default async function SlugPage({ params }: { params: Promise<{ pillar: string; subpillar: string; slug: string }> }) {
  const { pillar, subpillar, slug } = await params;
  const pillarLabel = PILLAR_LABELS[pillar] || pillar;
  const subpillarLabel = SUBPILLAR_LABELS[subpillar] || subpillar;

  // Try post slug first -- this is the common case for deep links.
  const post: FullPost | null = await getFullPostBySlug(slug).catch(() => null as FullPost | null);
  if (post) return <FullArticle post={post} />;

  // Fallback: treat as a subpillar listing under the same pillar.
  const posts = await getPostsBySubpillar(pillar, slug);
  if (posts.length > 0) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
        <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
          <Link href="/" style={{ color: '#555' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/news" style={{ color: '#555' }}>News</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href={`/news/${pillar}`} style={{ color: '#555' }}>{pillarLabel}</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#A0A0A0' }}>{subpillarLabel}</span>
        </nav>
        <div style={{ marginBottom: '2rem' }}>
          <div className="label">Subpillar</div>
          <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, marginBottom: '0.5rem' }}>
            {subpillarLabel.toUpperCase()}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontSize: '0.9375rem', maxWidth: '700px' }}>
            {subpillarLabel} stories from the {pillarLabel.toLowerCase()} pillar. <Link href={`/news/${pillar}`} style={{ color: '#C8102E' }}>See all {pillarLabel} →</Link>
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {posts.map((post: any) => (
            <Link key={post.id} href={`/news/${post.slug}`} style={{ display: 'block', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.125rem 1.375rem', textDecoration: 'none', borderLeft: '3px solid transparent', transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <h2 style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#fff', lineHeight: 1.35, marginBottom: '0.3rem' }}>{post.title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')}</h2>
                  {post.subtitle && (<p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '0.5rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{post.subtitle.replace(/&amp;/g, '&')}</p>)}
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', flexWrap: 'wrap' }}>
                    <span>{post.author_name || 'Arnel'}</span><span>·</span><span>{post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</span><span>·</span><span>{post.reading_time_minutes || 5} min read</span>
                  </div>
                </div>
                <div style={{ flexShrink: 0, color: 'var(--red)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'center' }}>Read →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return notFound();
}
