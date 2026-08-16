import type { Metadata } from 'next';
import Link from 'next/link';
import { getDirectoryCounts } from '@/lib/directory-counts';

export const metadata: Metadata = {
  title: 'About RinkStop | The World\'s Hockey Directory',
  description: 'RinkStop is a global hockey directory connecting players, coaches, fans, and teams worldwide. Learn about our mission to organize and grow hockey at every level.',
};

export const revalidate = 300;

export default async function AboutPage() {
  const counts = await getDirectoryCounts();
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>About</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>
        ABOUT RINKSTOP
      </h1>

      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.125rem', lineHeight: 1.7, marginBottom: '2.5rem', borderLeft: '4px solid #C8102E', paddingLeft: '1.25rem' }}>
        RinkStop is a global hockey directory built to connect the hockey world  --  from NHL teams to youth programs in non-traditional markets, from professional leagues to local rinks, from established players to first-time lace-ups.
      </p>

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '3rem' }}>
        Last updated: August 16, 2026
      </p>

      {/* Mission */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>OUR MISSION</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem', marginBottom: '1rem' }}>
          We believe hockey is more than a sport  --  it's a global community. Our mission is to make that community accessible to everyone, anywhere. Whether you're a parent looking for a youth program, a scout searching for talent in Southeast Asia, or a player exploring opportunities abroad, RinkStop is built to help you find what you need.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem' }}>
          Hockey is growing faster than ever in non-traditional markets. China, the Philippines, Thailand, South Africa  --  the sport is reaching new places and new people. RinkStop exists to document that growth and serve the communities driving it.
        </p>
      </div>

      {/* Who we are */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHO WE ARE</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem', marginBottom: '1rem' }}>
          RinkStop was founded by Arnel Larracas  --  a hockey enthusiast with over 20 years of experience in the sport, from playing in Chicago to coaching in the Philippines. Coming from a politics background and having lived and traveled across Africa, Asia, and the Philippines, Arnel saw firsthand how disconnected the global hockey community was.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem', marginBottom: '1rem' }}>
          That experience drove the creation of RinkStop: one place where anyone, anywhere, can find and share information about hockey at every level.
        </p>
      </div>

      {/* What we cover */}
      <div style={{ marginBottom: '3rem', background: 'var(--s2)', padding: '1.75rem 2rem', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>WHAT WE COVER</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Teams', desc: 'NHL, AHL, KHL, PWHL, NCAA, junior leagues, and more' },
            { label: 'Players', desc: 'Player profiles, stats, and career paths across all levels' },
            { label: 'Leagues', desc: 'Professional, amateur, international, and youth leagues' },
            { label: 'Rinks', desc: 'Ice rinks and arenas from major cities to non-traditional markets' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#C8102E', marginBottom: '0.25rem' }}>{item.label}</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>EDITORIAL CONTENT</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem', marginBottom: '1rem' }}>
          Beyond the directory, RinkStop publishes original editorial content covering the business, development, and culture of hockey. From NHL draft analysis to the growth of hockey in non-traditional markets, our articles are written for fans who want to understand the sport at a deeper level.
        </p>
      </div>

      {/* Editorial Standards */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>EDITORIAL STANDARDS</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem', marginBottom: '1rem' }}>
          RinkStop editorial content is written and reviewed by hockey fans, coaches, and analysts. We follow these standards:
        </p>
        <ul style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem', marginLeft: '1.5rem', marginBottom: '1rem' }}>
          <li><strong>Original reporting:</strong> Every article is written by a team member or contracted writer. We do not rewrite or republish content from other outlets without permission and attribution.</li>
          <li><strong>Source-linked claims:</strong> Statistical claims, quotes, and predictions cite the source (league box scores, official press releases, on-record interviews). Where a source is not directly attributable, we say so.</li>
          <li><strong>Corrections are visible:</strong> If we publish an error, we correct it promptly and note the correction at the bottom of the article. We do not silently edit published stories.</li>
          <li><strong>No paid placement in editorial:</strong> Editorial articles are never written in exchange for payment, products, or any other consideration. Advertising is labeled and kept separate from editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> for the full standard.</li>
          <li><strong>Opinions are labeled:</strong> Analysis, opinion, and prediction pieces are clearly tagged in the article header so readers can distinguish fact from interpretation.</li>
        </ul>
      </div>

      {/* How to verify a listing */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW TO VERIFY A LISTING</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem', marginBottom: '1rem' }}>
          RinkStop contains over 9,500 listings (rinks, teams, players, leagues). Most are aggregated from publicly available sources; some are submitted by users. Here&apos;s how to tell the difference:
        </p>
        <ul style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem', marginLeft: '1.5rem', marginBottom: '1rem' }}>
          <li><strong>Verified badge:</strong> A checkmark icon next to a team, player, or rink indicates we have confirmed the listing directly with the organization or a trusted source.</li>
          <li><strong>Claimed by:</strong> When a listing shows a &ldquo;Claimed by&rdquo; section with a name and link, the person or organization has verified ownership through our claim-your-listing process.</li>
          <li><strong>Source attribution:</strong> At the bottom of every rink, team, and player page, we list the source(s) we used to create the listing — usually a league website, box score archive, or official directory.</li>
          <li><strong>Update cadence:</strong> Each listing page shows when it was last updated. Listings that have not been updated in 12+ months are flagged as &ldquo;may be outdated&rdquo; on the page.</li>
          <li><strong>Report a correction:</strong> Every listing page has a &ldquo;Suggest a correction&rdquo; link that emails our team. Submitted corrections are reviewed by an admin before any change is applied to the listing.</li>
        </ul>
      </div>

      {/* Company */}
      <div style={{ marginBottom: '3rem', background: 'var(--s2)', padding: '1.75rem 2rem', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>COMPANY INFORMATION</h2>
        <div style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem' }}>
          <p style={{ marginBottom: '0.75rem' }}><strong style={{ color: '#fff' }}>RinkStop</strong> is a global hockey directory operated by Arnel Larracas.</p>
          <p style={{ marginBottom: '0.75rem' }}><strong style={{ color: '#fff' }}>Founded:</strong> 2018</p>
          <p style={{ marginBottom: '0.75rem' }}><strong style={{ color: '#fff' }}>Headquarters:</strong> 709 S Riverside Dr, Villa Park, IL 60181, United States</p>
          <p style={{ marginBottom: '0.75rem' }}><strong style={{ color: '#fff' }}>Coverage:</strong> {counts.rinks.toLocaleString()}+ rinks, {counts.teams.toLocaleString()}+ teams, {counts.players.toLocaleString()}+ players, {counts.leagues.toLocaleString()}+ leagues across {counts.countries.toLocaleString()}+ countries</p>
          <p style={{ marginBottom: 0 }}><strong style={{ color: '#fff' }}>Languages:</strong> English (primary). Translated content is generated from verified public sources.</p>
        </div>
      </div>

      {/* Contact */}
      <div id="contact" style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', scrollMarginTop: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GET IN TOUCH</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem', marginBottom: '1rem' }}>
          Have a directory listing to submit, a correction to suggest, or want to partner with us? We&apos;d love to hear from you.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '0.5rem' }}>
          <strong style={{ color: '#fff' }}>General &amp; listing inquiries:</strong>{' '}
          <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E', fontWeight: 600 }}>support@rinkstop.com</a>
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '0.5rem' }}>
          <strong style={{ color: '#fff' }}>Phone:</strong>{' '}
          <a href="tel:+17083791460" style={{ color: '#C8102E', fontWeight: 600 }}>(708) 379-1460</a>
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '0.5rem' }}>
          <strong style={{ color: '#fff' }}>Privacy &amp; data requests:</strong>{' '}
          <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E', fontWeight: 600 }}>support@rinkstop.com</a>
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '0.5rem' }}>
          <strong style={{ color: '#fff' }}>Partnerships:</strong>{' '}
          <a href="/partner-with-us" style={{ color: '#C8102E', fontWeight: 600 }}>Partner with us</a>
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)' }}>
          <strong style={{ color: '#fff' }}>Mailing address:</strong> 709 S Riverside Dr, Villa Park, IL 60181, United States
        </p>
      </div>
    </main>
  );
}