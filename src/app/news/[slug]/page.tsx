// src/app/news/[slug]/page.tsx  --  Individual blog post (public, SEO-optimized)
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BlogRelated from '@/components/BlogRelated';
import { supabaseAdmin } from '@/lib/supabase';
import { contentToHtml } from '@/lib/markdown';

// Defensive base URL — same pattern as the other server pages in this repo.
// In Vercel production NEXT_PUBLIC_SITE_URL is the real https://rinkstop.com,
// but during local builds it can be http://localhost:3456 or empty. In every
// case we want a stable, absolute https URL in the structured data.
const _RAW_SITE = process.env.NEXT_PUBLIC_SITE_URL || '';
const BASE_URL =
  _RAW_SITE.includes('localhost') || _RAW_SITE.includes('127.0.0.1') || !_RAW_SITE
    ? 'https://rinkstop.com'
    : _RAW_SITE;

interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  content: string;
  content_html?: string;
  author_name?: string;
  author_role?: string;
  published_at?: string;
  category?: string;
  tags?: string[];
  reading_time_minutes?: number;
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  updated_at?: string;
  view_count?: number;
}

interface Props {
  params: Promise<{ slug: string }>;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').substring(0, 160);
}

function formatDate(date?: string) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return date; }
}


async function getPost(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/blog/posts/${slug}`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  category?: string;
  tags?: string[];
  published_at?: string;
  og_image_url?: string;
  author_name?: string;
  reading_time_minutes?: number;
}

/**
 * Server-side: fetch up to 6 related published posts.
 *   - same category OR any matching tag
 *   - exclude the current post
 *   - order by published_at desc
 *   - status = 'published' (only count it as related if it's actually live)
 *
 * If 3+ rows come back, the page renders a "Related Hockey News" section.
 * If fewer than 3, we don't render the section at all.
 */
async function getRelatedPosts(currentPost: Post, limit: number = 6): Promise<RelatedPost[]> {
  try {
    const cat = currentPost.category || null;
    const tagList: string[] = Array.isArray(currentPost.tags) ? (currentPost.tags as string[]) : [];

    // Build a single query that ORs the category and any tag.
    // We then filter out the current slug in JS to avoid string-equality gotchas.
    const orParts: string[] = [];
    if (cat) orParts.push(`category.eq.${cat}`);
    for (const t of tagList) {
      // tags is a text[] column; Supabase's `cs` (contains) operator matches any of the current tags.
      orParts.push(`tags.cs.{"${t.replace(/"/g, '\\"')}"}`);
    }
    const orExpr = orParts.join(',');

    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('id, slug, title, subtitle, category, tags, published_at, og_image_url, author_name, reading_time_minutes')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .or(orExpr)
      .order('published_at', { ascending: false })
      .limit(limit + 1); // fetch one extra so we can drop the current post

    if (error || !data) return [];

    const filtered = (data as RelatedPost[])
      .filter(p => p.slug !== currentPost.slug)
      .slice(0, limit);
    return filtered;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[getRelatedPosts] ${currentPost.slug} threw:`, e);
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return notFound();

  // Root layout template already appends ' | RinkStop'. The seo_title in the DB
  // also ends in ' | RinkStop' (legacy pipeline), so strip it to avoid the
  // double 'X | RinkStop | RinkStop'. Fall back to plain post.title.
  const stripSuffix = (s: string) => s.replace(/\s*\|\s*RinkStop\s*$/, '');
  const blogTitle = stripSuffix(post.seo_title || post.title);
  const seoDesc = post.seo_description || post.subtitle || stripHtml(post.content);
  const ogImage = post.og_image_url || `https://rinkstop.com/og?title=${encodeURIComponent(post.title)}`;

  return {
    title: blogTitle,
    description: seoDesc,
    authors: [{ name: 'Arnel Larracas' }],
    openGraph: {
      title: blogTitle,
      description: seoDesc,
      type: 'article',
      publishedTime: post.published_at,
      authors: ['Arnel Larracas'],
      images: [ogImage],
      tags: post.tags || [],
    },
    twitter: {
      card: 'summary_large_image',
      title: blogTitle,
      description: seoDesc,
    },
    alternates: {
      canonical: `https://rinkstop.com/news/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return notFound();

  const htmlContent = contentToHtml(post.content);
  // Prefer the post's own author fields when set (the highlight pipeline sets
  // author_name = 'RinkStop / Highlight Desk'); fall back to the founder.
  const authorName = post.author_name || 'Arnel Larracas';
  const authorRole = post.author_role || 'Founder';
  const date = formatDate(post.published_at || (post as any).created_at);
  const readTime = post.reading_time_minutes || 5;
  const tags = post.tags || [];
  const wordCount = post.content.split(/\s+/).length;

  // Fetch related posts server-side. If 3+ exist, render a cross-link block.
  const relatedPosts = await getRelatedPosts(post, 6);

  // Per requirements: NewsArticle for the "highlights" category, Article for
  // everything else (blog, guides, NHL, etc.).
  const articleType: 'NewsArticle' | 'Article' =
    (post.category || '').toLowerCase() === 'highlights' ? 'NewsArticle' : 'Article';

  const headline = post.title;
  const description =
    post.seo_description || post.subtitle || stripHtml(post.content);
  const image = post.og_image_url || null;
  const canonicalUrl = `${BASE_URL}/news/${post.slug}`;
  const logoUrl = `${BASE_URL}/rinkstoplogo.png`;
  const tagsCsv = tags.join(', ');

  const articleJsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': articleType,
    headline,
    description,
    image,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      '@type': 'Person',
      name: authorName,
      jobTitle: authorRole,
    },
    publisher: {
      '@type': 'Organization',
      name: 'RinkStop',
      logo: {
        '@type': 'ImageObject',
        url: logoUrl,
      },
    },
    mainEntityOfPage: canonicalUrl,
    articleSection: post.category || undefined,
    keywords: tagsCsv || undefined,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${BASE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'News',
        item: `${BASE_URL}/news`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      {/* JSON-LD structured data — Article / NewsArticle */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      {/* JSON-LD — BreadcrumbList (Home > News > Article) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <article>
        {/* Hero */}
        <div style={{
          position: 'relative',
          backgroundImage: `url(${post.og_image_url || `https://rinkstop.com/og?title=${encodeURIComponent(post.title)}`})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '3rem 1rem',
          marginBottom: '2rem'
        }}>
          {/* Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(4,30,66,0.92) 0%, rgba(10,46,92,0.85) 100%)',
          }} />
          <div style={{ position: 'relative', maxWidth: '1280px', margin: '0 auto' }}>
            {post.category && (
              <div style={{
                display: 'inline-block',
                background: '#C8102E',
                color: '#fff',
                fontSize: '0.6875rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '0.25rem 0.75rem',
                borderRadius: '2px',
                marginBottom: '1rem'
              }}>
                {post.category}
              </div>
            )}
            <h1 style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: 'clamp(1.75rem, 5vw, 3rem)',
              color: '#fff',
              letterSpacing: '0.02em',
              lineHeight: 1.1,
              margin: '0 0 1rem'
            }}>
              {post.title}
            </h1>
            {post.subtitle && (
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.125rem', marginBottom: '1rem' }}>
                {post.subtitle}
              </p>
            )}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.8125rem'
            }}>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>By {authorName}</span>
              {date && <span>{date}</span>}
              <span>{readTime} min read</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 3rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '2rem',
            alignItems: 'start'
          }}
          className="news-content-grid"
          >
            {/* Main content */}
            <div>
              {/* Breadcrumb */}
              <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
                <Link href="/" style={{ color: '#555' }}>Home</Link>
                <span style={{ margin: '0 0.4rem' }}>›</span>
                <Link href="/news" style={{ color: '#555' }}>News</Link>
                <span style={{ margin: '0 0.4rem' }}>›</span>
                <span style={{ color: '#A0A0A0' }}>{post.title.substring(0, 40)}...</span>
              </nav>

              {/* Tags */}
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {tags.map(tag => (
                    <Link
                      key={tag}
                      href={`/news?tag=${tag}`}
                      style={{
                        background: 'rgba(200,16,46,0.08)',
                        color: '#C8102E',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '2px',
                        fontSize: '0.75rem',
                        textDecoration: 'none'
                      }}
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Article body */}
              <div
                className="article-card"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />

              {/* Share */}
              <div style={{
                marginTop: '2.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #eee',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center'
              }}>
                <span style={{ color: '#666', fontSize: '0.8125rem', fontWeight: 600 }}>Share:</span>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=https://rinkstop.com/news/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#1DA1F2',
                    color: '#fff',
                    padding: '0.4rem 0.875rem',
                    borderRadius: '3px',
                    fontSize: '0.8125rem',
                    textDecoration: 'none'
                  }}
                >
                  Post to X
                </a>
              </div>

              {/* Author bio */}
              <div style={{
                marginTop: '2.5rem',
                background: '#f8f8f8',
                padding: '1.5rem',
                borderRadius: '4px'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem', color: '#1a1a1a' }}>Arnel Larracas</div>
                <div style={{ color: '#C8102E', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{authorRole}</div>
                <p style={{ color: '#555', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                  Writer and hockey enthusiast.
                </p>
                <a
                  href="https://www.linkedin.com/in/arnellarracas"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#0A66C2', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.063 2.063 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  Connect on LinkedIn
                </a>
              </div>
            </div>

            {/* Sidebar */}
            <aside style={{ position: 'sticky', top: '1rem' }}>
              {/* Related content */}
              <BlogRelated currentSlug={post.slug} currentCategory={post.category} />

              {/* Back to news */}
              <div style={{ marginTop: '1.5rem' }}>
                <Link href="/news" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: '#555',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  padding: '0.5rem 0'
                }}>
                  ← Back to News
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>

      {/* Internal cross-linking block — Related Hockey News */}
      {/* Server-rendered, no client JS. Only renders when 3+ related posts exist. */}
      {relatedPosts.length >= 3 && (
        <section
          aria-label="Related hockey news"
          style={{
            background: '#0D1117',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '3rem 1rem',
          }}
        >
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}>
              <h2 style={{
                fontFamily: '"Bebas Neue", Impact, sans-serif',
                fontSize: '1.75rem',
                color: '#fff',
                letterSpacing: '0.04em',
                margin: 0,
              }}>
                Related Hockey News
              </h2>
              <Link
                href="/news"
                style={{
                  color: '#FFB81C',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  textDecoration: 'none',
                }}
              >
                See all news →
              </Link>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.25rem',
            }}>
              {relatedPosts.slice(0, 6).map((rp) => (
                <Link
                  key={rp.id}
                  href={`/news/${rp.slug}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#041E42',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    transition: 'transform 0.18s, border-color 0.18s, box-shadow 0.18s',
                  }}
                >
                  {/* 16:9 image — falls back to the site OG generator when the post has no og_image_url */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16 / 9',
                    background: '#0a1a36',
                    backgroundImage: `url(${rp.og_image_url || `${BASE_URL}/og?title=${encodeURIComponent(rp.title)}`})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {rp.category && (
                      <span style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        background: '#C8102E',
                        color: '#fff',
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '2px',
                      }}>
                        {rp.category}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '0.875rem 1rem 1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      color: '#fff',
                      lineHeight: 1.3,
                      margin: '0 0 0.4rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden',
                    }}>
                      {rp.title}
                    </h3>
                    {rp.subtitle && (
                      <p style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.8125rem',
                        lineHeight: 1.4,
                        margin: '0 0 0.6rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                        flex: 1,
                      }}>
                        {rp.subtitle}
                      </p>
                    )}
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.4)',
                      marginTop: 'auto',
                    }}>
                      <span style={{ color: '#FFB81C', fontWeight: 600 }}>
                        {rp.author_name || 'RinkStop'}
                      </span>
                      {rp.published_at && (
                        <>
                          <span>·</span>
                          <span>
                            {new Date(rp.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export const dynamic = 'force-dynamic';
export const dynamicParams = true;