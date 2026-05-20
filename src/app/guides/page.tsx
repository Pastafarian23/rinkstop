import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Guides | RinkStop',
  description: 'In-depth hockey guides covering technique, training, equipment buying, and the sport for beginners and experienced players alike.',
};

const GUIDE_CARDS = [
  { title: 'How to Choose the Right Stick', cat: 'Equipment', desc: 'Blade curve, flex, kickpoint, and length  --  what actually matters when buying your next stick.', icon: '🏒', href: '/guides/hockey-stick-guide' },
  { title: 'Off-Ice Training for Hockey Players', cat: 'Training', desc: 'The best dryland exercises to build explosive power, edge strength, and durability.', icon: '💪', href: '/guides/off-ice-hockey-training' },
  { title: 'Understanding Hockey Positions', cat: 'Beginners', desc: 'Centers, wings, defense, and goalies  --  what each position does and how they work together.', icon: '🛡️', href: '/guides/hockey-positions' },
  { title: 'Skate Fitting Guide', cat: 'Equipment', desc: 'How hockey skates should fit, common sizing mistakes, and what to look for at a fitting.', icon: '⛸️', href: '/guides/skate-fitting-guide' },
  { title: "Hockey Parent's Handbook", cat: 'Beginners', desc: "What to expect at your kid's first season  --  from equipment to game day etiquette.", icon: '👨‍👩‍👧', href: '/guides/hockey-parents-handbook' },
  { title: 'Eating for Performance', cat: 'Training', desc: 'Nutrition strategies for hockey players: pre-game meals, hydration, and recovery eating.', icon: '🥗', href: '/guides/hockey-nutrition' },
  { title: 'Breaking In New Gloves', cat: 'Equipment', desc: 'The best method to soften up new hockey gloves without damaging them.', icon: '🧤', href: '/guides/breaking-in-hockey-gloves' },
  { title: 'From Youth to Junior Hockey', cat: 'Pathway', desc: 'What it takes to make the jump from youth travel hockey to junior leagues.', icon: '🚀', href: '/guides/youth-to-junior-hockey' },
  { title: 'Hockey Rules Explained', cat: 'Beginners', desc: 'Every NHL rule explained in plain language  --  from icing to penalty shots.', icon: '📋', href: '/guides/hockey-rules' },
  { title: 'Hockey Glossary', cat: 'Reference', desc: 'The complete hockey dictionary  --  icing, offsides, one-timers, Corsi, and every term explained.', icon: '📖', href: '/glossary' },
];

export default function GuidesPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Guides</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          HOCKEY GUIDES
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Technique, training, equipment, and everything in between.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {GUIDE_CARDS.map(g => (
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
    </main>
  );
}