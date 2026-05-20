import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Gear & Brands | RinkStop',
  description: 'Hockey equipment reviews, brand comparisons, and buying guides for skates, sticks, pads, and more.',
};

export default function GearBrandsPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Gear & Brands</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          GEAR & BRANDS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Equipment reviews, brand comparisons, and what to buy  --  from skates to sticks.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { brand: 'Bauer', category: 'Skates & Equipment', lineup: 'Nexus • Vapor • Supreme', note: 'The largest hockey equipment brand in the world. Three distinct last shapes across product lines.', color: '#1E4D8C' },
          { brand: 'CCM', category: 'Skates & Equipment', lineup: 'JetSpeed • Ribcor • Tacks', note: 'Second-largest hockey brand. Known for the Super Tacks line and strong skate heat-molding tech.', color: '#C8102E' },
          { brand: 'Easton', category: 'Sticks & Equipment', lineup: 'M5 • M3 • Rival', note: 'Syn碳 fiber stick technology pioneer. Now focused on value-oriented sticks and protective gear.', color: '#FFB81C' },
          { brand: 'Warrior', category: 'Sticks & Equipment', lineup: 'Dolomit • Alpha • Ritual', note: 'Grew fast in the stick market with theCoil/Weave technology. Strong protective gear lineup too.', color: '#FF6600' },
          { brand: 'True', category: 'Sticks & Skates', lineup: 'A6.0 S1 • A6.0 S2', note: 'Direct-to-consumer brand that bypassed traditional retailers. Known for adjustability and feel.', color: '#00A3A3' },
          { brand: 'Bauer Re-Akt', category: 'Protective', lineup: 'Re-Akt 200 • Re-Akt 150', note: 'Security shell technology in helmets and shoulder pads. Popular at junior and college levels.', color: '#1E4D8C' },
          { brand: 'CCM Hyperlite', category: 'Skates', lineup: 'HyperLite 2', note: 'CCM\'s lightest skate ever. Asymmetrical toe cap and step-out last designed for maximum mobility.', color: '#C8102E' },
          { brand: 'Bauer Mach', category: 'Skates', lineup: 'Mach', note: 'Next generation of Bauer Vapor with a new suspended Tendon guard and upgraded liner.', color: '#1E4D8C' },
        ].map(g => (
          <div key={g.brand} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>{g.brand}</h3>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: g.color }}>{g.category}</span>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.25rem', marginBottom: '0.5rem' }}>{g.lineup}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', lineHeight: 1.65 }}>{g.note}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
        {[
          { title: 'Skate Buying Guide', note: 'Width, fit, blade quality  --  what actually matters when buying hockey skates.' },
          { title: 'Stick Flex Chart', note: 'Find the right flex based on weight and height. Too stiff or too whippy both hurt performance.' },
          { title: 'Helmet Ratings Explained', note: 'CCE vs. HECC certifications, what the ratings mean, and how to spot an outdated helmet.' },
          { title: 'Goalie Gear Differences', note: 'Leg pads, blockers, gloves, chest protectors  --  how goalie equipment differs from player gear.' },
        ].map(guide => (
          <div key={guide.title} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '0.4rem' }}>{guide.title}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{guide.note}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
