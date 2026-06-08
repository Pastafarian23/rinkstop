'use client';

import { useEffect, useState } from 'react';

type Subject = 'general' | 'incorrect_info' | 'claim_listing' | 'bug' | 'partnership' | 'other';
const VALID_SUBJECTS: Subject[] = ['general', 'incorrect_info', 'claim_listing', 'bug', 'partnership', 'other'];
const SUBJECT_LABELS: Record<Subject, string> = {
  general: 'General question',
  incorrect_info: 'Report incorrect information',
  claim_listing: 'Claim a listing',
  bug: 'Report a bug',
  partnership: 'Business partnership',
  other: 'Other',
};

interface Ticket {
  id: string;
  subject: Subject;
  message: string;
  status: string;
  created_at: string;
}

export default function SupportPage() {
  const [form, setForm] = useState<{ subject: Subject; message: string }>({
    subject: 'general',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Load user's existing tickets
  useEffect(() => {
    let cancelled = false;
    fetch('/api/support')
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setTickets(d.tickets || []);
          setLoadingTickets(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingTickets(false);
      });
    return () => { cancelled = true; };
  }, [submitted]); // refresh after new submission

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.message.trim().length < 5) {
      setError('Please enter a message (at least 5 characters).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: form.subject, message: form.message }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted({ id: data.ticket.id });
        setForm({ subject: 'general', message: '' });
      } else {
        setError(data.error || 'Failed to submit. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function statusColor(status: string) {
    if (status === 'open') return '#fb923c';
    if (status === 'closed') return '#4ade80';
    return '#888';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 720 }}>

      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.25rem' }}>
          HELP & SUPPORT
        </h2>
        <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
          Send us a message and we'll get back to you.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: 0 }}>
          CONTACT OUR TEAM
        </h3>

        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
            Subject *
          </label>
          <select
            value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value as Subject }))}
            required
            style={{
              width: '100%',
              background: '#141414',
              border: '1px solid #1e1e1e',
              borderRadius: 6,
              padding: '0.625rem 0.875rem',
              color: '#ccc',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          >
            {VALID_SUBJECTS.map(s => (
              <option key={s} value={s}>{SUBJECT_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
            Message *
          </label>
          <textarea
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Tell us how we can help..."
            rows={5}
            required
            minLength={5}
            maxLength={5000}
            style={{
              width: '100%',
              background: '#141414',
              border: '1px solid #1e1e1e',
              borderRadius: 6,
              padding: '0.625rem 0.875rem',
              color: '#e2e8f0',
              fontSize: '0.9rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.6,
            }}
          />
          <p style={{ color: '#555', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
            {form.message.length} / 5000
          </p>
        </div>

        {error && (
          <p style={{ color: '#f87171', fontSize: '0.875rem', background: 'rgba(248,113,113,0.1)', padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid rgba(248,113,113,0.2)', margin: 0 }}>
            {error}
          </p>
        )}

        {submitted && !error && (
          <p style={{ color: '#4ade80', fontSize: '0.875rem', background: 'rgba(74,222,128,0.1)', padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid rgba(74,222,128,0.2)', margin: 0 }}>
            ✓ Message sent. We'll reply to the email on your account.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: submitting ? '#8b0a1e' : '#C8102E',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
            letterSpacing: '0.02em',
          }}
        >
          {submitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>

      {/* Previous tickets */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 1rem' }}>
          YOUR MESSAGES — {tickets.length}
        </h3>
        {loadingTickets ? (
          <p style={{ color: '#555', fontSize: '0.875rem', margin: 0 }}>Loading...</p>
        ) : tickets.length === 0 ? (
          <p style={{ color: '#555', fontSize: '0.875rem', margin: 0 }}>
            You haven't sent any messages yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tickets.map(t => (
              <details
                key={t.id}
                style={{
                  borderBottom: '1px solid #1e1e1e',
                  paddingBottom: '0.75rem',
                }}
              >
                <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', listStyle: 'none', userSelect: 'none' }}>
                  <span style={{
                    display: 'inline-block',
                    width: 8, height: 8, borderRadius: '50%',
                    background: statusColor(t.status),
                  }} />
                  <span style={{ color: '#e2e8f0', fontWeight: 500, fontSize: '0.875rem', flex: 1 }}>
                    {SUBJECT_LABELS[t.subject as Subject] || t.subject}
                  </span>
                  <span style={{ color: '#555', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t.status}
                  </span>
                  <span style={{ color: '#555', fontSize: '0.75rem' }}>
                    {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </summary>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.65, margin: '0.75rem 0 0', whiteSpace: 'pre-wrap' }}>
                  {t.message}
                </p>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* FAQ Accordion */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 1.25rem' }}>
          FREQUENTLY ASKED QUESTIONS
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { q: 'How do I claim a rink, team, or player listing?', a: 'Go to your Dashboard and click "Claim a Profile." Submit a request and our team will review it.' },
            { q: 'How do I leave a review?', a: 'Visit any rink page and scroll to the "Write a Review" section. You\'ll need to be signed in to submit a review.' },
            { q: 'Can I delete my review?', a: 'Yes. Go to Dashboard → My Reviews and contact support to remove any review you\'ve submitted.' },
            { q: 'How does Founding Membership work?', a: 'Founding Members get verified status, priority support, and exclusive features. Visit the Founding Member page for full details.' },
            { q: 'How do I save players or teams?', a: 'When viewing a player or team page, click the Save button. Your saved items appear in Dashboard → Saved Items.' },
            { q: 'My rink or team info is wrong. How do I fix it?', a: 'Use the form above to report it, or use the "Suggest an Edit" link on the listing page.' },
          ].map(({ q, a }) => (
            <details key={q} style={{ borderBottom: '1px solid #1e1e1e', paddingBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', color: '#e2e8f0', fontWeight: 500, fontSize: '0.9rem', listStyle: 'none', userSelect: 'none' }}>
                {q}
              </summary>
              <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: 1.65, marginTop: '0.75rem' }}>{a}</p>
            </details>
          ))}
        </div>
      </div>

    </div>
  );
}
