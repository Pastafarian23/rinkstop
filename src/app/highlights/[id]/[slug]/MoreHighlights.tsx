'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Highlight {
  id: number;
  title: string;
  embedUrl: string | null;
  imageUrl: string;
  match: {
    homeTeam: { name: string; logo?: string } | null;
    awayTeam: { name: string; logo?: string } | null;
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

export default function MoreHighlights({ matchId }: { matchId: string }) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;
    const params = new URLSearchParams({ matchId, limit: '6', youtubeOnly: 'true' });
    fetch(`/api/highlights?${params.toString()}`)
      .then(r => r.json())
      .then(d => setHighlights(d.highlights || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading || highlights.length <= 1) return null;

  return (
    <div>
      <h3 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
        More from This Game
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {highlights
          .filter(h => h.id !== undefined)
          .slice(0, 4)
          .map(h => {
            const href = `/highlights/${h.id}/${slugify(h.title)}`;
            return (
              <Link key={h.id} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#161B22', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                  <div style={{ aspectRatio: '16/9', overflow: 'hidden', position: 'relative', background: '#1a2233' }}>
                    {h.imageUrl && (
                      <img src={h.imageUrl} alt={h.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {h.embedUrl && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg style={{ width: '16px', height: '16px', color: '#fff', marginLeft: '2px' }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.3 }} className="line-clamp-2">
                      {h.title}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
