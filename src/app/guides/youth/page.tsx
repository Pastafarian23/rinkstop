import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Youth Hockey Guides | RinkStop',
  description: 'Guides for parents and young hockey players — equipment, age groups, development models, costs, and what to expect at every level from Learn to Play through Midget.',
};

const YOUTH_GUIDE_CARDS = [
  { title: "Hockey Parent's Handbook", cat: 'Parents', desc: "What to expect at your kid's first season — from buying equipment to game day etiquette.", icon: '👨‍👩‍👧', href: '/guides/hockey-parents-handbook' },
  { title: 'House vs Travel Hockey', cat: 'Parents', desc: 'How to choose the right level for your kid — recreational house, select, or travel/AAA.', icon: '🏠', href: '/guides/youth/house-vs-travel-hockey' },
  { title: "USA Hockey's ADM Explained", cat: 'Parents', desc: 'The American Development Model — what it is, what the stages mean, and why early specialization hurts.', icon: '📈', href: '/guides/youth/usa-hockey-adm-explained' },
  { title: 'How to Tie Hockey Skates', cat: 'Parents', desc: 'Step-by-step lacing for beginners — the standard crisscross plus how to fix lace bite.', icon: '⛸️', href: '/guides/youth/how-to-tie-hockey-skates' },
  { title: 'From Youth to Junior Hockey', cat: 'Pathway', desc: 'What it takes to make the jump from youth travel hockey to junior leagues.', icon: '🚀', href: '/guides/youth-to-junior-hockey' },
  { title: 'Skate Fitting Guide', cat: 'Equipment', desc: 'How hockey skates should fit, common sizing mistakes, and what to look for at a fitting.', icon: '⛸️', href: '/guides/skate-fitting-guide' },
  { title: 'How to Choose the Right Stick', cat: 'Equipment', desc: 'Blade curve, flex, kickpoint, and length — what actually matters when buying your next stick.', icon: '🏒', href: '/guides/hockey-stick-guide' },
  { title: 'Breaking In New Gloves', cat: 'Equipment', desc: 'The best method to soften up new hockey gloves without damaging them.', icon: '🧤', href: '/guides/breaking-in-hockey-gloves' },
  { title: 'Off-Ice Training for Young Players', cat: 'Training', desc: 'Dryland exercises appropriate for youth players — building athleticism without burnout.', icon: '💪', href: '/guides/off-ice-hockey-training' },
  { title: 'Eating for Performance', cat: 'Training', desc: 'Nutrition strategies for youth hockey players: pre-game meals, hydration, and recovery eating.', icon: '🥗', href: '/guides/hockey-nutrition' },
];

export default function YouthGuidesPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Youth</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          YOUTH HOCKEY GUIDES
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: '720px' }}>
          For parents and young players. Covers equipment, age classifications, house vs travel decisions, the American Development Model, and what to expect at every level from Learn to Play through Midget.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {YOUTH_GUIDE_CARDS.map(g => (
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

      <div style={{ background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px', padding: '1.5rem' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Looking for adult guides?</p>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          If you're an adult getting into hockey — learn-to-play programs, beer league, rules, and positions — head to the adult section.
        </p>
        <Link href="/guides/adult" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
          View adult guides →
        </Link>
      </div>
    </main>
  );
}
