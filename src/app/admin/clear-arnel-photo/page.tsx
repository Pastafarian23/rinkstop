'use client';

// TEMPORARY admin page — one-time use to clear Arnel's Clerk profile photo.
// Will be DELETED in the same PR after the call completes.

import { useState } from 'react';

export default function ClearArnelPhotoPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doClear() {
    if (!confirm('This will permanently remove the Clerk profile photo for user_3Etd1E64kor4sHx1sbnkK3vcnpL. Continue?')) return;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/_admin/clear-arnel-photo', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResult(`Photo removed. New imageUrl: ${data.newImageUrl || '(null — fallback to initials)'}`);
      } else {
        setError(data.error || `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#fff',
      fontFamily: 'system-ui, sans-serif', padding: '2rem',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ color: '#C8102E', marginBottom: '1rem' }}>Clear Arnel's Clerk profile photo (one-time)</h1>
        <p style={{ color: '#888', marginBottom: '1.5rem' }}>
          Calls Clerk Backend API to remove the profile image for user_3Etd1E64kor4sHx1sbnkK3vcnpL.
          RinkStop's own avatar_url was already set to NULL. This finishes the reset on Clerk's side.
        </p>
        <button
          onClick={doClear}
          disabled={busy}
          style={{
            background: '#C8102E', color: '#fff', padding: '0.75rem 1.5rem',
            border: 'none', borderRadius: 6, fontSize: '0.95rem', fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Removing…' : 'Remove profile photo'}
        </button>
        {result && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#0a1a0a', border: '1px solid #14B8A6', borderRadius: 6, color: '#14B8A6' }}>
            ✓ {result}
          </div>
        )}
        {error && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#1a0a0a', border: '1px solid #C8102E', borderRadius: 6, color: '#C8102E' }}>
            ✗ {error}
          </div>
        )}
      </div>
    </div>
  );
}
