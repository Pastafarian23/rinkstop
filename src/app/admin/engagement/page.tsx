import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import EngagementDashboard from './EngagementDashboard';

export const dynamic = 'force-dynamic';

interface FollowRow {
  id: string;
  follower_user_id: string;
  followee_type: string;
  followee_id: string;
  created_at: string;
}

interface FavoriteRow {
  id: string;
  user_id: string;
  favorite_type: string;
  favorite_id: string;
  created_at: string;
}

interface EntityName {
  id: string;
  name: string;
}

interface UserInfo {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

interface ActivityItem {
  type: 'follow' | 'favorite';
  id: string;
  actor_user_id: string;
  actor_username: string | null;
  actor_display_name: string | null;
  target_type: string;
  target_id: string;
  target_name: string | null;
  target_url: string | null;
  created_at: string;
}

interface TopEntity {
  type: string;
  id: string;
  name: string | null;
  count: number;
  url: string | null;
}

interface PowerUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
  follows: number;
  favorites: number;
  total: number;
  profile_url: string | null;
}

const ACTIVITY_LIMIT = 100;
const TOP_ENTITIES_LIMIT = 25;
const POWER_USERS_LIMIT = 20;

const TYPE_TO_DIR: Record<string, string> = {
  player: 'players',
  team: 'teams',
  rink: 'rinks',
  league: 'leagues',
};

function entityHref(type: string, id: string): string | null {
  // Best-effort link back to the public directory page. We do not know
  // slug from id without an extra join; pass id and let the directory
  // page do the slug lookup (it already does).
  const dir = TYPE_TO_DIR[type];
  if (dir) return `/directory/${dir}/${id}`;
  if (type === 'user') return null; // resolved later via profile_url
  return null;
}

async function fetchEntityNames(
  type: string,
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  let query;
  if (type === 'player') {
    // players has no full_name column; concat first_name + last_name in JS
    query = supabaseAdmin.from('players').select('id, first_name, last_name').in('id', ids);
  } else if (type === 'team') {
    query = supabaseAdmin.from('team_workspaces').select('id, name').in('id', ids);
  } else if (type === 'rink') {
    query = supabaseAdmin.from('rinks').select('id, name').in('id', ids);
  } else if (type === 'league') {
    query = supabaseAdmin.from('leagues').select('id, name').in('id', ids);
  } else {
    return map;
  }

  const { data, error } = await query;
  if (error) {
    console.error('[engagement] fetchEntityNames error', type, error.message);
    return map;
  }
  for (const r of (data || []) as { id: string; name?: string; first_name?: string; last_name?: string }[]) {
    const name = r.name || [r.first_name, r.last_name].filter(Boolean).join(' ') || null;
    if (name) map.set(r.id, name);
  }
  return map;
}

async function fetchUserInfo(userIds: string[]): Promise<Map<string, UserInfo>> {
  const map = new Map<string, UserInfo>();
  if (userIds.length === 0) return map;
  // profiles has no email column (Clerk owns email). Use display_name as
  // the human label and username for the profile link.
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, username, display_name')
    .in('user_id', userIds);
  if (error) {
    console.error('[engagement] fetchUserInfo error', error.message);
    return map;
  }
  for (const r of (data || []) as { user_id: string; username: string | null; display_name: string | null }[]) {
    map.set(r.user_id, {
      user_id: r.user_id,
      username: r.username,
      display_name: r.display_name,
    });
  }
  return map;
}

async function getEngagementData() {
  // 1) Recent follow + favorite activity (parallel)
  const [followsRes, favoritesRes] = await Promise.all([
    supabaseAdmin
      .from('follows')
      .select('id, follower_user_id, followee_type, followee_id, created_at')
      .order('created_at', { ascending: false })
      .limit(ACTIVITY_LIMIT),
    supabaseAdmin
      .from('favorites')
      .select('id, user_id, favorite_type, favorite_id, created_at')
      .order('created_at', { ascending: false })
      .limit(ACTIVITY_LIMIT),
  ]);

  if (followsRes.error) console.error('[engagement] follows error', followsRes.error.message);
  if (favoritesRes.error) console.error('[engagement] favorites error', favoritesRes.error.message);

  const follows = (followsRes.data || []) as FollowRow[];
  const favorites = (favoritesRes.data || []) as FavoriteRow[];

  // 2) Top entities by follow + favorite (parallel)
  // We use raw group-by in JS after fetching the full table — Postgres views
  // would be cleaner but add a migration we don't need yet. For current
  // scale (thousands of rows) this is fast enough.
  const [allFollowsRes, allFavoritesRes] = await Promise.all([
    supabaseAdmin
      .from('follows')
      .select('followee_type, followee_id, follower_user_id')
      .limit(10000),
    supabaseAdmin
      .from('favorites')
      .select('favorite_type, favorite_id, user_id')
      .limit(10000),
  ]);

  const topFollowsByKey = new Map<string, number>();
  const topFavoritesByKey = new Map<string, number>();
  const followUserSet = new Set<string>();
  const favoriteUserSet = new Set<string>();

  for (const r of (allFollowsRes.data || []) as { followee_type: string; followee_id: string; follower_user_id: string }[]) {
    if (r.followee_type === 'user') continue; // user-to-user handled in Power Users only
    const k = r.followee_type + ':' + r.followee_id;
    topFollowsByKey.set(k, (topFollowsByKey.get(k) || 0) + 1);
    followUserSet.add(r.follower_user_id);
  }
  for (const r of (allFavoritesRes.data || []) as { favorite_type: string; favorite_id: string; user_id: string }[]) {
    const k = r.favorite_type + ':' + r.favorite_id;
    topFavoritesByKey.set(k, (topFavoritesByKey.get(k) || 0) + 1);
    favoriteUserSet.add(r.user_id);
  }

  const topFollowsSorted = Array.from(topFollowsByKey.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ENTITIES_LIMIT);
  const topFavoritesSorted = Array.from(topFavoritesByKey.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ENTITIES_LIMIT);

  // 3) Build entity-id lists by type, then batch-fetch names
  const followIdsByType = new Map<string, string[]>();
  const favoriteIdsByType = new Map<string, string[]>();
  for (const [k] of topFollowsSorted) {
    const [type, id] = k.split(':', 2);
    if (!followIdsByType.has(type)) followIdsByType.set(type, []);
    followIdsByType.get(type)!.push(id);
  }
  for (const [k] of topFavoritesSorted) {
    const [type, id] = k.split(':', 2);
    if (!favoriteIdsByType.has(type)) favoriteIdsByType.set(type, []);
    favoriteIdsByType.get(type)!.push(id);
  }

  const allTypes = new Set<string>([...followIdsByType.keys(), ...favoriteIdsByType.keys()]);
  const nameMaps = await Promise.all(
    Array.from(allTypes).map(async (type) => [type, await fetchEntityNames(type, [
      ...(followIdsByType.get(type) || []),
      ...(favoriteIdsByType.get(type) || []),
    ])] as const)
  );
  const nameByType = new Map<string, Map<string, string>>(nameMaps as any);

  const topFollowed: TopEntity[] = topFollowsSorted.map(([k, count]) => {
    const [type, id] = k.split(':', 2);
    return {
      type,
      id,
      name: nameByType.get(type)?.get(id) || null,
      count,
      url: entityHref(type, id),
    };
  });
  const topFavorited: TopEntity[] = topFavoritesSorted.map(([k, count]) => {
    const [type, id] = k.split(':', 2);
    return {
      type,
      id,
      name: nameByType.get(type)?.get(id) || null,
      count,
      url: entityHref(type, id),
    };
  });

  // 4) Power users — total follows + favorites per user
  const followsByUser = new Map<string, number>();
  const favoritesByUser = new Map<string, number>();
  for (const r of (allFollowsRes.data || []) as { follower_user_id: string }[]) {
    followsByUser.set(r.follower_user_id, (followsByUser.get(r.follower_user_id) || 0) + 1);
  }
  for (const r of (allFavoritesRes.data || []) as { user_id: string }[]) {
    favoritesByUser.set(r.user_id, (favoritesByUser.get(r.user_id) || 0) + 1);
  }
  const allUserIds = new Set<string>([...followsByUser.keys(), ...favoritesByUser.keys()]);
  const powerUsersSorted = Array.from(allUserIds)
    .map((uid) => ({
      user_id: uid,
      follows: followsByUser.get(uid) || 0,
      favorites: favoritesByUser.get(uid) || 0,
      total: (followsByUser.get(uid) || 0) + (favoritesByUser.get(uid) || 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, POWER_USERS_LIMIT);

  const userInfo = await fetchUserInfo(powerUsersSorted.map((u) => u.user_id));
  const powerUsers: PowerUser[] = powerUsersSorted.map((u) => {
    const info = userInfo.get(u.user_id);
    return {
      ...u,
      username: info?.username || null,
      display_name: info?.display_name || null,
      profile_url: info?.username ? `/profile/${info.username}` : null,
    };
  });

  // 5) Build activity feed with names + user info
  const activityActorIds = Array.from(new Set([
    ...follows.map((f) => f.follower_user_id),
    ...favorites.map((f) => f.user_id),
  ]));
  const activityUserInfo = await fetchUserInfo(activityActorIds);

  const activityTypeEntityIds = new Map<string, Set<string>>();
  for (const f of follows) {
    if (f.followee_type === 'user') continue;
    if (!activityTypeEntityIds.has(f.followee_type)) activityTypeEntityIds.set(f.followee_type, new Set());
    activityTypeEntityIds.get(f.followee_type)!.add(f.followee_id);
  }
  for (const f of favorites) {
    if (!activityTypeEntityIds.has(f.favorite_type)) activityTypeEntityIds.set(f.favorite_type, new Set());
    activityTypeEntityIds.get(f.favorite_type)!.add(f.favorite_id);
  }
  const activityNameMaps = await Promise.all(
    Array.from(activityTypeEntityIds.entries()).map(async ([type, ids]) => [type, await fetchEntityNames(type, Array.from(ids))] as const)
  );
  const activityNameByType = new Map<string, Map<string, string>>(activityNameMaps as any);

  const activity: ActivityItem[] = [
    ...follows.map((f) => {
      const info = activityUserInfo.get(f.follower_user_id);
      const isUser = f.followee_type === 'user';
      return {
        type: 'follow' as const,
        id: f.id,
        actor_user_id: f.follower_user_id,
        actor_username: info?.username || null,
        actor_display_name: info?.display_name || null,
        target_type: f.followee_type,
        target_id: f.followee_id,
        target_name: isUser ? null : activityNameByType.get(f.followee_type)?.get(f.followee_id) || null,
        target_url: entityHref(f.followee_type, f.followee_id),
        created_at: f.created_at,
      };
    }),
    ...favorites.map((f) => {
      const info = activityUserInfo.get(f.user_id);
      return {
        type: 'favorite' as const,
        id: f.id,
        actor_user_id: f.user_id,
        actor_username: info?.username || null,
        actor_display_name: info?.display_name || null,
        target_type: f.favorite_type,
        target_id: f.favorite_id,
        target_name: activityNameByType.get(f.favorite_type)?.get(f.favorite_id) || null,
        target_url: entityHref(f.favorite_type, f.favorite_id),
        created_at: f.created_at,
      };
    }),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, ACTIVITY_LIMIT);

  return {
    activity,
    topFollowed,
    topFavorited,
    powerUsers,
    counts: {
      follows: follows.length,
      favorites: favorites.length,
      totalFollows: topFollowsByKey.size,
      totalFavorites: topFavoritesByKey.size,
      activeUsers: allUserIds.size,
    },
  };
}

export default async function EngagementPage() {
  await requireAdmin();
  const data = await getEngagementData();

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1>📊 Engagement</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
            Real-time view of follows and favorites — who is engaging, with what, and how often.
          </p>
        </div>
      </div>
      <EngagementDashboard
        activity={data.activity}
        topFollowed={data.topFollowed}
        topFavorited={data.topFavorited}
        powerUsers={data.powerUsers}
        counts={data.counts}
      />
    </div>
  );
}
