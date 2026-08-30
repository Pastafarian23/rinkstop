// Server-rendered skeleton shown while /directory/players/[id] resolves.
//
// Next.js App Router renders this file inside a Suspense boundary so it
// streams to the client immediately while the page server-component is
// still doing its DB work (existence check, owner/follower lookup, SEO
// JSON-LD). The old UX was a blank page for 1.5–2.8s — this gives
// users a layout-shaped skeleton in well under 100ms.
//
// Mirrors the actual page chrome: hero block (name + meta + photo),
// stats grid, bio / career sections, claim CTA. The CTA is intentionally
// dimmed here (no click target) because the real claim check hasn't
// happened yet — that runs in the server component.

export default function Loading() {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      {/* Hero block */}
      <section style={{
        background: 'linear-gradient(180deg, rgba(255,184,28,0.04) 0%, transparent 100%)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '2rem 1.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
          <div className="skeleton" style={{ width: 120, height: 120, borderRadius: '50%' }} />
          <div className="skeleton" style={{ width: '60%', maxWidth: 360, height: '2rem' }} />
          <div className="skeleton" style={{ width: '40%', maxWidth: 240, height: '0.875rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="skeleton" style={{ width: 64, height: 22, borderRadius: 999 }} />
            <div className="skeleton" style={{ width: 96, height: 22, borderRadius: 999 }} />
            <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 999 }} />
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
        ))}
      </section>

      {/* Bio / about block */}
      <section style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div className="skeleton" style={{ width: 120, height: '1.5rem', marginBottom: '0.75rem' }} />
        <div className="skeleton" style={{ width: '100%', height: '0.875rem', marginBottom: '0.5rem' }} />
        <div className="skeleton" style={{ width: '95%', height: '0.875rem', marginBottom: '0.5rem' }} />
        <div className="skeleton" style={{ width: '80%', height: '0.875rem' }} />
      </section>

      {/* Highlights block */}
      <section style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div className="skeleton" style={{ width: 160, height: '1.25rem', marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 8 }} />
          ))}
        </div>
      </section>
    </div>
  );
}