// src/components/FullArticle.tsx
// Full single-article view used by both legacy /news/<slug> URLs (via the
// [pillar] route's Case 2 fallback) and any future single-segment article
// route. Lifted from src/app/news/_slug_deprecated/page.tsx on 2026-08-11
// when wiring up NewsArticle JSON-LD, article:* meta, visible <time>, and
// byline for Google Publisher Center.
//
// Schema on the rendered <article> matches NewsArticle / schema.org so Google's
// structured-data crawler can pick up publisher, datePublished, headline,
// image, etc. from one place.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import BlogRelated from '@/components/BlogRelated';
import ShareButton from '@/components/ShareButton';
import ArticleCtaBlock from '@/components/ArticleCtaBlock';
import RelatedDirectorySection from '@/components/RelatedDirectorySection';
import LocationHeader from '@/components/LocationHeader';
import { supabaseAdmin } from '@/lib/supabase';
import { contentToHtml } from '@/lib/markdown';
import { buildArticleShare } from '@/lib/share';
import { autolinkContent } from '@/lib/autolink';

const _RAW_SITE = process.env.NEXT_PUBLIC_SITE_URL || '';
export const FULL_ARTICLE_BASE_URL =
  _RAW_SITE.includes('localhost') || _RAW_SITE.includes('127.0.0.1') || !_RAW_SITE
    ? 'https://rinkstop.com'
    : _RAW_SITE;

export interface FullPost {
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
  country_slug?: string | null;
  state_slug?: string | null;
  city_slug?: string | null;
  country_label?: string | null;
  state_label?: string | null;
  city_label?: string | null;
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
 * Module-level cache for autolink entities. Per-article render calls this
 * and re-uses the result across the same server-instance lifetime, capped
 * at 1h via the TTL. Refresh on next request after expiry.
 *
 * Why module-level (vs per-request): 720 articles × 5 req/s ≈ 3,600 calls/min.
 * Without cache that's 3,600 Supabase round-trips for the same entity list.
 * With cache, it's 1 per hour.
 */
interface AutolinkEntityCache {
  teams: { name: string; slug: string }[];
  leagues: { name: string; slug: string }[];
  rinks: { name: string; slug: string }[];
  fetchedAt: number;
}
let _autolinkCache: AutolinkEntityCache | null = null;
const AUTOLINK_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getAutolinkEntities(): Promise<AutolinkEntityCache> {
  const now = Date.now();
  if (_autolinkCache && now - _autolinkCache.fetchedAt < AUTOLINK_CACHE_TTL_MS) {
    return _autolinkCache;
  }
  const [teamsRes, leaguesRes, rinksRes] = await Promise.all([
    supabaseAdmin
      .from('teams')
      .select('name, slug')
      .eq('is_active', true)
      .not('slug', 'is', null),
    supabaseAdmin
      .from('leagues')
      .select('name, slug')
      .eq('is_active', true)
      .not('slug', 'is', null),
    supabaseAdmin
      .from('rinks')
      .select('name, slug')
      .eq('is_active', true)
      .not('slug', 'is', null),
  ]);
  _autolinkCache = {
    teams: ((teamsRes.data as any[]) || []).filter(r => r.slug).map(r => ({ name: r.name, slug: r.slug })),
    leagues: ((leaguesRes.data as any[]) || []).filter(r => r.slug).map(r => ({ name: r.name, slug: r.slug })),
    rinks: ((rinksRes.data as any[]) || []).filter(r => r.slug).map(r => ({ name: r.name, slug: r.slug })),
    fetchedAt: now,
  };
  return _autolinkCache;
}

async function getRelatedPosts(currentPost: FullPost, limit: number = 6): Promise<RelatedPost[]> {
  try {
    const cat = currentPost.category || null;
    const tagList: string[] = Array.isArray(currentPost.tags) ? (currentPost.tags as string[]) : [];
    const orParts: string[] = [];
    if (cat) orParts.push(`category.eq.${cat}`);
    for (const t of tagList) {
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
      .limit(limit + 1);
    if (error || !data) return [];
    return (data as RelatedPost[]).filter(p => p.slug !== currentPost.slug).slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Build the NewsArticle / Article JSON-LD for a post.
 * Exported so generateMetadata callers can re-use the same shape.
 */
export function buildArticleJsonLd(post: FullPost): Record<string, any> {
  const articleType: 'NewsArticle' | 'Article' =
    (post.category || '').toLowerCase() === 'highlights' ? 'NewsArticle' : 'Article';

  const description =
    post.seo_description || post.subtitle || stripHtml(post.content);
  const canonicalUrl = `${FULL_ARTICLE_BASE_URL}/news/${post.slug}`;
  const logoUrl = `${FULL_ARTICLE_BASE_URL}/rinkstoplogo.png`;
  const tagsCsv = (post.tags || []).join(', ');
  const authorName = post.author_name || 'Arnel Larracas';
  const authorRole = post.author_role || 'Founder';

  const ld: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': articleType,
    headline: post.title,
    description,
    image: post.og_image_url || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      '@type': 'Person',
      name: authorName,
      jobTitle: authorRole,
    },
    publisher: {
      '@id': `${FULL_ARTICLE_BASE_URL}/#organization`,
      '@type': 'Organization',
      name: 'RinkStop',
      logo: {
        '@type': 'ImageObject',
        url: logoUrl,
        width: 600,
        height: 60,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    url: canonicalUrl,
    articleSection: post.category || undefined,
    keywords: tagsCsv || undefined,
    inLanguage: 'en',
    isAccessibleForFree: true,
  };

  // Drop undefined keys so the JSON-LD payload stays clean.
  Object.keys(ld).forEach(k => ld[k] === undefined && delete (ld as any)[k]);
  return ld;
}

export default async function FullArticle({ post }: { post: FullPost }) {
  if (!post || !post.slug) {
    return notFound();
  }

  let htmlContent = (post.content_html && post.content_html.trim().length > 0)
    ? post.content_html
    : contentToHtml(post.content);

  // 2026-09-03 Gap 9+14: auto-link team/league/rink mentions in article body.
  // Existing autolink.ts function was unused. Wire it up + fetch entity names
  // per-article (cached in a module-level Map so repeat article renders on the
  // same Next.js server instance skip the DB query).
  //
  // 2026-09-04: per-post opt-out. The autolink pass matches bare words like
  // "Canada", "USA", "championship", "sport" against DB entity slugs (national
  // teams, league rows), producing false-positive inline links that point at
  // the wrong directory entry. For articles where this is undesirable (e.g.
  // analysis pieces that use country names as prose, not as entity references),
  // set `disable_autolink: true` on the post. Column is optional — defaults to
  // false. Same fix protects every future article.
  const autolinkEnabled = !(post as { disable_autolink?: boolean }).disable_autolink;
  if (autolinkEnabled) {
    try {
      const entities = await getAutolinkEntities();
      if (entities.teams.length + entities.leagues.length + entities.rinks.length > 0) {
        htmlContent = autolinkContent(htmlContent, entities.teams, entities.leagues, entities.rinks);
      }
    } catch (e) {
      // Auto-linking is best-effort. If the DB query fails, render the
      // unlinked article rather than failing the whole page.
      console.error('[autolink] entity fetch failed:', e);
    }
  }

  const authorName = post.author_name || 'Arnel Larracas';
  const authorRole = post.author_role || 'Founder';
  const date = formatDate(post.published_at);
  const isoPublished = post.published_at ? new Date(post.published_at).toISOString() : '';
  const isoModified = post.updated_at ? new Date(post.updated_at).toISOString() : isoPublished;
  const readTime = post.reading_time_minutes || 5;
  const tags = post.tags || [];
  const relatedPosts = await getRelatedPosts(post, 6);
  const canonicalUrl = `${FULL_ARTICLE_BASE_URL}/news/${post.slug}`;
  const heroImage = post.og_image_url || `https://rinkstop.com/og?title=${encodeURIComponent(post.title)}`;

  const articleJsonLd = buildArticleJsonLd(post);
  const articleJsonLdString = JSON.stringify(articleJsonLd).replace(/</g, '\\u003c');

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${FULL_ARTICLE_BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'News', item: `${FULL_ARTICLE_BASE_URL}/news` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl },
    ],
  };
  const breadcrumbJsonLdString = JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c');

  return (
    <>
      {/* NewsArticle / Article JSON-LD — Google structured-data + AI Overview pickup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: articleJsonLdString }}
      />
      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLdString }}
      />

      <article
        itemScope
        itemType={`https://schema.org/${(post.category || '').toLowerCase() === 'highlights' ? 'NewsArticle' : 'Article'}`}
        lang="en"
      >
        <meta itemProp="inLanguage" content="en" />

        {/* Hero */}
        <div
          style={{
            position: 'relative',
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            padding: '3rem 1rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(4,30,66,0.92) 0%, rgba(10,46,92,0.85) 100%)',
            }}
          />
          <div style={{ position: 'relative', maxWidth: '1280px', margin: '0 auto' }}>
            {post.category && (
              <div
                style={{
                  display: 'inline-block',
                  background: '#C8102E',
                  color: '#fff',
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '2px',
                  marginBottom: '1rem',
                }}
              >
                {post.category}
              </div>
            )}
            <LocationHeader
              country_slug={post.country_slug}
              state_slug={post.state_slug}
              city_slug={post.city_slug}
              country_label={post.country_label}
              state_label={post.state_label}
              city_label={post.city_label}
            />
            <h1
              itemProp="headline"
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 'clamp(1.75rem, 5vw, 3rem)',
                color: '#fff',
                letterSpacing: '0.02em',
                lineHeight: 1.1,
                margin: '0 0 1rem',
              }}
            >
              {post.title}
            </h1>
            {post.subtitle && (
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.125rem', marginBottom: '1rem' }}>
                {post.subtitle}
              </p>
            )}
            <div
              itemProp="author" itemScope itemType="https://schema.org/Person"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                By <span itemProp="name">{authorName}</span>
              </span>
              {isoPublished && (
                <time
                  itemProp="datePublished"
                  dateTime={isoPublished}
                  suppressHydrationWarning
                >
                  {date}
                </time>
              )}
              {isoModified && isoModified !== isoPublished && (
                <time
                  itemProp="dateModified"
                  dateTime={isoModified}
                  suppressHydrationWarning
                >
                  Updated {formatDate(post.updated_at)}
                </time>
              )}
              <span>{readTime} min read</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 3rem' }}>
          <div
            className="news-content-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr)',
              gap: '2rem',
              alignItems: 'start',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
                <Link href="/" style={{ color: '#555' }}>Home</Link>
                <span style={{ margin: '0 0.4rem' }}>›</span>
                <Link href="/news" style={{ color: '#555' }}>News</Link>
                <span style={{ margin: '0 0.4rem' }}>›</span>
                <span style={{ color: '#A0A0A0' }}>{post.title.substring(0, 40)}...</span>
              </nav>

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
                        textDecoration: 'none',
                      }}
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}

              <div
                itemProp="articleBody"
                className="article-card"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />

              
              <ArticleCtaBlock
                slug={post.slug}
                category={post.category ?? null}
                tags={post.tags ?? null}
                title={post.title ?? null}
              />

              <div
                style={{
                  marginTop: '2.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #eee',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: '#666', fontSize: '0.8125rem', fontWeight: 600 }}>Share:</span>
                <ShareButton
                  payload={buildArticleShare({
                    title: post.title,
                    slug: post.slug,
                    excerpt: post.subtitle ?? null,
                  })}
                  variant="brand"
                />
              </div>

              <div
                style={{
                  marginTop: '2.5rem',
                  background: '#f8f8f8',
                  padding: '1.5rem',
                  borderRadius: '4px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem', color: '#1a1a1a' }}>
                  {authorName}
                </div>
                <div style={{ color: '#C8102E', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                  {authorRole}
                </div>
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
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.063 2.063 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  Connect on LinkedIn
                </a>
              </div>
            </div>

            <aside style={{ position: 'sticky', top: '1rem' }}>
              <BlogRelated currentSlug={post.slug} currentCategory={post.category} />
              <div style={{ marginTop: '1.5rem' }}>
                <Link
                  href="/news"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#555',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    padding: '0.5rem 0',
                  }}
                >
                  ← Back to News
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>

      {/* Related Hockey News — server-rendered cross-link block */}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <h2
                style={{
                  fontFamily: '"Bebas Neue", Impact, sans-serif',
                  fontSize: '1.75rem',
                  color: '#fff',
                  letterSpacing: '0.04em',
                  margin: 0,
                }}
              >
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1.25rem',
              }}
            >
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
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16 / 9',
                      background: '#0a1a36',
                      backgroundImage: `url(${rp.og_image_url || `${FULL_ARTICLE_BASE_URL}/og?title=${encodeURIComponent(rp.title)}`})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {rp.category && (
                      <span
                        style={{
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
                        }}
                      >
                        {rp.category}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '0.875rem 1rem 1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        color: '#fff',
                        lineHeight: 1.3,
                        margin: '0 0 0.4rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}
                    >
                      {rp.title}
                    </h3>
                    {rp.subtitle && (
                      <p
                        style={{
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: '0.8125rem',
                          lineHeight: 1.4,
                          margin: '0 0 0.6rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical' as const,
                          overflow: 'hidden',
                          flex: 1,
                        }}
                      >
                        {rp.subtitle}
                      </p>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.4)',
                        marginTop: 'auto',
                      }}
                    >
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

      <RelatedDirectorySection tags={post.tags} category={post.category} />
    </>
  );
}
