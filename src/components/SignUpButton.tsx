'use client';
import { useState } from 'react';
import Link from 'next/link';

<<<<<<< Updated upstream
export default function SignUpButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/newsletter-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Subscription failed');
      }

      setSubmitted(true);
      // Reset form after short delay to show success message
      setTimeout(() => { 
        setOpen(false); 
        setSubmitted(false); 
        setLoading(false);
        setEmail(''); 
      }, 2000);
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="btn btn-red"
        style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
        onClick={() => setOpen(true)}
      >
        Sign Up Free
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{ background: 'var(--navy)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '2rem', maxWidth: 420, width: '100%', position: 'relative' }}>
            <button
              onClick={() => setOpen(false)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}
            >
              ×
            </button>

            {!submitted ? (
              <>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Join RinkStop
                </div>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  Get updates on new features, league launches, apps, and more. No spam — ever.
                </p>
                {error && (
                  <p style={{ color: '#ff6b6b', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    {error}
                  </p>
                )}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: '#fff', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', boxSizing: 'border-box' }}
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading} style={{ background: '#C8102E', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}>
                    {loading ? 'Subscribing...' : 'Sign Up Free →'}
                  </button>
                </form>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6875rem', marginTop: '0.75rem', textAlign: 'center' }}>
                  We're building apps for teams, players, and leagues. Be the first to know.
                </p>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.25rem', color: '#fff', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  You&apos;re on the list!
                </div>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem' }}>
                  We&apos;ll reach out the moment apps go live. Stay tuned.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
=======
interface SignUpButtonProps {
  entityId?: string;
  entityType?: 'fan' | 'player' | 'coach' | 'scout' | 'business' | 'team' | 'league' | 'rink';
  label?: string;
}

const ENTITY_TYPE_PRICES: Record<string, string> = {
  fan: '$9.99',
  player: '$9.99',
  coach: '$19.99',
  scout: '$19.99',
  business: '$29.99',
  team: '$29.99',
  league: '$29.99',
  rink: '$29.99',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  fan: 'Fan',
  player: 'Player',
  coach: 'Coach',
  scout: 'Scout',
  business: 'Business',
  team: 'Team',
  league: 'League',
  rink: 'Rink',
};

export default function SignUpButton({ entityId = 'signup', entityType = 'fan', label = 'Sign Up Now' }: SignUpButtonProps) {
  return (
    <Link
      href="/add-listing"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        background: 'linear-gradient(135deg, #FFD700 0%, #FCC419 100%)',
        border: 'none',
        borderRadius: '6px',
        color: '#000',
        fontSize: '0.75rem',
        fontWeight: 700,
        cursor: 'pointer',
        textDecoration: 'none',
        boxShadow: '0 2px 8px rgba(255,215,0,0.2)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Link>
>>>>>>> Stashed changes
  );
}