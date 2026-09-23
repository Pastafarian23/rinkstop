'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PostRow } from './types';

interface ArticleReviewListProps {
  posts: PostRow[];
  statusFilter: string;
}

const AUDIT_STATUS_COLOR: Record<string, string> = {
  PASS_HIGH: '#22c55e',
  PASS_SINGLE: '#84cc16',
  PASS_WIKI: '#eab308',
  CANNOT_VERIFY: '#fb923c',
  FAIL: '#ef4444',
  FAIL_DISAGREE: '#ef4444',
  FAIL_CONFIDENCE: '#ef4444',
};

export default function ArticleReviewList({ posts, statusFilter }: ArticleReviewListProps) {
  if (posts.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center text-gray-400">
        {statusFilter === 'pending'
          ? 'No articles pending review. The auto-publish pipeline is keeping up.'
          : `No articles with status "${statusFilter}".`}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <ArticleRow key={post.id} post={post} />
      ))}
    </div>
  );
}

function ArticleRow({ post }: { post: PostRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const audit = post.last_audit_status || post.audit_status;
  const auditColor = audit ? AUDIT_STATUS_COLOR[audit] || '#6b7280' : '#6b7280';

  async function callReview(action: 'approve' | 'reject', note?: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/articles/${post.id}/review?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'reject' ? { note } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {audit && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{ background: `${auditColor}22`, color: auditColor, border: `1px solid ${auditColor}44` }}
              >
                {audit}
              </span>
            )}
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono">
              {post.status}
            </span>
            {post.category && (
              <span className="text-xs text-gray-500">{post.category}</span>
            )}
            <span className="text-xs text-gray-500 ml-auto">
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">{post.title}</h3>
          {post.subtitle && <p className="text-sm text-gray-400 mb-2">{post.subtitle}</p>}
          <div className="text-xs text-gray-500 font-mono">/news/{post.slug}</div>
        </div>

        {post.status === 'draft' && post.human_review_status === 'pending' && (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => callReview('approve')}
              disabled={isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded font-medium text-sm"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setShowRejectForm((v) => !v)}
              disabled={isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded font-medium text-sm"
            >
              ✗ Reject
            </button>
          </div>
        )}
      </div>

      {showRejectForm && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
          <label className="block text-xs text-red-300 mb-1">
            Rejection reason (required, visible to authors + audit trail)
          </label>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={2}
            className="w-full bg-black/30 border border-red-500/30 rounded px-2 py-1 text-sm text-white"
            placeholder="e.g. Predictions contradict published injury report; rewrite after Tuesday's practice update."
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                if (!rejectNote.trim()) {
                  setError('Note is required for rejection');
                  return;
                }
                callReview('reject', rejectNote.trim());
              }}
              disabled={isPending}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-sm font-medium"
            >
              Confirm Reject
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false);
                setRejectNote('');
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-400">{error}</div>
      )}

      {post.status === 'rejected' && post.review_note && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
          <div className="text-xs text-red-300 font-semibold mb-1">Rejection note:</div>
          <div className="text-gray-300">{post.review_note}</div>
          {post.reviewed_at && (
            <div className="text-xs text-gray-500 mt-1">
              by {post.reviewed_by} on {new Date(post.reviewed_at).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {(post.human_review_status === 'approved' || post.status === 'published') && post.reviewed_at && (
        <div className="mt-3 text-xs text-gray-500">
          Approved by {post.reviewed_by} on {new Date(post.reviewed_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
