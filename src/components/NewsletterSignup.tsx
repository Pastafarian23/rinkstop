'use client';

import { useState } from 'react';

/**
 * <NewsletterSignup /> — Email capture for the "Hockey Data Digest".
 *
 * A weekly digest of: new rinks, league updates, top teams, and the most
 * useful hockey stats of the week. Single text input + email submit.
 * No password required. Email goes to the leads table via /api/leads.
 *
 * Where used:
 *   - /news (hockey news landing)
 *   - /dataset-license (after the dataset CTA — for non-buyers who want updates)
 *
 * Why this matters:
 *   Visitors who don't buy today might convert in 30 days. Email capture
 *   turns a one-time bounce into a 4-touchpoint nurture path.
 *
 * Cost: 0 ongoing. Adds rows to `leads` table. Already wired through
 * /api/leads handler (validates email + honeypot + rate-limit).
 */
export default function NewsletterSignup({ source = 'unknown' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError('Please enter a valid email.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
          role: 'fan',
          // Honeypot field — bots fill it, humans don't see it.
          website_url: '',
        }),
      });
      if (!res.ok) throw new Error('submit_failed');
      setSubmitted(true);
    } catch {
      setError('Could not subscribe — try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        data-newsletter-success
        role="status"
        aria-live="polite"
        style={{
          background: 'rgba(20,184,166,0.10)',
          border: '1px solid rgba(20,184,166,0.4)',
          borderRadius: 10,
          padding: '1.25rem 1.5rem',
          color: '#5EEAD4',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        ✓ Subscribed — check your inbox for confirmation.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-newsletter-form
      style={{
        display: 'flex',
        gap: '0.5rem',
        maxWidth: 480,
        margin: '0 auto',
        flexWrap: 'wrap',
      }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-label="Email for the weekly hockey digest"
        required
        style={{
          flex: '1 1 240px',
          padding: '0.75rem 1rem',
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,184,28,0.3)',
          borderRadius: 8,
          color: '#fff',
          fontSize: '0.9375rem',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '0.75rem 1.25rem',
          background: submitting ? 'rgba(255,184,28,0.5)' : '#FFB81C',
          color: '#0B1E3F',
          border: 'none',
          borderRadius: 8,
          fontSize: '0.9375rem',
          fontWeight: 800,
          cursor: submitting ? 'wait' : 'pointer',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {submitting ? 'Subscribing…' : 'Get the Digest'}
      </button>
      {error && (
        <div
          role="alert"
          style={{
            flexBasis: '100%',
            fontSize: '0.8125rem',
            color: '#FF8FA0',
            marginTop: '0.25rem',
          }}
        >
          {error}
        </div>
      )}
    </form>
  );
}