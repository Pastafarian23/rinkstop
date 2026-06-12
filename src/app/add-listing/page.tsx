'use client';

import { useState, useEffect } from 'react';

const LISTING_TYPES = [
  { value: 'team', label: 'Team' },
  { value: 'player', label: 'Player' },
  { value: 'rink', label: 'Rink' },
  { value: 'league', label: 'League' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'other', label: 'Other' },
];

export default function AddListingPage() {
  const [form, setForm] = useState({
    listingType: '',
    name: '',
    city: '',
    country: '',
    website: '',
    description: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Inject page metadata on mount. This is a client component, so Next.js
  // doesn't emit <title>/<meta>/<link> from a static metadata export.
  useEffect(() => {
    const title = 'Add Your Team, League, or Rink | RinkStop';
    const description =
      "Submit your hockey team, league, or rink to the world's hockey directory. Free to add.";
    const canonical = 'https://rinkstop.com/add-listing';

    document.title = title;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!el) {
        el = document.createElement(selector.startsWith('meta') ? 'meta' : 'link');
        const m = selector.match(/\[(name|property)="([^"]+)"\]/);
        if (m) el.setAttribute(m[1], m[2]);
        if (selector.startsWith('link')) el.setAttribute('rel', 'canonical');
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
      return el;
    };

    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[property="og:site_name"]', 'content', 'RinkStop');
    setMeta('meta[property="og:type"]', 'content', 'website');
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);

    let canonicalEl = document.head.querySelector('link[rel="canonical"][data-seo-canonical="add-listing"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      canonicalEl.setAttribute('data-seo-canonical', 'add-listing');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonical;

    return () => {
      const el = document.head.querySelector('link[rel="canonical"][data-seo-canonical="add-listing"]');
      if (el && document.head.contains(el)) document.head.removeChild(el);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.listingType || !form.name || !form.email) {
      setError('Please fill in listing type, name, and email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/listings/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            LISTING SUBMITTED
          </h1>
          <p style={{ color: '#888', fontSize: '1rem', marginBottom: '1.5rem' }}>
            We received your submission and will review it within 1-2 business days. You'll hear from us at <strong style={{ color: '#fff' }}>{form.email}</strong>.
          </p>
          <a href="/add-listing" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#C8102E', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>
            Submit Another Listing
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', letterSpacing: '0.05em', color: '#fff', marginBottom: '0.5rem' }}>
            ADD A LISTING
          </h1>
          <p style={{ fontSize: '1rem', color: '#888' }}>
            Know a team, player, rink, or league that's missing from our directory? Submit it here and we'll review it.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem', background: '#111118', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '2rem' }}>
          {/* Listing Type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Listing Type <span style={{ color: '#C8102E' }}>*</span>
            </label>
            <select
              name="listingType"
              value={form.listingType}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #2a2a3e', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="">Select a type...</option>
              {LISTING_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Name <span style={{ color: '#C8102E' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Team, player, rink, or league name"
              required
              style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #2a2a3e', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>

          {/* City + Country */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                City
              </label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Chicago"
                style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #2a2a3e', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Country
              </label>
              <input
                type="text"
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="e.g. USA"
                style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #2a2a3e', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Website <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="url"
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://"
              style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #2a2a3e', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Tell us about this listing — league, division, notable facts, etc."
              rows={4}
              style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #2a2a3e', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Your Email <span style={{ color: '#C8102E' }}>*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #2a2a3e', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
            />
            <p style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.4rem' }}>We'll only use this to follow up on your submission.</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(200,16,46,0.15)', border: '1px solid rgba(200,16,46,0.4)', borderRadius: '6px', padding: '0.75rem', color: '#ff6b6b', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: loading ? '#333' : 'linear-gradient(135deg, #C8102E 0%, #a00d25 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.9375rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Submitting...' : 'Submit Listing for Review'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#555', marginTop: '1.5rem' }}>
          Listings are reviewed within 1-2 business days. Verified listings go live on RinkStop.
        </p>
      </div>
    </div>
  );
}