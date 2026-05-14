import type { Metadata } from 'next';
import RinkDetail from '../../rinks/[id]/page';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/api/rinks`, { cache: 'no-store' });
    const rinks = await res.json();
    const rink = rinks.find((r: any) => r.id === id);
    if (rink) {
      return {
        title: `${rink.name} | RinkStop`,
        description: `${rink.name} — ${rink.city}, ${rink.province_state || rink.country}. Ice rink on RinkStop.`,
        openGraph: {
          title: `${rink.name} | RinkStop`,
          images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
        },
      };
    }
  } catch { /* ignore */ }
  return { title: 'Rink | RinkStop' };
}

export default RinkDetail;