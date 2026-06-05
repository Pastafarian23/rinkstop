// src/components/DirectoryRelatedArticles.tsx
// Server-rendered "Related Articles" section for directory pages.
// Picks the 3 most relevant blog posts for a given country/state/city context.
//
// Used on country pages, state/province pages, and city pages to flip the
// directory → article funnel.

import Link from 'next/link';

interface DirectoryRelatedArticlesProps {
  countryName?: string;
  countrySlug?: string;
  regionName?: string;
  regionSlug?: string;
  cityName?: string;
  citySlug?: string;
  limit?: number;
}

interface ArticleTemplate {
  slugHint: string[]; // keywords that match the post slug
  title: string;
  pitch: string;
  href: string; // explicit override
  cta: string;
  icon: string;
}

// Map of high-priority articles that should appear on most directory pages
// regardless of context. These are the "evergreen" near-me articles.
const EVERGREEN_ARTICLES: ArticleTemplate[] = [
  {
    slugHint: ['ice-rink-near-me'],
    title: 'How to Find Local Rinks',
    pitch: 'The complete guide to finding ice rinks, public skate sessions, and open hockey in your area.',
    href: '/blog/ice-rink-near-me-how-to-find-local-rinks-for-hockey-skating-and-recreation',
    cta: 'Read Guide',
    icon: '🏒',
  },
  {
    slugHint: ['hockey-teams-near-me'],
    title: 'Find Hockey Teams Near You',
    pitch: 'From youth to adult, learn how to find the right team and league at every level.',
    href: '/blog/hockey-teams-near-me',
    cta: 'Read Guide',
    icon: '👥',
  },
  {
    slugHint: ['hockey-rinks-with-pro-shops'],
    title: 'Rinks with Pro Shops',
    pitch: 'One-stop hockey facilities with on-site gear, fitting, and equipment — no extra trips.',
    href: '/blog/hockey-rinks-with-pro-shops-a-complete-guide-to-one-stop-hockey-facilities',
    cta: 'Read Guide',
    icon: '🛒',
  },
];

// Country-specific articles (only show on pages for that country)
const COUNTRY_ARTICLES: Record<string, ArticleTemplate[]> = {
  'united-states': [
    {
      slugHint: ['ice-rink-directory-usa'],
      title: 'US Rink Directory Guide',
      pitch: 'Every state, every city. The complete guide to the US ice rink directory.',
      href: '/blog/ice-rink-directory-usa-a-complete-guide-to-finding-every-rink-in-any-state',
      cta: 'Read Guide',
      icon: '🗺️',
    },
    {
      slugHint: ['hockey-practice-facilities'],
      title: 'Practice Facilities by State',
      pitch: 'How to find ice time and training space anywhere in the US.',
      href: '/blog/hockey-practice-facilities-by-state-how-to-find-ice-time-and-training-space-anyw',
      cta: 'Read Guide',
      icon: '⛸️',
    },
    {
      slugHint: ['hockey-growth-non-traditional'],
      title: 'Hockey\'s Growth in Non-Traditional Markets',
      pitch: 'Why hockey is booming in Florida, Texas, Arizona, and the Sun Belt — and what that means for you.',
      href: '/blog/hockey-growth-non-traditional-markets',
      cta: 'Read Article',
      icon: '🌴',
    },
  ],
  'canada': [
    {
      slugHint: ['adult-hockey-leagues'],
      title: 'Adult Hockey Leagues Guide',
      pitch: 'From beer league to pro — the adult hockey pathway in Canada.',
      href: '/blog/adult-hockey-leagues-near-me-a-player-s-guide-to-finding-local-programs',
      cta: 'Read Guide',
      icon: '🏒',
    },
    {
      slugHint: ['youth-hockey-leagues'],
      title: 'Youth Hockey Leagues',
      pitch: 'How Canadian families navigate minor hockey, from initiation to junior.',
      href: '/blog/youth-hockey-leagues-near-me',
      cta: 'Read Guide',
      icon: '👦',
    },
  ],
  'united-kingdom': [
    {
      slugHint: ['adult-hockey-leagues'],
      title: 'UK Adult Hockey Guide',
      pitch: 'Find adult leagues and clubs in the UK — from beginners to EIHL veterans.',
      href: '/blog/adult-hockey-leagues-near-me-a-player-s-guide-to-finding-local-programs',
      cta: 'Read Guide',
      icon: '🏒',
    },
  ],
};

function pickArticles(props: DirectoryRelatedArticlesProps, limit: number): ArticleTemplate[] {
  const { countrySlug } = props;
  const picked: ArticleTemplate[] = [];
  const seen = new Set<string>();

  // 1) Country-specific articles (if any)
  const countryKey = countrySlug || '';
  const countryArticles = COUNTRY_ARTICLES[countryKey] || [];
  for (const a of countryArticles) {
    if (picked.length >= limit) break;
    if (!seen.has(a.href)) {
      picked.push(a);
      seen.add(a.href);
    }
  }

  // 2) Evergreen articles to fill remaining slots
  for (const a of EVERGREEN_ARTICLES) {
    if (picked.length >= limit) break;
    if (!seen.has(a.href)) {
      picked.push(a);
      seen.add(a.href);
    }
  }

  return picked.slice(0, limit);
}

export default async function DirectoryRelatedArticles({
  countryName,
  countrySlug,
  regionName,
  regionSlug,
  cityName,
  citySlug,
  limit = 3,
}: DirectoryRelatedArticlesProps) {
  const articles = pickArticles({ countryName, countrySlug, regionName, regionSlug, cityName, citySlug, limit }, limit);
  if (articles.length === 0) return null;

  // Build context for the heading
  const ctx = cityName
    ? `${cityName}${regionName ? `, ${regionName}` : ''}`
    : regionName
      ? regionName
      : countryName || 'this area';

  return (
    <section
      aria-label="Related articles"
      style={{
        marginTop: '2.5rem',
        marginBottom: '2rem',
        padding: '1.75rem 1.5rem',
        background: 'linear-gradient(180deg, #f8f9fb 0%, #eef2f7 100%)',
        border: '1px solid #dde3ec',
        borderLeft: '4px solid #041E42',
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
        Hockey Guides for {ctx}
      </h2>
      <p style={{
        color: '#555',
        fontSize: '0.875rem',
        marginBottom: '1.25rem',
        lineHeight: 1.5,
      }}>
        The RinkStop blog covers the questions every player, parent, and coach asks.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '0.875rem',
      }}>
        {articles.map((article, i) => (
          <Link
            key={i}
            href={article.href}
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
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{article.icon}</span>
              <h3 style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: '#041E42',
                margin: 0,
                lineHeight: 1.25,
              }}>
                {article.title}
              </h3>
            </div>
            <p style={{
              color: '#555',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              marginBottom: '0.75rem',
              flex: 1,
            }}>
              {article.pitch}
            </p>
            <span style={{
              alignSelf: 'flex-start',
              background: '#C8102E',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0.4rem 0.85rem',
              borderRadius: '3px',
            }}>
              {article.cta} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
