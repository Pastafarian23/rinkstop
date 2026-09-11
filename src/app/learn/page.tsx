/**
 * /learn
 *
 * Index of every beginner-friendly explainer on RinkStop. The page
 * renders a single source of truth (src/lib/learn-catalog.ts) so
 * adding a new learn page = one entry in the catalog, no UI work.
 *
 * Also surfaces:
 *   - Featured-snippet block for "How do I start playing hockey?"
 *   - Quick-jump nav by category
 *   - Cross-link to /tools and /guides
 *   - JSON-LD: BreadcrumbList + WebPage (dateModified) + ItemList
 *
 * Last verified: 2026-09-10.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';
import { LEARN, LEARN_CATEGORIES, learnByCategory, LEARN_TOTAL } from '@/lib/learn-catalog';
import ProgressWidget from '@/components/learn/ProgressWidget';

export const metadata: Metadata = {
  title: 'Learn Hockey — Beginner Guide for Players, Parents, and Fans | RinkStop',
  description: `${LEARN_TOTAL} free beginner-friendly explainers for new players, parents, and fans. When to start, what to expect, what it costs, how to skate and shoot, the rules, and a parent-onboarding section for first-time families.`,
  keywords: [
    'learn hockey',
    'hockey for beginners',
    'how to start playing hockey',
    'when to start hockey',
    'youth hockey for parents',
    'hockey rules for beginners',
    'how to skate',
    'how to shoot a hockey puck',
    'hockey cost by age',
    'hockey for new fans',
  ],
  alternates: { canonical: 'https://rinkstop.com/learn' },
  openGraph: {
    title: 'Learn Hockey — Beginner Guide for Players, Parents, and Fans',
    description: `${LEARN_TOTAL} free beginner-friendly explainers. When to start, what to expect, what it costs, how to skate and shoot, and the rules.`,
    url: 'https://rinkstop.com/learn',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
};

const LEARN_LAST_UPDATED = '2026-09-10';

export default function LearnHubPage() {
  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Learn Hockey' }]} />

      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8102E' }}>Your Hockey Journey Starts Here</span>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, marginTop: '0.25rem' }}>
          LEARN HOCKEY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.6, marginTop: '0.5rem', maxWidth: 720 }}>
          {LEARN_TOTAL} free explainers for new players, parents, and fans. From your first strides on ice to understanding NHL rules — everything a beginner needs in one place.
        </p>
      </div>

      {/* Featured-snippet block */}
      <aside
        aria-label="Quick answer"
        style={{
          background: 'rgba(255,184,28,0.06)',
          border: '1px solid rgba(255,184,28,0.18)',
          borderLeft: '3px solid #FFB81C',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
          color: 'rgba(255,255,255,0.85)',
          fontSize: '0.9375rem',
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: '#FFB81C' }}>How do I start playing hockey?</strong>{' '}
        If you\u2019re an adult with no experience, start with{' '}
        <Link href="/learn/how-to-skate" style={{ color: '#FFB81C' }}>how to skate</Link>{' '}
        and the{' '}
        <Link href="/learn/hockey-rules" style={{ color: '#FFB81C' }}>hockey rules primer</Link>.
        If you\u2019re a parent putting your kid in hockey, start with{' '}
        <Link href="/directory/youth-hockey/learn-to-play" style={{ color: '#FFB81C' }}>find a learn-to-play program</Link>,{' '}
        check the{' '}
        <Link href="/tools/hockey-cost-calculator" style={{ color: '#FFB81C' }}>cost calculator</Link>,{' '}
        and read the{' '}
        <Link href="/learn/age-to-start-hockey" style={{ color: '#FFB81C' }}>when can my kid start</Link>{' '}
        guide. If you just want to understand the game as a new fan, start with{' '}
        <Link href="/learn/hockey-terminology" style={{ color: '#FFB81C' }}>the glossary</Link>.
      </aside>

      {/* Per-user progress + next step (Phase 5 PR2). Hidden when signed out. */}
      <ProgressWidget />

      {/* Why Learn Hockey — quick motivational callout */}
      <section style={{ marginBottom: '2.5rem', background: 'var(--s2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>WHY PLAY HOCKEY?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { icon: '❤️', title: 'Fitness', desc: 'Hockey burns calories, builds leg strength, and improves cardio faster than most sports.' },
            { icon: '🧠', title: 'Mental Toughness', desc: 'Fast-paced decision making builds mental acuity. You think faster, react quicker.' },
            { icon: '🤝', title: 'Community', desc: 'Hockey teams become families. The locker room bonds run deeper than any office friendship.' },
            { icon: '🌍', title: 'Global Sport', desc: 'From Canada to Russia to Japan — hockey connects you worldwide.' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
              <div>
                <h3 style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem', fontSize: '0.9375rem' }}>{item.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skill levels — Find Your Level */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FIND YOUR LEVEL</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
          <LevelCard level="Beginner" icon="🎿" color="#4CAF50" desc="New to hockey — start here" />
          <LevelCard level="Intermediate" icon="⛸️" color="#FF9800" desc="Know basics, building skills" />
          <LevelCard level="Advanced" icon="🏒" color="#C8102E" desc="Competitive player level" />
        </div>
      </section>

      {/* Quick-jump nav by category */}
      <nav aria-label="Learn sections" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {LEARN_CATEGORIES.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            style={{ padding: '0.4rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', textDecoration: 'none' }}
          >
            {c.icon} {c.title}
          </a>
        ))}
      </nav>

      {/* All categories, auto-rendered from the catalog. Only show sections that have guides. */}
      {LEARN_CATEGORIES.map((cat) => {
        const entries = learnByCategory(cat.id);
        if (entries.length === 0) return null;
        return (
          <section key={cat.id} id={cat.id} style={{ marginBottom: '3rem', scrollMarginTop: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                {entries.length} {entries.length === 1 ? 'GUIDE' : 'GUIDES'}
              </span>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{cat.icon}</span> {cat.title}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', marginTop: '0.4rem' }}>{cat.subtitle}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {entries.map((l) => (
                <LearnCard key={l.href} entry={l} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Cross-link to /tools and /guides — the 80/20 SEO play */}
      <section style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          Take the next step
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          The explainers above give you the how. The tools and guides answer the practical questions once you\u2019re ready to commit.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <RelatedLink href="/tools" title="Free Hockey Tools" desc="Cost, sizing, eligibility" />
          <RelatedLink href="/tools/hockey-cost-calculator" title="Hockey Cost Calculator" desc="Estimate by age + state + level" />
          <RelatedLink href="/tools/junior-eligibility-checker" title="Junior Eligibility Checker" desc="CHL / USHL / NCAA by birth year" />
          <RelatedLink href="/guides/hockey-parents-handbook" title="Hockey Parents Handbook" desc="First-year parent survival guide" />
          <RelatedLink href="/directory/youth-hockey/learn-to-play" title="Find Learn to Play" desc="Programs in your area" />
          <RelatedLink href="/guides" title="All Hockey Guides" desc="Deep-dive reference material" />
        </div>
      </section>

      {/* Find a program CTA */}
      <section style={{ background: 'linear-gradient(135deg, #C8102E 0%, #8a0a1e 100%)', padding: '2rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>READY TO GET ON THE ICE?</h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '1.5rem', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
          Find beginner-friendly learn-to-play programs, youth hockey leagues, and adult hockey near you.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/directory/youth-hockey/learn-to-play" style={{ padding: '0.75rem 1.5rem', background: '#fff', color: '#C8102E', borderRadius: '6px', fontWeight: 700, textDecoration: 'none' }}>Learn to Play Programs</Link>
          <Link href="/directory/youth-hockey" style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', fontWeight: 700, textDecoration: 'none' }}>Youth Hockey</Link>
          <Link href="/directory/youth-hockey/adult-leagues" style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', fontWeight: 700, textDecoration: 'none' }}>Adult Leagues</Link>
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
              { '@type': 'ListItem', position: 2, name: 'Learn Hockey', item: 'https://rinkstop.com/learn' },
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
            name: 'Learn Hockey — RinkStop',
            description: `${LEARN_TOTAL} free beginner-friendly explainers for new players, parents, and fans.`,
            url: 'https://rinkstop.com/learn',
            inLanguage: 'en-US',
            isPartOf: { '@type': 'WebSite', name: 'RinkStop', url: 'https://rinkstop.com/' },
            datePublished: '2026-05-01',
            dateModified: LEARN_LAST_UPDATED,
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
            name: 'RinkStop Learn Hockey Guides',
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            numberOfItems: LEARN.length,
            itemListElement: LEARN.map((l, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: l.title,
              url: `https://rinkstop.com${l.href}`,
              description: l.desc,
            })),
          }),
        }}
      />
    </main>
  );
}

function LevelCard({ level, icon, color, desc }: { level: string; icon: string; color: string; desc: string }) {
  return (
    <div style={{ background: 'var(--s2)', borderRadius: '8px', padding: '1.25rem', border: `2px solid ${color}`, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{icon}</div>
      <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: color, letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{level.toUpperCase()}</h3>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{desc}</p>
      <Link href="/directory/youth-hockey/programs" style={{ display: 'inline-block', padding: '0.4rem 0.75rem', background: color, color: '#fff', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none' }}>
        Find Programs
      </Link>
    </div>
  );
}

function LearnCard({ entry }: { entry: import('@/lib/learn-catalog').LearnEntry }) {
  return (
    <Link
      href={entry.href}
      style={{ display: 'block', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', textDecoration: 'none', transition: 'border-color 0.2s, transform 0.2s' }}
    >
      <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{entry.title}</h3>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.6, marginBottom: '0.5rem' }}>{entry.desc}</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{entry.readTime} min read</span>
        {(entry.relatedTools?.length ?? 0) > 0 && (
          <span style={{ fontSize: '0.65rem', color: '#FFB81C', fontWeight: 600, padding: '0.1rem 0.4rem', background: 'rgba(255,184,28,0.1)', borderRadius: '999px' }}>tools linked</span>
        )}
        {(entry.relatedGuides?.length ?? 0) > 0 && (
          <span style={{ fontSize: '0.65rem', color: '#FFB81C', fontWeight: 600, padding: '0.1rem 0.4rem', background: 'rgba(255,184,28,0.1)', borderRadius: '999px' }}>guides linked</span>
        )}
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>· verified {entry.verified}</span>
      </div>
    </Link>
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
