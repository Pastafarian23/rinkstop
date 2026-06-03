import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function UKCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: citySlug } = await params;
  const cityName = citySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const { data: rinks, error } = await supabase
    .from('rinks')
    .select('id, name, slug, address, phone, website_url, notes')
    .eq('country', 'United Kingdom')
    .eq('is_active', true)
    .ilike('city', `%${cityName}%`)
    .order('name');

  return (
    <div>
      <h1>Test: {cityName}</h1>
      <p>Found {rinks?.length || 0} rinks</p>
      {error && <p>Error: {error.message}</p>}
      <ul>
        {rinks?.map(r => (
          <li key={r.id}>
            {r.name} - {r.address}
            {r.website_url && <Link href={r.website_url}>Website</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
