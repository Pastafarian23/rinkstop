'use client';

import { useState } from 'react';

interface UpgradeButtonProps {
  entityId: string;
  entityType: 'fan' | 'player' | 'coach' | 'scout' | 'business' | 'team' | 'league' | 'rink';
  entityName: string;
}

const PRICE = { fan: '$9.99', player: '$9.99', coach: '$19.99', scout: '$19.99', business: '$29.99', team: '$29.99', league: '$29.99', rink: '$29.99' };
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
    <div style={{ textAlign: 'left', width: '100%' }}>
      <h3 style={{ color: '#FFD700', marginBottom: '0.25rem' }}>Founding Member Benefits</h3>
      <p style={{ fontSize: '0.875rem', color: '#ccc', lineHeight: 1.5 }}>
        Permanent badge • Verified profile • Priority visibility • Supporter recognition • Future perks
      </p>

      <div style={{ margin: '1.5rem 0' }}>
        <h4 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '0.875rem' }}>What You Get</h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
          {perks.map(perk => (
            <li key={perk} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#ddd' }}>
              <span style={{ color: '#FFD700', flexShrink: 0, marginTop: '2px' }}>✓</span>
              {perk}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#FFD700' }}>{price}</span>
        <span style={{ fontSize: '0.875rem', color: '#666', marginLeft: '0.5rem' }}>one-time payment</span>
      </div>

      <button onClick={handleUpgrade} disabled={loading} style={{
        width: '100%', padding: '0.75rem',
        background: loading ? '#555' : '#FFD700',
        border: 'none', borderRadius: '6px',
        color: loading ? '#888' : '#000',
        fontSize: '0.875rem', fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
      }}>
        {loading ? 'Processing...' : 'Confirm Founding Membership'}
      </button>

      <p style={{ fontSize: '0.75rem', color: '#444', textAlign: 'center', marginTop: '1rem' }}>
        Secure one-time payment. Founding Member status is permanent.
      </p>
    </div>
  );
}