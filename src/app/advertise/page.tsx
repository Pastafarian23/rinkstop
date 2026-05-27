import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Advertise with RinkStop | Hockey Directory Advertising',
  description: 'Advertise your hockey brand, product, or service to a global audience. RinkStop reaches hockey enthusiasts across NHL, international leagues, youth, and non-traditional markets.',
};

export default function AdvertisePage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Advertise</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>
        ADVERTISE WITH RINKSTOP
      </h1>

      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.125rem', lineHeight: 1.7, marginBottom: '2.5rem', borderLeft: '4px solid #C8102E', paddingLeft: '1.25rem' }}>
        Reach a global hockey audience  --  from NHL fans to youth players, coaches, scouts, and the growing hockey community in non-traditional markets.
      </p>

      {/* Why advertise */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>WHY ADVERTISE ON RINKSTOP</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {[
            { stat: 'Global Reach', desc: 'Audiences across North America, Europe, Asia, and non-traditional hockey markets.' },
            { stat: 'Deep Engagement', desc: 'Visitors spend meaningful time browsing directory listings, reading articles, and exploring team and player profiles.' },
            { stat: 'Targeted Audience', desc: 'Hockey fans, players, coaches, scouts, and hockey-related businesses  --  a highly qualified audience.' },
            { stat: 'Contextually Relevant', desc: 'Your brand appears alongside hockey content, ensuring relevant placement for hockey enthusiasts.' },
          ].map(item => (
            <div key={item.stat} style={{ background: 'var(--s2)', padding: '1.25rem 1.5rem', borderRadius: '8px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>{item.stat}</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ad formats */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>ADVERTISING OPTIONS</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            {
              format: 'Display Advertising (Google AdSense)',
              desc: 'Contextual display ads served through Google AdSense. Ads appear throughout the site  --  on directory pages, article pages, and the homepage. Pay-per-click or pay-per-impression depending on campaign type.',
            },
            {
              format: 'Sponsored Content',
              desc: 'Have your brand featured in our editorial content. Sponsored articles, directory spotlights, and newsletter features available. Contact us for custom content packages.',
            },
            {
              format: 'Directory Listings & Promotions',
              desc: 'Premium placement for teams, leagues, rinks, and brands in our directory. Get featured positioning and enhanced listing visibility for key pages.',
            },
            {
              format: 'Newsletter Sponsorship',
              desc: 'Reach our email subscribers directly. Newsletter sponsorships include brand mentions and featured placements sent to our subscriber list.',
            },
          ].map(item => (
            <div key={item.format} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem 1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.5rem' }}>{item.format}</div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Audience */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>OUR AUDIENCE</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem', marginBottom: '1rem' }}>
          RinkStop attracts a diverse global audience united by their passion for hockey:
        </p>
        <ul style={{ marginLeft: '1.5rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>
          <li>Fans following NHL, international, and junior hockey</li>
          <li>Players at recreational, amateur, and professional levels</li>
          <li>Coaches and scouts searching for talent and programs</li>
          <li>Parents and families researching youth hockey programs</li>
          <li>Hockey businesses and brands targeting the hockey market</li>
        </ul>
      </div>

      {/* Contact */}
      <div style={{ background: 'var(--s2)', padding: '2rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GET STARTED</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Ready to reach the global hockey community? Send us a message with details about your brand, budget, and goals, and we'll put together a custom advertising proposal.
        </p>
        <a
          href="mailto:info@rinkstop.com?subject=Advertising Inquiry"
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
          Send Us a Message
        </a>
      </div>
    </main>
  );
}