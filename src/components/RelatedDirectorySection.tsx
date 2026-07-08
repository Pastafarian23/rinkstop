'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type EntityKind = 'rink' | 'team' | 'league';

interface Entity {
  id: string;
  slug: string;
  name: string;
  type: EntityKind;
  city?: string | null;
  country?: string | null;
}

export interface RelatedDirectorySectionProps {
  tags?: string[];
  category?: string | null;
  limit?: number;
}

export default function RelatedDirectorySection({ tags = [], category, limit = 6 }: RelatedDirectorySectionProps) {
  const [items, setItems] = useState<Entity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (tags.length === 0 && !category) {
      setLoaded(true);
      return;
    }
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    tags.forEach(t => params.append('tag', t));
    params.set('limit', String(limit));

    fetch(`/api/related-directory?${params.toString()}`, { signal: new AbortController().signal })
      .then(r => r.ok ? r.json() : Promise.resolve({ items: [] }))
      .then(data => {
        setItems(data.items || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [tags.join(','), category, limit]);

  if (!loaded || items.length === 0) return null;

  return (
    <section className="section-py" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container">
        <div className="sec-head" style={{ marginBottom: '1rem' }}>
          <div>
            <div className="label" style={{ color: '#C8102E' }}>Related</div>
            <h2 className="font-sport" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', color: '#fff', margin: 0 }}>
              Rinks, Teams &amp; Leagues
            </h2>
          </div>
          <Link href="/directory" className="sec-link">Directory →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {items.slice(0, limit).map(item => {
            const href = `/${item.type === 'rink' ? 'directory/rinks' : item.type === 'team' ? 'directory/teams' : 'directory/leagues'}/${item.slug}`;
            const loc = [item.city, item.country].filter(Boolean).join(', ');
            const icon = item.type === 'rink' ? '🏒' : item.type === 'team' ? '👥' : '🏆';
            return (
              <Link
                key={item.id}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: '#0f0f0f', border: '1px solid #1e1e1e',
                  borderRadius: 10, padding: '0.85rem 1rem',
                  textDecoration: 'none',
                }}
              >
                <div style={{ fontSize: '1.25rem' }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.72rem' }}>{loc || item.type}</div>
                </div>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>→</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}