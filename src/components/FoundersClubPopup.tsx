'use client';

import { useEffect, useState } from 'react';
import { FoundingMemberUpgrade } from './FoundingMemberUpgrade';

interface FoundersClubPopupProps {
  frequency?: 'always' | 'once' | 'weekly';
  entityType?: 'fan' | 'player' | 'coach' | 'scout' | 'business' | 'team' | 'league' | 'rink';
  entityId?: string;
}

const PRICE_BY_TYPE: Record<string, string> = {
  fan: '$9.99', player: '$9.99', coach: '$19.99', scout: '$19.99',
  business: '$29.99', team: '$29.99', league: '$29.99', rink: '$29.99',
};

export default function FoundersClubPopup({ frequency = 'always', entityType = 'fan', entityId = 'founders-club' }: FoundersClubPopupProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [selectedType, setSelectedType] = useState(entityType);

  useEffect(() => {
    if (frequency === 'always') {
      setShowPopup(true);
      return;
    }
    if (frequency === 'once') {
      const hasSeen = localStorage.getItem('rinkstop_founders_popup_seen');
      setShowPopup(!hasSeen);
      if (!hasSeen) localStorage.setItem('rinkstop_founders_popup_seen', 'true');
      return;
    }
    if (frequency === 'weekly') {
      const lastSeen = localStorage.getItem('rinkstop_founders_popup_weekly');
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      if (!lastSeen || (Date.now() - parseInt(lastSeen)) >= weekMs) {
        setShowPopup(true);
        localStorage.setItem('rinkstop_founders_popup_weekly', Date.now().toString());
      }
    }
  }, [frequency]);

  if (!showPopup) return null;

  const typeOptions: Array<{ value: string; label: string; price: string }> = [
    { value: 'fan', label: 'Fan', price: '$9.99' },
    { value: 'player', label: 'Player', price: '$9.99' },
    { value: 'coach', label: 'Coach', price: '$19.99' },
    { value: 'scout', label: 'Scout', price: '$19.99' },
    { value: 'team', label: 'Team', price: '$29.99' },
    { value: 'league', label: 'League', price: '$29.99' },
    { value: 'rink', label: 'Rink', price: '$29.99' },
    { value: 'business', label: 'Business', price: '$29.99' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) setShowPopup(false); }}
    >
      {/* Desktop modal */}
      <div style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e',
        borderRadius: '12px', padding: '2rem',
        maxWidth: '540px', width: '100%', position: 'relative', textAlign: 'center',
        display: 'none',
      }} className="founders-modal-desktop">
        <button onClick={() => setShowPopup(false)} style={{
          position: 'absolute', top: '0.75rem', right: '0.75rem',
          background: 'none', border: 'none', color: '#555',
          fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1,
        }}>×</button>

        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          JOIN THE FOUNDERS CLUB
        </h2>
        <p style={{ fontSize: '0.8125rem', color: '#888', marginBottom: '1.25rem' }}>
          Be part of hockey history. Choose your membership type.
        </p>

        {/* Type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {typeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedType(opt.value as typeof selectedType)}
              style={{
                padding: '0.5rem 0.25rem',
                borderRadius: '6px',
                border: `1px solid ${selectedType === opt.value ? '#FFD700' : '#333'}`,
                background: selectedType === opt.value ? 'rgba(255,215,0,0.1)' : '#161616',
                color: selectedType === opt.value ? '#FFD700' : '#888',
                fontSize: '0.6875rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ marginBottom: '0.125rem' }}>{opt.label}</div>
              <div style={{ color: selectedType === opt.value ? '#FFD700' : '#666' }}>{opt.price}</div>
            </button>
          ))}
        </div>

        <FoundingMemberUpgrade
          entityId={entityId}
          entityType={selectedType}
          entityName="RinkStop Community"
        />

        <p style={{ fontSize: '0.6875rem', color: '#444', marginTop: '1rem' }}>
          One-time payment. Founding Member benefits.
        </p>
      </div>

      {/* Mobile modal */}
      <div style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e',
        borderRadius: '12px', padding: '1.5rem',
        width: '100%', maxHeight: '90vh', overflow: 'auto',
        position: 'relative', textAlign: 'center',
      }} className="founders-modal-mobile">
        <button onClick={() => setShowPopup(false)} style={{
          position: 'absolute', top: '0.5rem', right: '0.5rem',
          background: 'none', border: 'none', color: '#555',
          fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1,
        }}>×</button>

        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          JOIN THE FOUNDERS CLUB
        </h2>
        <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '1rem' }}>
          Choose your membership type:
        </p>

        {/* Mobile type selector - horizontal scroll */}
        <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem', WebkitOverflowScrolling: 'touch' }}>
          {typeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedType(opt.value as typeof selectedType)}
              style={{
                flexShrink: 0,
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: `1px solid ${selectedType === opt.value ? '#FFD700' : '#333'}`,
                background: selectedType === opt.value ? 'rgba(255,215,0,0.1)' : '#161616',
                color: selectedType === opt.value ? '#FFD700' : '#888',
                fontSize: '0.625rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div>{opt.label}</div>
              <div style={{ color: selectedType === opt.value ? '#FFD700' : '#666', fontSize: '0.5625rem' }}>{opt.price}</div>
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'left' }}>
          <FoundingMemberUpgrade
            entityId={entityId}
            entityType={selectedType}
            entityName="RinkStop Community"
          />
        </div>

        <p style={{ fontSize: '0.6875rem', color: '#444', marginTop: '0.75rem' }}>
          One-time payment. Permanent status.
        </p>
      </div>

      <style>{`
        @media (min-width: 480px) {
          .founders-modal-mobile { display: none !important; }
          .founders-modal-desktop { display: block !important; }
        }
        @media (max-width: 479px) {
          .founders-modal-mobile { display: block !important; }
          .founders-modal-desktop { display: none !important; }
        }
      `}</style>
    </div>
  );
}