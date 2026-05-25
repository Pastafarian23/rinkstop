'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';

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
    homeTeam: { id: number; name: string; displayName: string; abbreviation: string; logo: string } | null;
    awayTeam: { id: number; name: string; displayName: string; abbreviation: string; logo: string } | null;
  };
}

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);

  useEffect(() => {
    async function fetchHighlights() {
      try {
        const res = await fetch(`/api/highlights?limit=12&offset=0`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setHighlights(data.highlights || []);
        setHasMore((data.pagination?.totalCount || 0) > 12);
      } catch (err) {
        setError('Failed to load highlights');
      } finally {
        setLoading(false);
      }
    }
    fetchHighlights();
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const newOffset = offset + 12;
      const res = await fetch(`/api/highlights?limit=12&offset=${newOffset}`);
      const data = await res.json();
      setHighlights(prev => [...prev, ...(data.highlights || [])]);
      setOffset(newOffset);
      setHasMore(highlights.length + (data.highlights || []).length < (data.pagination?.totalCount || 0));
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D1117', color: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: "'Bebas Neue', Impact, sans-serif", color: '#C8102E' }}>
              Loading highlights...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>NHL Highlights | RinkStop</title>
        <meta name=\"description\" content=\"Watch the latest NHL hockey highlights from RinkStop.\" />
      </Head>

      {/* Modal for video embed */}
      {selectedHighlight && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedHighlight(null)}
        >
          <div
            style={{ width: '100%', maxWidth: '900px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{selectedHighlight.title}</h3>
              <button
                onClick={() => setSelectedHighlight(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px',
                  color: '#fff', padding: '0.5rem 1rem', cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
            {selectedHighlight.embedUrl ? (
              <iframe
                src={selectedHighlight.embedUrl}
                style={{ width: '100%', aspectRatio: '16/9', borderRadius: '8px' }}
                allowFullScreen
                title={selectedHighlight.title}
              />
            ) : (
              <a
                href={selectedHighlight.url}
                target=\"_blank\"
                rel=\"noopener noreferrer\"
                style={{
                  display: 'block', background: '#C8102E', color: '#fff',
                  padding: '1rem', borderRadius: '8px', textAlign: 'center',
                  textDecoration: 'none', fontWeight: 700,
                }}
              >
                Watch on {selectedHighlight.source}
              </a>
            )}
          </div>
        </div>
      )}

      <div style={{ minHeight: '100vh', background: '#0D1117', color: '#fff' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #041E42 0%, #0A2E5C 100%)',
          padding: 'clamp(2rem, 5vw, 3rem) 0',
          borderBottom: '4px solid #C8102E',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E' }}>
              Video
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontFamily: "'Bebas Neue', Impact, sans-serif", color: '#fff', lineHeight: 1, marginBottom: '0.75rem' }}>
              NHL HIGHLIGHTS
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', maxWidth: '600px' }}>
              Watch the latest NHL game highlights, best plays, and memorable moments from across professional hockey.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '1rem 0',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Filter:
            </span>
            <Link href=\"/highlights\" style={{ padding: '0.375rem 0.875rem', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: 600, background: '#C8102E', color: '#fff', textDecoration: 'none' }}>
              All
            </Link>
            <Link href=\"/highlights?league=NHL\" style={{ padding: '0.375rem 0.875rem', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: 600, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
              NHL
            </Link>
            <Link href=\"/highlights?league=NCAAH\" style={{ padding: '0.375rem 0.875rem', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: 600, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
              NCAAH
            </Link>
          </div>
        </div>

        {/* Highlights Grid */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          {error ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                style={{ background: '#C8102E', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.75rem 1.5rem', cursor: 'pointer', fontWeight: 700 }}
              >
                Retry
              </button>
            </div>
          ) : highlights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.125rem' }}>No highlights available yet.</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Check back soon for the latest NHL highlights.</p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}>
                {highlights.map(highlight => {
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
                        transition: 'border-color 0.2s',
                      }}
                    >
                      {/* Thumbnail / Video Preview */}
                      <div
                        style={{ position: 'relative', cursor: 'pointer' }}
                        onClick={() => setSelectedHighlight(highlight)}
                      >
                        <div style={{ aspectRatio: '16/9', background: '#041E42', position: 'relative' }}>
                          {highlight.imageUrl ? (
                            <img
                              src={highlight.imageUrl}
                              alt={highlight.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : null}
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
                            <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"white\">
                              <path d=\"M8 5v14l11-7z\" />
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
                        <h3
                          style={{
                            fontWeight: 700, fontSize: '0.9375rem', color: '#fff',
                            lineHeight: 1.4, marginBottom: '0.5rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelectedHighlight(highlight)}
                        >
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
                            {highlight.channel && (
                              <>
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                                <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{highlight.channel}</span>
                              </>
                            )}
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

              {/* Load More */}
              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    style={{
                      background: loadingMore ? 'rgba(200,16,46,0.5)' : '#C8102E',
                      color: '#fff', border: 'none', borderRadius: '8px',
                      padding: '0.875rem 2rem', fontSize: '0.9375rem', fontWeight: 700,
                      cursor: loadingMore ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loadingMore ? 'Loading...' : 'Load More Highlights'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}