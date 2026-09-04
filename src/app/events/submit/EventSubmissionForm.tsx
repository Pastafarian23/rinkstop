'use client';

// Event submission form client.
// Public — no auth required.

import { useState } from 'react';

const EVENT_TYPE_OPTIONS = [
  { value: 'tournament', label: 'Tournament' },
  { value: 'camp', label: 'Camp' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'tryout', label: 'Tryout' },
  { value: 'showcase', label: 'Showcase' },
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'lesson_series', label: 'Lesson Series' },
  { value: 'training', label: 'Training' },
  { value: 'skills_session', label: 'Skills Session' },
  { value: 'public_skate', label: 'Public Skate' },
  { value: 'learn_to_skate', label: 'Learn to Skate' },
  { value: 'open_hockey', label: 'Open Hockey' },
  { value: 'other', label: 'Other' },
];

interface RinkOption {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  province_state: string | null;
  country: string | null;
}

function fmtRinkLabel(r: RinkOption): string {
  const parts = [r.name];
  if (r.city) parts.push(r.city);
  if (r.province_state) parts.push(r.province_state);
  return parts.join(', ');
}

export default function EventSubmissionForm({
  rinks,
  preSelectedRinkId,
}: {
  rinks: RinkOption[];
  preSelectedRinkId: string | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rinkSearch, setRinkSearch] = useState('');

  // Form state — uses public-API field names (title, event_type, etc.)
  const [form, setForm] = useState({
    rink_id: preSelectedRinkId || '',
    title: '',
    event_type: 'tournament',
    starts_at: '',
    ends_at: '',
    address: '',
    registration_url: '',
    submitter_name: '',
    submitter_email: '',
    notes: '',
  });

  // Filter rinks by search
  const filteredRinks = rinkSearch
    ? rinks.filter(r => fmtRinkLabel(r).toLowerCase().includes(rinkSearch.toLowerCase()))
    : rinks.slice(0, 50);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const r = await fetch('/api/events/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          rink_id: form.rink_id || undefined,
        }),
      });
      const j = await r.json();

      if (!r.ok) {
        setError(j.error || 'Submission failed. Please try again.');
        return;
      }

      setSubmitted({ id: j.submission_id });
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{
        background: 'rgba(74,222,128,0.1)',
        border: '1px solid rgba(74,222,128,0.4)',
        borderRadius: 12,
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#86EFAC' }}>Submission received</h2>
        <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
          Reference ID: <code style={{ background: 'rgba(148,163,184,0.1)', padding: '0.1rem 0.3rem', borderRadius: 3 }}>{submitted.id}</code>
        </p>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          The rink owner will review your submission and you'll see it listed once approved.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/events" style={{
            background: 'var(--accent)', color: '#fff', textDecoration: 'none',
            padding: '0.5rem 1rem', borderRadius: 6, fontSize: '0.9rem', fontWeight: 600,
          }}>Browse events</a>
          <button
            type="button"
            onClick={() => { setSubmitted(null); setForm({ ...form, title: '', notes: '' }); }}
            style={{
              background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
              padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1.5rem', display: 'grid', gap: '1rem',
    }}>
      {error && (
        <div style={{
          background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)',
          color: '#FCA5A5', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      {/* Rink (search + select) */}
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.25rem' }}>
          Rink <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional but recommended)</span>
        </label>
        <input
          type="text"
          placeholder="Search for a rink..."
          value={rinkSearch}
          onChange={e => setRinkSearch(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', marginBottom: '0.25rem' }}
        />
        <select
          value={form.rink_id}
          onChange={e => setForm({ ...form, rink_id: e.target.value })}
          style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}
        >
          <option value="">— Don't know / not in list —</option>
          {filteredRinks.map(r => (
            <option key={r.id} value={r.id}>{fmtRinkLabel(r)}</option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.25rem' }}>
          Event title *
        </label>
        <input
          required
          type="text"
          placeholder="e.g. 2026 Cebu Youth Hockey Cup"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}
        />
      </div>

      {/* Event type */}
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.25rem' }}>
          Event type *
        </label>
        <select
          required
          value={form.event_type}
          onChange={e => setForm({ ...form, event_type: e.target.value })}
          style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}
        >
          {EVENT_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.25rem' }}>
            Starts *
          </label>
          <input
            required
            type="datetime-local"
            value={form.starts_at}
            onChange={e => setForm({ ...form, starts_at: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.25rem' }}>
            Ends *
          </label>
          <input
            required
            type="datetime-local"
            value={form.ends_at}
            onChange={e => setForm({ ...form, ends_at: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}
          />
        </div>
      </div>

      {/* Optional fields */}
      <details style={{ color: 'var(--text-muted)' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.9rem' }}>Optional details</summary>
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--fg)', marginBottom: '0.25rem' }}>Address (if different from rink)</label>
            <input
              type="text"
              placeholder="Specific rink room or address"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--fg)', marginBottom: '0.25rem' }}>Registration URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={form.registration_url}
              onChange={e => setForm({ ...form, registration_url: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--fg)', marginBottom: '0.25rem' }}>Notes for the rink owner</label>
            <textarea
              rows={3}
              placeholder="Divisions, age groups, special rules, etc."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontFamily: 'inherit' }}
            />
          </div>
        </div>
      </details>

      {/* Submitter info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.25rem' }}>
            Your name *
          </label>
          <input
            required
            type="text"
            placeholder="Jane Smith"
            value={form.submitter_name}
            onChange={e => setForm({ ...form, submitter_name: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.25rem' }}>
            Your email *
          </label>
          <input
            required
            type="email"
            placeholder="jane@example.com"
            value={form.submitter_email}
            onChange={e => setForm({ ...form, submitter_email: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          padding: '0.75rem 1.5rem', borderRadius: 6, fontSize: '0.95rem', fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? 'Submitting...' : 'Submit event for review'}
      </button>
    </form>
  );
}
