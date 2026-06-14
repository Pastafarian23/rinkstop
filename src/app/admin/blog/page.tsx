'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';

interface CrossLinkRef {
  id: string;
  name?: string;
  slug?: string;
  first_name?: string;
  last_name?: string;
}

interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  status: 'draft' | 'published' | 'archived' | string;
  category?: string;
  tags?: string[];
  view_count?: number;
  published_at?: string | null;
  created_at: string;
  updated_at?: string;
  is_featured?: boolean;
  highlight_id?: number | null;
  reading_time_minutes?: number;
  team_home_id?: string | null;
  team_away_id?: string | null;
  league_id?: string | null;
  player_id?: string | null;
  country_slug?: string | null;
  team_home?: CrossLinkRef | null;
  team_away?: CrossLinkRef | null;
  league?: CrossLinkRef | null;
  player?: CrossLinkRef | null;
}

type StatusFilter = 'all' | 'published' | 'draft' | 'archived';
type CrossLinkFilter = '' | 'team' | 'league' | 'player' | 'country';

const STATUS_PILL_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  published: { bg: 'rgba(20,184,166,0.15)', color: '#14B8A6', label: 'Published' },
  draft: { bg: 'rgba(250,204,21,0.15)', color: '#FACC15', label: 'Draft' },
  archived: { bg: 'rgba(248,113,113,0.15)', color: '#F87171', label: 'Archived' },
};

export default function BlogPostsAdmin() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [crossLinkFilter, setCrossLinkFilter] = useState<CrossLinkFilter>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [counts, setCounts] = useState<{ all: number; published: number; draft: number; archived: number }>({
    all: 0, published: 0, draft: 0, archived: 0,
  });

  const [actionInFlight, setActionInFlight] = useState<Record<string, boolean>>({});

  const fetchCounts = useCallback(async () => {
    // Fetch small count probes (1 row each) to get totals
    const statuses: Array<'all' | 'published' | 'draft' | 'archived'> = ['all', 'published', 'draft', 'archived'];
    const results = await Promise.all(
      statuses.map(async (s) => {
        const params = s === 'all' ? 'limit=1' : `status=${s}&limit=1`;
        const r = await fetch(`/api/admin/articles?${params}`);
        if (!r.ok) return [s, 0];
        const d = await r.json();
        return [s, d.pagination?.total || 0];
      }),
    );
    const next: any = {};
    for (const [s, t] of results) next[s] = t;
    setCounts(next);
  }, []);

  const fetchPosts = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('pageSize', '25');
      params.set('sort', 'created_at');
      params.set('order', 'desc');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (crossLinkFilter) params.set('crossLink', crossLinkFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/articles?${params}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setPosts(data.posts || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, crossLinkFilter, search]);

  useEffect(() => {
    fetchPosts(page);
  }, [fetchPosts, page]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, crossLinkFilter, search]);

  const handleStatusAction = async (post: Post, newStatus: 'published' | 'archived' | 'draft') => {
    const key = `${post.id}:${newStatus}`;
    setActionInFlight((s) => ({ ...s, [key]: true }));
    try {
      const res = await fetch(`/api/admin/articles/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      // Refresh list + counts
      await Promise.all([fetchPosts(page), fetchCounts()]);
    } catch (e) {
      alert(`Failed to ${newStatus === 'published' ? 'promote' : newStatus === 'archived' ? 'archive' : 'demote'}: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setActionInFlight((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
    }
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const hasActiveFilters = statusFilter !== 'all' || crossLinkFilter !== '' || search !== '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1><span aria-hidden="true">✍️</span> Blog Posts</h1>
          <p>
            {total.toLocaleString()} article{total === 1 ? '' : 's'}
            {statusFilter !== 'all' ? ` with status ${statusFilter}` : ''}
            {crossLinkFilter ? ` linked to ${crossLinkFilter}` : ''}
            {search ? ` matching "${search}"` : ''}
          </p>
        </div>
        <Link href="/admin/blog/new" className="admin-btn admin-btn-primary">+ New Post</Link>
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {(['all', 'published', 'draft', 'archived'] as StatusFilter[]).map((s) => {
          const isActive = statusFilter === s;
          const count = counts[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 999,
                border: '1px solid',
                borderColor: isActive ? 'rgba(20,184,166,0.6)' : 'rgba(255,255,255,0.1)',
                background: isActive ? 'rgba(20,184,166,0.15)' : 'rgba(255,255,255,0.04)',
                color: isActive ? '#14B8A6' : 'rgba(255,255,255,0.7)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span style={{
                fontSize: '0.7rem',
                opacity: 0.6,
                fontWeight: 500,
              }}>{count.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      {/* Search + cross-link filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
        <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: 6, flex: 1, minWidth: 200 }}>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title or subtitle…"
            className="input-field"
            style={{ flex: 1 }}
          />
          <button type="submit" className="admin-btn admin-btn-secondary">Search</button>
        </form>
        <select
          value={crossLinkFilter}
          onChange={(e) => setCrossLinkFilter(e.target.value as CrossLinkFilter)}
          className="input-field"
          style={{ width: 'auto' }}
        >
          <option value="">All cross-links</option>
          <option value="team">Has team link</option>
          <option value="league">Has league link</option>
          <option value="player">Has player link</option>
          <option value="country">Has country link</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setCrossLinkFilter('');
              setSearchInput('');
              setSearch('');
            }}
            className="admin-btn admin-btn-secondary"
            style={{ whiteSpace: 'nowrap' }}
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, color: '#FCA5A5', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading posts…</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {hasActiveFilters
            ? 'No articles match the current filters.'
            : 'No articles yet. Create your first blog post above.'}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              isPending={actionInFlight[`${post.id}:published`] || actionInFlight[`${post.id}:archived`] || actionInFlight[`${post.id}:draft`]}
              onPromote={() => handleStatusAction(post, 'published')}
              onArchive={() => handleStatusAction(post, 'archived')}
              onDemote={() => handleStatusAction(post, 'draft')}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded text-sm bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50"
          >
            ← Prev
          </button>
          <span className="px-3 py-1 text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded text-sm bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function PostRow({ post, isPending, onPromote, onArchive, onDemote }: {
  post: Post;
  isPending: boolean;
  onPromote: () => void;
  onArchive: () => void;
  onDemote: () => void;
}) {
  const statusStyle = STATUS_PILL_STYLES[post.status] || STATUS_PILL_STYLES.draft;

  // Build cross-link badges
  const crossLinks = useMemo(() => {
    const out: Array<{ kind: string; label: string; href: string }> = [];
    if (post.team_home) {
      out.push({ kind: 'team', label: `🏠 ${post.team_home.name}`, href: `/directory/teams/${post.team_home.slug}` });
    }
    if (post.team_away) {
      out.push({ kind: 'team', label: `✈ ${post.team_away.name}`, href: `/directory/teams/${post.team_away.slug}` });
    }
    if (post.league) {
      out.push({ kind: 'league', label: `🏆 ${post.league.name}`, href: `/directory/leagues/${post.league.id}` });
    }
    if (post.player) {
      const name = `${post.player.first_name || ''} ${post.player.last_name || ''}`.trim();
      out.push({ kind: 'player', label: `⭐ ${name}`, href: `/directory/players/${post.player.slug || post.player.id}` });
    }
    if (post.country_slug) {
      out.push({ kind: 'country', label: `🌍 ${post.country_slug}`, href: `/news?country=${post.country_slug}` });
    }
    return out;
  }, [post]);

  return (
    <div className="admin-card p-4" style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row with status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '2px 8px',
              borderRadius: 4,
              background: statusStyle.bg,
              color: statusStyle.color,
            }}>
              {statusStyle.label}
            </span>
            {post.is_featured && (
              <span style={{ fontSize: '0.7rem', color: '#FACC15' }}>⭐ Featured</span>
            )}
            {post.highlight_id && (
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                HL #{post.highlight_id}
              </span>
            )}
          </div>

          <Link
            href={`/admin/blog/${post.slug}`}
            className="text-white font-medium hover:text-teal-400 transition-colors"
            style={{ display: 'block', marginBottom: 4 }}
          >
            {post.title}
          </Link>

          {post.subtitle && (
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginBottom: 6 }}>
              {post.subtitle}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', flexWrap: 'wrap' }}>
            <span>
              {post.published_at
                ? `Published ${new Date(post.published_at).toLocaleDateString()}`
                : post.status === 'draft'
                  ? `Created ${new Date(post.created_at).toLocaleDateString()}`
                  : `Archived`}
            </span>
            {post.category && <span className="capitalize">{post.category}</span>}
            {post.reading_time_minutes && <span>{post.reading_time_minutes} min read</span>}
            <span>{post.view_count || 0} views</span>
            {post.tags && post.tags.length > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                {post.tags.slice(0, 3).join(', ')}{post.tags.length > 3 ? '…' : ''}
              </span>
            )}
          </div>

          {/* Cross-link badges */}
          {crossLinks.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {crossLinks.map((cl, i) => (
                <a
                  key={`${cl.kind}-${i}`}
                  href={cl.href}
                  target="_blank"
                  rel="noopener"
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.7)',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {cl.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
          {post.status !== 'published' && (
            <button
              onClick={onPromote}
              disabled={isPending}
              className="admin-btn admin-btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
              title="Promote to published"
            >
              ✓ Promote
            </button>
          )}
          {post.status === 'published' && (
            <button
              onClick={onDemote}
              disabled={isPending}
              className="admin-btn admin-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
              title="Move back to draft"
            >
              ← Draft
            </button>
          )}
          {post.status !== 'archived' && (
            <button
              onClick={onArchive}
              disabled={isPending}
              className="admin-btn admin-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
              title="Archive this post"
            >
              ⌫ Archive
            </button>
          )}
          {post.status === 'archived' && (
            <button
              onClick={onPromote}
              disabled={isPending}
              className="admin-btn admin-btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
              title="Re-publish this archived post"
            >
              ↻ Re-publish
            </button>
          )}
          <Link
            href={`/admin/blog/${post.slug}`}
            className="admin-btn admin-btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
          >
            Edit
          </Link>
          {post.status === 'published' && (
            <a
              href={`/news/${post.slug}`}
              target="_blank"
              rel="noopener"
              className="admin-btn admin-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
            >
              View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
