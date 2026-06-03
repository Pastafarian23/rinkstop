import type { Metadata } from 'next';
import { getCountryPageData, getCountryMetadata, countryToSlug } from '@/lib/country-page';
import CountryPageContent from '@/components/CountryPageContent';

const COUNTRY_NAME = 'Japan';

export async function generateMetadata(): Promise<Metadata> {
  return getCountryMetadata(COUNTRY_NAME, countryToSlug(COUNTRY_NAME));
}

export const dynamic = 'force-dynamic';

export default async function JapanPage() {
  const data = await getCountryPageData(COUNTRY_NAME);
  return <CountryPageContent data={data} />;
}
