import type { Metadata } from 'next';
import TeamDetail from '../../teams/[id]/page';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/api/teams?id=${id}`, { cache: 'no-store' });
    const data = await res.json();
    const team = data?.data?.[0];
    if (team) {
      return {
        title: `${team.name} | RinkStop`,
        description: `${team.name}${team.city ? ` — ${team.city}, ${team.country}` : ` — ${team.country}`}. View team roster, stats, and details on RinkStop.`,
        openGraph: {
          title: `${team.name} | RinkStop`,
          description: `${team.name} — hockey team on RinkStop.`,
          images: team.logo_url ? [{ url: team.logo_url, width: 400, height: 400 }] : [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
        },
      };
    }
  } catch { /* ignore */ }
  return { title: 'Team | RinkStop' };
}

export default TeamDetail;