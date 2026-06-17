'use client';

import { useState } from 'react';

interface QueueItem {
  id: string;
  user_id: string;
  requested_slug: string;
  reason: 'brand_prefix' | 'soft_profanity' | 'pattern';
  reason_detail: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  requester_name: string | null;
  requester_username: string | null;
  requester_tier: string | null;
}

const REASON_LABEL: Record<string, { label: string; tone: 'brand' | 'profanity' | 'pattern' }> = {
  brand_prefix: { label: 'Brand prefix', tone: 'brand' },
  soft_profanity: { label: 'Profanity / borderline', tone: 'profanity' },
  pattern: { label: 'Suspicious pattern', tone: 'pattern' },
};

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.floor((now - t) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function toneStyle(tone: 'brand' | 'profanity' | 'pattern'): React.CSSProperties {
  if (tone === 'brand') {
    return { background: 'rgba(255,184,28,0.15)', border: '1px solid rgba(255,184,28,0.45)', color: '#FFB81C' };
  }
  if (tone === 'profanity') {
    return { background: 'rgba(200,16,46,0.15)', border: '1px solid rgba(200,16,46,0.45)', color: '#ff8a9c' };
  }
  return { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' };
}

export default function UsernameReviewClient({ initialItems }: { initialItems: QueueItem[] }) {
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'brand_prefix' | 'soft_profanity'>('all');

  const visible = items.filter((it) => filter === 'all' || it.reason === filter);

  async function act(reviewId: string, action: 'approve' | 'reject') {
    setBusyId(reviewId);
    setError(null);
    try {
      const res = await fetch('/api/admin/username-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || `Action failed: HTTP ${res.status}`);
        return;
      }
      // Remove from local list (status flipped server-side)
      setItems((prev) => prev.filter((it) => it.id !== reviewId));
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.04em' }}
        >
          Username review queue
        </h1>
        <p className="text-white/60 text-sm mb-6">
          Layer 2 (brand prefix) and Layer 3 (profanity) review. New signups land here automatically
          when they match a brand prefix or contain soft-flagged language. Approve to commit the
          username; reject to release it back to the user.
        </p>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded text-sm"
            style={{ background: 'rgba(200,16,46,0.15)', border: '1px solid rgba(200,16,46,0.4)', color: '#ff8a9c' }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Filter chips */}
        <div className="flex gap-2 mb-4">
          {(['all', 'brand_prefix', 'soft_profanity'] as const).map((f) => {
            const count =
              f === 'all' ? items.length : items.filter((it) => it.reason === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-md text-sm font-medium"
                style={
                  filter === f
                    ? { background: '#FFB81C', color: '#041E42' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }
                }
                data-testid={`filter-${f}`}
              >
                {f === 'all' ? 'All' : REASON_LABEL[f]?.label || f} ({count})
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <div
            className="px-6 py-12 rounded-lg text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-white/60 text-lg">
              {items.length === 0 ? 'Queue is empty. Nice work.' : 'No matches for the current filter.'}
            </p>
            {items.length === 0 && (
              <p className="text-white/40 text-sm mt-2">
                New signups that match a brand prefix or contain soft-flagged language will appear here.
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-3" data-testid="review-list">
            {visible.map((item) => {
              const meta = REASON_LABEL[item.reason] || { label: item.reason, tone: 'pattern' as const };
              return (
                <li
                  key={item.id}
                  className="px-4 py-4 rounded-lg flex items-center gap-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  data-testid={`review-item-${item.requested_slug}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code
                        className="text-base font-semibold"
                        style={{ color: '#FFB81C' }}
                        data-testid="review-slug"
                      >
                        @{item.requested_slug}
                      </code>
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={toneStyle(meta.tone)}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-sm text-white/60">
                      Requested by{' '}
                      <span className="text-white/80">
                        {item.requester_name || '(no name)'}
                      </span>
                      {item.requester_username && (
                        <>
                          {' '}
                          <span className="text-white/40">@{item.requester_username}</span>
                        </>
                      )}{' '}
                      · tier: <span className="text-white/80">{item.requester_tier || 'free'}</span> ·{' '}
                      <span title={item.created_at}>{timeAgo(item.created_at)}</span>
                    </div>
                    {item.reason_detail && (
                      <div className="text-xs text-white/40 mt-1 font-mono">
                        {item.reason_detail}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => act(item.id, 'reject')}
                      disabled={busyId === item.id}
                      className="px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)' }}
                      data-testid={`review-reject-${item.requested_slug}`}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => act(item.id, 'approve')}
                      disabled={busyId === item.id}
                      className="px-3 py-2 rounded-md text-sm font-bold disabled:opacity-50"
                      style={{ background: '#FFB81C', color: '#041E42' }}
                      data-testid={`review-approve-${item.requested_slug}`}
                    >
                      {busyId === item.id ? '…' : 'Approve'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
