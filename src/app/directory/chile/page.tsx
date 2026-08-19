import type { Metadata } from 'next';
import { getCountryPageData, getCountryMetadata, countryToSlug } from '@/lib/country-page';
import CountryPageContent from '@/components/CountryPageContent';

const COUNTRY_NAME = 'Chile';

// FAQ data for JSON-LD
const COUNTRY_FAQS = [
  {
    q: 'Are there ice rinks in Chile?',
    a: 'Yes. Chile has ice rinks primarily in Santiago and other major cities, supporting hockey at recreational and competitive levels. RinkStop tracks rinks across Chile in the directory.',
  },
  {
    q: 'What hockey leagues operate in Chile?',
    a: 'Chile has domestic hockey leagues and participates in international IIHF competition. RinkStop lists Chilean leagues and teams in the directory alongside global hockey organizations.',
  },
  {
    q: 'Can I find hockey teams in Chile?',
    a: 'Use the RinkStop directory to find hockey teams in Chile. Browse by country or search for specific teams, rinks, and leagues across South America.',
  },
  {
    q: 'Is ice hockey popular in South America?',
    a: 'Ice hockey is growing in South America. Countries like Chile, Argentina, and Brazil have active hockey communities with rinks, leagues, and youth programs. RinkStop covers hockey across the continent.',
  },
];

export async function generateMetadata(): Promise<Metadata> {
  return getCountryMetadata(COUNTRY_NAME, countryToSlug(COUNTRY_NAME));
}

export const revalidate = 3600;
export const dynamicParams = true;

export default async function ChilePage() {
  const data = await getCountryPageData(COUNTRY_NAME);

  return (
    <>
      {(() => {
        const breadcrumbSchema = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com/' },
            { '@type': 'ListItem', position: 2, name: 'Directory', item: 'https://rinkstop.com/directory' },
            { '@type': 'ListItem', position: 3, name: 'Countries', item: 'https://rinkstop.com/directory' },
            { '@type': 'ListItem', position: 4, name: 'Chile', item: 'https://rinkstop.com/directory/chile' },
          ],
        };
        const faqSchema = {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: COUNTRY_FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        };
        return (
          <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
          </>
        );
      })()}
      <CountryPageContent data={data} />
    </>
  );
}
