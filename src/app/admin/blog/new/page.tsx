'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewBlogPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    subtitle: '',
    content: '',
    category: 'blog',
    tags: '',
    status: 'draft',
    seo_title: '',
    seo_description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/blog/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
      body: JSON.stringify({
        ...formData,
        tags: formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      }),
    });

    if (res.ok) {
      router.push('/admin/blog');
    } else {
      const err = await res.json();
      alert('Error: ' + err.error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/blog" className="text-slate-400 hover:text-teal-400 text-sm">← Back to Posts</Link>
        <h1 className="text-2xl font-bold text-white">New Blog Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
            <input
              type="text"
              required
              className="input-field w-full"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Slug *</label>
            <input
              type="text"
              required
              className="input-field w-full"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
            <select
              className="input-field w-full"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="hockey, coaching, youth"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">Subtitle</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">SEO Title</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.seo_title}
              onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
              placeholder="Defaults to title if empty"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">SEO Description</label>
            <textarea
              className="input-field w-full"
              rows={3}
              value={formData.seo_description}
              onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
              placeholder="155 characters recommended. Defaults to subtitle if empty."
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">Content (Markdown) *</label>
            <textarea
              required
              className="input-field w-full font-mono text-sm"
              rows={15}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="# Heading&#10;&#10;Your content here in markdown..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
            <select
              className="input-field w-full"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Post'}
          </button>
          <Link href="/admin/blog" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}