'use client';

import { useState, useEffect } from 'react';

interface Edit {
  id: number;
  field: string;
  old_value: any;
  new_value: any;
  reviewed_by: string;
  reviewed_at: string;
}

interface Props {
  postId: string;
  refreshKey?: number;
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  content: 'Body',
  tags: 'Tags',
  category: 'Category',
  cross_link_overrides: 'Cross-links',
  highlight_id_override: 'Highlight',
  status: 'Status',
};

function summarize(value: any, maxLen = 60): string {
  if (value == null) return '∅';
  if (typeof value === 'string') {
    return value.length > maxLen ? value.slice(0, maxLen) + '…' : value;
  }
  if (Array.isArray(value)) {
    return `[${value.length} item${value.length === 1 ? '' : 's'}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ',…' : ''}}`;
  }
  return String(value);
}

/**
 * Read-only list of past review edits for this post.
 * Helps the reviewer understand "what's been changed before" so they
 * don't undo prior work or repeat the same override.
 */
export default function ReviewHistoryPanel({ postId, refreshKey }: Props) {
  const [edits, setEdits] = useState<Edit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/admin/articles/${postId}/review-history`);
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setEdits(d.edits || []);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [postId, refreshKey]);

  return (
    <div className="admin-card p-4" style={{ marginTop: '1rem' }}>
      <h3 style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 0.75rem' }}>
        🕓 Review history
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: 8 }}>
          {edits.length} edit{edits.length === 1 ? '' : 's'}
        </span>
      </h3>

      {loading && <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Loading…</div>}

      {!loading && edits.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>No edits yet.</div>
      )}

      {!loading && edits.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
          {edits.map((e) => (
            <div
              key={e.id}
              style={{
                padding: 8,
                background: 'rgba(0,0,0,0.15)',
                borderRadius: 4,
                fontSize: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: '#14B8A6', fontWeight: 500 }}>{FIELD_LABELS[e.field] || e.field}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                  {new Date(e.reviewed_at).toLocaleString()}
                </span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{summarize(e.old_value)}</span>
                <span style={{ margin: '0 4px', opacity: 0.5 }}>→</span>
                <span style={{ color: 'rgba(255,255,255,0.9)' }}>{summarize(e.new_value)}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', marginTop: 2 }}>
                by {e.reviewed_by?.startsWith('user_') ? e.reviewed_by.slice(5, 15) + '…' : e.reviewed_by}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
