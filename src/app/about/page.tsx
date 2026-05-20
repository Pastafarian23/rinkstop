import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About RinkStop | The World\'s Hockey Directory',
  description: 'RinkStop is a global hockey directory connecting players, coaches, fans, and teams worldwide. Learn about our mission to organize and grow hockey at every level.',
};

export default function AboutPage() {
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

      {/* Contact */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GET IN TOUCH</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1rem', marginBottom: '1rem' }}>
          Have a directory listing to submit, a correction to suggest, or want to partner with us? We'd love to hear from you.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '0.5rem' }}>Email: <a href="mailto:info@rinkstop.com" style={{ color: '#C8102E', fontWeight: 600 }}>info@rinkstop.com</a></p>
        <p style={{ color: 'rgba(255,255,255,0.55)' }}>Website: <a href="https://rinkstop.com" style={{ color: '#C8102E', fontWeight: 600 }}>https://rinkstop.com</a></p>
      </div>
    </main>
  );
}