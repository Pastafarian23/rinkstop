'use client';

import { useState } from 'react';

export default function ProfileEditForm({ initialBio, initialLocation }: { initialBio: string; initialLocation: string }) {
  const [bio, setBio] = useState(initialBio);
  const [location, setLocation] = useState(initialLocation);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, location }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Save failed');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid #1e1e1e',
      borderRadius: 12,
      padding: '1.5rem',
    }}>
      <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>
        PUBLIC PROFILE
      </h3>
      <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
        These fields appear on your <a href="/u/me" style={{ color: '#14B8A6' }}>public profile</a> and in the directory when you claim listings.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="bio" style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>
          BIO
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Tell people who you are. Ex: Coach at the Boston Bolts. Former D1 player at BU."
          style={{
            width: '100%',
            background: '#141414',
            border: '1px solid #1e1e1e',
            borderRadius: 6,
            padding: '0.75rem',
            color: '#fff',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: 80,
          }}
        />
        <div style={{ color: '#555', fontSize: '0.75rem', marginTop: 4, textAlign: 'right' }}>{bio.length}/500</div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label htmlFor="location" style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>
          LOCATION
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={120}
          placeholder="Boston, MA"
          style={{
            width: '100%',
            background: '#141414',
            border: '1px solid #1e1e1e',
            borderRadius: 6,
            padding: '0.75rem',
            color: '#fff',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.625rem 1.25rem',
            background: '#C8102E',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span style={{ color: '#14B8A6', fontSize: '0.85rem' }}>✓ Saved</span>}
        {error && <span style={{ color: '#C8102E', fontSize: '0.85rem' }}>{error}</span>}
      </div>
    </div>
  );
}
