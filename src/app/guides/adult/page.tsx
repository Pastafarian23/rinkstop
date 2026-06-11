import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Adult Hockey Guides | RinkStop',
  description: 'For adult hockey newcomers — rules, positions, learn-to-play programs, beer league, and what to expect on the ice.',
};

const ADULT_GUIDE_CARDS = [
  { title: 'Hockey Rules for Beginners', cat: 'Beginners', desc: 'Every NHL rule explained in plain language — from icing to penalty shots.', icon: '📋', href: '/guides/hockey-rules' },
  { title: 'Understanding Hockey Positions', cat: 'Beginners', desc: 'Centers, wings, defense, and goalies — what each position does and how they work together.', icon: '🛡️', href: '/guides/hockey-positions' },
  { title: 'How to Fit Hockey Equipment', cat: 'Equipment', desc: 'How to fit every piece as an adult — helmet, shoulder pads, pants vs. girdle, gloves, jock/jill, with a women-specific section.', icon: '🛡️', href: '/guides/adult/how-to-fit-hockey-equipment' },
];

export default function AdultGuidesPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Adult</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          ADULT HOCKEY GUIDES
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: '720px' }}>
          For adults getting into hockey — whether you're joining a learn-to-play program, signing up for your first beer league, or just trying to understand what your kid is doing out there.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {ADULT_GUIDE_CARDS.map(g => (
          <Link key={g.title} href={g.href} style={{
            display: 'block',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.25rem',
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{g.icon}</div>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)' }}>{g.cat}</span>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.0625rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.3rem', marginBottom: '0.5rem' }}>{g.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.65 }}>{g.desc}</p>
          </Link>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.5rem' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>More coming soon</p>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          We're actively expanding the adult section. Future guides will cover: how to start playing hockey as an adult, learn-to-play programs near you, beer league 101, what to expect at your first practice, equipment for adult newcomers, and more.
        </p>
      </div>
    </main>
  );
}
