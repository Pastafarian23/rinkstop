import type { Metadata } from 'next';
import { getCountryPageData, getCountryMetadata, countryToSlug } from '@/lib/country-page';
import CountryPageContent from '@/components/CountryPageContent';

const COUNTRY_NAME = 'Saudi Arabia';

const COUNTRY_FAQS = [
  {
    q: 'Are there ice rinks in Saudi Arabia?',
    a: 'Yes. Saudi Arabia has ice rinks in major cities including Riyadh, supporting hockey at recreational and competitive levels. RinkStop tracks rinks across Saudi Arabia in the directory.',
  },
  {
    q: 'What hockey leagues operate in Saudi Arabia?',
    a: 'Saudi Arabia has domestic hockey leagues and participates in international IIHF competition. RinkStop lists Saudi Arabian leagues and teams alongside global hockey organizations.',
  },
  {
    q: 'Can I find hockey teams in Saudi Arabia?',
    a: 'Use the RinkStop directory to find hockey teams in Saudi Arabia. Browse by country or search for specific teams, rinks, and leagues across the Middle East.',
  },
  {
    q: 'Is ice hockey growing in the Middle East?',
    a: 'Ice hockey is growing in the Middle East, with active hockey communities in Saudi Arabia, the UAE, and Qatar. RinkStop covers hockey across the region.',
  },
];

export async function generateMetadata(): Promise<Metadata> {
  return getCountryMetadata(COUNTRY_NAME, countryToSlug(COUNTRY_NAME));
}

export const revalidate = 3600;
export const dynamicParams = true;

export default async function SaudiArabiaPage() {
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
            { '@type': 'ListItem', position: 4, name: 'Saudi Arabia', item: 'https://rinkstop.com/directory/saudi-arabia' },
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
