import type { Metadata } from 'next';
import BrandDetail from '../../brands/[id]/page';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/api/brands`, { cache: 'no-store' });
    const brands = await res.json();
    const brand = brands.find((b: any) => b.id === id);
    if (brand) {
      return {
        title: `${brand.name} | RinkStop`,
        description: `${brand.name} — ${brand.category?.replace('_', ' ')} hockey equipment brand.`,
        openGraph: {
          title: `${brand.name} | RinkStop`,
          images: brand.logo_url ? [{ url: brand.logo_url, width: 400, height: 400 }] : [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
        },
      };
    }
  } catch { /* ignore */ }
  return { title: 'Brand | RinkStop' };
}

export default BrandDetail;