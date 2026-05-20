import type { Metadata } from 'next';
import { metadata as siteMetadata } from './metadata';
export { siteMetadata as metadata };
import Link from 'next/link';

export default function SenegalPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/countries" style={{ color: '#555' }}>Countries</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Senegal</span>
      </nav>

      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🇸🇳</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#fff', letterSpacing: '0.02em', marginBottom: '1rem' }}>
          HOCKEY IN SENEGAL
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
          Ice hockey is not currently established in Senegal. The sport remains developing in West Africa.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          If you know of any ice hockey activity in Senegal — youth programs, expat leagues, indoor rinks, or anything related — we'd love to feature it on RinkStop. The sport has to start somewhere.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
          <Link href="/directory/countries" style={{
            display: 'inline-block',
            background: 'var(--s2)',
            color: 'rgba(255,255,255,0.7)',
            padding: '0.6rem 1.5rem',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none',
            border: '1px solid var(--border)',
          }}>
            ← Browse All Countries
          </Link>
          <Link href="/add-listing" style={{
            display: 'inline-block',
            background: '#C8102E',
            color: '#fff',
            padding: '0.6rem 1.5rem',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}>
            Submit a Hockey Tip →
          </Link>
        </div>

        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2rem', maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
            WANT TO HELP GROW HOCKEY IN SENEGAL?
          </h2>
          <ul style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 2, paddingLeft: '1.2rem', listStyle: 'disc' }}>
            <li>Know an indoor rink we haven't listed? Tell us.</li>
            <li>Running a youth or expat program? We'll add it free.</li>
            <li>Want to bring hockey equipment to Senegal? We'd love to connect you with organizations doing that work.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
