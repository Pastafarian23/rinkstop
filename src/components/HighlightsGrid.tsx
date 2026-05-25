'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mapTeamForHighlights } from '@/lib/highlights-helpers';

interface Highlight {
  id: number;
  title: string;
  description: string;
  type: string;
  url: string;
  embedUrl: string | null;
  imageUrl: string;
  source: string;
  channel: string | null;
  match: {
    id: number;
    league: string;
    season: number;
    date: string;
    round: string;
    homeTeam: {
      id: number;
      name: string;
      displayName: string;
      abbreviation: string;
      logo: string;
    } | null;
    awayTeam: {
      id: number;
      name: string;
      displayName: string;
      abbreviation: string;
      logo: string;
    } | null;
  };
}

interface HighlightsGridProps {
  limit?: number;
  teamFilter?: 'homeTeamName' | 'awayTeamName';
  teamName?: string;
  matchId?: string;
  title?: string;
  columns?: 2 | 3 | 4;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default function HighlightsGrid({
  limit = 8,
  teamFilter,
  teamName,
  matchId,
  title = 'Latest Highlights',
  columns = 4,
}: HighlightsGridProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchHighlights() {
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        params.append('youtubeOnly', 'true');
        const normalizedTeam = teamFilter && teamName ? mapTeamForHighlights(teamName) : teamName;
        if (teamFilter && normalizedTeam) {
          params.append(teamFilter, normalizedTeam);
        }
        if (matchId) {
          params.append('matchId', matchId);
        }

        const res = await fetch(`/api/highlights?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const filtered = (data.highlights || []).filter((h: Highlight) => h.source === 'youtube' || !!h.embedUrl);
        setHighlights(filtered);
      } catch (err) {
        setError('Failed to load highlights');
      } finally {
        setLoading(false);
      }
    }

    fetchHighlights();
  }, [limit, teamFilter, teamName, matchId]);

  if (loading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-bold mb-6 text-[#041E42]">{title}</h2>
        <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error || highlights.length === 0) {
    return null;
  }

  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-6 text-[#041E42]">{title}</h2>
      <div className={`grid grid-cols-1 ${gridCols[columns]} gap-6`}>
        {highlights.map((highlight) => {
          const score = highlight.match.homeTeam && highlight.match.awayTeam
            ? `${highlight.match.homeTeam.abbreviation} vs ${highlight.match.awayTeam.abbreviation}`
            : '';
          const href = `/highlights/${highlight.id}/${slugify(highlight.title)}`;

          return (
            <a
              key={highlight.id}
              href={href}
              className="group block cursor-pointer"
            >
              <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-video">
                {highlight.imageUrl ? (
                  <img
                    src={highlight.imageUrl}
                    alt={highlight.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#041E42]" />
                )}
                {/* Centered play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-black/70 transition-colors">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {/* Type badge */}
                {highlight.type === 'VERIFIED' && (
                  <div className="absolute top-2 left-2">
                    <span className="text-xs px-2 py-1 rounded bg-green-600 text-white">
                      {highlight.type}
                    </span>
                  </div>
                )}
                {/* Score overlay bottom */}
                {score && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <span className="text-xs font-semibold text-white">{score}</span>
                  </div>
                )}
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-[#041E42] line-clamp-2 group-hover:text-[#C8102E] transition-colors">
                  {highlight.title}
                </h3>
                <div className="mt-1 text-sm text-gray-500 flex items-center gap-2">
                  {highlight.match.date && (
                    <span>{new Date(highlight.match.date).toLocaleDateString()}</span>
                  )}
                  {score && (
                    <>
                      <span>•</span>
                      <span>{score}</span>
                    </>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
