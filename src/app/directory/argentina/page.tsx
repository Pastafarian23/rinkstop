import type { Metadata } from 'next';
import { getCountryPageData, getCountryMetadata, countryToSlug } from '@/lib/country-page';
import CountryPageContent from '@/components/CountryPageContent';

const COUNTRY_NAME = 'Argentina';

const COUNTRY_FAQS = [
  {
    q: 'Are there ice rinks in Argentina?',
    a: 'Yes. Argentina has ice rinks in Buenos Aires and other major cities, supporting hockey at recreational and competitive levels. RinkStop tracks rinks across Argentina in the directory.',
  },
  {
    q: 'What hockey leagues operate in Argentina?',
    a: 'Argentina has domestic hockey leagues and participates in international IIHF competition. RinkStop lists Argentine leagues and teams alongside global hockey organizations.',
  },
  {
    q: 'Can I find hockey teams in Argentina?',
    a: 'Use the RinkStop directory to find hockey teams in Argentina. Browse by country or search for specific teams, rinks, and leagues across South America.',
  },
  {
    q: 'Is ice hockey popular in South America?',
    a: 'Ice hockey is growing in South America. Argentina, Chile, and Brazil have active hockey communities with rinks, leagues, and youth programs. RinkStop covers hockey across the continent.',
  },
];

export async function generateMetadata(): Promise<Metadata> {
  return getCountryMetadata(COUNTRY_NAME, countryToSlug(COUNTRY_NAME));
}

export const revalidate = 3600;
export const dynamicParams = true;

export default async function ArgentinaPage() {
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
            { '@type': 'ListItem', position: 4, name: 'Argentina', item: 'https://rinkstop.com/directory/argentina' },
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
