// src/app/blog/[slug]/page.tsx — Individual blog post (public, SEO-optimized)
import { notFound } from 'next/navigation';
import Link from 'next/link';

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

// Strip HTML tags for plain text preview
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').substring(0, 160);
}

// Convert markdown content to clean HTML paragraphs
function contentToHtml(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];
  let inList = false;

  const flushList = () => {
    if (inList) {
      output.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      flushList();
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushList();
      output.push(`<h1 class="text-3xl font-bold text-white mt-8 mb-4">${trimmed.substring(2)}</h1>`);
    } else if (trimmed.startsWith('## ')) {
      flushList();
      output.push(`<h2 class="text-2xl font-semibold text-slate-100 mt-6 mb-3">${trimmed.substring(3)}</h2>`);
    } else if (trimmed.startsWith('### ')) {
      flushList();
      output.push(`<h3 class="text-xl font-medium text-slate-300 mt-5 mb-2">${trimmed.substring(4)}</h3>`);
    } else if (trimmed.startsWith('- ')) {
      if (!inList) {
        output.push('<ul class="list-disc ml-6 my-2 space-y-1">');
        inList = true;
      }
      output.push(`<li class="text-slate-300 leading-relaxed">${escapeHtml(trimmed.substring(2))}</li>`);
    } else if (trimmed.startsWith('> ')) {
      flushList();
      output.push(`<blockquote class="border-l-4 border-teal-500 pl-4 my-4 italic text-slate-400">${escapeHtml(trimmed.substring(2))}</blockquote>`);
    } else if (trimmed === '---') {
      flushList();
      output.push('<hr class="border-slate-800 my-8" />');
    } else {
      flushList();
      output.push(`<p class="text-slate-300 leading-relaxed mb-4">${escapeHtml(trimmed)}</p>`);
    }
  }

  flushList();
  return output.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date?: string): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return date;
  }
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/blog/posts/${slug}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Dynamic metadata for SEO — uses Next.js generateMetadata pattern
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
    authors: [{ name: post.author_name || 'Arnel' }],
    openGraph: {
      title: blogTitle,
      description: seoDesc,
      type: 'article',
      publishedTime: post.published_at,
      authors: [post.author_name || 'Arnel'],
      images: [ogImage],
      tags: post.tags || [],
    },
    twitter: {
      card: 'summary_large_image',
      title: blogTitle,
      description: seoDesc,
    },
    alternates: {
      canonical: `https://rinkstop.com/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  const htmlContent = contentToHtml(post.content);
  const authorName = post.author_name || 'Arnel';
  const authorRole = post.author_role || 'Founder, RinkStop';
  const date = formatDate(post.published_at);
  const readTime = post.reading_time_minutes || 5;
  const tags = post.tags || [];
  const wordCount = post.content.split(/\s+/).length;

  return (
    <>
      <article className="max-w-3xl mx-auto py-12 px-4">
        {/* Schema.org JSON-LD for E-E-A-T */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.title,
              description: post.seo_description || post.subtitle || stripHtml(post.content),
              author: {
                '@type': 'Person',
                name: authorName,
                jobTitle: authorRole,
              },
              datePublished: post.published_at,
              dateModified: post.updated_at,
              publisher: {
                '@type': 'Organization',
                name: 'RinkStop',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://rinkstop.com/logo.png',
                },
              },
              mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': `https://rinkstop.com/blog/${post.slug}`,
              },
              wordCount: wordCount,
              timeRequired: `PT${readTime}M`,
              articleSection: post.category || 'blog',
              keywords: tags.join(', '),
            }),
          }}
        />

        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-teal-400">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-teal-400">Blog</Link>
          {post.category && (
            <>
              <span className="mx-2">/</span>
              <Link href={`/blog?category=${post.category}`} className="hover:text-teal-400 capitalize">
                {post.category.replace('-', ' ')}
              </Link>
            </>
          )}
        </nav>

        {/* Category badge */}
        {post.category && (
          <span className="inline-block text-xs bg-teal-500/10 text-teal-400 px-3 py-1 rounded-full mb-4 capitalize">
            {post.category.replace('-', ' ')}
          </span>
        )}

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
            {post.title}
          </h1>

          {post.subtitle && (
            <p className="text-xl text-slate-400 mb-6 leading-relaxed">{post.subtitle}</p>
          )}

          {/* Author & Meta — E-E-A-T signals */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-teal-500/20">
                {authorName[0]}
              </div>
              <div>
                <div className="text-slate-200 font-semibold">{authorName}</div>
                <div className="text-xs text-slate-500">{authorRole}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <time dateTime={post.published_at}>{date}</time>
              <span>·</span>
              <span>{readTime} min read</span>
              <span>·</span>
              <span>{wordCount} words</span>
              {post.view_count != null && (
                <>
                  <span>·</span>
                  <span>{post.view_count.toLocaleString()} views</span>
                </>
              )}
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${tag}`}
                  className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full hover:bg-teal-500/20 hover:text-teal-400 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </header>

        {/* Divider */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-8" />

        {/* Article Body */}
        <div
          className="prose prose-invert prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Divider */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent my-8" />

        {/* Author Bio Card — E-E-A-T */}
        <section className="flex items-center gap-4 p-5 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="w-14 h-14 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-lg shadow-teal-500/10">
            {authorName[0]}
          </div>
          <div>
            <div className="text-white font-semibold">{authorName}</div>
            <div className="text-sm text-slate-500">{authorRole}</div>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              Arnel is a hockey coach with 20+ years of experience across Chicago, Africa, and the Philippines. He founded RinkStop to connect the global hockey community and help players, coaches, and fans discover the game worldwide.
            </p>
          </div>
        </section>

        {/* Related Posts */}
        <section className="mt-12 pt-8 border-t border-slate-800">
          <h2 className="text-lg font-bold text-white mb-4">More from RinkStop</h2>
          <p className="text-slate-500 text-sm">
            Explore more stories on the global hockey community →{' '}
            <Link href="/blog" className="text-teal-400 hover:underline font-medium">
              All posts →
            </Link>
          </p>
        </section>
      </article>
    </>
  );
}

// Dynamic route params — allow all slugs, not just pre-seeded ones
export const dynamicParams = true;

// Generate static params for existing seeded posts
export async function generateStaticParams() {
  return [
    { slug: 'global-hockey-directory-building-05-09-2026' },
    { slug: 'coaching-cebu-lessons-05-08-2026' },
    { slug: 'youth-hockey-overseas-05-08-2026' },
    { slug: 'youth-hockey-growth-04-22-2026' },
  ];
}