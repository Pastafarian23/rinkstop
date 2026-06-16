'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

/**
 * /admin/blog/queue
 *
 * State-machine article queue UI (2026-06-16).
 *
 * Shows posts grouped by workflow status, with quick Approve / Edit / Archive
 * buttons. The 8-state machine:
 *   - draft: just generated, never verified
 *   - needs_review: ambiguous (source data missing/contradictory) → Arnel
 *   - verified: clean, ready to publish
 *   - published: live on rinkstop.com
 *   - needs_rewrite: failed verification, queued for rewrite-architect
 *   - rewriting: rewrite-architect is currently working on it
 *   - archived: terminal
 *   - manually_approved: Arnel said "OK" despite verification flag
 *
 * Powers the 8am digest cron's "click here" link.
 */

type StatusFilter =
  | 'all'
  | 'needs_review'
  | 'needs_rewrite'
  | 'verified'
  | 'published'
  | 'manually_approved'
  | 'rewriting'
  | 'draft'
  | 'archived';

type SourceDataStatus = 'has_source' | 'no_source' | null;

interface CrossLinkRef {
  id: string;
  name?: string;
  slug?: string;
  first_name?: string;
  last_name?: string;
}

interface QueuePost {
  id: string;
  slug: string;
  title: string;
  status: string;
  category?: string;
  published_at?: string | null;
  created_at: string;
  updated_at?: string;
  highlight_id?: number | null;
  verified_at?: string | null;
  verified_rounds?: number;
  next_check_at?: string | null;
  last_issue_summary?: string | null;
  source_data_status?: SourceDataStatus;
  rewrite_fails?: number;
  team_home?: CrossLinkRef | null;
  team_away?: CrossLinkRef | null;
  league?: CrossLinkRef | null;
}

interface QueueStats {
  needs_review: number;
  needs_rewrite: number;
  verified: number;
  published: number;
  manually_approved: number;
  rewriting: number;
  draft: number;
  archived: number;
  total: number;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  needs_review:       { bg: 'rgba(251,191,36,0.15)', color: '#FBBF24', label: 'Needs Review' },
  needs_rewrite:      { bg: 'rgba(248,113,113,0.15)', color: '#F87171', label: 'Needs Rewrite' },
  verified:           { bg: 'rgba(20,184,166,0.15)', color: '#14B8A6', label: 'Verified' },
  published:          { bg: 'rgba(34,197,94,0.15)', color: '#22C55E', label: 'Published' },
  manually_approved:  { bg: 'rgba(168,85,247,0.15)', color: '#A855F7', label: 'Manually Approved' },
  rewriting:          { bg: 'rgba(96,165,250,0.15)', color: '#60A5FA', label: 'Rewriting' },
  draft:              { bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF', label: 'Draft' },
  archived:           { bg: 'rgba(107,114,128,0.15)', color: '#6B7280', label: 'Archived' },
};

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (days >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  return 'just now';
}

export default function ArticleQueuePage() {
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('needs_review');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadPosts = useCallback(async (status: StatusFilter, q: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('status', status);
      params.set('pageSize', '50');
      if (q) params.set('search', q);
      const res = await fetch(`/api/admin/articles?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setPosts(j.posts || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      // Fetch counts for the 4 actionable statuses (the rest are infinite-scroll
      // info). Each is a single count() call — fast, no body transferred.
      const statuses: Array<keyof Omit<QueueStats, 'total'>> = [
        'needs_review', 'needs_rewrite', 'verified', 'manually_approved',
      ];
      const counts: Record<string, number> = {};
      await Promise.all(
        statuses.map(async (s) => {
          const res = await fetch(`/api/admin/articles?status=${s}&pageSize=1`);
          if (res.ok) {
            const j = await res.json();
            counts[s] = j.pagination?.total || 0;
          } else {
            counts[s] = 0;
          }
        }),
      );
      setStats({
        ...counts,
        published: 0, rewriting: 0, draft: 0, archived: 0,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
      } as QueueStats);
    } catch {
      // Stats are best-effort. Don't block the main queue.
    }
  }, []);

  useEffect(() => {
    loadPosts(statusFilter, search);
  }, [statusFilter, search, loadPosts]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleAction = useCallback(async (postId: string, newStatus: string) => {
    setActionLoadingId(postId);
    try {
      const res = await fetch(`/api/admin/articles/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      // Remove from current view
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      await loadStats(); // refresh badges
    } catch (e: any) {
      alert(`Action failed: ${e?.message || e}`);
    } finally {
      setActionLoadingId(null);
    }
  }, [loadStats]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  }, [searchInput]);

  const filterButtons: Array<{ key: StatusFilter; label: string; count?: number }> = useMemo(() => {
    const arr: Array<{ key: StatusFilter; label: string; count?: number }> = [
      { key: 'needs_review', label: 'Needs Review', count: stats?.needs_review },
      { key: 'needs_rewrite', label: 'Needs Rewrite', count: stats?.needs_rewrite },
      { key: 'verified', label: 'Verified', count: stats?.verified },
      { key: 'manually_approved', label: 'Manually Approved', count: stats?.manually_approved },
    ];
    if (statusFilter === 'all' || ['published', 'rewriting', 'draft', 'archived'].includes(statusFilter)) {
      arr.push({ key: statusFilter, label: STATUS_STYLES[statusFilter]?.label || statusFilter });
    }
    arr.push({ key: 'all', label: 'All' });
    return arr;
  }, [stats, statusFilter]);

  return (
    <div style={{ padding: 24, color: 'var(--text, #e5e7eb)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Article Queue</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filterButtons.map((b) => {
            const active = statusFilter === b.key;
            return (
              <button
                key={b.key}
                onClick={() => setStatusFilter(b.key)}
                style={{
                  background: active ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
                  color: active ? '#60A5FA' : '#9CA3AF',
                  border: '1px solid ' + (active ? '#3B82F6' : 'rgba(255,255,255,0.1)'),
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {b.label}
                {b.count !== undefined && b.count > 0 && (
                  <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>
                    {b.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <form onSubmit={handleSearchSubmit} style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Search title…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'inherit',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 13,
              minWidth: 200,
            }}
          />
          <button type="submit" style={{ background: 'rgba(59,130,246,0.25)', color: '#60A5FA', border: '1px solid #3B82F6', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>
            Search
          </button>
        </form>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171', padding: 12, borderRadius: 6, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>Loading…</div>
      ) : posts.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>
          No posts in <strong>{STATUS_STYLES[statusFilter]?.label || statusFilter}</strong>.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {posts.map((p) => {
            const status = STATUS_STYLES[p.status] || { bg: 'rgba(107,114,128,0.15)', color: '#9CA3AF', label: p.status };
            const isLoading = actionLoadingId === p.id;
            return (
              <div
                key={p.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: 16,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: status.bg,
                        color: status.color,
                        padding: '2px 10px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      {status.label}
                    </span>
                    {p.team_home && p.team_away && (
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {p.team_home.name} vs {p.team_away.name}
                      </span>
                    )}
                    {p.verified_rounds !== undefined && p.verified_rounds > 0 && (
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                        ✓ {p.verified_rounds}× verified
                      </span>
                    )}
                    {p.rewrite_fails !== undefined && p.rewrite_fails > 0 && (
                      <span style={{ fontSize: 11, color: '#F87171' }}>
                        ⚠ {p.rewrite_fails}/3 rewrite fails
                      </span>
                    )}
                    {p.next_check_at && (
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                        next check: {timeAgo(p.next_check_at)}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    style={{ color: 'inherit', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}
                  >
                    {p.title}
                  </Link>
                  {p.last_issue_summary && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#F87171', fontStyle: 'italic' }}>
                      {p.last_issue_summary}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {/* Action buttons vary by current status */}
                  {p.status === 'needs_review' && (
                    <>
                      <button
                        onClick={() => handleAction(p.id, 'manually_approved')}
                        disabled={isLoading}
                        style={actionBtn('#14B8A6', isLoading)}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(p.id, 'draft')}
                        disabled={isLoading}
                        style={actionBtn('#FBBF24', isLoading)}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleAction(p.id, 'archived')}
                        disabled={isLoading}
                        style={actionBtn('#F87171', isLoading)}
                      >
                        Archive
                      </button>
                    </>
                  )}
                  {p.status === 'needs_rewrite' && (
                    <>
                      <button
                        onClick={() => handleAction(p.id, 'archived')}
                        disabled={isLoading}
                        style={actionBtn('#F87171', isLoading)}
                      >
                        Archive
                      </button>
                    </>
                  )}
                  {p.status === 'verified' && (
                    <>
                      <button
                        onClick={() => handleAction(p.id, 'published')}
                        disabled={isLoading}
                        style={actionBtn('#22C55E', isLoading)}
                      >
                        Publish
                      </button>
                      <button
                        onClick={() => handleAction(p.id, 'archived')}
                        disabled={isLoading}
                        style={actionBtn('#F87171', isLoading)}
                      >
                        Archive
                      </button>
                    </>
                  )}
                  {p.status === 'manually_approved' && (
                    <>
                      <button
                        onClick={() => handleAction(p.id, 'published')}
                        disabled={isLoading}
                        style={actionBtn('#22C55E', isLoading)}
                      >
                        Publish
                      </button>
                      <button
                        onClick={() => handleAction(p.id, 'archived')}
                        disabled={isLoading}
                        style={actionBtn('#F87171', isLoading)}
                      >
                        Archive
                      </button>
                    </>
                  )}
                  <Link
                    href={`/admin/blog/${p.slug}`}
                    style={actionBtn('#60A5FA', false, true) as any}
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function actionBtn(color: string, loading: boolean, isLink = false): React.CSSProperties {
  return {
    background: isLink ? 'transparent' : `${color}26`,
    color,
    border: `1px solid ${color}`,
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1,
    textDecoration: isLink ? 'none' : undefined,
    display: 'inline-block',
  };
}
