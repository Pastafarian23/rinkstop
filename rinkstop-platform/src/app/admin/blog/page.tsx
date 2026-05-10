'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

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
  seo_description?: string;
}

export default function BlogPostsAdmin() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPosts = async (p: number) => {
    const res = await fetch(`/api/blog/posts?status=published&limit=10&page=${p}`);
    const data = await res.json();
    setPosts(data.posts || []);
    setTotalPages(data.pagination?.pages || 1);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(page); }, [page]);

  if (loading) return <div className="text-center py-12 text-slate-500">Loading posts...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">Blog Posts</h1>
        <Link href="/admin/blog/new" className="btn-primary text-sm px-4 py-2">
          + New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No posts yet. Create your first blog post above.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="flex items-center justify-between p-4 bg-slate-900/60 rounded-lg border border-slate-800">
              <div>
                <Link href={`/admin/blog/${post.slug}`} className="text-white font-medium hover:text-teal-400 transition-colors">
                  {post.title}
                </Link>
                <div className="text-xs text-slate-500 mt-1 flex gap-4">
                  <span>{post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Draft'}</span>
                  <span className="capitalize">{post.category}</span>
                  {post.tags?.length ? <span>{post.tags.join(', ')}</span> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/blog/${post.slug}`} className="text-slate-400 hover:text-teal-400 text-sm px-3 py-1 border border-slate-700 rounded hover:border-teal-500 transition-colors">
                  Edit
                </Link>
                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener" className="text-slate-400 hover:text-teal-400 text-sm px-3 py-1 border border-slate-700 rounded hover:border-teal-500 transition-colors">
                  Preview
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded text-sm ${
                page === i + 1
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}