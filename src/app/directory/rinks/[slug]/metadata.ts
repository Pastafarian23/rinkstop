import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/api/rinks?slug=${id}`,
      { cache: 'no-store' }
    );
    const rink = await res.json();

    if (!rink) {
      return { title: 'Rink Not Found' };
    }

    const fullName = rink.name || 'Unnamed Rink';
    const city = rink.city || '';
    const province = rink.province_state || '';
    const country = rink.country || '';
    const location = [city, province, country].filter(Boolean).join(', ');
    
    // Build SEO-rich description
    const capacityStr = rink.capacity ? ` with capacity for ${rink.capacity.toLocaleString()} fans` : '';
    const iceSizeStr = rink.ice_size ? `, ${rink.ice_size} ice surface` : '';
    const surfaceStr = rink.surface_type ? `, ${rink.surface_type} surface` : '';
    const description = `${fullName} in ${location}. Find upcoming hockey games, teams, leagues, and reviews${capacityStr}${iceSizeStr}${surfaceStr}. View rink details, schedule, location map, and more on RinkStop.`;

    // Build keywords
    const keywords = [
      fullName,
      rink.name,
      `ice rink ${city}`,
      `ice rink ${country}`,
      `hockey rink ${city}`,
      `hockey rink ${country}`,
      `${city} ice arena`,
      `${country} hockey rinks`,
      'find hockey rink',
      'rinkstop',
    ].filter(Boolean);

    const title = `${fullName} | ${city}${province ? ', ' + province : ''} | RinkStop`;

    return {
      title,
      description,
      keywords: keywords.join(', '),
      openGraph: {
        title,
        description,
        type: 'website',
        ...(rink.logo_url ? { images: [{ url: rink.logo_url, width: 200, height: 200, alt: fullName }] } : {}),
      },
      twitter: {
        card: 'summary',
        title,
        description,
        ...(rink.logo_url ? { images: [rink.logo_url] } : {}),
      },
      alternates: {
        canonical: `https://rinkstop.com/directory/rinks/${rink.slug}`,
      },
    };
  } catch (err) {
    console.error('Rink metadata error:', err);
    return { title: 'Rink' };
  }
}