/**
 * ArticleCtaBlock — inline CTA rendered at the end of every editorial article.
 *
 * Topic-matched destination: each article auto-selects one of 5 variants based
 * on its category + tags. Default fallback goes to /directory for unmatched
 * articles (e.g., NHL recaps, opinion pieces).
 *
 * Visual: matches HockeyCostCalculatorClient CTA pattern. Uses RinkStop red
 * (#C8102E) for primary button, gold (#FFB81C) accent, Bebas Neue for headings.
 *
 * Topic priority (first match wins):
 *   youth  > try  > equipment  > regional  > claim  > default
 *
 * Day 3 (2026-06-29) — added for the article CTA backfill campaign.
 */

import Link from 'next/link';

export type ArticleCtaVariant = 'youth' | 'try' | 'regional' | 'equipment' | 'claim' | 'default';

export interface ArticleCtaBlockProps {
  slug: string;
  category?: string | null;
  tags?: string[] | null;
  title?: string | null;
}

// Keyword sets — case-insensitive substring match against category, tags, title, slug.
const YOUTH_KEYWORDS = [
  'youth hockey', 'minor hockey', 'tier 1', 'tier 2', 'mite', 'squirt',
  'peewee', 'bantam', 'midget', '16u', '18u', 'high school hockey', 'junior hockey',
  'youth leagues', 'youth programs', 'youth teams', 'youth cost', 'youth directory',
  'kid hockey', 'parent guide',
];

const TRY_KEYWORDS = [
  'try hockey', 'try-hockey', 'trying hockey', 'learn to play', 'learn-to-play',
  'learning hockey', 'first skate', 'free skate', 'intro to hockey', 'new to hockey',
  'never played', 'starting hockey',
];

const EQUIPMENT_KEYWORDS = [
  'stick', 'blade', 'flex', 'curve', 'equipment', 'gear', 'helmet', 'skates',
  'gloves', 'pads', 'hockey stick', 'hockey equipment', 'stick size', 'stick guide',
];

const REGIONAL_KEYWORDS = [
  'near me', 'in any city', 'in any state',
  'team directory', 'rink directory', 'league directory', 'hockey rinks',
  'public ice skating', 'leagues near', 'teams near', 'rinks with', 'practice facilities',
  'training facilities', 'adult hockey leagues', 'youth hockey leagues', 'hockey teams',
];

const CLAIM_KEYWORDS = [
  'claim', 'listing', 'advertise', 'business', 'operator', 'owner', 'team revenue',
  'sponsorship', 'revenue streams', 'revenue sharing',
];

function matchTopic(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

export function selectArticleCtaVariant(props: ArticleCtaBlockProps): ArticleCtaVariant {
  const haystack = [
    props.category || '',
    props.title || '',
    props.slug || '',
    ...(props.tags || []),
  ].join(' ');

  // Order matters — equipment first (specific domain), then try, youth, regional, claim, default.
  // Equipment > try so that equipment articles tagged "beginners" route to equipment
  // (the "beginners" tag is incidental; the domain is equipment).
  // Try > youth so that try-hockey articles for families route to try
  // (the family context is incidental; the action is try).
  if (matchTopic(haystack, EQUIPMENT_KEYWORDS)) return 'equipment';
  if (matchTopic(haystack, TRY_KEYWORDS)) return 'try';
  if (matchTopic(haystack, YOUTH_KEYWORDS)) return 'youth';
  if (matchTopic(haystack, REGIONAL_KEYWORDS)) return 'regional';
  if (matchTopic(haystack, CLAIM_KEYWORDS)) return 'claim';
  return 'default';
}

const VARIANT_CONFIG: Record<ArticleCtaVariant, {
  headline: string;
  ctaLabel: string;
  ctaHref: string;
  body: string;
}> = {
  youth: {
    headline: 'What does youth hockey cost your family?',
    ctaLabel: 'Try the free cost calculator →',
    ctaHref: '/tools/hockey-cost-calculator',
    body: 'Get a free estimate for the full season — registration, equipment, ice time, tournaments, travel. By level, region, and age.',
  },
  try: {
    headline: 'New to hockey?',
    ctaLabel: 'Find learn-to-play near you →',
    ctaHref: '/directory/youth-hockey/learn-to-play',
    body: 'Free and low-cost intro programs from USA Hockey, NHL clubs, and local affiliates. Perfect for kids and families just starting out.',
  },
  regional: {
    headline: 'Find hockey in your area',
    ctaLabel: 'Browse the directory →',
    ctaHref: '/directory/rinks',
    body: 'The global hockey directory — rinks, teams, leagues, and facilities in any city. Search by location or level.',
  },
  equipment: {
    headline: 'What size stick do you need?',
    ctaLabel: 'Try the stick-size calculator →',
    ctaHref: '/tools/hockey-stick-size-calculator',
    body: 'Free stick-size calculator. Length, flex, and curve recommendations by height, weight, position, and skill level. Industry-standard chin-to-nose rule + weight-based flex.',
  },
  claim: {
    headline: 'Own a rink, team, or league?',
    ctaLabel: 'Claim your listing →',
    ctaHref: '/claim-your-listing',
    body: 'Get verified in minutes. Claim your free listing to update hours, photos, and contact info — and unlock paid features when you\'re ready.',
  },
  default: {
    headline: 'Explore RinkStop',
    ctaLabel: 'Browse teams, players, and rinks →',
    ctaHref: '/directory',
    body: 'The global hockey directory. Find rinks, teams, leagues, and players in your area — or anywhere in the world.',
  },
};

export default function ArticleCtaBlock(props: ArticleCtaBlockProps) {
  const variant = selectArticleCtaVariant(props);
  const cfg = VARIANT_CONFIG[variant];

  return (
    <div
      style={{
        margin: '2.5rem auto 2rem',
        maxWidth: '880px',
        background: 'linear-gradient(135deg, rgba(200,16,46,0.05) 0%, rgba(255,184,28,0.04) 100%)',
        border: '1px solid rgba(200,16,46,0.2)',
        borderRadius: '12px',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}
      data-cta-variant={variant}
      data-article-slug={props.slug}
    >
      <h2
        style={{
          fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          color: '#041E42',
          margin: '0 0 0.5rem',
          letterSpacing: '0.02em',
          lineHeight: 1.1,
        }}
      >
        {cfg.headline}
      </h2>
      <p
        style={{
          color: 'rgba(0,0,0,0.6)',
          fontSize: '0.95rem',
          maxWidth: '560px',
          margin: '0 auto 1.25rem',
          lineHeight: 1.5,
        }}
      >
        {cfg.body}
      </p>
      <Link
        href={cfg.ctaHref}
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: '#C8102E',
          color: '#fff',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '1rem',
          fontFamily: 'inherit',
          textAlign: 'center',
          maxWidth: '100%',
        }}
        className="article-cta-button"
      >
        {cfg.ctaLabel}
      </Link>
    </div>
  );
}