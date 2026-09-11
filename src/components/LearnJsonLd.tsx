/**
 * LearnJsonLd.tsx
 *
 * Server component: renders the Article + BreadcrumbList JSON-LD
 * schema for a /learn/* subpage. Used by all 24 /learn subpages to
 * give Google richer search results + E-E-A-T attribution.
 *
 * Why a server component (not a <script> in each page): centralizes
 * the schema generation so adding a new /learn page = import + one
 * line, not 30 lines of hand-written JSON-LD.
 *
 * Schema includes:
 *   - Article (the page itself) with author/publisher attribution
 *   - BreadcrumbList (Home > Learn > Page)
 *   - The page's `verified` date as both datePublished and dateModified
 *     (the page-level author byline matches the FAQ disclosure)
 *
 * Per the AI-assisted human-reviewed disclosure pattern (per MEMORY.md
 * 2026-09-03): Arnel Larracas is the byline; AI tools are mentioned
 * in the publisher description.
 */

interface LearnJsonLdProps {
  href: string;
  title: string;
  description: string;
  verified: string; // YYYY-MM-DD
  readTime: number; // minutes
}

export default function LearnJsonLd({ href, title, description, verified, readTime }: LearnJsonLdProps) {
  const fullUrl = `https://rinkstop.com${href}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      url: fullUrl,
      inLanguage: 'en-US',
      datePublished: verified,
      dateModified: verified,
      author: {
        '@type': 'Person',
        name: 'Arnel Larracas',
        url: 'https://rinkstop.com/profile/arnel-larracas',
        jobTitle: 'Founder & Editor-in-Chief',
      },
      publisher: {
        '@type': 'Organization',
        name: 'RinkStop',
        url: 'https://rinkstop.com/',
        logo: { '@type': 'ImageObject', url: 'https://rinkstop.com/og-image.png' },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': fullUrl },
      timeRequired: `PT${readTime}M`,
      isPartOf: { '@type': 'WebSite', name: 'RinkStop', url: 'https://rinkstop.com/' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com/' },
        { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://rinkstop.com/learn' },
        { '@type': 'ListItem', position: 3, name: title, item: fullUrl },
      ],
    },
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
