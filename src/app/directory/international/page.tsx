import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'International Hockey',
  description: 'Explore international hockey competitions including the IIHF, World Championships, and Olympics. Complete coverage of national team competitions worldwide.',
};

export default function InternationalPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>International</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          INTERNATIONAL HOCKEY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          National team competitions from around the world.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {[
          {
            label: 'IIHF',
            abbr: 'International Ice Hockey Federation',
            desc: 'Governing body for international hockey. World Championships, U20, U18, and women\'s tournaments.',
            href: '/directory/international/iihf',
            color: '#1E5B9C',
            stat: '60+ member nations',
          },
          {
            label: 'World Championships',
            abbr: 'IIHF Men\'s World Championship',
            desc: 'Annual top-tier international competition. Top nations competing for world champion status.',
            href: '/directory/international/world-championships',
            color: '#C8102E',
            stat: '16 teams • Annual',
          },
          {
            label: 'Olympics',
            abbr: 'Olympic Ice Hockey',
            desc: 'The pinnacle of international competition. NHL players represent their nations on the world stage.',
            href: '/directory/international/olympics',
            color: '#1E7B1E',
            stat: 'Every 4 years',
          },
          {
            label: 'Countries',
            abbr: 'National Teams by Country',
            desc: 'Browse hockey programs by country. From traditional powers to emerging markets.',
            href: '/directory/countries',
            color: '#7B3FA0',
            stat: '60+ nations',
          },
          {
            label: "Women's Hockey",
            abbr: "IIHF Women's World Championship",
            desc: "Elite women's international competition. PWHL players competing for national titles.",
            href: '/directory/pwhl',
            color: '#C8102E',
            stat: 'Annual',
          },
          {
            label: 'U20 & U18',
            abbr: 'World Junior Championships',
            desc: "The world's best young talent. NHL draft prospects competing for their nations.",
            href: '/directory/international/iihf',
            color: '#041E42',
            stat: 'Annual • December',
          },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.5rem',
              transition: 'border-color 0.2s',
            }}>
              <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: item.color }}>{item.label}</span>
              <h3 className="font-sport" style={{ fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem' }}>{item.abbr}</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', marginTop: '0.5rem', lineHeight: 1.6 }}>{item.desc}</p>
              <span style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{item.stat}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}