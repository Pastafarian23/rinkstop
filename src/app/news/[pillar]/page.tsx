// src/app/news/[pillar]/page.tsx
// Pillar-scope listing page. Two responsibilities:
//   1. If the [pillar] segment is a canonical pillar slug (highlights, guides,
//      blog, nhl, international, womens, business) — render the pillar listing
//      with all posts scoped to that pillar.
//   2. If the [pillar] segment is a post slug (legacy URL like /news/<slug>),
//      render the post. This is the safety net for deep links that pointed
//      at the old /news/[slug] route.
//
// Subpillar routing is handled by the [pillar]/[subpillar]/page.tsx child.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

const supabase = supabaseAdmin;

const CANONICAL_PILLARS = new Set([
  'highlights',
  'guides',
  'blog',
  'nhl',
  'international',
  'womens',
  'business',
]);

const PILLAR_LABELS: Record<string, string> = {
  highlights: 'Highlights',
  guides: 'Guides',
  blog: 'Blog',
  nhl: 'NHL',
  international: 'International',
  womens: 'Women\u2019s Hockey',
  business: 'Business of Hockey',
};

const PILLAR_DESCRIPTIONS: Record<string, string> = {
  highlights: 'Quick-hit news, scores, and updates from the global hockey community.',
  guides: 'Evergreen guides that explain how hockey works at every level.',
  blog: 'Editorial analysis and opinion on the business, development, and culture of hockey.',
  nhl: 'NHL coverage \u2014 trades, draft, analysis, and playoffs.',
  international: 'IIHF, World Championship, Olympics, and global hockey stories.',
  womens: 'PWHL, NCAA women\u2019s hockey, IIHF Women\u2019s World Championship.',
  business: 'The business side of hockey \u2014 leagues, teams, recruiting, and the economics.',
};

interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  published_at?: string;
  category?: string;
  pillar?: string;
  subpillar?: string;
  pillar_slug?: string;
  subpillar_slug?: string;
  reading_time_minutes?: number;
  author_name?: string;
}

function formatDate(date?: string) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return date; }
}

export const revalidate = 3600;
export const dynamicParams = true;

async function getPostBySlug(slug: string): Promise<Post | null> {
  const { data } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, published_at, category, pillar, subpillar, pillar_slug, subpillar_slug, reading_time_minutes, author_name')
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();
  return data as Post | null;
}

async function getPostsByPillar(pillarSlug: string, limit = 30): Promise<Post[]> {
  const { data } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, published_at, category, pillar, subpillar, pillar_slug, subpillar_slug, reading_time_minutes, author_name')
    .eq('status', 'published')
    .eq('pillar_slug', pillarSlug)
    .order('published_at', { ascending: false })
    .limit(limit);
  return (data as Post[]) || [];
}

export async function generateMetadata({ params }: { params: Promise<{ pillar: string }> }) {
  const { pillar } = await params;
  if (CANONICAL_PILLARS.has(pillar)) {
    const label = PILLAR_LABELS[pillar] || pillar;
    return {
      title: `${label} News`,
      description: PILLAR_DESCRIPTIONS[pillar] || `Latest ${label.toLowerCase()} stories from RinkStop.`,
      alternates: { canonical: `https://rinkstop.com/news/${pillar}` },
    };
  }
  // Treat as a post slug
  const post = await getPostBySlug(pillar);
  if (!post) return { title: 'Not Found' };
  return {
    title: post.title,
    description: post.subtitle || '',
    alternates: { canonical: `https://rinkstop.com/news/${post.slug}` },
  };
}

export default async function PillarPage({ params }: { params: Promise<{ pillar: string }> }) {
  const { pillar } = await params;

  // Case 1: canonical pillar — render the pillar listing
  if (CANONICAL_PILLARS.has(pillar)) {
    const posts = await getPostsByPillar(pillar);
    const label = PILLAR_LABELS[pillar] || pillar;
    const description = PILLAR_DESCRIPTIONS[pillar] || '';
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
        <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
          <Link href="/" style={{ color: '#555' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/news" style={{ color: '#555' }}>News</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#A0A0A0' }}>{label}</span>
        </nav>

        <div style={{ marginBottom: '2rem' }}>
          <div className="label">Pillar</div>
          <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, marginBottom: '0.5rem' }}>
            {label.toUpperCase()}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontSize: '0.9375rem', maxWidth: '700px' }}>
            {description}
          </p>
        </div>

        {/* Pillar sidebar */}
        <nav aria-label="News pillars" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/news" style={{ padding: '0.4rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', textDecoration: 'none' }}>
            All
          </Link>
          {Array.from(CANONICAL_PILLARS).map(p => (
            <Link
              key={p}
              href={`/news/${p}`}
              style={{
                padding: '0.4rem 0.85rem',
                background: p === pillar ? 'rgba(200,16,46,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${p === pillar ? 'rgba(200,16,46,0.4)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '999px',
                color: p === pillar ? '#C8102E' : 'rgba(255,255,255,0.7)',
                fontSize: '0.8125rem',
                textDecoration: 'none',
                fontWeight: p === pillar ? 700 : 400,
              }}
            >
              {PILLAR_LABELS[p]}
            </Link>
          ))}
        </nav>

        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.125rem' }}>No posts in this pillar yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/news/${post.slug}`}
                style={{
                  display: 'block',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '1.125rem 1.375rem',
                  textDecoration: 'none',
                  borderLeft: '3px solid transparent',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    {post.subpillar && (
                      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(200,16,46,0.15)', color: 'var(--red)', marginBottom: '0.5rem' }}>
                        {post.subpillar}
                      </span>
                    )}
                    <h2 style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#fff', lineHeight: 1.35, marginBottom: '0.3rem' }}>
                      {post.title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')}
                    </h2>
                    {post.subtitle && (
                      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '0.5rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        {post.subtitle.replace(/&amp;/g, '&')}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', flexWrap: 'wrap' }}>
                      <span>{post.author_name || 'Arnel'}</span>
                      <span>·</span>
                      <span>{formatDate(post.published_at)}</span>
                      <span>·</span>
                      <span>{post.reading_time_minutes || 5} min read</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, color: 'var(--red)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'center' }}>
                    Read →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Case 2: legacy slug — render the post. This is the deep-link safety net.
  const post = await getPostBySlug(pillar);
  if (!post) return notFound();

  // Render the post body (simplified single-page view — the canonical post
  // template at /news/[slug]/page.tsx handles the full article page; this is
  // a fallback for legacy URLs that match a single-segment path).
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/news" style={{ color: '#555' }}>News</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{post.title.substring(0, 40)}...</span>
      </nav>
      <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, marginBottom: '0.5rem' }}>
        {post.title}
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontSize: '0.9375rem' }}>
        {post.subtitle}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', marginTop: '1rem' }}>
        Author: {post.author_name || 'Arnel'} · {formatDate(post.published_at)} · {post.reading_time_minutes || 5} min read
      </p>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '2rem', fontSize: '0.875rem' }}>
        <Link href={`/news/${post.slug}`} style={{ color: '#C8102E' }}>View full article →</Link>
      </p>
    </div>
  );
}
