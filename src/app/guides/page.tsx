import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Guides',
  description: 'In-depth hockey guides covering technique, training, equipment buying, and the sport for beginners and experienced players alike. Separate tracks for youth and adult players.',
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://rinkstop.com/guides' },
};

const YOUTH_PREVIEW = [
  { title: "Hockey Parent's Handbook", desc: "What to expect at your kid's first season — from equipment to game day etiquette.", href: '/guides/hockey-parents-handbook' },
  { title: 'House vs Travel Hockey', desc: 'How to choose the right level — recreational house, select, or travel/AAA.', href: '/guides/youth/house-vs-travel-hockey' },
  { title: "USA Hockey's ADM Explained", desc: 'The American Development Model — what it is and why early specialization hurts.', href: '/guides/youth/usa-hockey-adm-explained' },
];

const ADULT_PREVIEW = [
  { title: 'Hockey Rules for Beginners', desc: 'Every NHL rule in plain language — from icing to penalty shots.', href: '/guides/hockey-rules' },
  { title: 'Understanding Hockey Positions', desc: 'Centers, wings, defense, and goalies — what each position does.', href: '/guides/hockey-positions' },
];

export default function GuidesPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Guides</span>
      </nav>

      <div style={{ marginBottom: '2rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          HOCKEY GUIDES
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Technique, training, equipment, and everything in between. Choose the track that fits.
        </p>
      </div>

      {/* Youth Section */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8102E' }}>FOR PARENTS & YOUNG PLAYERS</span>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem' }}>YOUTH HOCKEY</h2>
          </div>
          <Link href="/guides/youth" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            See all youth guides →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {YOUTH_PREVIEW.map(g => (
            <Link key={g.title} href={g.href} style={{
              display: 'block',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.25rem',
              textDecoration: 'none',
              transition: 'border-color 0.2s',
            }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.0625rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{g.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.65 }}>{g.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Adult Section */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>FOR ADULT NEWCOMERS</span>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem' }}>ADULT HOCKEY</h2>
          </div>
          <Link href="/guides/adult" style={{ color: 'var(--gold)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            See all adult guides →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {ADULT_PREVIEW.map(g => (
            <Link key={g.title} href={g.href} style={{
              display: 'block',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.25rem',
              textDecoration: 'none',
              transition: 'border-color 0.2s',
            }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.0625rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{g.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.65 }}>{g.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Events & Competitions — tournament and championship reference */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888' }}>REFERENCE</span>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem' }}>EVENTS & COMPETITIONS</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', marginTop: '0.4rem' }}>Tournament formats, histories, and how the major championships work.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          <Link href="/guides/stanley-cup" style={{
            display: 'block',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.25rem',
            textDecoration: 'none',
          }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.0625rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>Stanley Cup Guide</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.65 }}>130 years of history, the playoff format, the trophy itself, Conn Smythe, and how a new champion is crowned each June.</p>
          </Link>
          <Link href="/guides/iihf-world-championship" style={{
            display: 'block',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.25rem',
            textDecoration: 'none',
          }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.0625rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>IIHF World Championship Guide</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.65 }}>Format, group stages, knockout rounds, and how national teams qualify for the world&apos;s largest annual hockey tournament.</p>
          </Link>
        </div>
      </section>

      {/* Equipment & Training Reference (no audience split) */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888' }}>REFERENCE</span>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem' }}>EQUIPMENT & TRAINING</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {[
            { title: 'Skate Fitting Guide', href: '/guides/skate-fitting-guide' },
            { title: 'How to Choose the Right Stick', href: '/guides/hockey-stick-guide' },
            { title: 'Breaking In New Gloves', href: '/guides/breaking-in-hockey-gloves' },
            { title: 'Off-Ice Training', href: '/guides/off-ice-hockey-training' },
            { title: 'Eating for Performance', href: '/guides/hockey-nutrition' },
            { title: 'Hockey Glossary', href: '/glossary' },
          ].map(g => (
            <Link key={g.title} href={g.href} style={{
              display: 'block',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              textDecoration: 'none',
            }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9375rem', color: '#fff', letterSpacing: '0.04em' }}>{g.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Fit each piece — drill-down links to every piece-of-gear guide (both audiences) */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8102E' }}>FIT EACH PIECE</span>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem' }}>GEAR FITTING GUIDES</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', marginTop: '0.4rem' }}>How to fit every piece of hockey equipment, with separate guides for parents and adult players.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {[
            { piece: 'Helmet', youth: '/guides/youth/helmet-fitting-guide', adult: '/guides/adult/helmet-fitting-guide' },
            { piece: 'Shoulder Pads', youth: '/guides/youth/shoulder-pad-fitting-guide', adult: '/guides/adult/shoulder-pad-fitting-guide' },
            { piece: 'Elbow Pads', youth: '/guides/youth/elbow-pad-fitting-guide', adult: '/guides/adult/elbow-pad-fitting-guide' },
            { piece: 'Hockey Pants / Girdle', youth: '/guides/youth/hockey-pants-fitting-guide', adult: '/guides/adult/hockey-pants-fitting-guide' },
            { piece: 'Shin Guards', youth: '/guides/youth/shin-guard-fitting-guide', adult: '/guides/adult/shin-guard-fitting-guide' },
            { piece: 'Hockey Gloves', youth: '/guides/youth/hockey-glove-fitting-guide', adult: '/guides/adult/hockey-glove-fitting-guide' },
            { piece: 'Jock / Jill', youth: '/guides/youth/jock-jill-fitting-guide', adult: '/guides/adult/jock-jill-fitting-guide' },
          ].map(g => (
            <div key={g.piece} style={{
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
            }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.0625rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{g.piece}</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href={g.youth} style={{ color: '#C8102E', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
                  Youth / Parent →
                </Link>
                <Link href={g.adult} style={{ color: 'var(--gold)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
                  Adult / Player →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
