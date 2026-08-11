// src/app/news/[pillar]/[subpillar]/page.tsx
// Subpillar listing page. Renders posts scoped to a (pillar, subpillar) pair.
// Example: /news/nhl/draft, /news/nhl/playoffs, /news/womens/pwhl.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

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

async function getPostsBySubpillar(pillarSlug: string, subpillarSlug: string, limit = 30): Promise<Post[]> {
  const { data } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, published_at, category, pillar, subpillar, pillar_slug, subpillar_slug, reading_time_minutes, author_name')
    .eq('status', 'published')
    .eq('pillar_slug', pillarSlug)
    .eq('subpillar_slug', subpillarSlug)
    .order('published_at', { ascending: false })
    .limit(limit);
  return (data as Post[]) || [];
}

export async function generateMetadata({ params }: { params: Promise<{ pillar: string; subpillar: string }> }) {
  const { pillar, subpillar } = await params;
  const pillarLabel = PILLAR_LABELS[pillar] || pillar;
  const subpillarLabel = SUBPILLAR_LABELS[subpillar] || subpillar;
  return {
    title: `${subpillarLabel} \u2014 ${pillarLabel} News`,
    description: `${subpillarLabel} stories from the ${pillarLabel.toLowerCase()} pillar.`,
    alternates: { canonical: `https://rinkstop.com/news/${pillar}/${subpillar}` },
  };
}

export default async function SubpillarPage({ params }: { params: Promise<{ pillar: string; subpillar: string }> }) {
  const { pillar, subpillar } = await params;
  const posts = await getPostsBySubpillar(pillar, subpillar);

  const pillarLabel = PILLAR_LABELS[pillar] || pillar;
  const subpillarLabel = SUBPILLAR_LABELS[subpillar] || subpillar;

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

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.125rem' }}>No posts in this subpillar yet.</p>
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
