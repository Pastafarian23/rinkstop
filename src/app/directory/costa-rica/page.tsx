import type { Metadata } from 'next';
import { getCountryPageData, getCountryMetadata, countryToSlug } from '@/lib/country-page';
import CountryPageContent from '@/components/CountryPageContent';

const COUNTRY_NAME = 'Costa Rica';

export async function generateMetadata(): Promise<Metadata> {
  return getCountryMetadata(COUNTRY_NAME, countryToSlug(COUNTRY_NAME));
}

export const revalidate = 3600;
export const dynamicParams = true;

export default async function CostaRicaPage() {
  const data = await getCountryPageData(COUNTRY_NAME);
  return <CountryPageContent data={data} />;
}
