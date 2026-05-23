'use client';

import { useState } from 'react';
import Link from 'next/link';

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
  const price = ENTITY_TYPE_PRICES[entityType] || '$9.99';

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
      {label} — {price}
    </Link>
  );
}