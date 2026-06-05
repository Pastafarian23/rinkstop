// src/components/BlogDirectoryCTA.tsx
// Server-rendered "Find it on RinkStop" CTA for blog posts.
// Links blog content → relevant directory pages to create the article-to-directory funnel.
//
// The component picks CTAs based on the post's category and tags. Each CTA is a
// card with an icon, a short pitch, and a button. Up to 3 CTAs are shown.

import Link from 'next/link';

interface CTA {
  title: string;
  pitch: string;
  href: string;
  cta: string;
  icon: string; // emoji or simple unicode
  highlight?: string; // e.g. "Top 100+ in the US"
}

interface BlogDirectoryCTAProps {
  category?: string;
  tags?: string[];
  title?: string;
}

function pickCTAs(category: string | undefined, tags: string[] | undefined, title: string | undefined): CTA[] {
  const text = `${category || ''} ${(tags || []).join(' ')} ${title || ''}`.toLowerCase();
  const ctas: CTA[] = [];

  // ── Ice rinks / skating ──
  if (/ice\s*rink|skating|open\s*skate|public\s*skat|recreation/.test(text)) {
    ctas.push({
      title: 'Find Rinks Near You',
      pitch: 'Browse the full RinkStop directory — searchable by city, state, or country. Public skate hours, addresses, and contact info.',
      href: '/directory/rinks',
      cta: 'Browse Rinks',
      icon: '🏒',
      highlight: '900+ rinks in 30+ countries',
    });
  }

  // ── Pro shops / equipment ──
  if (/pro\s*shop|equipment|gear|stick|skate|training\s*facilit|practice/.test(text)) {
    ctas.push({
      title: 'Find Rinks with Pro Shops',
      pitch: 'Skip the runaround. Find rinks that have a pro shop on-site so you can get fitted, grab gear, and stick-and-puck in one trip.',
      href: '/directory/rinks',
      cta: 'See Pro Shop Rinks',
      icon: '🛒',
    });
  }

  // ── Teams / leagues ──
  if (/team|league|adult\s*hockey|youth\s*hockey|beer\s*league|junior|ncaa|chl/.test(text)) {
    ctas.push({
      title: 'Find Teams in Your Area',
      pitch: 'Search the RinkStop team directory by city, league, and age level. From youth to pro — every team in one place.',
      href: '/directory/teams',
      cta: 'Browse Teams',
      icon: '👥',
      highlight: '2,100+ teams indexed',
    });
  }

  // ── Coaches ──
  if (/coach|coaching|lesson|private|training|skill/.test(text)) {
    ctas.push({
      title: 'Find a Hockey Coach',
      pitch: 'Skating, shooting, positioning — connect with experienced coaches in your area. Filter by specialty and level.',
      href: '/directory/teams',
      cta: 'Find Coaches',
      icon: '🎯',
    });
  }

  // ── Geographic / directory USA ──
  if (/directory\s*usa|state|by\s*state|all\s*states/.test(text)) {
    ctas.push({
      title: 'RinkStop USA Directory',
      pitch: 'Every state, every city. Browse the full US rink directory — filterable by city, with addresses, phone numbers, and websites.',
      href: '/directory/united-states',
      cta: 'Browse US Rinks',
      icon: '🗺️',
    });
  }

  // ── Geographic / Canada ──
  if (/canada|chc|ohl|whl|qmjhl|ontario|alberta|quebec|british\s*columbia/.test(text)) {
    ctas.push({
      title: 'RinkStop Canada Directory',
      pitch: 'From BC to Newfoundland, browse the full Canadian hockey directory. CHL, junior, university, and recreational teams — all indexed.',
      href: '/directory/canada',
      cta: 'Browse Canada',
      icon: '🍁',
    });
  }

  // ── Non-traditional / growth markets ──
  if (/non-traditional|growth|growing|florida|texas|arizona|north\s*carolina|sun\s*belt/.test(text)) {
    ctas.push({
      title: 'Find Hockey Where It\'s Growing',
      pitch: 'Browse rinks and teams in non-traditional markets — Florida, Texas, Arizona, and beyond. The new hockey frontier.',
      href: '/directory/united-states',
      cta: 'Browse by State',
      icon: '🌴',
    });
  }

  // ── Default fallback if nothing matched ──
  if (ctas.length === 0) {
    ctas.push({
      title: 'Explore the RinkStop Directory',
      pitch: '900+ rinks in 30+ countries, 2,100+ teams, 6,300+ players, 190+ leagues. The world\'s largest hockey directory — searchable by city, state, or country.',
      href: '/directory',
      cta: 'Open Directory',
      icon: '🏒',
    });
  }

  // Always add a general "see all" CTA at the end if we have 1+ specific ones
  if (ctas.length >= 1 && ctas.length < 3) {
    ctas.push({
      title: 'See the Full RinkStop Directory',
      pitch: 'Rinks, teams, leagues, players — every hockey data point in one place. The fastest way to find what you need.',
      href: '/directory',
      cta: 'Explore Directory',
      icon: '🏒',
      highlight: '900+ rinks · 2,100+ teams',
    });
  }

  // Cap at 3 CTAs
  return ctas.slice(0, 3);
}

export default function BlogDirectoryCTA({ category, tags, title }: BlogDirectoryCTAProps) {
  const ctas = pickCTAs(category, tags, title);
  if (ctas.length === 0) return null;

  return (
    <section
      aria-label="Find it on RinkStop"
      style={{
        marginTop: '2.5rem',
        padding: '1.75rem 1.5rem',
        background: 'linear-gradient(180deg, #f8f9fb 0%, #eef2f7 100%)',
        border: '1px solid #dde3ec',
        borderLeft: '4px solid #C8102E',
        borderRadius: '6px',
      }}
    >
      <h2 style={{
        fontFamily: '"Bebas Neue", Impact, sans-serif',
        fontSize: '1.25rem',
        color: '#041E42',
        letterSpacing: '0.04em',
        marginBottom: '0.4rem',
      }}>
        Find It on RinkStop
      </h2>
      <p style={{
        color: '#555',
        fontSize: '0.875rem',
        marginBottom: '1.25rem',
        lineHeight: 1.5,
      }}>
        Skip the search — jump straight to the data. The RinkStop directory is the world's largest hockey index.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '0.875rem',
      }}>
        {ctas.map((cta, i) => (
          <Link
            key={i}
            href={cta.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              padding: '1rem 1.125rem',
              textDecoration: 'none',
              transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{cta.icon}</span>
              <h3 style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: '#041E42',
                margin: 0,
                lineHeight: 1.25,
              }}>
                {cta.title}
              </h3>
            </div>
            <p style={{
              color: '#555',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              marginBottom: '0.75rem',
              flex: 1,
            }}>
              {cta.pitch}
            </p>
            {cta.highlight && (
              <div style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#C8102E',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
              }}>
                {cta.highlight}
              </div>
            )}
            <span style={{
              alignSelf: 'flex-start',
              background: '#041E42',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0.4rem 0.85rem',
              borderRadius: '3px',
            }}>
              {cta.cta} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
