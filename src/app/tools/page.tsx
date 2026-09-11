/**
 * /tools
 *
 * Index of all free RinkStop hockey tools. Lists the 6 calculators with
 * descriptions, "best for" tags, time-to-complete estimates, and
 * cross-links to the related guides.
 *
 * Server component (no client JS) — SEO surfaces in HTML directly.
 * Last verified: 2026-09-10.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Free Hockey Tools & Calculators — RinkStop',
  description: 'Six free hockey calculators and tools: cost estimator (by age, level, state), skate size, glove size, stick size, goalie gear sizer, and junior hockey eligibility checker (CHL/USHL/NCAA). No sign-up required.',
  keywords: [
    'hockey tools',
    'hockey calculators',
    'hockey cost calculator',
    'hockey skate size calculator',
    'hockey glove size calculator',
    'hockey stick size calculator',
    'hockey goalie gear sizer',
    'junior hockey eligibility checker',
    'free hockey tools',
  ],
  alternates: { canonical: 'https://rinkstop.com/tools' },
  openGraph: {
    title: 'Free Hockey Tools & Calculators',
    description: 'Cost, sizing, eligibility. Six free tools, no sign-up, instant results.',
    url: 'https://rinkstop.com/tools',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
};

type Tool = {
  href: string;
  title: string;
  desc: string;
  bestFor: string;
  time: string;
  icon: string;
  relatedGuide?: { title: string; href: string };
};

const TOOLS: Tool[] = [
  {
    href: '/tools/hockey-cost-calculator',
    title: 'Hockey Cost Calculator',
    desc: 'Estimate how much youth hockey costs per year by age, state, and level (House, Travel A/AA, AAA). Real 2026 data covering registration, equipment, ice time, tournaments, travel, and hidden costs.',
    bestFor: 'Parents',
    time: '2 min',
    icon: '💰',
    relatedGuide: { title: 'Hockey Parents Handbook', href: '/guides/hockey-parents-handbook' },
  },
  {
    href: '/tools/junior-eligibility-checker',
    title: 'Junior Eligibility Checker',
    desc: 'Enter a player\'s birth year. Returns eligibility windows for CHL (OHL/WHL/QMJHL), USHL, NAHL, NCDC, BCHL, AJHL, and NCAA. Shows which leagues the player is age-eligible for and when those windows close.',
    bestFor: 'Junior-bound players',
    time: '30 sec',
    icon: '🎯',
    relatedGuide: { title: 'Youth to Junior Hockey', href: '/guides/youth-to-junior-hockey' },
  },
  {
    href: '/tools/hockey-skate-size-calculator',
    title: 'Skate Size Calculator',
    desc: 'Convert your US shoe size to the right Bauer, CCM, or generic hockey skate size. Includes width and half-size adjustment guidance so your first pair fits.',
    bestFor: 'New skaters',
    time: '30 sec',
    icon: '⛸️',
    relatedGuide: { title: 'Skate Fitting Guide', href: '/guides/skate-fitting-guide' },
  },
  {
    href: '/tools/hockey-glove-size-calculator',
    title: 'Glove Size Calculator',
    desc: 'Find the right hockey glove size by hand measurement or player height. Covers 11", 12", 13", 14", 15" and the in-between sizes most retailers skip.',
    bestFor: 'New skaters',
    time: '30 sec',
    icon: '🧤',
    relatedGuide: { title: 'Breaking In New Gloves', href: '/guides/breaking-in-hockey-gloves' },
  },
  {
    href: '/tools/hockey-stick-size-calculator',
    title: 'Stick Size Calculator',
    desc: 'Get the right stick length, flex rating, and blade curve pattern by player height, weight, and position. Includes the lying-on-the-ground test and the in-skates check.',
    bestFor: 'New skaters',
    time: '30 sec',
    icon: '🏒',
    relatedGuide: { title: 'How to Choose the Right Stick', href: '/guides/hockey-stick-guide' },
  },
  {
    href: '/tools/hockey-goalie-gear-sizer',
    title: 'Goalie Gear Sizer',
    desc: 'Size the chest protector, blocker, catching glove, leg pads, and stick by goalie height and stance. Separates ATK (attack-angle) and RVH (reverse-VH) recommendations.',
    bestFor: 'Goalies',
    time: '1 min',
    icon: '🥅',
    relatedGuide: { title: 'Goaltending Guide', href: '/guides/goaltending' },
  },
];

const TOOLS_LAST_UPDATED = '2026-09-10';

export default function ToolsIndexPage() {
  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Tools</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8102E' }}>FREE HOCKEY TOOLS</span>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, marginTop: '0.25rem' }}>
          HOCKEY CALCULATORS &amp; TOOLS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.6, marginTop: '0.5rem', maxWidth: 720 }}>
          Six free tools. No sign-up, no email gate, no data sent to a salesperson. Cost your season, size your gear, and check junior eligibility — all in your browser.
        </p>
      </div>

      {/* Featured-snippet block — Google "free hockey tools" voice/featured answer */}
      <aside
        aria-label="Quick answer"
        style={{
          background: 'rgba(56,189,248,0.06)',
          border: '1px solid rgba(56,189,248,0.18)',
          borderLeft: '3px solid #38BDF8',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
          color: 'rgba(255,255,255,0.85)',
          fontSize: '0.9375rem',
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: '#38BDF8' }}>What hockey tools does RinkStop offer?</strong>{' '}
        Six free tools with no sign-up required: the{' '}
        <Link href="/tools/hockey-cost-calculator" style={{ color: '#38BDF8' }}>Hockey Cost Calculator</Link>{' '}
        (estimates annual cost by age, state, and level), the{' '}
        <Link href="/tools/junior-eligibility-checker" style={{ color: '#38BDF8' }}>Junior Eligibility Checker</Link>{' '}
        (CHL/USHL/NCAA eligibility by birth year), and four sizing calculators (skate, glove, stick, goalie gear). Pair them with the{' '}
        <Link href="/guides/hockey-parents-handbook" style={{ color: '#38BDF8' }}>Hockey Parents Handbook</Link>{' '}
        for the full picture.
      </aside>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        {TOOLS.map(tool => (
          <Link
            key={tool.href}
            href={tool.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.25rem',
              textDecoration: 'none',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }} aria-hidden="true">{tool.icon}</span>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', margin: 0 }}>{tool.title}</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0, flex: 1 }}>{tool.desc}</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <Tag>{tool.bestFor}</Tag>
              <Tag muted>~{tool.time}</Tag>
            </div>
            {tool.relatedGuide && (
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                Pair with: <Link href={tool.relatedGuide.href} style={{ color: '#C8102E', textDecoration: 'none', fontWeight: 600 }}>{tool.relatedGuide.title} →</Link>
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#C8102E', fontWeight: 700, letterSpacing: '0.04em', marginTop: '0.25rem' }}>USE TOOL →</div>
          </Link>
        ))}
      </div>

      {/* Related surfaces */}
      <section style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          Want to go deeper?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          The tools answer narrow questions. The guides answer the broad ones — what to expect, how to choose, what to skip.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <RelatedLink href="/guides/hockey-parents-handbook" title="Hockey Parents Handbook" desc="First-year parent survival guide" />
          <RelatedLink href="/guides/youth-to-junior-hockey" title="Youth to Junior Hockey" desc="CHL vs NCAA vs USHL pathways" />
          <RelatedLink href="/guides/skate-fitting-guide" title="Skate Fitting Guide" desc="Bauer, CCM, half-size, width" />
          <RelatedLink href="/guides/hockey-tryout-guide" title="Tryout Guide" desc="What coaches look for, by age" />
          <RelatedLink href="/learn" title="Learn Hockey" desc="24 beginner-friendly explainers" />
          <RelatedLink href="/learn/first-day-on-ice" title="Your First Day on the Ice" desc="Walk-through for new parents" />
          <RelatedLink href="/learn/choosing-a-program" title="Choosing a Learn-to-Play Program" desc="7 questions + red flags" />
        </div>
      </section>

      {/* JSON-LD: ItemList (the tool grid) + BreadcrumbList (page identity) + WebPage (freshness) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com/' },
              { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://rinkstop.com/tools' },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Free Hockey Tools & Calculators',
            description: 'Six free hockey calculators and tools: cost, sizing, and junior eligibility.',
            url: 'https://rinkstop.com/tools',
            inLanguage: 'en-US',
            isPartOf: { '@type': 'WebSite', name: 'RinkStop', url: 'https://rinkstop.com/' },
            datePublished: '2026-05-01',
            dateModified: TOOLS_LAST_UPDATED,
            primaryImageOfPage: { '@type': 'ImageObject', url: 'https://rinkstop.com/og-image.png' },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'RinkStop Hockey Tools',
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            numberOfItems: TOOLS.length,
            itemListElement: TOOLS.map((t, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: t.title,
              url: `https://rinkstop.com${t.href}`,
              description: t.desc,
            })),
          }),
        }}
      />
    </main>
  );
}

function Tag({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.5rem',
      borderRadius: '999px',
      background: muted ? 'rgba(255,255,255,0.04)' : 'rgba(200,16,46,0.1)',
      border: '1px solid ' + (muted ? 'rgba(255,255,255,0.08)' : 'rgba(200,16,46,0.3)'),
      color: muted ? 'rgba(255,255,255,0.5)' : '#FCA5A5',
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.02em',
    }}>{children}</span>
  );
}

function RelatedLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: '0.75rem 1rem',
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        textDecoration: 'none',
        transition: 'border-color 0.2s',
      }}
    >
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', marginBottom: '0.15rem' }}>{title}</div>
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{desc}</div>
    </Link>
  );
}