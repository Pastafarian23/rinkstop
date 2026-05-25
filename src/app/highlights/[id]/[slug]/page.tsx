import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import VideoPageClient from './VideoPageClient';

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const highlightId = parseInt(id);
  if (isNaN(highlightId)) return {};

  try {
    const res = await fetch(`https://rinkstop.com/api/highlights?limit=20&youtubeOnly=true`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const h = (data.highlights || []).find((x: any) => x.id === highlightId);
    if (!h) return {};

    const title = h.title || 'Hockey Highlight';
    const description = `${title}${h.match?.homeTeam && h.match?.awayTeam ? ` — ${h.match.homeTeam.abbreviation} vs ${h.match.awayTeam.abbreviation}` : ''}`.slice(0, 160);
    const imageUrl = h.imageUrl || '';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'video.other',
        images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630 }] : [],
        siteName: 'RinkStop',
      },
      twitter: {
        card: 'player',
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
      alternates: {
        canonical: `https://rinkstop.com/highlights/${highlightId}/${slugify(title)}`,
      },
    };
  } catch {
    return {};
  }
}

export default async function HighlightPage({ params }: Props) {
  const { id, slug } = await params;
  const highlightId = parseInt(id);
  if (isNaN(highlightId)) notFound();

  try {
    // Fetch from rinkstop API (same server — no external DNS issues)
    const res = await fetch(`https://rinkstop.com/api/highlights?limit=20&youtubeOnly=true`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) notFound();
    const data = await res.json();
    const h = (data.highlights || []).find((x: any) => x.id === highlightId);
    if (!h) notFound();

    const highlight = {
      id: h.id,
      title: h.title,
      description: h.description || '',
      type: h.type,
      url: h.url,
      embedUrl: h.embedUrl,
      imageUrl: h.imageUrl,
      source: h.source,
      channel: h.channel,
      match: {
        id: h.match?.id,
        league: h.match?.league,
        season: h.match?.season,
        date: h.match?.date,
        round: h.match?.round,
        homeTeam: h.match?.homeTeam,
        awayTeam: h.match?.awayTeam,
      },
    };

    // JSON-LD VideoObject schema
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: highlight.title,
      description: highlight.description,
      thumbnailUrl: highlight.imageUrl,
      embedUrl: highlight.embedUrl,
      uploadDate: highlight.match?.date ? new Date(highlight.match.date).toISOString() : undefined,
      publisher: {
        '@type': 'Organization',
        name: 'RinkStop',
        logo: {
          '@type': 'ImageObject',
          url: 'https://rinkstop.com/rinkstoplogo.png',
        },
      },
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <VideoPageClient highlight={highlight} />
      </>
    );
  } catch {
    notFound();
  }
}
