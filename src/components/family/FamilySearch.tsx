// FamilySearch.tsx - Search and link youth players to Family Hub
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

interface SearchResult {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  birth_date: string | null;
  headshot_url: string | null;
  teams?: { name: string } | null;
}

export default function FamilySearch() {
  const { user: clerkUser, isLoaded } = useUser();
  const me = clerkUser?.id;
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const searchPlayers = async () => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/players?search=${encodeURIComponent(query)}&limit=8&includeBirthDate=true`);
      const data = await res.json();
      setResults(data.data || []);
    } catch (e) {
      console.error('Search failed:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const linkPlayer = async (playerId: string) => {
    setLinking(playerId);
    setMessage(null);
    try {
      const res = await fetch('/api/profiles/managed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileType: 'player', profileId: playerId, relationship: 'parent' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to link');
      }
      setMessage('Player linked successfully!');
      // Trigger refresh to show new linked player
      window.location.reload();
    } catch (e: any) {
      setMessage(e.message || 'Failed to link player');
    } finally {
      setLinking(null);
    }
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(searchPlayers, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div style={{ marginTop: 8 }}>
      <input
        type="text"
        placeholder="Search youth hockey players by name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%', padding: '0.6rem 0.8rem', fontSize: 14,
          background: '#0a0a0a', border: '1px solid #222', borderRadius: 6,
          color: '#fff', outline: 'none',
        }}
      />
      {loading && <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Searching...</div>}
      
      {results.length > 0 && (
        <div style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto', border: '1px solid #1e1e1e', borderRadius: 6 }}>
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => linkPlayer(p.id)}
              disabled={linking === p.id}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)',
                border: 'none', borderBottom: '1px solid #1e1e1e', cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {p.headshot_url ? (
                <img src={p.headshot_url} alt="" style={{ width: 36, height: 36, borderRadius: '4px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '4px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#444' }}>
                  {p.first_name?.[0]}{p.last_name?.[0]}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{p.first_name} {p.last_name}</div>
                {p.teams?.name && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{p.teams.name}</div>}
              </div>
              {linking === p.id && <span style={{ color: '#14B8A6', fontSize: 12 }}>Linking...</span>}
            </button>
          ))}
        </div>
      )}

      {message && (
        <div style={{ marginTop: 8, padding: '0.5rem', background: message.includes('success') ? 'rgba(34,197,94,0.1)' : 'rgba(200,16,46,0.1)', borderRadius: 6, fontSize: 13, color: message.includes('success') ? '#22c55e' : '#C8102E' }}>
          {message}
        </div>
      )}
    </div>
  );
}