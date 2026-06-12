import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/api/teams?slug=${slug}`, { cache: 'no-store' });
    const data = await res.json();
    const team = data?.data?.[0];
    if (team) {
      return {
        title: `${team.name} | RinkStop — Hockey Directory`,
        description: `${team.name}${team.city ? ` — ${team.city}, ${team.country}` : ` — ${team.country}`}. View roster, stats, arena, and notable players on RinkStop.`,
        openGraph: {
          title: `${team.name} | RinkStop`,
          description: `${team.name} — hockey team on RinkStop.`,
          images: team.logo_url ? [{ url: team.logo_url, width: 400, height: 400 }] : [],
        },
        alternates: {
          canonical: `https://rinkstop.com/directory/teams/${team.slug || slug}`,
        },
      };
    }
  } catch { /* ignore */ }
  return { title: 'Team | RinkStop' };
}