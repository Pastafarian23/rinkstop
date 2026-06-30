import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import FavoritesClient from './FavoritesClient';

export const dynamic = 'force-dynamic';

interface Favorite {
  favorite_type: 'rink' | 'team' | 'player' | 'league' | 'business';
  favorite_id: string;
  name: string;
  href: string;
  icon: string;
}

const TYPE_TO_TABLE = {
  rink: 'rinks', team: 'teams', player: 'players', league: 'leagues', business: 'listings',
} as const;
const TYPE_TO_NAME_COL = {
  rink: 'name', team: 'name', player: 'full_name', league: 'name', business: 'business_name',
} as const;
const TYPE_TO_HREF = {
  rink: (id: string) => `/directory/rinks/${id}`,
  team: (id: string) => `/directory/teams/${id}`,
  player: (id: string) => `/directory/players/${id}`,
  league: (id: string) => `/directory/leagues/${id}`,
  business: (id: string) => `/businesses/${id}`,
} as const;
const TYPE_TO_ICON = {
  rink: '⛸️', team: '🏆', player: '🏒', league: '🏆', business: '🛒',
} as const;

export default async function FavoritesPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  const { data: favorites } = await supabaseAdmin
    .from('favorites')
    .select('favorite_type, favorite_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  type RawFav = { favorite_type: keyof typeof TYPE_TO_TABLE; favorite_id: string };
  const items: Favorite[] = [];

  // Resolve names in one pass per type
  if (favorites && favorites.length > 0) {
    const groups: Record<string, string[]> = {};
    for (const f of favorites as RawFav[]) {
      if (!groups[f.favorite_type]) groups[f.favorite_type] = [];
      groups[f.favorite_type].push(f.favorite_id);
    }
    for (const [type, ids] of Object.entries(groups)) {
      const t = type as keyof typeof TYPE_TO_TABLE;
      const table = TYPE_TO_TABLE[t];
      const nameCol = TYPE_TO_NAME_COL[t];
      // For rinks/teams/leagues the page uses slug; for players + businesses, id.
      // The href function takes whatever the existing /directory/* route uses.
      // We grab both id and slug where available so the href is canonical.
      const selectCols = t === 'rink' ? 'id, slug, name' : t === 'team' ? 'id, slug, name' : t === 'player' ? 'id, full_name' : t === 'league' ? 'id, name' : 'id, business_name';
      const { data: rows } = await supabaseAdmin
        .from(table).select(selectCols).in('id', ids);
      const map: Record<string, { name: string; slug?: string }> = {};
      for (const r of ((rows as unknown) as Array<{ id: string; slug?: string; name?: string; full_name?: string; business_name?: string }>) || []) {
        map[r.id] = { name: r.name || r.full_name || r.business_name || 'Unknown', slug: r.slug };
      }
      for (const id of ids) {
        const row = map[id];
        const name = row?.name || 'Unknown';
        const slug = row?.slug;
        items.push({
          favorite_type: t,
          favorite_id: id,
          name,
          href: slug && (t === 'rink' || t === 'team') ? TYPE_TO_HREF[t](slug) : TYPE_TO_HREF[t](id),
          icon: TYPE_TO_ICON[t],
        });
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 720 }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.25rem' }}>
          SAVED ITEMS
        </h2>
        <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
          {items.length} item{items.length !== 1 ? 's' : ''} saved
        </p>
      </div>
      <FavoritesClient initialFavorites={items} />
    </div>
  );
}
