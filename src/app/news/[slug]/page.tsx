// src/app/news/[slug]/page.tsx  --  Individual blog post (public, SEO-optimized)
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BlogRelated from '@/components/BlogRelated';

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Convert inline markdown to HTML. Order matters:
// 1) links first (may wrap with italic later)
// 2) bold (**...**)
// 3) italic (*...*) — single * not part of **
function inlineMarkdownToHtml(line: string): string {
  // 1) links: [label](https://url)
  let s = line.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g,
    (_m, label, url) => {
      const safeLabel = escapeHtml(label);
      const safeUrl = url.replace(/"/g, '&quot;');
      return `<a href="${safeUrl}" rel="noopener noreferrer" target="_blank">${safeLabel}</a>`;
    }
  );
  // 2) bold
  s = s.replace(/\*\*(.+?)\*\*/g, (_m, t) => `<strong>${t}</strong>`);
  // 3) italic — single * not in ** and not part of HTML tags we just emitted
  s = s.replace(/(^|[^*\w])\*([^\*\n]+?)\*(?!\*)/g, (_m, lead, t) => `${lead}<em>${t}</em>`);
  return s;
}

function contentToHtml(content: string): string {
  // Remove sign-off lines
  let text = content
    .replace(/Stay true to who you are\..*$/gim, '')
    .replace(/^\s* -- \s*Arnel\s*$/gim, '')
    .replace(/^\s*Arnel\s*$/gim, '');

  const lines = text.split('\n');
  const html: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { html.push(''); continue; }

    // H2
    if (line.startsWith('## ')) {
      html.push(`<h2>${inlineMarkdownToHtml(line.substring(3))}</h2>`);
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      html.push(`<h3>${inlineMarkdownToHtml(line.substring(4))}</h3>`);
      continue;
    }

    // Regular paragraph (escape HTML, then apply inline markdown)
    html.push(`<p>${inlineMarkdownToHtml(escapeHtml(line))}</p>`);
  }

  return html.join('\n');
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

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return notFound();

  const seoTitle = post.seo_title || post.title;
  const blogTitle = `${seoTitle} | RinkStop Blog`;
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
  const authorName = 'Arnel Larracas';
  const authorRole = 'Founder';
  const date = formatDate(post.published_at || (post as any).created_at);
  const readTime = post.reading_time_minutes || 5;
  const tags = post.tags || [];
  const wordCount = post.content.split(/\s+/).length;

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: post.title,
            description: post.seo_description || post.subtitle || stripHtml(post.content),
            image: post.og_image_url || `https://rinkstop.com/og?title=${encodeURIComponent(post.title)}`,
            datePublished: post.published_at,
            dateModified: post.updated_at || post.published_at,
            author: { '@type': 'Person', name: 'Arnel Larracas' },
            publisher: {
              '@type': 'Organization',
              name: 'RinkStop',
              logo: { '@type': 'ImageObject', url: 'https://rinkstop.com/rinkstoplogo.png' },
            },
            mainEntityOfPage: `https://rinkstop.com/news/${post.slug}`,
          }),
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
    </>
  );
}

export const dynamic = 'force-dynamic';
export const dynamicParams = true;