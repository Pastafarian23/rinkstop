'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface Props {
  listingType: 'rink' | 'team' | 'league';
  listingId: string;
  listingName: string;
  /** Optional — show this headline above the form */
  heading?: string;
  /** Optional — sub-text below the heading */
  subtext?: string;
}

const HEADING_DEFAULT: Record<'rink' | 'team' | 'league', string> = {
  rink: 'Contact this rink',
  team: 'Contact this team',
  league: 'Contact this league',
};

const SUBTEXT_DEFAULT: Record<'rink' | 'team' | 'league', string> = {
  rink: 'Send a message to the rink owner. They typically reply within 1–2 days.',
  team: 'Send a message to the team manager. They typically reply within 1–2 days.',
  league: 'Send a message to the league director. They typically reply within 1–2 days.',
};

export default function ListingContactForm({
  listingType,
  listingId,
  listingName,
  heading,
  subtext,
}: Props) {
  const { isSignedIn, user } = useUser();
  const [name, setName] = useState(isSignedIn && user ? (user.fullName || '') : '');
  const [email, setEmail] = useState(
    isSignedIn && user?.emailAddresses?.[0]?.emailAddress ? user.emailAddresses[0].emailAddress : ''
  );
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || message.trim().length < 10) {
      setError('Please fill in your name, email, and a short message.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads/listing-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_type: listingType,
          listing_id: listingId,
          submitter_name: name.trim(),
          email: email.trim(),
          submitter_phone: phone.trim() || undefined,
          message: message.trim(),
          // Honeypot — bots fill, humans don't
          website_url: '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          background: 'rgba(20, 184, 166, 0.08)',
          border: '1px solid rgba(20, 184, 166, 0.4)',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: '#0F766E',
            fontWeight: 700,
            fontSize: '1.05rem',
            margin: '0 0 0.5rem',
          }}
        >
          ✓ Message sent
        </p>
        <p style={{ color: 'rgba(0,0,0,0.65)', fontSize: '0.9rem', margin: 0 }}>
          Your inquiry about {listingName} was delivered. They&apos;ll reach out by email.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div>
        <h3
          style={{
            margin: '0 0 0.25rem',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#041E42',
          }}
        >
          {heading || HEADING_DEFAULT[listingType]}
        </h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(0,0,0,0.6)' }}>
          {subtext || SUBTEXT_DEFAULT[listingType]}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name *"
          autoComplete="name"
          maxLength={200}
          style={inputStyle}
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com *"
          autoComplete="email"
          maxLength={254}
          style={inputStyle}
        />
      </div>

      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (optional)"
        autoComplete="tel"
        maxLength={50}
        style={inputStyle}
      />

      <textarea
        required
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Your message — what are you looking for? *"
        rows={4}
        minLength={10}
        maxLength={4000}
        style={{ ...inputStyle, resize: 'vertical', minHeight: 100, fontFamily: 'inherit' }}
      />

      {/* Honeypot — visually hidden */}
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />

      {error && (
        <p style={{ color: '#C8102E', fontSize: '0.85rem', margin: 0 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: submitting ? '#1a1a1a' : '#041E42',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '0.875rem 1.5rem',
          fontSize: '0.95rem',
          fontWeight: 700,
          cursor: submitting ? 'not-allowed' : 'pointer',
          letterSpacing: '0.02em',
          fontFamily: 'inherit',
          transition: 'background 0.15s',
        }}
      >
        {submitting ? 'Sending…' : 'SEND MESSAGE'}
      </button>

      <p style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.5)', margin: 0, textAlign: 'center' }}>
        Your message is sent directly to the {listingType} manager. RinkStop does not store anything beyond
        what&apos;s needed to deliver it.
      </p>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#F8FAFC',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 6,
  padding: '0.75rem 0.875rem',
  color: '#0a0a0a',
  fontSize: '0.95rem',
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
};
