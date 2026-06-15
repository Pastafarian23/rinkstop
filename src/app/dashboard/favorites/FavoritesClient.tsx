'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Favorite {
  favorite_type: 'rink' | 'team' | 'player' | 'league' | 'business';
  favorite_id: string;
  name: string;
  href: string;
  icon: string;
}

const TYPE_FILTERS: { value: 'all' | Favorite['favorite_type']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'rink', label: '⛸️ Rinks' },
  { value: 'team', label: '🏆 Teams' },
  { value: 'player', label: '🏒 Players' },
  { value: 'league', label: '🏆 Leagues' },
  { value: 'business', label: '🛒 Businesses' },
];

export default function FavoritesClient({ initialFavorites }: { initialFavorites: Favorite[] }) {
  const [favorites, setFavorites] = useState<Favorite[]>(initialFavorites);
  const [filter, setFilter] = useState<'all' | Favorite['favorite_type']>('all');
  const [removing, setRemoving] = useState<string | null>(null);

  const visible = filter === 'all' ? favorites : favorites.filter((f) => f.favorite_type === filter);

  const remove = useCallback(async (fav: Favorite) => {
    const key = `${fav.favorite_type}:${fav.favorite_id}`;
    if (!confirm(`Remove ${fav.name} from your saved items?`)) return;
    setRemoving(key);
    // Optimistic
    setFavorites((cur) => cur.filter((f) => !(f.favorite_type === fav.favorite_type && f.favorite_id === fav.favorite_id)));
    try {
      const res = await fetch(`/api/favorites?favorite_type=${fav.favorite_type}&favorite_id=${encodeURIComponent(fav.favorite_id)}`, { method: 'DELETE' });
      if (!res.ok) {
        setFavorites((cur) => [...cur, fav]);  // rollback
        alert('Could not remove. Please try again.');
      }
    } catch {
      setFavorites((cur) => [...cur, fav]);  // rollback
      alert('Network error. Please try again.');
    } finally {
      setRemoving(null);
    }
  }, []);

  if (favorites.length === 0) {
    return (
      <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '3rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '2rem', margin: '0 0 0.75rem' }}>❤️</p>
        <p style={{ color: '#888', fontSize: '1rem', margin: '0 0 0.5rem' }}>No saved items yet</p>
        <p style={{ color: '#555', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
          Browse rinks, teams, and players and tap the save icon to add them here.
        </p>
        <Link href="/directory" style={{ display: 'inline-block', background: '#041E42', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.875rem' }}>
          Browse Directory →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Type filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TYPE_FILTERS.map((t) => {
          const count = t.value === 'all' ? favorites.length : favorites.filter((f) => f.favorite_type === t.value).length;
          const active = filter === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilter(t.value)}
              disabled={count === 0 && t.value !== 'all'}
              style={{
                background: active ? 'rgba(20,184,166,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? '#14B8A6' : '#1e1e1e'}`,
                color: active ? '#14B8A6' : count === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                borderRadius: 999, padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: 600,
                cursor: count === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {visible.length === 0 ? (
          <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '2rem 1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            No saved {filter === 'all' ? '' : filter + 's'} match this filter.
          </div>
        ) : visible.map((f) => {
          const key = `${f.favorite_type}:${f.favorite_id}`;
          return (
            <div
              key={key}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8,
                padding: '0.75rem 1rem', opacity: removing === key ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>{f.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={f.href} style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                  {f.name}
                </Link>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                  {f.favorite_type}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(f)}
                disabled={removing === key}
                aria-label={`Remove ${f.name} from saved items`}
                title="Remove"
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)', borderRadius: 6,
                  padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                ✕ Remove
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
