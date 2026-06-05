'use client';

export default function RinksError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', background: '#0a0a0a', border: '2px solid #C8102E', borderRadius: '8px', color: '#fff', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#C8102E', marginBottom: '1rem' }}>🔴 Rinks Page Error</h1>
      <p style={{ marginBottom: '1rem' }}><strong>Message:</strong> {error.message}</p>
      {error.digest && <p style={{ marginBottom: '1rem' }}><strong>Digest:</strong> {error.digest}</p>}
      <p style={{ marginBottom: '1rem', wordBreak: 'break-all' }}><strong>Stack:</strong> {error.stack}</p>
      <button onClick={reset} style={{ padding: '0.5rem 1rem', background: '#C8102E', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Try again</button>
    </div>
  );
}
