'use client';

import { useState } from 'react';
import { VerifiedBadge, BadgeTier } from '@/components/VerifiedBadge';

interface UpgradeButtonProps {
  playerId: string;
  currentTier: BadgeTier;
  playerName: string;
}

const TIERS = [
  {
    tier: 'verified' as BadgeTier,
    label: 'Verified Recruit',
    price: '$39',
    period: '/year',
    color: '#14B8A6',
    bgColor: 'rgba(20,184,166,0.12)',
    borderColor: 'rgba(20,184,166,0.4)',
    badgeIcon: 'shield-check',
    features: [
      'Verified Recruit badge on profile',
      'Identity verified by birthdate',
      'Highlight video embeds (YouTube/Vimeo)',
      'Contact info visible to verified scouts',
      'Appears in "Top Recruits" search filter',
      'Listed in Scout Directory',
    ],
    cta: 'Get Verified — $39/yr',
  },
  {
    tier: 'elite' as BadgeTier,
    label: 'Elite Recruit',
    price: '$99',
    period: '/year',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.5)',
    badgeIcon: 'star',
    popular: true,
    features: [
      'Everything in Verified, plus:',
      'Featured on RinkStop homepage',
      'Full video gallery (up to 5 videos)',
      'Priority placement in scout searches',
      '"Open to College / Open to Pro" toggles',
      'Scouting reports attached by admins',
      'Elite badge with star icon',
      'Recruiting bio with full details',
    ],
    cta: 'Go Elite — $99/yr',
  },
];

export function PlayerUpgradeButton({ playerId, currentTier, playerName }: UpgradeButtonProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleUpgrade = async (tier: BadgeTier) => {
    setLoading(tier);
    try {
      const res = await fetch('/api/players/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          tier,
          successUrl: `${window.location.origin}/directory/players/${playerId}`,
          cancelUrl: `${window.location.origin}/directory/players/${playerId}?upgrade=cancelled`,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Could not start checkout. Please try again.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  if (currentTier === 'elite') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <VerifiedBadge tier="elite" size="md" />
        <span style={{ fontSize: '0.75rem', color: '#888' }}>Elite Recruit active</span>
      </div>
    );
  }

  if (currentTier === 'verified') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <VerifiedBadge tier="verified" size="md" />
          <span style={{ fontSize: '0.75rem', color: '#888' }}>Verified Recruit active</span>
        </div>
        {showModal ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {TIERS.filter(t => t.tier === 'elite').map(t => (
              <button
                key={t.tier}
                onClick={() => handleUpgrade(t.tier)}
                disabled={loading === t.tier}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: loading === t.tier ? '#555' : t.bgColor,
                  border: `1.5px solid ${loading === t.tier ? '#555' : t.borderColor}`,
                  borderRadius: '6px',
                  color: loading === t.tier ? '#888' : t.color,
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: loading === t.tier ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {loading === t.tier ? 'Redirecting...' : t.cta}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(245,158,11,0.1)',
              border: '1.5px solid rgba(245,158,11,0.4)',
              borderRadius: '6px',
              color: '#F59E0B',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Upgrade to Elite →
          </button>
        )}
      </div>
    );
  }

  // Free tier — show upgrade modal
  if (!showModal) {
    return (
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: '0.625rem 1.5rem',
          background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '0.875rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(20,184,166,0.25)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Get Verified — From $39/yr
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
    >
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '560px',
          width: '100%',
          position: 'relative',
        }}
      >
        <button
          onClick={() => setShowModal(false)}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: '#555',
            fontSize: '1.25rem',
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          UPGRADE YOUR PROFILE
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '1.5rem' }}>
          Verified profiles get seen by scouts and recruiters. {playerName}&apos;s profile is currently free.
        </p>

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.5rem' }}>
          {TIERS.map((t) => (
            <div
              key={t.tier}
              style={{
                background: t.popular ? t.bgColor : '#0a0a0a',
                border: `1.5px solid ${t.popular ? t.borderColor : '#1a1a1a'}`,
                borderRadius: '8px',
                padding: '1.25rem',
                position: 'relative',
              }}
            >
              {t.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: t.color,
                  color: '#000',
                  fontSize: '0.5625rem',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  padding: '0.15rem 0.6rem',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <VerifiedBadge tier={t.tier} size="sm" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{t.label}</span>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: t.color }}>{t.price}</span>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>{t.period}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem', display: 'grid', gap: '0.35rem' }}>
                {t.features.slice(0, 5).map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.75rem', color: '#aaa' }}>
                    <span style={{ color: t.color, flexShrink: 0, marginTop: '1px' }}>✓</span>
                    {f}
                  </li>
                ))}
                {t.features.length > 5 && (
                  <li style={{ fontSize: '0.6875rem', color: '#666', marginLeft: '1rem' }}>
                    +{t.features.length - 5} more benefits
                  </li>
                )}
              </ul>

              <button
                onClick={() => handleUpgrade(t.tier)}
                disabled={loading !== null}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  background: loading === t.tier ? '#333' : t.color,
                  border: 'none',
                  borderRadius: '5px',
                  color: t.tier === 'verified' ? '#fff' : '#000',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: loading === t.tier ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {loading === t.tier ? 'Redirecting to Stripe...' : t.cta}
              </button>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.6875rem', color: '#444', textAlign: 'center' }}>
          Secure checkout via Stripe. To change or cancel your membership, email <a href="mailto:support@rinkstop.com" style={{ color: '#666', textDecoration: 'underline' }}>support@rinkstop.com</a>.
        </p>
      </div>
    </div>
  );
}