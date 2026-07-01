'use client';
import { useState, useEffect } from 'react';

interface ReviewItem {
  id: string;
  team_id: string;
  requested_name: string;
  requested_short_name: string | null;
  previous_name: string;
  previous_short_name: string | null;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  created_at: string;
  team: { id: string; slug: string; name: string; short_name: string | null };
}

function escHtml(s: unknown) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function TeamNameReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/admin/team-name-review?status=${tab}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setItems(d.items || []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [tab]);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    const note = action === 'reject' ? prompt('Reason for rejection (optional):') : '';
    if (action === 'reject' && note === null) return;

    const btns = document.querySelectorAll(`[data-review="${id}"]`) as NodeListOf<HTMLButtonElement>;
    btns.forEach(b => { b.disabled = true; b.textContent = '…'; });

    try {
      const r = await fetch('/api/admin/team-name-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: id, action, note: note || undefined }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error((d.error || 'Error') + (d.message ? ': ' + d.message : ''));
      showToast(action === 'approve' ? '✓ Approved — name updated' : '✓ Rejected', 'ok');
      // Reload current tab
      const r2 = await fetch(`/api/admin/team-name-review?status=${tab}`);
      const d2 = await r2.json();
      setItems(d2.items || []);
    } catch (e: unknown) {
      showToast(String(e), 'err');
      btns.forEach((b, i) => {
        b.disabled = false;
        b.textContent = i === 0 ? '✓ Approve' : '✗ Reject';
      });
    }
  }

  const badge = (s: string) => {
    const cls = s === 'approved' ? 'badge-approved' : s === 'rejected' ? 'badge-rejected' : 'badge-pending';
    return <span className={`badge ${cls}`}>{s}</span>;
  };

  return (
    <div style={{ fontFamily: " -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: '#0a0a0f', color: '#e5e5e5', minHeight: '100vh', padding: '2rem' }}>
      <style>{`
        .spinner { border: 2px solid #1f2937; border-top-color: #14B8A6; border-radius: 50%; width: 16px; height: 16px; animation: spin 0.6s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .toast { position: fixed; bottom: 1.5rem; right: 1.5rem; padding: 0.75rem 1.25rem; border-radius: 8px; font-size: 0.85rem; font-weight: 500; z-index: 100; }
        .toast-ok { background: #14B8A6; color: #fff; }
        .toast-err { background: #ef4444; color: #fff; }
        .tab { padding: 0.6rem 1.25rem; cursor: pointer; color: #6b7280; font-size: 0.875rem; font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -1px; user-select: none; }
        .tab.active { color: #14B8A6; border-bottom-color: #14B8A6; }
        .card { background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem; }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
        .team-name { font-size: 1.1rem; font-weight: 700; color: #fff; }
        .team-slug { font-size: 0.8rem; color: #6b7280; margin-top: 0.2rem; }
        .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .badge-pending { background: rgba(255,184,28,0.12); color: #FFB81C; border: 1px solid rgba(255,184,28,0.25); }
        .badge-approved { background: rgba(20,184,166,0.12); color: #14B8A6; border: 1px solid rgba(20,184,166,0.25); }
        .badge-rejected { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); }
        .diff-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
        .diff-table th { text-align: left; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; padding: 0.4rem 0.75rem; border-bottom: 1px solid #1f2937; }
        .diff-table td { padding: 0.5rem 0.75rem; font-size: 0.875rem; border-bottom: 1px solid #1f2937; }
        .diff-table tr:last-child td { border-bottom: none; }
        .old-val { color: #ef4444; text-decoration: line-through; }
        .new-val { color: #14B8A6; }
        .meta { font-size: 0.78rem; color: #6b7280; margin-top: 0.75rem; }
        .actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
        .btn { padding: 0.45rem 1rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: none; }
        .btn-approve { background: #14B8A6; color: #fff; }
        .btn-reject { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff' }}>
        🏒 Team Name Review
      </h1>

      <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '1px solid #1f2937' }}>
        {(['pending', 'approved', 'rejected'] as const).map(t => (
          <div
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <span className="spinner" style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Loading…
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
          Failed to load: {error}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          No {tab} reviews.
        </div>
      ) : (
        items.map(item => (
          <div key={item.id} className="card">
            <div className="card-header">
              <div>
                <div className="team-name">{escHtml(item.team?.name || '')}</div>
                <div className="team-slug">{escHtml(item.team?.slug || '')}</div>
              </div>
              {badge(item.status)}
            </div>

            <table className="diff-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Current</th>
                  <th>Requested</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Team Name</td>
                  <td className="old-val">{escHtml(item.previous_name || '—')}</td>
                  <td className="new-val">{escHtml(item.requested_name || '—')}</td>
                </tr>
                <tr>
                  <td>Short Name</td>
                  <td className="old-val">{escHtml(item.previous_short_name || '—')}</td>
                  <td className="new-val">{escHtml(item.requested_short_name || '—')}</td>
                </tr>
              </tbody>
            </table>

            <div className="meta">
              Submitted: {new Date(item.created_at).toLocaleString()}
              {item.review_note && <div>Note: {escHtml(item.review_note)}</div>}
            </div>

            {item.status === 'pending' && (
              <div className="actions" data-review={item.id}>
                <button
                  className="btn btn-approve"
                  data-review={item.id}
                  onClick={() => handleAction(item.id, 'approve')}
                >
                  ✓ Approve
                </button>
                <button
                  className="btn btn-reject"
                  data-review={item.id}
                  onClick={() => handleAction(item.id, 'reject')}
                >
                  ✗ Reject
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
