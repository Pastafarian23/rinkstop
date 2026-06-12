// Dynamic metadata for brand pages.
// Uses the same slug-or-uuid discrimination as the page handler.

import type { Metadata } from 'next';
import { getBrandBySlug, getBrandSlugMap } from '@/lib/brand-page';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  let slug = id;
  if (UUID_RE.test(id)) {
    const map = await getBrandSlugMap();
    slug = map.get(id) || id;
  }

  const data = await getBrandBySlug(slug);
  if (!data) return { title: 'Brand' };

  const { brand } = data;
  return {
    title: `${brand.name}`,
    description: `${brand.name} — ${(brand.category || 'hockey equipment brand').replace('_', ' ')} brand${brand.country_of_origin ? ` from ${brand.country_of_origin}` : ''}.`,
    openGraph: {
      title: `${brand.name}`,
      description: `${brand.name} — ${(brand.category || '').replace('_', ' ')} hockey brand${brand.country_of_origin ? ` from ${brand.country_of_origin}` : ''}.`,
      images: brand.logo_url
        ? [{ url: brand.logo_url, width: 400, height: 400 }]
        : [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
    },
  };
}
