'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to send');
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
      setError('Something went wrong. Please try again or email us directly.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Contact</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="label">Get in Touch</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          CONTACT US
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontSize: '0.9375rem', maxWidth: '520px' }}>
          Have a question, suggestion, or want to contribute? Drop us a line below.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>

        {/* Form */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.75rem' }}>
          {status === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
              <h2 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Message Sent!</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>We&apos;ll get back to you at {form.email || 'your email'} within 1-2 business days.</p>
              <button
                onClick={() => setStatus('idle')}
                style={{ marginTop: '1.25rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.625rem 1.25rem', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Send Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem' }}>
                  Your Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Alex Ovechkin"
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem' }}>
                  Email Address *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="alex@nhl.com"
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem' }}>
                  Subject
                </label>
                <select
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className="input-field"
                  style={{ color: form.subject ? '#fff' : '#555' }}
                >
                  <option value="">Select a topic...</option>
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Add Your Listing">Add Your Listing</option>
                  <option value="Add Your League">Add Your League</option>
                  <option value="Add a Rink">Add a Rink</option>
                  <option value="Report an Error">Report an Error</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Feedback">Feedback</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem' }}>
                  Message *
                </label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us what's on your mind..."
                  className="input-field"
                  style={{ resize: 'vertical', minHeight: '120px' }}
                />
              </div>
              {error && (
                <p style={{ color: '#C8102E', fontSize: '0.8125rem' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={status === 'sending'}
                style={{
                  background: status === 'sending' ? 'rgba(200,16,46,0.5)' : 'var(--red)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                }}
              >
                {status === 'sending' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        {/* Info panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '0.5rem' }}>Email</p>
            <a href="mailto:support@rinkstop.com" style={{ color: '#fff', fontSize: '0.9375rem', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
              support@rinkstop.com
            </a>
          </div>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '0.5rem' }}>Response Time</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>1-2 business days</p>
          </div>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '0.75rem' }}>Quick Links</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                { href: '/admin/teams/new', label: 'Add Your Listing' },
                { href: '/admin/leagues/new', label: 'Add Your League' },
                { href: '/admin/rinks/new', label: 'Add a Rink' },
                { href: '/news', label: 'Latest News' },
              ].map(l => (
                <Link key={l.href} href={l.href} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', textDecoration: 'none' }}>
                  → {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
