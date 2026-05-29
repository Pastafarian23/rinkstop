'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useSearchParams } from 'next/navigation';

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

function HighlightsContent() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [activeLeague, setActiveLeague] = useState<string>('');
  const [youtubeOnly, setYoutubeOnly] = useState(true);
  const searchParams = useSearchParams();

  // Read league from URL on mount
  useEffect(() => {
    const league = searchParams.get('league') || '';
    setActiveLeague(league);
    fetchHighlights(league, 0);
  }, [searchParams]);

  async function fetchHighlights(league: string, offsetVal: number) {
    setLoading(true);
    try {
      let url = `/api/highlights?limit=12&offset=${offsetVal}`;
      // Only apply youtubeOnly filter for NHL and All (NCAA has no YouTube content)
      if (youtubeOnly) url += '&youtubeOnly=true';
      if (league) url += `&leagueName=${encodeURIComponent(league)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      let data = await res.json();
      let filtered = (data.highlights || []).filter((h: Highlight) => h.source === 'youtube' || !!h.embedUrl);
      
      // If youtube filter returns nothing for NCAA, fall back to showing all NCAA sources
      if (league && filtered.length === 0 && data.highlights?.length > 0) {
        filtered = data.highlights;
      }
      
      setHighlights(filtered);
      setOffset(offsetVal);
      setHasMore((data.pagination?.totalCount || 0) > filtered.length);
    } catch (err) {
      setError('Failed to load highlights');
    } finally {
      setLoading(false);
    }
  }

  function handleLeagueFilter(league: string) {
    setActiveLeague(league);
    fetchHighlights(league, 0);
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const newOffset = offset + 12;
      let url = `/api/highlights?limit=12&offset=${newOffset}&youtubeOnly=true`;
      if (activeLeague) url += `&leagueName=${encodeURIComponent(activeLeague)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      const newHighlights = (data.highlights || []).filter((h: Highlight) => h.source === 'youtube' || !!h.embedUrl);
      setHighlights(prev => [...prev, ...newHighlights]);
      setOffset(newOffset);
      setHasMore(newHighlights.length === 12);
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  const leagueOptions = [
    { label: 'All', value: '' },
    { label: 'NHL', value: 'NHL' },
    { label: 'NCAA', value: 'NCAA' },
  ];

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
        <title>Hockey Highlights | Watch NHL & NCAA Videos | RinkStop</title>
        <meta name="description" content="Watch the latest NHL and NCAA hockey highlights on RinkStop. Full game recaps, top plays, and memorable moments from professional and college hockey." />
        <meta property="og:title" content="Hockey Highlights | RinkStop" />
        <meta property="og:description" content="Watch the latest NHL and NCAA hockey highlights." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="RinkStop" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Hockey Highlights | RinkStop" />
        <meta name="twitter:description" content="Watch the latest NHL and NCAA hockey highlights." />
        <link rel="canonical" href="https://rinkstop.com/highlights" />
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
                target="_blank"
                rel="noopener noreferrer"
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
              HOCKEY HIGHLIGHTS
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', maxWidth: '600px' }}>
              Watch the latest NHL and NCAA hockey highlights, top plays, and memorable moments.
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
            {leagueOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleLeagueFilter(opt.value)}
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '20px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  background: activeLeague === opt.value ? '#C8102E' : 'rgba(255,255,255,0.07)',
                  color: activeLeague === opt.value ? '#fff' : 'rgba(255,255,255,0.6)',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Highlights Grid */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          {error ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
              <button
                onClick={() => fetchHighlights(activeLeague, 0)}
                style={{ background: '#C8102E', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.75rem 1.5rem', cursor: 'pointer', fontWeight: 700 }}
              >
                Retry
              </button>
            </div>
          ) : highlights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.125rem' }}>No highlights available yet.</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {activeLeague ? `${activeLeague} highlights` : 'Check back soon for the latest hockey highlights.'}
              </p>
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

const HighlightsPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HighlightsContent />
    </Suspense>
  );
};

export default HighlightsPage;