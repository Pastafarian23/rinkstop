/**
 * src/app/passport/[passportId]/not-found.tsx
 *
 * Workstream 2 — PR3: 404 page for /passport/[passportId].
 *
 * Used when:
 *   - PASSPORT_PUBLIC_LOOKUP flag is off
 *   - The Passport ID is malformed
 *   - No Passport exists for the given ID
 *   - The Passport is in `deactivated` status (info-leak prevention)
 *
 * Mirrors the QR resolver's "no longer active" copy but at the public route
 * layer. Single design language across both surfaces.
 */

import Link from 'next/link';

export default function PassportNotFound() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        background:
          'linear-gradient(180deg, #f8fafc 0%, #eef2f7 60%, #e2e8f0 100%)',
        padding: '48px 24px',
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        color: '#0f172a',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '32px 24px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: 14,
            letterSpacing: '0.14em',
            color: '#64748b',
            margin: 0,
            textTransform: 'uppercase',
          }}
        >
          RinkStop
        </p>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            margin: '8px 0 12px',
            color: '#041E42',
          }}
        >
          Passport not found
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.55,
            margin: '0 0 24px',
            color: '#475569',
          }}
        >
          We couldn't find a Hockey Passport with that ID. It may have been
          deactivated, the QR code may be from an old print, or the link
          could be incorrect.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            background: '#041E42',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Back to RinkStop
        </Link>
      </div>
    </main>
  );
}