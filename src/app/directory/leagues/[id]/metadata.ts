import type { Metadata } from 'next';
import LeagueDetail from '../../leagues/[id]/page';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/api/leagues`, { cache: 'no-store' });
    const leagues = await res.json();
    const league = leagues.find((l: any) => l.id === id);
    if (league) {
      return {
        title: `${league.name} | RinkStop`,
        description: `${league.name} — ${league.country}. ${league.level?.replace('_', ' ')} hockey league on RinkStop.`,
        openGraph: {
          title: `${league.name} | RinkStop`,
          images: league.logo_url ? [{ url: league.logo_url, width: 400, height: 400 }] : [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
        },
      };
    }
  } catch { /* ignore */ }
  return { title: 'League' };
}

export default LeagueDetail;