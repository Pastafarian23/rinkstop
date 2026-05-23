'use client';

import { useState } from 'react';

interface UpgradeButtonProps {
  entityId: string;
  entityType: 'fan' | 'player' | 'coach' | 'scout' | 'business' | 'team' | 'league' | 'rink';
  entityName: string;
}

const PRICE: Record<string, string> = {
  fan: '$9.99', player: '$9.99', coach: '$19.99', scout: '$19.99',
  business: '$29.99', team: '$29.99', league: '$29.99', rink: '$29.99',
};

const PERKS: Record<string, string[]> = {
  fan:     ['Founding Member badge on profile','Priority visibility in search','Supporter recognition','Access to founding member community','Early access to new features'],
  player:  ['Founding Member badge on profile','Verified status for credibility','Priority visibility in searches','Founding member community access','Early feature access'],
  coach:   ['Founding Member badge on profile','Verified coach credentials','Priority visibility for teams seeking coaches','Founding member community','Early access to coaching tools'],
  scout:   ['Founding Member badge on profile','Verified scout credentials','Priority visibility for players seeking scouts','Founding member community','Early access to scouting tools'],
  business:['Founding Member badge on profile','Verified business status','Priority visibility in directory','Founding member network access','Early access to business features'],
  team:    ['Founding Member badge on profile','Verified team status','Priority visibility in searches','Founding member community access','Early access to team management tools'],
  league:  ['Founding Member badge on profile','Verified league status','Priority visibility for teams seeking leagues','Founding member community','Early access to league features'],
  rink:    ['Founding Member badge on profile','Verified rink status','Priority visibility in directory','Founding member network access','Early access to rink features'],
};

export function FoundingMemberUpgrade({ entityId, entityType, entityName }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/founding/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId,
          entityType,
          successUrl: `${window.location.origin}/directory/${entityType}s/${entityId}`,
          cancelUrl: `${window.location.origin}/directory/${entityType}s/${entityId}?upgrade=cancelled`,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert('Could not start checkout. Please try again.');
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const price = PRICE[entityType] || '$9.99';
  const perks = PERKS[entityType] || PERKS.fan;

  return (
    <div>
      {/* Benefits section */}
      <div style={{
        background: '#0f1e2d',
        border: '1px solid #1e2d3d',
        borderRadius: '10px',
        padding: '1rem 1.125rem',
        marginBottom: '1.25rem',
      }}>
        <h4 style={{ color: '#fff', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 700 }}>
          What You Get as a <span style={{ color: '#C8102E', textTransform: 'capitalize' }}>{entityType}</span>
        </h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
          {perks.map((perk, i) => (
            <li key={perk} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.8125rem', color: '#aabbcc', lineHeight: 1.4 }}>
              <span style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: 'rgba(200,16,46,0.2)', border: '1px solid #C8102E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '1px',
                color: '#C8102E', fontSize: '0.5625rem', fontWeight: 800,
              }}>✓</span>
              {perk}
            </li>
          ))}
        </ul>
      </div>

      {/* Price + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.875rem' }}>
        <div>
          <div style={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.1em', color: '#667788', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Total</div>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: '#fff', letterSpacing: '0.02em' }}>{price}</span>
          <span style={{ fontSize: '0.75rem', color: '#556677', marginLeft: '0.375rem' }}>one-time · forever yours</span>
        </div>
        <button onClick={handleUpgrade} disabled={loading} style={{
          padding: '0.75rem 1.5rem',
          background: loading ? '#3a1a22' : '#C8102E',
          border: 'none', borderRadius: '8px',
          color: loading ? '#885566' : '#fff',
          fontSize: '0.875rem', fontWeight: 800,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
          letterSpacing: '0.03em',
        }}>
          {loading ? 'Processing...' : 'Get Started →'}
        </button>
      </div>

      <p style={{ fontSize: '0.6875rem', color: '#445566', textAlign: 'center' }}>
        Secure checkout via Stripe · Founding Member benefits are permanent
      </p>
    </div>
  );
}