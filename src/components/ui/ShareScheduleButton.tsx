// ShareScheduleButton.tsx - Generate and display shareable schedule link
'use client';

import { useState, useEffect } from 'react';

interface ShareResponse {
  token: string;
  createdAt: string;
  expiresAt: string;
  url: string;
}

export default function ShareScheduleButton() {
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOrCreateShare = async () => {
    setLoading(true);
    try {
      // Try to get existing token first
      let res = await fetch('/api/schedule/share');
      if (res.status === 404) {
        // No existing token, create one
        res = await fetch('/api/schedule/share', { method: 'POST' });
      }
      if (!res.ok) {
        const err = await res.json();
        alert(err.error === 'upgrade' ? 'Upgrade to Pro to share schedules' : err.error || 'Share failed');
        return;
      }
      const data = await res.json();
      setShareData(data);
    } catch (e) {
      console.error('Share error:', e);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!shareData) return;
    const fullUrl = `${window.location.origin}${shareData.url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const revokeShare = async () => {
    if (!shareData || !confirm('Revoke this share link?')) return;
    await fetch('/api/schedule/share', { method: 'DELETE' });
    setShareData(null);
  };

  useEffect(() => {
    // Auto-load existing share on mount
    fetchOrCreateShare();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      {shareData ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              readOnly
              value={`${window.location.origin}${shareData.url}`}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              style={{
                flex: 1, padding: '0.4rem 0.6rem', fontSize: 13,
                background: '#0a0a0a', border: '1px solid #222', borderRadius: 6,
                color: '#fff', cursor: 'pointer',
              }}
            />
            <button
              onClick={copyLink}
              style={{
                padding: '0.4rem 0.8rem', fontSize: 13,
                background: copied ? '#22c55e' : '#14B8A6',
                border: 'none', borderRadius: 6, color: '#fff',
                fontWeight: 600, cursor: 'pointer', minWidth: 70,
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Expires {new Date(shareData.expiresAt).toLocaleDateString()}
            </span>
            <button
              onClick={revokeShare}
              style={{
                background: 'transparent', border: 'none', color: '#C8102E',
                fontSize: 12, cursor: 'pointer', padding: 4,
              }}
            >
              Revoke
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={fetchOrCreateShare}
          disabled={loading}
          style={{
            padding: '0.5rem 0.9rem', fontSize: 13,
            background: loading ? '#333' : 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6, color: '#fff', fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          🔗 {loading ? 'Loading...' : 'Share My Schedule'}
        </button>
      )}
    </div>
  );
}