import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/api/players?id=${id}`,
      { cache: 'no-store' }
    );
    const json = await res.json();
    const player = json?.data?.[0];

    if (!player) {
      return { title: 'Player Not Found | RinkStop' };
    }

    const fullName = `${player.first_name} ${player.last_name}`;
    const teamName = player.teams?.name || 'Unknown Team';
    const leagueName = player.teams?.leagues?.name || '';
    const position = player.position?.replace('_', ' ') || 'Hockey Player';

    const metaParts = [position];
    if (player.height_cm) metaParts.push(`${player.height_cm}cm`);
    if (player.nationality) metaParts.push(player.nationality);
    metaParts.push(`plays for ${teamName}`);
    if (leagueName) metaParts.push(`(${leagueName})`);
    const description = `${fullName} — ${metaParts.join(', ')}. View full profile, stats and career information on RinkStop.`;

    return {
      title: `${fullName} | ${teamName} | RinkStop`,
      description,
      openGraph: {
        title: `${fullName} | RinkStop`,
        description,
        type: 'profile',
        firstName: player.first_name,
        lastName: player.last_name,
        ...(player.headshot_url
          ? { images: [{ url: player.headshot_url, width: 200, height: 200, alt: fullName }] }
          : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${fullName} | RinkStop`,
        description,
        ...(player.headshot_url ? { images: [player.headshot_url] } : {}),
      },
      alternates: {
        canonical: `https://rinkstop.com/directory/players/${id}`,
      },
    };
  } catch (err) {
    console.error('Player metadata error:', err);
    return { title: 'Player | RinkStop' };
  }
}