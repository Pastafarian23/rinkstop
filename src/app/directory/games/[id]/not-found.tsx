'use client';

import Link from 'next/link';

export default function GameNotFound() {
  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '1rem' }}>Game Not Found</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>This game doesn&apos;t exist or has been removed.</p>
      <Link href="/directory/games" style={{ color: '#C8102E', display: 'inline-block', marginTop: '1rem' }}>
        ← Back to Scores
      </Link>
    </div>
  );
}
