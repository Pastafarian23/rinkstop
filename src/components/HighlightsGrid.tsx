'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
          const home = highlight.match.homeTeam;
          const away = highlight.match.awayTeam;
          const score = home && away ? `${home.abbreviation} vs ${away.abbreviation}` : '';
          const href = `/highlights/${highlight.id}/${slugify(highlight.title)}`;

          return (
            <Link
              key={highlight.id}
              href={href}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                cursor: 'pointer',
              }}>
                {/* Thumbnail / Video Preview */}
                <div style={{ position: 'relative' }}>
                  <div style={{ aspectRatio: '16/9', background: '#041E42', position: 'relative' }}>
                    {highlight.imageUrl ? (
                      <img
                        src={highlight.imageUrl}
                        alt={highlight.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null}
                    {/* Gradient overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
                    }} />
                    {/* Play button */}
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 56, height: 56,
                      background: 'rgba(200,16,46,0.9)',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    {/* Type badge */}
                    <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
                      <span style={{
                        fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.08em',
                        padding: '0.25rem 0.5rem', borderRadius: '4px',
                        background: highlight.type === 'VERIFIED' ? '#16A34A' : '#F59E0B',
                        color: '#fff',
                      }}>
                        {highlight.type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '1rem' }}>
                  <h3 style={{
                    fontWeight: 700, fontSize: '0.9375rem', color: '#fff',
                    lineHeight: 1.4, marginBottom: '0.5rem',
                  }}>
                    {highlight.title}
                  </h3>

                  {score && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '0.25rem 0.625rem', borderRadius: '4px',
                      background: 'rgba(200,16,46,0.15)', color: '#C8102E',
                      fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {score}
                    </div>
                  )}

                  {highlight.match.date && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
                    }}>
                      {new Date(highlight.match.date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}