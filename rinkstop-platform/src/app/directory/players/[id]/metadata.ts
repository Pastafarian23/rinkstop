import type { Metadata } from 'next';
import PlayerDetail from '../../players/[id]/page';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/api/players?id=${id}`, { cache: 'no-store' });
    const data = await res.json();
    const player = data?.data?.[0];
    if (player) {
      return {
        title: `${player.first_name} ${player.last_name} | RinkStop`,
        description: `${player.first_name} ${player.last_name} — ${player.position || 'Hockey player'} for ${player.teams?.name || 'team'}. View stats and profile on RinkStop.`,
        openGraph: {
          title: `${player.first_name} ${player.last_name} | RinkStop`,
          images: player.headshot_url ? [{ url: player.headshot_url, width: 200, height: 200 }] : [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
        },
      };
    }
  } catch { /* ignore */ }
  return { title: 'Player | RinkStop' };
}

export default PlayerDetail;