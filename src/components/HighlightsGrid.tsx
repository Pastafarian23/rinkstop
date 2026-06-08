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

export default function HighlightsGrid({
  limit = 8,
  teamFilter,
  teamName,
  matchId,
  title = 'Latest Highlights',
}: HighlightsGridProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Highlight | null>(null);

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
      <div style={{ padding: '2rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || highlights.length === 0) {
    return null;
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <div className="sec-head" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
          }}>
            {title.toUpperCase()}
          </h2>
          <Link href="/highlights" className="sec-link">View all highlights →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {highlights.map((highlight) => {
            const home = highlight.match.homeTeam;
            const away = highlight.match.awayTeam;
            const matchLabel = home && away ? `${home.abbreviation} vs ${away.abbreviation}` : '';

            return (
              <div
                key={highlight.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onClick={() => setSelected(highlight)}
              >
                {/* Thumbnail with centered play button */}
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
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />

                    {/* Centered RED play button — matching /highlights page exactly */}
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

                  {matchLabel && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '0.25rem 0.625rem', borderRadius: '4px',
                      background: 'rgba(200,16,46,0.15)', color: '#C8102E',
                      fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.75rem',
                    }}>
                      {matchLabel}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: highlight.source === 'youtube' ? '#FF0000' : '#fff' }}>
                        {highlight.source}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(highlight.match.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Video Modal — matching /highlights page exactly */}
      {selected && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ width: '100%', maxWidth: '900px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{selected.title}</h3>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px',
                  color: '#fff', padding: '0.5rem 1rem', cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
            {selected.embedUrl ? (
              <iframe
                src={selected.embedUrl}
                style={{ width: '100%', aspectRatio: '16/9', borderRadius: '8px' }}
                allowFullScreen
                title={selected.title}
              />
            ) : (
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', background: '#C8102E', color: '#fff',
                  padding: '1rem', borderRadius: '8px', textAlign: 'center',
                  textDecoration: 'none', fontWeight: 700,
                }}
              >
                Watch on {selected.source}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
