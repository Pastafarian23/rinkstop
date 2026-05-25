import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import VideoPageClient from './VideoPageClient';

const NHL_BASE = 'https://nhl.highlightly.net';
const HOCKEY_BASE = 'https://hockey.highlightly.net';
const API_KEY = '***REMOVED***';

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

// Generate slug from title for SEO-friendly URL
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Fetch highlight data from highlightly API
async function getHighlight(id: number, league?: string) {
  const isNHL = !league ||
    league?.toUpperCase() === 'NHL' ||
    league?.toUpperCase() === 'NCAAH' ||
    league?.toUpperCase() === 'NHL/NCAAH';
  const BASE_URL = isNHL ? NHL_BASE : HOCKEY_BASE;
  const HOST = isNHL ? 'nhl-ncaah-api.p.rapidapi.com' : 'hockey-highlights-api.p.rapidapi.com';

  const res = await fetch(`${BASE_URL}/highlights?limit=100&offset=0`, {
    headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': HOST },
    next: { revalidate: 60 }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.data || []).find((h: any) => h.id === id);
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, slug } = await params;
  const highlightId = parseInt(id);
  if (isNaN(highlightId)) return {};

  // Try NHL first
  let h = await getHighlight(highlightId, 'NHL');
  if (!h) h = await getHighlight(highlightId, 'KHL');

  if (!h) {
    return {
      title: 'Highlight Not Found | RinkStop',
      description: 'This hockey highlight could not be found.',
    };
  }

  const title = h.title || 'Hockey Highlight';
  const description = `${title} — Watch on RinkStop. ${h.description || ''}`.slice(0, 160);
  const imageUrl = h.imgUrl || '';
  const videoUrl = h.embedUrl || h.url || '';
  const type = h.type === 'VERIFIED' ? 'video.other' : 'video.other';
  const date = h.match?.date ? new Date(h.match.date).toISOString() : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'video.other',
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630 }] : [],
      videos: videoUrl ? [{ url: videoUrl, width: 1280, height: 720, type: 'text/html' }] : [],
      siteName: 'RinkStop',
    },
    twitter: {
      card: 'player',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
    alternates: {
      canonical: `https://rinkstop.com/highlights/${id}/${slugify(title)}`,
    },
    other: {
      'og:type': 'video.other',
      'og:video:url': videoUrl,
      'og:video:secure_url': videoUrl,
      'og:video:type': 'text/html',
      'og:video:width': '1280',
      'og:video:height': '720',
      ...(date ? { 'article:published_time': date } : {}),
    },
  };
}

export default async function HighlightPage({ params }: Props) {
  const { id, slug } = await params;
  const highlightId = parseInt(id);
  if (isNaN(highlightId)) notFound();

  // Try NHL first, then other leagues
  let h = await getHighlight(highlightId, 'NHL');
  if (!h) h = await getHighlight(highlightId, 'KHL');
  if (!h) h = await getHighlight(highlightId);

  if (!h) notFound();

  const highlight = {
    id: h.id,
    title: h.title,
    description: h.description || '',
    type: h.type,
    url: h.url,
    embedUrl: h.embedUrl,
    imageUrl: h.imgUrl,
    source: h.source,
    channel: h.channel,
    match: {
      id: h.match?.id,
      league: h.match?.league,
      season: h.match?.season,
      date: h.match?.date,
      round: h.match?.round,
      homeTeam: h.match?.homeTeam ? {
        id: h.match.homeTeam.id,
        name: h.match.homeTeam.name,
        displayName: h.match.homeTeam.displayName,
        abbreviation: h.match.homeTeam.abbreviation,
        logo: h.match.homeTeam.logo,
      } : null,
      awayTeam: h.match?.awayTeam ? {
        id: h.match.awayTeam.id,
        name: h.match.awayTeam.name,
        displayName: h.match.awayTeam.displayName,
        abbreviation: h.match.awayTeam.abbreviation,
        logo: h.match.awayTeam.logo,
      } : null,
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
    duration: undefined, // highlightly doesn't provide duration
    publisher: {
      '@type': 'Organization',
      name: 'RinkStop',
      logo: {
        '@type': 'ImageObject',
        url: 'https://rinkstop.com/rinkstoplogo.png',
      },
    },
    ...(highlight.match?.league ? { articleSection: highlight.match.league } : {}),
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
}
