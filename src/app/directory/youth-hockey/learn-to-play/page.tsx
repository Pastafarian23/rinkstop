import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Learn to Play Hockey | RinkStop',
  description: 'Everything you need to know about getting started in hockey. Learn to play programs, first gear, what to expect at first practice, and how to find a program near you.',
};

export default function LearnToPlayPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory">Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Learn to Play</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          LEARN TO PLAY HOCKEY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          First time on ice. Everything you need to get started.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Youth Hockey', href: '/directory/youth-hockey' },
          { label: 'Youth Tournaments', href: '/directory/youth-hockey/tournaments' },
          { label: 'Adult Leagues', href: '/directory/youth-hockey/adult-leagues' },
          { label: 'Adult Tournaments', href: '/directory/youth-hockey/adult-tournaments' },
          { label: 'All Hockey', href: '/directory' },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.55)',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
          }}>
            {n.label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          {
            title: 'First Time on Ice',
            color: 'var(--gold)',
            icon: '⛸',
            desc: 'Most kids start between ages 4 and 8. Learn to Play programs require zero experience  --  coaches expect complete beginners.',
          },
          {
            title: 'Gear for Beginners',
            color: '#4A90D9',
            icon: '🏒',
            desc: 'Essential gear: skates, helmet, shoulder pads, elbow pads, shin guards, gloves, stick, and mouthguard. Many programs rent gear.',
          },
          {
            title: 'Finding a Program',
            color: 'var(--red)',
            icon: '📍',
            desc: 'Search your local rink&apos;s website or call them directly. Most rinks run their own Learn to Play sessions year-round.',
          },
          {
            title: 'What to Expect',
            color: 'var(--teal)',
            icon: '👨‍👩‍👧',
            desc: 'First practices are about having fun and getting comfortable on ice. Falling is normal. Pucks are everywhere. Smiles are guaranteed.',
          },
        ].map(item => (
          <div key={item.title} style={{
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.5rem',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{item.icon}</div>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: item.color, letterSpacing: '0.04em', marginBottom: '0.75rem' }}>{item.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: 1.7 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem 2rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT HAPPENS AT FIRST PRACTICE</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { step: '1', text: 'Get fitted for rental skates  --  half size up from street shoes' },
            { step: '2', text: 'Step on ice with full gear  --  coaches help with balance' },
            { step: '3', text: 'Learn to fall safely  --  hockey falls are different from normal falls' },
            { step: '4', text: 'Push with both legs  --  building stride strength' },
            { step: '5', text: 'Glide on one foot  --  the foundation of everything' },
            { step: '6', text: 'Introduction to the stick  --  pushing the puck forward' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--red)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8125rem', color: '#fff' }}>{s.step}</div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: 1.6 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
