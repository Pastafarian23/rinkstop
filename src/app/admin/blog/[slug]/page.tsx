'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  content: string;
  category?: string;
  tags?: string[];
  status?: string;
  seo_title?: string;
  seo_description?: string;
  published_at?: string;
}

export default async function EditBlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    fetch(`/api/blog/posts/${slug}`)
      .then((res) => res.json())
      .then((data) => { setPost(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;
    setSaving(true);

    const res = await fetch(`/api/blog/posts/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
      body: JSON.stringify(post),
    });

    if (res.ok) {
      alert('Post updated successfully!');
    } else {
      const err = await res.json();
      alert('Error: ' + err.error);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;
  if (!post) return <div className="text-center py-12 text-slate-500">Post not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/blog" className="text-slate-400 hover:text-teal-400 text-sm">← Back to Posts</Link>
        <h1 className="text-2xl font-bold text-white">Edit: {post.title}</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <input
              type="text"
              className="input-field w-full"
              value={post.title}
              onChange={(e) => setPost({ ...post, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Slug</label>
            <input
              type="text"
              className="input-field w-full"
              value={post.slug}
              onChange={(e) => setPost({ ...post, slug: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
            <select
              className="input-field w-full"
              value={post.category}
              onChange={(e) => setPost({ ...post, category: e.target.value })}
            >
              <option value="blog">Blog</option>
              <option value="coaching">Coaching</option>
              <option value="global-scenes">Local Scenes</option>
              <option value="youth-hockey">Youth Hockey</option>
              <option value="industry">Industry</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              className="input-field w-full"
              value={(post.tags || []).join(', ')}
              onChange={(e) => setPost({ ...post, tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) })}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">Subtitle</label>
            <input
              type="text"
              className="input-field w-full"
              value={post.subtitle || ''}
              onChange={(e) => setPost({ ...post, subtitle: e.target.value })}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">SEO Title</label>
            <input
              type="text"
              className="input-field w-full"
              value={post.seo_title || ''}
              onChange={(e) => setPost({ ...post, seo_title: e.target.value })}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">SEO Description</label>
            <textarea
              className="input-field w-full"
              rows={3}
              value={post.seo_description || ''}
              onChange={(e) => setPost({ ...post, seo_description: e.target.value })}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">Content (Markdown)</label>
            <textarea
              className="input-field w-full font-mono text-sm"
              rows={15}
              value={post.content}
              onChange={(e) => setPost({ ...post, content: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
            <select
              className="input-field w-full"
              value={post.status}
              onChange={(e) => setPost({ ...post, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href="/admin/blog" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}