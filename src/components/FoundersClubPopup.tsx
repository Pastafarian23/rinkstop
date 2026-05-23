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

  const typeOptions = [
    { value: 'fan',     label: 'Fan',     price: '$9.99', desc: 'Hockey fan & supporter' },
    { value: 'player',  label: 'Player',  price: '$9.99', desc: 'Get verified & get discovered' },
    { value: 'coach',   label: 'Coach',   price: '$19.99',desc: 'Verified coaching credentials' },
    { value: 'scout',   label: 'Scout',   price: '$19.99',desc: 'Connect with talent' },
    { value: 'team',    label: 'Team',    price: '$29.99',desc: 'Verified team presence' },
    { value: 'league',  label: 'League',  price: '$29.99',desc: 'Verified league presence' },
    { value: 'rink',    label: 'Rink',    price: '$29.99',desc: 'Verified rink presence' },
    { value: 'business',label: 'Business', price: '$29.99',desc: 'Verified business presence' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
        backdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) setShowPopup(false); }}
    >
      {/* Desktop modal */}
      <div className="founders-modal-desktop" style={{
        background: '#0B1622', border: '1px solid #C8102E',
        borderRadius: '12px', padding: '2rem',
        maxWidth: '580px', width: '100%', position: 'relative',
      }}>
        <button onClick={() => setShowPopup(false)} style={{
          position: 'absolute', top: '0.75rem', right: '0.75rem',
          background: 'none', border: 'none', color: '#555',
          fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1,
        }}>×</button>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', justifyContent: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8102E', display: 'inline-block' }} />
            <span style={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.15em', color: '#C8102E', textTransform: 'uppercase' }}>RinkStop Founding Club</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8102E', display: 'inline-block' }} />
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#fff', letterSpacing: '0.04em', margin: '0.25rem 0' }}>
            BECOME A FOUNDING MEMBER
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#888' }}>Choose your plan. See exact benefits below.</p>
        </div>

        {/* Selected type badge */}
        <div style={{
          background: 'rgba(200,16,46,0.12)', border: '1px solid #C8102E',
          borderRadius: '8px', padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.25rem', textAlign: 'left',
        }}>
          <div>
            <div style={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.1em', color: '#C8102E', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Selected Plan</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{selectedType}</div>
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#C8102E' }}>
            {PRICE_BY_TYPE[selectedType]}
            <span style={{ fontSize: '0.625rem', color: '#666', fontFamily: 'Arial, sans-serif', display: 'block' }}>one-time</span>
          </div>
        </div>

        {/* Type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {typeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedType(opt.value as typeof selectedType)}
              style={{
                padding: '0.625rem 0.375rem',
                borderRadius: '8px',
                border: `2px solid ${selectedType === opt.value ? '#C8102E' : '#1e2d3d'}`,
                background: selectedType === opt.value ? 'rgba(200,16,46,0.15)' : '#0f1e2d',
                color: selectedType === opt.value ? '#fff' : '#667788',
                fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              <div style={{ marginBottom: '0.2rem' }}>{opt.label}</div>
              <div style={{ color: selectedType === opt.value ? '#C8102E' : '#445566', fontSize: '0.6875rem' }}>{opt.price}</div>
            </button>
          ))}
        </div>

        <FoundingMemberUpgrade
          entityId={entityId}
          entityType={selectedType}
          entityName="RinkStop Community"
        />
      </div>

      {/* Mobile modal */}
      <div className="founders-modal-mobile" style={{
        background: '#0B1622', border: '1px solid #C8102E',
        borderRadius: '12px', padding: '1.25rem',
        width: '100%', maxHeight: '92vh', overflowY: 'auto',
        position: 'relative',
      }}>
        <button onClick={() => setShowPopup(false)} style={{
          position: 'absolute', top: '0.5rem', right: '0.5rem',
          background: 'none', border: 'none', color: '#555',
          fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1,
        }}>×</button>

        {/* Header */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', justifyContent: 'center' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C8102E', display: 'inline-block' }} />
            <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.15em', color: '#C8102E', textTransform: 'uppercase' }}>RinkStop Founding Club</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C8102E', display: 'inline-block' }} />
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', margin: '0.25rem 0' }}>
            BECOME A FOUNDING MEMBER
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#888' }}>Pick your plan below.</p>
        </div>

        {/* Selected type badge */}
        <div style={{
          background: 'rgba(200,16,46,0.12)', border: '1px solid #C8102E',
          borderRadius: '8px', padding: '0.625rem 0.875rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1rem',
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', color: '#C8102E', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Selected Plan</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{selectedType}</div>
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#C8102E', textAlign: 'right' }}>
            {PRICE_BY_TYPE[selectedType]}
            <span style={{ fontSize: '0.5625rem', color: '#666', fontFamily: 'Arial, sans-serif', display: 'block' }}>one-time</span>
          </div>
        </div>

        {/* Mobile type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.375rem', marginBottom: '1rem' }}>
          {typeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedType(opt.value as typeof selectedType)}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: `2px solid ${selectedType === opt.value ? '#C8102E' : '#1e2d3d'}`,
                background: selectedType === opt.value ? 'rgba(200,16,46,0.15)' : '#0f1e2d',
                color: selectedType === opt.value ? '#fff' : '#667788',
                fontSize: '0.6875rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              <div>{opt.label}</div>
              <div style={{ color: selectedType === opt.value ? '#C8102E' : '#445566', fontSize: '0.625rem', marginTop: '0.125rem' }}>{opt.price}</div>
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