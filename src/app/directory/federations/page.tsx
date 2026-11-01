import type { Metadata } from 'next';
import Link from 'next/link';
import { FEDERATIONS } from '@/lib/federations';
import { countryToSlug } from '@/lib/country-page';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Federations Worldwide',
  description: 'Browse national ice hockey federations — IIHF member and associate associations with governing body, safeguarding contacts, and required registration documents.',
};

// ISR-cached for 1 hour. The federation list is static (84 entries in
// src/lib/federations.ts) and only changes when Arnel edits that file.
export const revalidate = 3600;

export default function FederationsPage() {
  const sorted = [...FEDERATIONS].sort((a, b) =>
    a.countryName.localeCompare(b.countryName),
  );

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '0 16px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 0 32px' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/directory" style={{ color: 'rgba(255,255,255,0.4)' }}>Directory</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Federations</span>
        </nav>

        <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', letterSpacing: '0.04em', marginBottom: 8, color: '#fff' }}>
          HOCKEY FEDERATIONS WORLDWIDE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', maxWidth: 640, margin: '0 auto' }}>
          National ice hockey associations — IIHF member and associate federations with governing body, safeguarding contacts, and player registration requirements.{' '}
          {sorted.length} federations indexed.
        </p>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {sorted.map((f) => {
            const slug = countryToSlug(f.countryName);
            return (
              <Link
                key={f.countryCode}
                href={`/federations/${slug}`}
                style={{
                  background: '#0f0f0f',
                  border: '1px solid #1e1e1e',
                  borderRadius: 8,
                  padding: '16px 18px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  minHeight: 120,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', letterSpacing: '0.02em' }}>
                  {f.countryName}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, flex: 1 }}>
                  {f.federationName}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#C8102E', fontWeight: 600, flexShrink: 0 }}>
                  VIEW PROFILE →
                </div>
              </Link>
            );
          })}
        </div>

        <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '28px 32px', textAlign: 'center', marginTop: 48 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: 16 }}>
            Is your federation missing or out of date? Contact us to update the listing.
          </p>
          <Link
            href="/contact"
            style={{
              display: 'inline-block',
              background: '#C8102E',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Contact Us
          </Link>
        </div>
      </div>
    </main>
  );
}