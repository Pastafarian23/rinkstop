'use client';

import { useState } from 'react';

const PLANS = [
  {
    type: 'fan',
    label: 'Fan',
    price: '$9.99',
    period: '/year',
    color: '#3B82F6',
    bgColor: 'rgba(59,130,246,0.1)',
    borderColor: 'rgba(59,130,246,0.3)',
    popular: false,
    features: [
      'Follow your favorite teams & players',
      'Personalized hockey news feed',
      'Game reminders & notifications',
      'Favorite venues & schedules',
      'Ad-free experience',
    ],
  },
  {
    type: 'player',
    label: 'Player',
    price: '$9.99',
    period: '/year',
    color: '#14B8A6',
    bgColor: 'rgba(20,184,166,0.1)',
    borderColor: 'rgba(20,184,166,0.3)',
    popular: true,
    features: [
      'Player profile page',
      'Stats & highlights visibility',
      'Scout discovery & contact',
      'Video embeds',
      'Recruiting tools',
    ],
  },
  {
    type: 'coach',
    label: 'Coach',
    price: '$19.99',
    period: '/year',
    color: '#8B5CF6',
    bgColor: 'rgba(139,92,246,0.1)',
    borderColor: 'rgba(139,92,246,0.3)',
    popular: false,
    features: [
      'Coach profile page',
      'Team management tools',
      'Player evaluation tools',
      'Recruit tracking',
      'Video sharing & analysis',
    ],
  },
  {
    type: 'scout',
    label: 'Scout',
    price: '$19.99',
    period: '/year',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.3)',
    popular: false,
    features: [
      'Advanced player search',
      'Player comparison tools',
      'Scouting report creation',
      'Contact unlimited players',
      'Export data & reports',
    ],
  },
  {
    type: 'team',
    label: 'Team',
    price: '$29.99',
    period: '/year',
    color: '#C8102E',
    bgColor: 'rgba(200,16,46,0.1)',
    borderColor: 'rgba(200,16,46,0.3)',
    popular: false,
    features: [
      'Team profile & schedule',
      'Roster management',
      'Game stats & analytics',
      'Merchandise store',
      'Sponsor management',
    ],
  },
  {
    type: 'league',
    label: 'League',
    price: '$29.99',
    period: '/year',
    color: '#10B981',
    bgColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.3)',
    popular: false,
    features: [
      'League hub & standings',
      'Multi-team management',
      'Official stats league-wide',
      'Scheduling engine',
      'Sponsor & media tools',
    ],
  },
  {
    type: 'rink',
    label: 'Rink',
    price: '$29.99',
    period: '/year',
    color: '#06B6D4',
    bgColor: 'rgba(6,182,212,0.1)',
    borderColor: 'rgba(6,182,212,0.3)',
    popular: false,
    features: [
      'Rink profile page',
      'Ice time bookings',
      'Tournament scheduling',
      'Local news feed',
      'Facility promotion',
    ],
  },
  {
    type: 'business',
    label: 'Business',
    price: '$29.99',
    period: '/year',
    color: '#EC4899',
    bgColor: 'rgba(236,72,153,0.1)',
    borderColor: 'rgba(236,72,153,0.3)',
    popular: false,
    features: [
      'Hockey gear marketplace',
      'Business profile & store',
      'Event sponsorship tools',
      'Targeted advertising',
      'Analytics dashboard',
    ],
  },
];

export default function AddListingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (entityType: string) => {
    setLoading(entityType);
    try {
      const res = await fetch('/api/founding/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: 'signup',
          entityType,
          successUrl: `${window.location.origin}/?signup=success`,
          cancelUrl: `${window.location.origin}/add-listing?cancelled=true`,
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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '0.05em', color: '#fff', marginBottom: '0.5rem' }}>
            BECOME A FOUNDING MEMBER
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#888', maxWidth: '600px', margin: '0 auto 1rem' }}>
            Get founding member pricing for life when you join today. Cancel anytime.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '6px', padding: '0.5rem 1rem' }}>
            <span style={{ color: '#FFD700', fontSize: '0.875rem', fontWeight: 700 }}>*</span>
            <span style={{ color: '#888', fontSize: '0.875rem' }}>Founding member pricing - locked in forever</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {PLANS.map((plan) => (
            <div
              key={plan.type}
              style={{
                background: plan.popular ? plan.bgColor : '#111118',
                border: `1.5px solid ${plan.popular ? '#FFD700' : plan.borderColor}`,
                borderRadius: '12px',
                padding: '1.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-11px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #FFD700 0%, #FCC419 100%)',
                  color: '#000',
                  fontSize: '0.5625rem',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  padding: '0.2rem 0.7rem',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: plan.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{plan.label}</span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: plan.color }}>{plan.price}</span>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>{plan.period}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', flex: 1, display: 'grid', gap: '0.5rem' }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#aaa' }}>
                    <span style={{ color: plan.color, flexShrink: 0, marginTop: '2px' }}>+</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.type)}
                disabled={loading !== null}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: loading === plan.type ? '#333' : plan.popular ? 'linear-gradient(135deg, #FFD700 0%, #FCC419 100%)' : plan.color,
                  border: 'none',
                  borderRadius: '6px',
                  color: plan.popular ? '#000' : '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: loading === plan.type ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: plan.popular ? '0 4px 12px rgba(255,215,0,0.25)' : 'none',
                }}
              >
                {loading === plan.type ? 'Redirecting to Stripe...' : `Join as ${plan.label}`}
              </button>
            </div>
          ))}
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em', marginBottom: '1rem', color: '#fff' }}>COMMON QUESTIONS</h2>
          <div style={{ display: 'grid', gap: '0.75rem', textAlign: 'left' }}>
            {[
              { q: 'Is this pricing locked in forever?', a: 'Yes - founding members keep this pricing for life, even when standard prices increase.' },
              { q: 'Can I cancel anytime?', a: 'Yes, cancel anytime from your account settings. No questions asked.' },
              { q: 'What payment methods do you accept?', a: 'All major credit and debit cards via Stripe.' },
              { q: 'When does my subscription start?', a: "Immediately after checkout - you'll have instant access to your member features." },
            ].map(({ q, a }) => (
              <div key={q} style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{q}</div>
                <div style={{ fontSize: '0.8125rem', color: '#888' }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}