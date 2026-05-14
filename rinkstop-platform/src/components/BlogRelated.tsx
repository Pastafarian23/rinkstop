'use client';

import { useState, useEffect } from 'react';
import RelatedContent from '@/components/RelatedContent';
import Link from 'next/link';

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  category?: string;
  tags?: string[];
  published_at?: string;
  author_name?: string;
  reading_time_minutes?: number;
}

interface BlogRelatedProps {
  currentSlug: string;
  currentTags?: string[];
  currentCategory?: string;
}

function formatDate(date?: string): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return date; }
}

export default function BlogRelated({ currentSlug, currentTags, currentCategory }: BlogRelatedProps) {
  const [posts, setPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    // Fetch all published posts and client-side filter by tags/category
    fetch('/api/blog/posts?page=1&limit=20')
      .then(r => r.json())
      .then(data => {
        const all: RelatedPost[] = data?.data || [];
        const others = all.filter(p => p.slug !== currentSlug);

        // Score posts by tag overlap
        const scored = others.map(p => {
          let score = 0;
          if (currentCategory && p.category === currentCategory) score += 3;
          if (currentTags && p.tags) {
            const overlap = (p.tags as string[]).filter(t => (currentTags as string[]).includes(t)).length;
            score += overlap;
          }
          return { post: p, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, 3).map(s => s.post);
        setPosts(top);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });

    setTimeout(() => controller.abort(), 8000);
    return () => controller.abort();
  }, [currentSlug, currentTags, currentCategory]);

  if (loading) return null;
  if (posts.length === 0) return null;

  return (
    <section style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
      <h2 style={{
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        fontSize: '1.375rem',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: '0.04em',
        marginBottom: '1.25rem',
      }}>
        You Might Also Like
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {posts.map(post => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            style={{
              display: 'block',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '1rem 1.25rem',
              textDecoration: 'none',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-h)';
              (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ minWidth: 0 }}>
                {post.category && (
                  <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(200,16,46,0.15)', color: 'var(--red)', marginBottom: '0.375rem' }}>
                    {post.category}
                  </span>
                )}
                <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', lineHeight: 1.35, marginBottom: '0.25rem' }}>
                  {post.title}
                </p>
                {post.subtitle && (
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                    {post.subtitle}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <span>{post.author_name || 'Arnel'}</span>
                  <span>·</span>
                  <span>{formatDate(post.published_at)}</span>
                  <span>·</span>
                  <span>{post.reading_time_minutes || 5} min</span>
                </div>
              </div>
              <span style={{ color: 'var(--red)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                Read →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}