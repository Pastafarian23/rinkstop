// src/app/blog/page.tsx — Blog listing page (public)
import Link from 'next/link';

interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  published_at?: string;
  category?: string;
  tags?: string[];
  reading_time_minutes?: number;
  view_count?: number;
  author_name?: string;
}

async function getPosts(): Promise<{ posts: Post[], total: number }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/blog/posts?status=published&limit=20&page=1`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) return { posts: [], total: 0 };
  const data = await res.json();
  return { posts: data.posts || [], total: data.pagination?.total || 0 };
}

const CATEGORIES = [
  { key: 'blog', label: 'Latest from the Blog' },
  { key: 'coaching', label: 'Coaching Insights' },
  { key: 'global-scenes', label: 'Local Scenes' },
  { key: 'youth-hockey', label: 'Youth Hockey' },
  { key: 'industry', label: 'Industry' },
];

export default async function BlogPage() {
  const { posts, total } = await getPosts();

  // Group by category
  const grouped: Record<string, Post[]> = {};
  CATEGORIES.forEach(c => { grouped[c.key] = posts.filter(p => p.category === c.key); });

  const formatDate = (date?: string) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return date; }
  };

  return (
    <div>
      {/* Hero */}
      <section className="text-center py-16">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">The RinkStop Blog</h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Stories, insights, and analysis from the global hockey community — on and off the ice.
        </p>
      </section>

      {/* Featured Post */}
      {posts.length > 0 && (
        <Link href={`/blog/${posts[0].slug}`} className="block group mb-12">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 hover:border-teal-500/50 transition-all hover:-translate-y-1">
            <div className="flex gap-2 mb-3">
              <span className="text-xs bg-teal-500/10 text-teal-400 px-2 py-1 rounded capitalize">
                {posts[0].category || 'blog'}
              </span>
              {posts[0].tags?.slice(0, 3).map((tag: string) => (
                <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white group-hover:text-teal-400 transition-colors mb-3">
              {posts[0].title}
            </h2>
            {posts[0].subtitle && (
              <p className="text-slate-400 text-lg mb-4">{posts[0].subtitle}</p>
            )}
            <div className="flex gap-4 text-sm text-slate-500">
              <span>{posts[0].author_name || 'Arnel'}</span>
              <span>·</span>
              <span>{formatDate(posts[0].published_at)}</span>
              <span>·</span>
              <span>{posts[0].reading_time_minutes || 5} min read</span>
            </div>
          </div>
        </Link>
      )}

      {/* Posts by Category */}
      {CATEGORIES
        .filter(c => grouped[c.key]?.length > 0)
        .map(({ key, label }) => (
          <section key={key} className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">{label}</h2>
            <div className="space-y-3">
              {grouped[key]!.slice(key === 'blog' ? 1 : 0).map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="block p-4 bg-slate-900/60 rounded-lg border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/50 transition-all hover:translate-x-1"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-white hover:text-teal-400 transition-colors">
                        {post.title}
                      </h3>
                      {post.subtitle && (
                        <p className="text-sm text-slate-500 mt-1">{post.subtitle}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex gap-2 text-xs text-slate-500">
                      <span>{formatDate(post.published_at)}</span>
                      <span>·</span>
                      <span>{post.reading_time_minutes || 5} min</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}