// src/components/BlogRelatedServer.tsx
// Server-rendered "Related Posts" sidebar component for blog posts.
// Fetches all published posts in the same render pass and scores them
// by tag/category/keyword overlap. Top 3 are returned.
//
// Unlike BlogRelated (client component), this version renders in SSR
// HTML so search engines and the initial page load see the related links.

import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  category?: string;
  tags?: string[];
  published_at?: string;
  reading_time_minutes?: number;
  og_image_url?: string;
}

interface BlogRelatedServerProps {
  currentSlug: string;
  currentTitle: string;
  currentCategory?: string;
  currentTags?: string[];
  limit?: number;
}

function scorePost(current: { tags?: string[]; category?: string; title: string }, candidate: RelatedPost) {
  let score = 0;
  // Same category: +3
  if (current.category && candidate.category && candidate.category === current.category) {
    score += 3;
  }
  // Each overlapping tag: +1
  const currentTags = new Set((current.tags || []).map(t => t.toLowerCase()));
  const candTags = new Set((candidate.tags || []).map(t => t.toLowerCase()));
  let tagOverlap = 0;
  candTags.forEach(t => { if (currentTags.has(t)) tagOverlap += 1; });
  score += tagOverlap;

  // Title keyword overlap: +1 per match (filter common words)
  const common = new Set(['with', 'from', 'into', 'your', 'this', 'that', 'what', 'when', 'have', 'been', 'their', 'there', 'these', 'those', 'where', 'which', 'about', 'more', 'find', 'guide', 'complete', 'every', 'best', 'what', 'should']);
  const curWords = new Set(
    current.title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !common.has(w))
  );
  const candWords = new Set(
    (candidate.title || '').toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !common.has(w))
  );
  let kwOverlap = 0;
  candWords.forEach(w => { if (curWords.has(w)) kwOverlap += 1; });
  score += kwOverlap;

  return score;
}

function formatDate(date?: string): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return date; }
}

export default async function BlogRelatedServer({
  currentSlug,
  currentTitle,
  currentCategory,
  currentTags,
  limit = 3,
}: BlogRelatedServerProps) {
  // Fetch ALL published posts (small dataset, single query)
  const { data: allPosts, error } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, category, tags, published_at, reading_time_minutes, og_image_url')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  if (error || !allPosts) return null;

  // Score and rank
  const candidates: RelatedPost[] = (allPosts as RelatedPost[]).filter(p => p.slug !== currentSlug);
  const scored = candidates
    .map(p => ({ post: p, score: scorePost(
      { tags: currentTags, category: currentCategory, title: currentTitle },
      p
    ) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length === 0) return null;

  return (
    <section
      style={{
        marginTop: '1.5rem',
        padding: '1.25rem',
        background: '#fff',
        border: '1px solid #e5e5e5',
        borderRadius: '6px',
      }}
      aria-label="Related posts"
    >
      <h2 style={{
        fontFamily: '"Bebas Neue", Impact, sans-serif',
        fontSize: '1.125rem',
        color: '#041E42',
        letterSpacing: '0.04em',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid #C8102E',
      }}>
        Related Posts
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {scored.map(({ post, score }) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            style={{
              display: 'block',
              textDecoration: 'none',
              paddingBottom: '0.875rem',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              {post.og_image_url && (
                <img
                  src={post.og_image_url}
                  alt=""
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    flexShrink: 0,
                    background: '#f0f0f0',
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  color: '#1a1a1a',
                  lineHeight: 1.35,
                  marginBottom: '0.25rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical' as const,
                  overflow: 'hidden',
                }}>
                  {post.title}
                </p>
                <div style={{
                  display: 'flex',
                  gap: '0.4rem',
                  fontSize: '0.6875rem',
                  color: '#999',
                  flexWrap: 'wrap',
                }}>
                  {post.category && (
                    <span style={{
                      color: '#C8102E',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {post.category}
                    </span>
                  )}
                  <span>·</span>
                  <span>{post.reading_time_minutes || 5} min</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/blog"
        style={{
          display: 'block',
          marginTop: '1rem',
          textAlign: 'center',
          color: '#C8102E',
          fontSize: '0.8125rem',
          fontWeight: 700,
          textDecoration: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        See All Posts →
      </Link>
    </section>
  );
}
