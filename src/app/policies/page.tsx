import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RinkStop Policies — Editorial, Youth, Privacy & Data',
  description:
    'Index of every RinkStop policy page: editorial standards, data methodology, corrections, youth content, privacy, terms, cookies, and advertising disclosures.',
  alternates: { canonical: 'https://rinkstop.com/policies' },
  robots: { index: true, follow: true },
};

const POLICY_GROUPS: Array<{ heading: string; items: Array<{ href: string; label: string; summary: string }> }> = [
  {
    heading: 'Editorial & data',
    items: [
      {
        href: '/editorial-policy',
        label: 'Editorial Policy',
        summary: 'How RinkStop writes, reviews, and publishes editorial content.',
      },
      {
        href: '/data-methodology',
        label: 'Data Methodology',
        summary: 'How directory data is sourced, verified, updated, and corrected.',
      },
      {
        href: '/corrections',
        label: 'Corrections',
        summary: 'How to report an error or suggest a correction to a directory listing or article.',
      },
      {
        href: '/policies/youth-content',
        label: 'Youth Content Policy',
        summary: 'How RinkStop handles content involving minors — COPPA and TFAT frameworks.',
      },
    ],
  },
  {
    heading: 'Privacy & legal',
    items: [
      { href: '/privacy', label: 'Privacy Policy', summary: 'What data RinkStop collects and how it is used.' },
      { href: '/terms', label: 'Terms of Service', summary: 'The rules that govern use of RinkStop.' },
      { href: '/cookies', label: 'Cookie Policy', summary: 'How cookies and similar technologies are used, with opt-out instructions.' },
    ],
  },
  {
    heading: 'Business',
    items: [
      { href: '/advertise', label: 'Advertise', summary: 'How advertising appears on RinkStop (Google AdSense disclosure).' },
      { href: '/about', label: 'About RinkStop', summary: 'Operator information, contact, and editorial standards.' },
      { href: '/contact', label: 'Contact', summary: 'How to reach the RinkStop team.' },
    ],
  },
];

export default function PoliciesIndex() {
  // JSON-LD: a CollectionPage that lists every policy as an individual
  // WebPage. This gives AdSense reviewers (and Googlebot) a single
  // discoverable hub that satisfies the "trust pages are linked site-wide"
  // completeness signal.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'RinkStop Policies',
    url: 'https://rinkstop.com/policies',
    description:
      'Index of every RinkStop policy page — editorial standards, data methodology, corrections, youth content, privacy, terms, and advertising disclosures.',
    isPartOf: { '@type': 'WebSite', url: 'https://rinkstop.com', name: 'RinkStop' },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: POLICY_GROUPS.flatMap((g, gi) =>
        g.items.map((item, ii) => ({
          '@type': 'ListItem',
          position: gi * 10 + ii + 1,
          name: item.label,
          url: `https://rinkstop.com${item.href}`,
        }))
      ),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
          <Link href="/" style={{ color: '#555' }}>
            Home
          </Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#A0A0A0' }}>Policies</span>
        </nav>

        <h1
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            color: '#fff',
            letterSpacing: '0.04em',
            marginBottom: '1rem',
          }}
        >
          RINKSTOP POLICIES
        </h1>

        <p
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '1.0625rem',
            lineHeight: 1.7,
            marginBottom: '2.5rem',
            borderLeft: '4px solid #C8102E',
            paddingLeft: '1.25rem',
          }}
        >
          Every policy that governs how RinkStop operates — from how directory data is sourced and
          corrected, to how editorial articles are written, to how we handle content involving minors.
        </p>

        {POLICY_GROUPS.map((group) => (
          <section key={group.heading} style={{ marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.5rem',
                color: '#fff',
                letterSpacing: '0.04em',
                marginBottom: '1rem',
              }}
            >
              {group.heading}
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.875rem' }}>
              {group.items.map((item) => (
                <li
                  key={item.href}
                  style={{
                    background: 'var(--s2)',
                    borderRadius: '6px',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <Link
                    href={item.href}
                    style={{
                      color: '#FFB81C',
                      fontWeight: 700,
                      fontSize: '1.0625rem',
                      textDecoration: 'none',
                    }}
                  >
                    {item.label} →
                  </Link>
                  <p style={{ margin: '0.375rem 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', lineHeight: 1.55 }}>
                    {item.summary}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div style={{ marginTop: '2.5rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
          <strong style={{ color: '#fff' }}>Questions about any policy?</strong> Email{' '}
          <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E', fontWeight: 600 }}>
            support@rinkstop.com
          </a>{' '}
          — every policy page above lists the responsible team for that area.
        </div>
      </main>
    </>
  );
}
