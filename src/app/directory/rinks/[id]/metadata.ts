import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/api/rinks?id=${id}`,
      { cache: 'no-store' }
    );
    const rink = await res.json();

    if (!rink) {
      return { title: 'Rink Not Found | RinkStop' };
    }

    const fullName = rink.name || 'Unnamed Rink';
    const location = [rink.city, rink.province_state, rink.country].filter(Boolean).join(', ');
    const description = `${fullName}${location ? ' — ' + location : ''}. Ice rink${rink.capacity ? ' with capacity for ' + rink.capacity.toLocaleString() + ' fans' : ''}. View location, schedule, teams, and reviews on RinkStop.`;

    return {
      title: `${fullName} | RinkStop`,
      description,
      openGraph: {
        title: `${fullName} | RinkStop`,
        description,
        type: 'website',
        ...(rink.logo_url ? { images: [{ url: rink.logo_url, width: 200, height: 200, alt: fullName }] } : {}),
      },
      twitter: {
        card: 'summary',
        title: `${fullName} | RinkStop`,
        description,
        ...(rink.logo_url ? { images: [rink.logo_url] } : {}),
      },
      alternates: {
        canonical: `https://rinkstop.com/directory/rinks/${id}`,
      },
    };
  } catch (err) {
    console.error('Rink metadata error:', err);
    return { title: 'Rink | RinkStop' };
  }
}