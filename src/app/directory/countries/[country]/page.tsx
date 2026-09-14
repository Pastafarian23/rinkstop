// WS27 PR4 — fix 404 on /directory/countries/{country} by redirecting to the
// canonical country page. The [country] dynamic route at /directory/{country}
// (e.g. /directory/finland) is the live canonical URL.
//
// Mapping covers all countries with hasHockey: true in the countries index
// that have a corresponding country page at /directory/{slug}. Countries
// without a known mapping redirect to the countries index.

import { redirect } from 'next/navigation';

const COUNTRY_MAP: Record<string, string> = {
  // hasHockey: true + has directory page
  'argentina': 'argentina',
  'australia': 'australia',
  'austria': 'austria',
  'brazil': 'brazil',
  'canada': 'canada',
  'chile': 'chile',
  'china': 'china',
  'czech republic': 'czech-republic',
  'denmark': 'denmark',
  'finland': 'finland',
  'france': 'france',
  'germany': 'germany',
  'hungary': 'hungary',
  'india': 'india',
  'indonesia': 'indonesia',
  'italy': 'italy',
  'japan': 'japan',
  'malaysia': 'malaysia',
  'mexico': 'mexico',
  'netherlands': 'netherlands',
  'new zealand': 'new-zealand',
  'norway': 'norway',
  'philippines': 'philippines',
  'russia': 'russia',
  'singapore': 'singapore',
  'south korea': 'south-korea',
  'sweden': 'sweden',
  'switzerland': 'switzerland',
  'thailand': 'thailand',
  'united kingdom': 'united-kingdom',
  'united states': 'united-states',
  'usa': 'united-states',
  // aliases
  'uk': 'united-kingdom',
  'us': 'united-states',
  'america': 'united-states',
  'czechia': 'czech-republic',
  'korea': 'south-korea',
  'korean': 'south-korea',
};

export default async function CountryRedirect({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  const slug = COUNTRY_MAP[country.toLowerCase().trim()];
  if (slug) {
    redirect(`/directory/${slug}`);
  }
  // No known mapping — send to the countries index rather than a bare 404
  redirect('/directory/countries');
}
