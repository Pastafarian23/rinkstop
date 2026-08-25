'use client';

import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import MoreHighlights from './MoreHighlights';

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default function VideoPageClient({ highlight }: { highlight: Highlight }) {
  const [showVideo, setShowVideo] = useState(true); // Start with video visible
  const [copied, setCopied] = useState(false);

  const pageUrl = `https://rinkstop.com/highlights/${highlight.id}/${slugify(highlight.title)}`;
  const embedSrc = highlight.embedUrl?.replace('watch?v=', 'embed/') + '?autoplay=1&mute=1' || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const score = highlight.match.homeTeam && highlight.match.awayTeam
    ? `${highlight.match.homeTeam.name} vs ${highlight.match.awayTeam.name}`
    : highlight.match.league
    ? highlight.match.league
    : '';

  const date = highlight.match.date
    ? new Date(highlight.match.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <>
      <Head>
        <title>{highlight.title}</title>
        <meta name="description" content={`${highlight.title}${score ? ` — ${score}` : ''}. Watch hockey highlights on RinkStop.`} />
        <meta property="og:title" content={highlight.title} />
        <meta property="og:description" content={`${highlight.title}${score ? ` — ${score}` : ''}`} />
        <meta property="og:image" content={highlight.imageUrl} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="video.other" />
        {embedSrc && (
          <>
            <meta property="og:video" content={embedSrc} />
            <meta property="og:video:secure_url" content={embedSrc} />
            <meta property="og:video:type" content="text/html" />
            <meta property="og:video:width" content="1280" />
            <meta property="og:video:height" content="720" />
          </>
        )}
        <meta name="twitter:card" content="player" />
        <meta name="twitter:title" content={highlight.title} />
        <meta name="twitter:description" content={`${highlight.title}${score ? ` — ${score}` : ''}`} />
        <meta name="twitter:image" content={highlight.imageUrl} />
        {embedSrc && <meta name="twitter:player" content={embedSrc} />}
        {embedSrc && <meta name="twitter:player:width" content="1280" />}
        {embedSrc && <meta name="twitter:player:height" content="720" />}
        <link rel="canonical" href={pageUrl} />
      </Head>

      <div style={{ minHeight: '100vh', background: '#0D1117', color: '#fff' }}>
        {/* Navigation breadcrumb */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>
            <Link href="/highlights" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
              Highlights
            </Link>
            <span>›</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{highlight.title}</span>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: '2rem', alignItems: 'start' }}>
            {/* Main video + info */}
            <div>
              {/* Video player */}
              <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
                {embedSrc ? (
                  <iframe
                    src={embedSrc}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    {highlight.imageUrl && (
                      <img src={highlight.imageUrl} alt={highlight.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                    )}
                    <div style={{ position: 'relative', textAlign: 'center', padding: '1rem' }}>
                      <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>This video is available on {highlight.source}</p>
                      <a
                        href={highlight.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#C8102E', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}
                      >
                        Watch on {highlight.source}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Video info */}
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                      {highlight.title}
                    </h1>
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
                      {date && <span>{date}</span>}
                      {score && <><span>•</span><span>{score}</span></>}
                      {highlight.match.season && <><span>•</span><span>Season {highlight.match.season}</span></>}
                      {highlight.source && (
                        <><span>•</span><span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: highlight.source === 'youtube' ? 'rgba(255,0,0,0.85)' : 'rgba(255,255,255,0.12)',
                          color: '#fff',
                          textTransform: 'uppercase',
                        }}>
                          {highlight.source}
                        </span></>
                      )}
                    </div>
                  </div>

                  {/* Share buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={handleCopy}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'transparent',
                        color: copied ? '#4ade80' : '#fff',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {copied ? '✓ Copied!' : 'Copy Link'}
                    </button>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(highlight.title)}&url=${encodeURIComponent(pageUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: '0.875rem', textDecoration: 'none' }}
                    >
                      Share
                    </a>
                  </div>
                </div>

                {highlight.description && (
                  <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                    {highlight.description}
                  </p>
                )}
              </div>

              {/* More highlights from same match */}
              <div style={{ marginTop: '2rem' }}>
                <MoreHighlights matchId={String(highlight.match.id)} />
              </div>
            </div>

            {/* Sidebar */}
            <div>
              {/* Match info card */}
              <div style={{ background: '#161B22', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0' }}>Match Details</h3>
                {highlight.match.homeTeam && highlight.match.awayTeam && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    {highlight.match.homeTeam.logo && (
                      <img src={highlight.match.homeTeam.logo} alt={highlight.match.homeTeam.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                    )}
                    <span style={{ color: '#fff', fontWeight: 600 }}>{highlight.match.homeTeam.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>vs</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{highlight.match.awayTeam.name}</span>
                    {highlight.match.awayTeam.logo && (
                      <img src={highlight.match.awayTeam.logo} alt={highlight.match.awayTeam.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                    )}
                  </div>
                )}
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
                  {highlight.match.league && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>League</span>
                      <span style={{ color: '#fff' }}>{highlight.match.league}</span>
                    </div>
                  )}
                  {highlight.match.season && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Season</span>
                      <span style={{ color: '#fff' }}>{highlight.match.season}</span>
                    </div>
                  )}
                  {highlight.match.round && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Round</span>
                      <span style={{ color: '#fff' }}>{highlight.match.round}</span>
                    </div>
                  )}
                  {date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Date</span>
                      <span style={{ color: '#fff' }}>{date}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Source</span>
                    <span style={{ color: '#fff' }}>{highlight.source}</span>
                  </div>
                </div>
              </div>

              {/* Back to highlights */}
              <Link
                href="/highlights"
                style={{
                  display: 'block',
                  marginTop: '1rem',
                  padding: '0.75rem',
                  textAlign: 'center',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                }}
              >
                ← All Highlights
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

