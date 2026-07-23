import type { Metadata } from 'next';
import { getCountryPageData, getCountryMetadata, slugToCountry, countryToSlug } from '@/lib/country-page';
import CountryPageContent from '@/components/CountryPageContent';

interface Props {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: countrySlug } = await params;
  const countryName = slugToCountry(countrySlug);
  return getCountryMetadata(countryName, countryToSlug(countryName));
}

export const revalidate = 3600;
export const dynamicParams = true;

export default async function CountryPage({ params }: Props) {
  const { country: countrySlug } = await params;
  const countryName = slugToCountry(countrySlug);
  const data = await getCountryPageData(countryName);
  return <CountryPageContent data={data} />;
}
