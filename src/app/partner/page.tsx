import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Partner With RinkStop',
  description: 'Partner with RinkStop  --  the world\'s hockey directory. Reach a global hockey audience through directory listings, content partnerships, and advertising.',
};

export default function PartnerPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Partner</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '1rem' }}>
        PARTNER WITH RINKSTOP
      </h1>

      <p style={{ color: '#444', fontSize: '1.125rem', lineHeight: 1.7, marginBottom: '2.5rem', borderLeft: '4px solid #C8102E', paddingLeft: '1.25rem' }}>
        RinkStop is the global hockey directory  --  connecting teams, players, leagues, rinks, and fans worldwide. Partner with us to reach an engaged, growing hockey audience.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
        {[
          {
            title: 'Directory Listings',
            desc: 'Get your team, league, rink, or brand featured in the world\'s most comprehensive hockey directory. Increase visibility and reach new audiences.',
            icon: '🏒',
          },
          {
            title: 'Content Partnerships',
            desc: 'Work with our editorial team to create original content featuring your organization. Articles, interviews, and spotlight pieces available.',
            icon: '📝',
          },
          {
            title: 'Data & API Access',
            desc: 'Need hockey data for your project? We offer data licensing and API access for qualified partners building hockey-related tools and platforms.',
            icon: '📊',
          },
          {
            title: 'Sponsorship',
            desc: 'Sponsor specific sections, events, or content series on RinkStop. Tailored packages for brands looking to reach the hockey community.',
            icon: '🤝',
          },
        ].map(item => (
          <div key={item.title} style={{ background: '#f5f5f5', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{item.icon}</div>
            <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.25rem', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>{item.title}</h3>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.6 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ background: '#041E42', padding: '2rem 2.5rem', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>LET&apos;S TALK</h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          We work with hockey organizations, brands, media companies, and technology platforms. Tell us about your goals and we&apos;ll put together a custom partnership proposal.
        </p>
        <a
          href="mailto:support@rinkstop.com?subject=Partnership Inquiry"
          style={{
            display: 'inline-block',
            background: '#C8102E',
            color: '#fff',
            padding: '0.75rem 1.75rem',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '0.9375rem',
            textDecoration: 'none',
          }}
        >
          Get in Touch →
        </a>
      </div>
    </main>
  );
}