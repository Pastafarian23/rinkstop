import type { Metadata } from 'next';
import { getCountryPageData, getCountryMetadata, countryToSlug } from '@/lib/country-page';
import CountryPageContent from '@/components/CountryPageContent';

const COUNTRY_NAME = 'Hungary';

const COUNTRY_FAQS = [
  {
    q: 'Are there ice rinks in Hungary?',
    a: 'Yes. Hungary has ice rinks in Budapest and other major cities, supporting hockey at recreational and competitive levels. RinkStop tracks rinks across Hungary in the directory.',
  },
  {
    q: 'What hockey leagues operate in Hungary?',
    a: 'Hungary has domestic hockey leagues including the OB I bajnokság and participates in international IIHF competition. RinkStop lists Hungarian leagues and teams alongside global hockey organizations.',
  },
  {
    q: 'Can I find hockey teams in Hungary?',
    a: 'Use the RinkStop directory to find hockey teams in Hungary. Browse by country or search for specific teams, rinks, and leagues across Europe.',
  },
  {
    q: 'Is ice hockey popular in Europe?',
    a: 'Ice hockey is popular across Europe, with strong hockey traditions in countries like Hungary, Czech Republic, Slovakia, Sweden, Finland, and Russia. RinkStop covers hockey across the continent.',
  },
];

export async function generateMetadata(): Promise<Metadata> {
  return getCountryMetadata(COUNTRY_NAME, countryToSlug(COUNTRY_NAME));
}

export const revalidate = 3600;
export const dynamicParams = true;

export default async function HungaryPage() {
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
            { '@type': 'ListItem', position: 4, name: 'Hungary', item: 'https://rinkstop.com/directory/hungary' },
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
