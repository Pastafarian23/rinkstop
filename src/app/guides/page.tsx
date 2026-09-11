/**
 * /guides
 *
 * Index of every hockey guide on RinkStop. The page renders a single
 * source of truth (src/lib/guides-catalog.ts) grouped by category so
 * adding a new guide = one entry in the catalog, no UI work.
 *
 * Also surfaces:
 *   - Featured-snippet block for "What hockey guides does RinkStop offer?"
 *   - Cross-links to related tools (e.g. cost calculator on the
 *     Parents Handbook card)
 *   - FAQ cross-link block
 *   - JSON-LD: BreadcrumbList + WebPage (dateModified) + ItemList
 *
 * Last verified: 2026-09-10.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { GUIDES, GUIDE_CATEGORIES, guidesByCategory, type GuideCategory } from '@/lib/guides-catalog';

export const metadata: Metadata = {
  title: 'Hockey Guides — RinkStop | Technique, Equipment, Leagues, Pathways',
  description: 'In-depth hockey guides covering technique (skating, shooting, stickhandling), training, equipment fitting (with separate guides for parents and adult players), every major league (NHL, AHL, KHL, PWHL, CHL, NCAA, USHL, IIHF), and player pathways. Updated 2026.',
  keywords: [
    'hockey guides',
    'hockey techniques',
    'hockey training',
    'hockey equipment fitting',
    'hockey leagues explained',
    'hockey pathways',
    'youth hockey parents',
    'hockey positions',
    'hockey rules',
  ],
  alternates: { canonical: 'https://rinkstop.com/guides' },
  openGraph: {
    title: 'Hockey Guides — RinkStop',
    description: 'Technique, training, equipment, leagues, and pathways. Every guide free, all on one page.',
    url: 'https://rinkstop.com/guides',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
};

const GUIDES_LAST_UPDATED = '2026-09-10';

export default function GuidesIndexPage() {
  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Guides</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8102E' }}>HOCKEY GUIDES</span>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, marginTop: '0.25rem' }}>
          EVERY HOCKEY GUIDE ON RINKSTOP
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.6, marginTop: '0.5rem', maxWidth: 720 }}>
          {GUIDES.length} guides across 8 categories. Technique, training, equipment, every major league, and the pathways from youth to junior. Free, no sign-up, written by people who coach and play.
        </p>
      </div>

      {/* Featured-snippet block */}
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
        <strong style={{ color: '#38BDF8' }}>What hockey guides does RinkStop offer?</strong>{' '}
        {GUIDES.length} free guides across 8 categories: parents (handbook, house vs travel, USA Hockey ADM), leagues (NHL, AHL, KHL, PWHL, CHL, NCAA, USHL, IIHF), pathways (NHL Draft, youth to junior), positions, training (skating, shooting, stickhandling, passing, defense, goaltending, off-ice, strength, nutrition), equipment (with separate fit guides for parents and adult players), officiating, and reference. Pair the{' '}
        <Link href="/guides/hockey-parents-handbook" style={{ color: '#38BDF8' }}>Hockey Parents Handbook</Link>{' '}
        with the{' '}
        <Link href="/tools/hockey-cost-calculator" style={{ color: '#38BDF8' }}>Hockey Cost Calculator</Link>{' '}
        for the most-read pairing on the site.
      </aside>

      {/* Quick-jump nav */}
      <nav aria-label="Guide categories" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {GUIDE_CATEGORIES.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            style={{ padding: '0.4rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', textDecoration: 'none' }}
          >
            {c.icon} {c.title}
          </a>
        ))}
      </nav>

      {/* All categories, auto-rendered from the catalog */}
      {GUIDE_CATEGORIES.map((cat) => {
        const entries = guidesByCategory(cat.id);
        if (entries.length === 0) return null;
        return (
          <section key={cat.id} id={cat.id} style={{ marginBottom: '3rem', scrollMarginTop: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                {entries.length} {entries.length === 1 ? 'GUIDE' : 'GUIDES'}
              </span>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{cat.icon}</span> {cat.title}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', marginTop: '0.4rem' }}>{cat.subtitle}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {entries.map((g) => (
                <Link
                  key={g.href}
                  href={g.href}
                  style={{ display: 'block', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', textDecoration: 'none', transition: 'border-color 0.2s, transform 0.2s' }}
                >
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{g.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.65, marginBottom: g.relatedTools && g.relatedTools.length > 0 ? '0.75rem' : 0 }}>{g.desc}</p>
                  {g.relatedTools && g.relatedTools.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                      Try:{' '}
                      {g.relatedTools.map((t, i) => (
                        <span key={t}>
                          <Link href={t} style={{ color: '#C8102E', textDecoration: 'none', fontWeight: 600 }}>
                            {t === '/tools/hockey-cost-calculator' ? 'Cost Calculator' :
                             t === '/tools/hockey-skate-size-calculator' ? 'Skate Size' :
                             t === '/tools/hockey-glove-size-calculator' ? 'Glove Size' :
                             t === '/tools/hockey-stick-size-calculator' ? 'Stick Size' :
                             t === '/tools/hockey-goalie-gear-sizer' ? 'Goalie Gear' :
                             t === '/tools/junior-eligibility-checker' ? 'Junior Eligibility' : 'Tool'}
                          </Link>
                          {i < g.relatedTools.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* Cross-link to FAQ and Tools */}
      <section style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          Looking for something else?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          The guides are deep-dives. The FAQ answers narrow questions. The tools solve narrow problems.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <RelatedLink href="/tools" title="Free Hockey Tools" desc="Cost, sizing, eligibility" />
          <RelatedLink href="/faq" title="RinkStop FAQ" desc="Accounts, listings, billing" />
          <RelatedLink href="/guides/hockey-parents-handbook" title="Hockey Parents Handbook" desc="First-year parent guide" />
          <RelatedLink href="/learn" title="Learn Hockey" desc="24 beginner explainers" />
          <RelatedLink href="/learn/first-day-on-ice" title="Your First Day on the Ice" desc="Walk-through for new parents" />
          <RelatedLink href="/learn/equipment-on-a-budget" title="Equipment on a Budget" desc="What to buy new, used, skip" />
          <RelatedLink href="/learn/hockey-development-pathway" title="Hockey Development Pathway" desc="Learn to Play → Pro" />
          <RelatedLink href="/tools/junior-eligibility-checker" title="Junior Eligibility Checker" desc="CHL/USHL/NCAA by birth year" />
          <RelatedLink href="/learn/hockey-rules" title="Hockey Rules (12 min primer)" desc="Offside, icing, penalties explained" />
        </div>
      </section>

      {/* JSON-LD: BreadcrumbList + WebPage (freshness) + ItemList (the guides) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com/' },
              { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://rinkstop.com/guides' },
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
            name: 'Hockey Guides — RinkStop',
            description: 'In-depth hockey guides covering technique, training, equipment fitting, leagues, and pathways.',
            url: 'https://rinkstop.com/guides',
            inLanguage: 'en-US',
            isPartOf: { '@type': 'WebSite', name: 'RinkStop', url: 'https://rinkstop.com/' },
            datePublished: '2026-05-01',
            dateModified: GUIDES_LAST_UPDATED,
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
            name: 'RinkStop Hockey Guides',
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            numberOfItems: GUIDES.length,
            itemListElement: GUIDES.map((g, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: g.title,
              url: `https://rinkstop.com${g.href}`,
              description: g.desc,
            })),
          }),
        }}
      />
    </main>
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