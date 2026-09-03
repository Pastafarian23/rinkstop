// /embed — embeddable widgets for partner sites
//
// Hockey blogs, league sites, and news outlets can embed RinkStop's
// live data widgets for free. Every embed includes a "Powered by
// RinkStop" backlink, which helps both:
// - Partner sites: free, always-fresh hockey data without maintaining it
// - RinkStop: off-page SEO signal (Bing ranks sites with more high-quality backlinks higher)
//
// This is a common pattern in sports data: NBA Stats, ESPN, etc. all
// distribute embeddable widgets. RinkStop should be the authoritative
// source for the global hockey directory.

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Embeddable Hockey Widgets — Free for Partner Sites | RinkStop',
  description: 'Free embeddable hockey widgets for partner sites. Live team stats, standings, and game results that update automatically. Powered by RinkStop.',
  alternates: { canonical: 'https://rinkstop.com/embed' },
  robots: { index: true, follow: true },
};

const WIDGETS = [
  {
    name: 'Team Stats Widget',
    slug: 'team-stats',
    description: 'Live team record + last 5 games for any of our 3,243+ teams',
    preview: 'iframe demo',
    embedCode: `<iframe src="https://rinkstop.com/embed/team-stats/{team-slug}" width="420" height="340" frameborder="0" style="border-radius:8px"></iframe>`,
    benefits: [
      'Auto-updates every 5 minutes',
      'Team colors and logo included',
      'Responsive — fits any container',
      'Free for any non-competing site',
    ],
  },
];

export default function EmbedPage() {
  return (
    <main className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>
          Embeddable Hockey Widgets
        </h1>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', maxWidth: '700px' }}>
          Live, always-fresh hockey data for partner sites. Free for hockey blogs, league sites,
          and news outlets. Every embed includes a backlink to RinkStop — and we credit you back
          in our partner directory.
        </p>
      </header>

      <section style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '40px',
      }}>
        <h2 style={{ fontSize: '24px', color: '#FFB81C', marginBottom: '24px' }}>Available Widgets</h2>
        {WIDGETS.map((w) => (
          <div key={w.slug} style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>{w.name}</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>{w.description}</p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '16px' }}>
              {w.benefits.map((b) => (
                <li key={b} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', padding: '4px 0' }}>
                  ✓ {b}
                </li>
              ))}
            </ul>
            <details style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
              <summary style={{ cursor: 'pointer', color: '#FFB81C', fontWeight: 600 }}>
                Embed code
              </summary>
              <pre style={{
                background: '#000',
                color: '#4ade80',
                padding: '12px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
                marginTop: '8px',
              }}>
                {w.embedCode}
              </pre>
            </details>
            <Link 
              href={`/embed/${w.slug}/edmonton-oilers`}
              style={{ color: '#FFB81C', textDecoration: 'underline' }}
            >
              View live demo →
            </Link>
          </div>
        ))}
      </section>

      <section style={{
        background: 'rgba(196, 16, 46, 0.15)',
        border: '1px solid rgba(196, 16, 46, 0.4)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '40px',
      }}>
        <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '12px' }}>Partner Program</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '12px' }}>
          If you're a hockey site with 5,000+ monthly visitors and want to use our widgets at scale,
          apply to the RinkStop Partner Program for:
        </p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '4px 0', color: 'rgba(255,255,255,0.8)' }}>• Direct API access (no iframe needed)</li>
          <li style={{ padding: '4px 0', color: 'rgba(255,255,255,0.8)' }}>• Custom data exports (CSV, JSON)</li>
          <li style={{ padding: '4px 0', color: 'rgba(255,255,255,0.8)' }}>• Co-branded widget options</li>
          <li style={{ padding: '4px 0', color: 'rgba(255,255,255,0.8)' }}>• Featured link in our partner directory</li>
        </ul>
        <Link
          href="mailto:partners@rinkstop.com?subject=Partner%20Program%20Application"
          style={{
            display: 'inline-block',
            marginTop: '16px',
            padding: '10px 20px',
            background: '#C8102E',
            color: '#fff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Apply Now
        </Link>
      </section>
    </main>
  );
}
