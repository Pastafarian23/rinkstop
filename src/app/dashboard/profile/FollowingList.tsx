import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

interface FollowedEntity {
  followee_type: 'player' | 'team' | 'rink' | 'league' | 'user';
  followee_id: string;
  name: string;
  href: string;
  icon: string;
  followed_at: string;
}

const TYPE_TO_TABLE = {
  player: { table: 'players', name: 'full_name', href: (id: string) => `/directory/players/${id}`, icon: '🏒' },
  team:   { table: 'teams',   name: 'name',      href: (id: string) => `/directory/teams/${id}`,   icon: '🏆' },
  rink:   { table: 'rinks',   name: 'name',      href: (id: string) => `/directory/rinks/${id}`,   icon: '⛸️' },
  league: { table: 'leagues', name: 'name',      href: (id: string) => `/directory/leagues/${id}`, icon: '🏆' },
  user:   { table: 'profiles',name: 'display_name',href: (id: string, username?: string | null) => username ? `/profile/${username}` : '#', icon: '👤' },
} as const;

export default async function FollowingList({ userId }: { userId: string }) {
  const { data: follows } = await supabaseAdmin
    .from('follows')
    .select('followee_type, followee_id, created_at')
    .eq('follower_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!follows || follows.length === 0) {
    return (
      <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>
          FOLLOWING
        </h3>
        <p style={{ color: '#555', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
          You aren&rsquo;t following anyone yet. Tap the <strong style={{ color: '#14B8A6' }}>+ Follow</strong> button on any player, team, rink, league, or user profile.
        </p>
      </div>
    );
  }

  // Resolve names per type
  const groups: Record<string, { id: string; created_at: string }[]> = {};
  for (const f of follows) {
    const t = f.followee_type as keyof typeof TYPE_TO_TABLE;
    if (!groups[t]) groups[t] = [];
    groups[t].push({ id: f.followee_id, created_at: f.created_at });
  }

  const items: FollowedEntity[] = [];
  for (const [type, rows] of Object.entries(groups)) {
    const t = type as keyof typeof TYPE_TO_TABLE;
    const cfg = TYPE_TO_TABLE[t];
    const ids = rows.map((r) => r.id);
    const selectCols = t === 'user' ? 'user_id, display_name, username' : `id, ${cfg.name}`;
    const { data: entities } = await supabaseAdmin.from(cfg.table).select(selectCols).in(t === 'user' ? 'user_id' : 'id', ids);
    const byId: Record<string, { name: string; username: string | null }> = {};
    for (const e of (entities || []) as Array<{ id?: string; user_id?: string; full_name?: string; name?: string; display_name?: string; username?: string | null }>) {
      const id = (e.id || e.user_id || '') as string;
      byId[id] = { name: e.full_name || e.name || e.display_name || 'Unknown', username: e.username ?? null };
    }
    for (const row of rows) {
      const entry = byId[row.id];
      items.push({
        followee_type: t,
        followee_id: row.id,
        name: entry?.name || 'Unknown',
        href: t === 'user' ? cfg.href(row.id, entry?.username) : cfg.href(row.id),
        icon: cfg.icon,
        followed_at: row.created_at,
      });
    }
  }

  // Sort by followed_at desc (server already returned that order, but we re-sorted by type)
  items.sort((a, b) => b.followed_at.localeCompare(a.followed_at));

  return (
    <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}>
      <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 0.75rem' }}>
        FOLLOWING ({items.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((it) => (
          <Link
            key={`${it.followee_type}:${it.followee_id}`}
            href={it.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#0a0a0a', border: '1px solid #141414', borderRadius: 8,
              padding: '0.6rem 0.85rem', textDecoration: 'none',
            }}
          >
            <div style={{ fontSize: '1.25rem' }}>{it.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                {it.followee_type}
              </div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
