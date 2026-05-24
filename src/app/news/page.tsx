// src/app/news/page.tsx  --  Blog listing page (Server Component)
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  published_at?: string;
  category?: string;
  reading_time_minutes?: number;
  author_name?: string;
}

function formatDate(date?: string) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return date; }
}

export default async function BlogPage() {
  const { data: posts } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, published_at, category, reading_time_minutes, author_name')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>News</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="label">Latest</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          HOCKEY NEWS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontSize: '0.9375rem' }}>
          Stories, insights, and analysis from the global hockey community.
        </p>
      </div>

      {/* Posts */}
      {!posts || posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.125rem', marginBottom: '0.5rem' }}>No posts yet.</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>Check back soon  --  new content is coming.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {posts.map((post: Post) => (
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
                  {post.category && (
                    <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(200,16,46,0.15)', color: 'var(--red)', marginBottom: '0.5rem' }}>
                      {post.category}
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