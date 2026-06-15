'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

type FilterTab = 'all' | 'stale' | 'missing' | 'partial';
type ReasonBadge = { label: string; bg: string; color: string };

const REASON_STYLES: Record<string, ReasonBadge> = {
  stale: { label: 'Stale FK', bg: 'rgba(248,113,113,0.15)', color: '#F87171' },
  missing: { label: 'Missing FK', bg: 'rgba(250,204,21,0.15)', color: '#FACC15' },
  partial: { label: 'Partial FK', bg: 'rgba(251,146,60,0.15)', color: '#FB923C' },
};

interface TeamRef {
  id: string;
  name: string;
  slug: string;
}

interface NeedsReviewPost {
  id: string;
  slug: string;
  title: string;
  status: string;
  category: string | null;
  published_at: string | null;
  created_at: string;
  team_home_id: string | null;
  team_away_id: string | null;
  team_home: TeamRef | null;
  team_away: TeamRef | null;
  game_date: string | null;
  country_slug: string | null;
  reason: 'stale' | 'missing' | 'partial' | 'valid';
  reason_text: string;
  is_reviewed: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface ApiResponse {
  posts: NeedsReviewPost[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  stats: { stale: number; missing: number; partial: number; total: number; reviewed: number };
}

export default function NeedsReviewPage() {
  const [tab, setTab] = useState<FilterTab>('all');
  const [showReviewed, setShowReviewed] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [posts, setPosts] = useState<NeedsReviewPost[]>([]);
  const [stats, setStats] = useState<ApiResponse['stats'] | null>(null);
  const [pagination, setPagination] = useState<ApiResponse['pagination'] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        filter: tab,
        page: String(page),
        pageSize: '50',
      });
      if (showReviewed) params.set('include', 'reviewed');
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/articles/needs-review?${params}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data: ApiResponse = await res.json();
      setPosts(data.posts);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  }, [tab, showReviewed, search, page]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const reviewedCount = stats?.reviewed ?? 0;
  const queueCount = (stats?.stale ?? 0) + (stats?.missing ?? 0) + (stats?.partial ?? 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1><span aria-hidden="true">⚠️</span> Posts Needing Team Review</h1>
          <p>
            {loading ? 'Loading…' : (
              <>
                {queueCount.toLocaleString()} post{queueCount === 1 ? '' : 's'} in the queue
                {reviewedCount > 0 ? ` · ${reviewedCount.toLocaleString()} reviewed` : ''}
              </>
            )}
          </p>
        </div>
        <Link href="/admin/blog" className="admin-btn admin-btn-secondary">← Back to all posts</Link>
      </div>

      {/* Tab pills: reason filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {([
          ['all', 'All', queueCount],
          ['stale', 'Stale FK', stats?.stale ?? 0],
          ['missing', 'Missing FK', stats?.missing ?? 0],
          ['partial', 'Partial FK', stats?.partial ?? 0],
        ] as [FilterTab, string, number][]).map(([key, label, count]) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => { setTab(key); setPage(1); }}
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
              {label}
              <span style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 500 }}>{count.toLocaleString()}</span>
            </button>
          );
        })}
        <button
          onClick={() => { setShowReviewed(v => !v); setPage(1); }}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: 999,
            border: '1px solid',
            borderColor: showReviewed ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.1)',
            background: showReviewed ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
            color: showReviewed ? '#60A5FA' : 'rgba(255,255,255,0.7)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          {showReviewed ? '✓ Show reviewed' : 'Show reviewed'}
        </button>
      </div>

      {/* Search */}
      <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search title…"
          className="input-field"
          style={{ flex: 1, maxWidth: 400 }}
        />
        <button type="submit" className="admin-btn admin-btn-secondary">Search</button>
      </form>

      {/* Error banner */}
      {error && (
        <div className="admin-card p-4" style={{ marginBottom: '1rem', background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.3)' }}>
          <strong style={{ color: '#F87171' }}>Error:</strong> {error}
        </div>
      )}

      {/* Posts list */}
      {loading ? (
        <div className="admin-card p-6" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          Loading posts…
        </div>
      ) : posts.length === 0 ? (
        <div className="admin-card p-6" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          {showReviewed && queueCount === 0
            ? '🎉 No posts need review! All team FKs are valid.'
            : 'No posts match the current filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.map((p) => {
            const reasonStyle = REASON_STYLES[p.reason];
            return (
              <div
                key={p.id}
                className="admin-card p-4"
                style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.7rem', fontWeight: 600,
                        padding: '2px 8px', borderRadius: 4,
                        background: reasonStyle?.bg || 'rgba(255,255,255,0.05)',
                        color: reasonStyle?.color || 'rgba(255,255,255,0.5)',
                      }}
                      title={p.reason_text}
                    >
                      {reasonStyle?.label || p.reason}
                    </span>
                    {p.is_reviewed && (
                      <span
                        style={{
                          fontSize: '0.7rem', fontWeight: 600,
                          padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(96,165,250,0.15)', color: '#60A5FA',
                        }}
                      >
                        ✓ Reviewed
                      </span>
                    )}
                    {p.status !== 'published' && (
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                        {p.status}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/admin/blog/${p.slug}/review`}
                    style={{ color: '#fff', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}
                  >
                    {p.title}
                  </Link>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                    <code style={{ fontSize: '0.7rem' }}>{p.slug}</code>
                    {p.team_home && <> · {p.team_home.name}</>}
                    {p.team_away && <> @ {p.team_away.name}</>}
                    {p.published_at && <> · {new Date(p.published_at).toLocaleDateString()}</>}
                  </div>
                </div>
                <Link
                  href={`/admin/blog/${p.slug}/review`}
                  className="admin-btn admin-btn-primary"
                  style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  {p.is_reviewed ? 'View' : 'Fix'} →
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: '1.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="admin-btn admin-btn-secondary"
            style={{ opacity: page === 1 ? 0.4 : 1 }}
          >
            ← Prev
          </button>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="admin-btn admin-btn-secondary"
            style={{ opacity: page === pagination.totalPages ? 0.4 : 1 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
