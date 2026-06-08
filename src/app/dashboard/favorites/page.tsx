import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

export default async function FavoritesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const { data: favorites } = await supabaseAdmin
    .from('favorites')
    .select('id, favorite_type, favorite_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  type FavItem = { id: string; favorite_type: string; favorite_id: string; created_at: string };

  // Fetch names for each favorited item
  const players: Record<string, string> = {};
  const teams: Record<string, string> = {};
  const rinks: Record<string, string> = {};

  const playerIds = (favorites as FavItem[]|null)?.filter(f => f.favorite_type === 'player').map(f => f.favorite_id) || [];
  const teamIds = (favorites as FavItem[]|null)?.filter(f => f.favorite_type === 'team').map(f => f.favorite_id) || [];
  const rinkIds = (favorites as FavItem[]|null)?.filter(f => f.favorite_type === 'rink').map(f => f.favorite_id) || [];

  if (playerIds.length) {
    const { data } = await supabaseAdmin.from('players').select('id, full_name').in('id', playerIds);
    (data || []).forEach(p => { players[p.id] = p.full_name; });
  }
  if (teamIds.length) {
    const { data } = await supabaseAdmin.from('teams').select('id, name').in('id', teamIds);
    (data || []).forEach(t => { teams[t.id] = t.name; });
  }
  if (rinkIds.length) {
    const { data } = await supabaseAdmin.from('rinks').select('id, name').in('id', rinkIds);
    (data || []).forEach(r => { rinks[r.id] = r.name; });
  }

  function getName(f: FavItem) {
    if (f.favorite_type === 'player') return players[f.favorite_id] || 'Unknown Player';
    if (f.favorite_type === 'team') return teams[f.favorite_id] || 'Unknown Team';
    return rinks[f.favorite_id] || 'Unknown Rink';
  }

  function getHref(f: FavItem) {
    if (f.favorite_type === 'player') return `/directory/players/${f.favorite_id}`;
    if (f.favorite_type === 'team') return `/directory/teams/${f.favorite_id}`;
    return `/directory/rinks/${f.favorite_id}`;
  }

  function getIcon(type: string) {
    if (type === 'player') return '🏒';
    if (type === 'team') return '🏆';
    return '⛸️';
  }

  const grouped = {
    rink: (favorites as FavItem[]|null)?.filter(f => f.favorite_type === 'rink') || [],
    team: (favorites as FavItem[]|null)?.filter(f => f.favorite_type === 'team') || [],
    player: (favorites as FavItem[]|null)?.filter(f => f.favorite_type === 'player') || [],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 720 }}>

      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.25rem' }}>
          SAVED ITEMS
        </h2>
        <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
          {favorites?.length || 0} item{(favorites?.length || 0) !== 1 ? 's' : ''} saved
        </p>
      </div>

      {(!favorites || favorites.length === 0) ? (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.75rem' }}>❤️</p>
          <p style={{ color: '#888', fontSize: '1rem', margin: '0 0 0.5rem' }}>No saved items yet</p>
          <p style={{ color: '#555', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            Browse rinks, teams, and players and tap the save icon to add them here.
          </p>
          <Link
            href="/directory"
            style={{
              display: 'inline-block',
              background: '#041E42',
              color: '#fff',
              padding: '0.625rem 1.25rem',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Browse Directory →
          </Link>
        </div>
      ) : (
        <>
          {(['rink', 'team', 'player'] as const).map(type => {
            const items = grouped[type];
            if (!items.length) return null;
            return (
              <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '0.9rem', color: '#666', letterSpacing: '0.08em', margin: '0 0 0.25rem' }}>
                  {type === 'rink' ? '⛸️ RINKS' : type === 'team' ? '🏆 TEAMS' : '🏒 PLAYERS'} — {items.length}
                </h3>
                {items.map(f => (
                  <Link
                    key={f.id}
                    href={getHref(f)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      background: '#0f0f0f',
                      border: '1px solid #1e1e1e',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#C8102E'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{getIcon(f.favorite_type)}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{getName(f)}</p>
                      <p style={{ color: '#555', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>
                        Saved {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span style={{ color: '#333', fontSize: '1rem' }}>→</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}