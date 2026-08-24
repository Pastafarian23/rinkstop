'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  published_at?: string;
  category?: string;
  reading_time_minutes?: number;
  author_name?: string;
  og_image_url?: string | null;
}

export default function HomeNewsSection() {
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Fetch enough to find recent non-highlight posts even when the
        // latest N posts are all auto-generated highlight recaps. The /api
        // default limit is 10, so we ask for 40 to skip past the highlight
        // wall and surface blog/guides/news/analysis/recruiting content.
        const res = await fetch('/api/blog/posts?page=1&limit=40');
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        // Filter out posts that are just highlight recaps — they already appear
        // in the LATEST HIGHLIGHTS grid above this section. Showing the same
        // content twice made the page feel repetitive. Keep all other
        // categories: news, blog, guides, analysis, recruiting, business, etc.
        const filtered = (json.data || []).filter(
          (p: Post) => (p.category || '').toLowerCase() !== 'highlights'
        );
        setPosts(filtered.slice(0, 5));
      } catch {
        if (!cancelled) setPosts([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (!posts || posts.length === 0) return null;

  return (
    <section className="section-py" style={{ background: '#111823', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container">
        <div className="sec-head">
          <div>
            <div className="label">Latest</div>
            <h2 className="font-sport" style={{ fontSize: 'clamp(1.625rem, 4vw, 2.25rem)', color: '#fff' }}>HOCKEY NEWS</h2>
          </div>
          <Link href="/news" className="sec-link">All News →</Link>
        </div>
        <div className="news-grid">
          {posts.map((post) => (
            <Link key={post.id} href={`/news/${post.slug}`} className="card" style={{ textDecoration: 'none' }}>
              {post.og_image_url ? (
                <img src={post.og_image_url} alt={`${post.title} — ${post.category || 'Hockey News'} article image`} style={{ width: '100%', height: '150px', objectFit: 'cover' }} loading="lazy" />
              ) : (
                <div style={{ height: '150px', background: 'linear-gradient(135deg, #041E42, #0A2E5C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                </div>
              )}
              <div style={{ padding: '1rem' }}>
                {post.category && <span className="badge badge-red" style={{ marginBottom: '0.5rem', display: 'inline-flex' }}>{post.category}</span>}
                <h3 style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', lineHeight: 1.4, marginBottom: '0.5rem' }}>{post.title}</h3>
                {post.subtitle && (
                  <p style={{
                    color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem', lineHeight: 1.6, marginBottom: '0.75rem',
                    display: '-webkit-box', overflow: 'hidden',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                  }}>{post.subtitle}</p>
                )}
                <span style={{ color: '#C8102E', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Read More →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
