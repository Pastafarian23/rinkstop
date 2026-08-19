import type { Metadata } from 'next';
import { getCountryPageData, getCountryMetadata, countryToSlug } from '@/lib/country-page';
import CountryPageContent from '@/components/CountryPageContent';

const COUNTRY_NAME = 'Singapore';

const COUNTRY_FAQS = [
  {
    q: 'Are there ice rinks in Singapore?',
    a: 'Yes. Singapore has ice rinks including the Singapore Ice Palace and other facilities, supporting hockey at recreational and competitive levels. RinkStop tracks rinks across Singapore in the directory.',
  },
  {
    q: 'What hockey leagues operate in Singapore?',
    a: 'Singapore has domestic hockey leagues and participates in international IIHF competition. RinkStop lists Singaporean leagues and teams alongside global hockey organizations.',
  },
  {
    q: 'Can I find hockey teams in Singapore?',
    a: 'Use the RinkStop directory to find hockey teams in Singapore. Browse by country or search for specific teams, rinks, and leagues across Southeast Asia.',
  },
  {
    q: 'Is ice hockey popular in Southeast Asia?',
    a: 'Ice hockey is growing in Southeast Asia, with active hockey communities in Singapore, Thailand, the Philippines, and Malaysia. RinkStop covers hockey across the region.',
  },
];

export async function generateMetadata(): Promise<Metadata> {
  return getCountryMetadata(COUNTRY_NAME, countryToSlug(COUNTRY_NAME));
}

export const revalidate = 3600;
export const dynamicParams = true;

export default async function SingaporePage() {
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
            { '@type': 'ListItem', position: 4, name: 'Singapore', item: 'https://rinkstop.com/directory/singapore' },
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
