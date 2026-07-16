import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import FeedItem from '@/components/coach-feed/FeedItem';
import MarkReadButton from '@/components/coach-feed/MarkReadButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Coach Feed' };

type PostType = 'news' | 'schedule' | 'result';

interface FeedPost {
  id: string;
  type: PostType;
  team_id: string;
  team_name: string;
  team_slug: string;
  author_name: string | null;
  title: string;
  body: string;
  created_at: string;
  // Type-specific
  game_date?: string;
  opponent?: string;
  home_away?: 'home' | 'away' | 'neutral';
  our_score?: number;
  their_score?: number;
  start_at?: string;
  location?: string;
}

const FOCUS_META: Record<PostType, { label: string; emoji: string; color: string }> = {
  news:     { label: 'News',     emoji: '📣', color: 'bg-blue-100 text-blue-900' },
  schedule: { label: 'Schedule', emoji: '📅', color: 'bg-amber-100 text-amber-900' },
  result:   { label: 'Result',   emoji: '🏒', color: 'bg-green-100 text-green-900' },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function fmtRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - d) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function CoachFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const sp = await searchParams;
  const filter = (sp.type as PostType) || 'all';

  // 1. Find all teams the user is on (direct or via parent link)
  const { data: memberships } = await supabaseAdmin
    .from('team_members')
    .select('team_id, parent_user_id, role, team_workspaces:team_id (id, slug, name)')
    .or(`user_id.eq.${userId},parent_user_id.eq.${userId}`)
    .is('left_at', null);

  if (!memberships || memberships.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900">Coach Feed</h1>
        <p className="mt-2 text-slate-600">
          Updates from your coaches will appear here once you join a team.
        </p>
        <Link
          href="/dashboard/team"
          className="mt-4 inline-block rounded-md bg-[#041E42] px-4 py-2 text-sm font-medium text-white hover:bg-[#041E42]/90"
        >
          Browse teams
        </Link>
      </div>
    );
  }

  // Map team_id -> {slug, name, role}
  const teamMap = new Map<string, { slug: string; name: string; role: string }>();
  for (const m of memberships) {
    const t = m.team_workspaces as unknown as { id: string; slug: string; name: string } | null;
    if (t) {
      teamMap.set(t.id, { slug: t.slug, name: t.name, role: m.role });
    }
  }
  const teamIds = Array.from(teamMap.keys());
  if (teamIds.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900">Coach Feed</h1>
        <p className="mt-2 text-slate-600">No team data found. Try refreshing.</p>
      </div>
    );
  }

  // 2. Fetch all posts in parallel from the 3 tables
  const [newsRes, scheduleRes, resultsRes] = await Promise.all([
    supabaseAdmin
      .from('team_news')
      .select('id, team_id, title, body, published_at, author_user_id, profiles:author_user_id (display_name)')
      .in('team_id', teamIds)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(50),
    // team_events is the canonical source. Join back to team_schedule via
    // legacy_schedule_id to get opponent / home_away / location which live in the
    // legacy table (team_events.opposing_team maps to team_schedule.opponent).
    (async () => {
      const { data, error } = await supabaseAdmin
        .from('team_events')
        .select(
          `id, team_id, title, starts_at, ends_at, opposing_team, status,
           location_note, description,
           profiles:author_user_id(display_name),
           team_schedule!inner(id, opponent, home_away, location, notes)`
        )
        .in('team_id', teamIds)
        .order('starts_at', { ascending: false })
        .limit(50);
      if (error) return { data: [] as any[], error };
      // Normalise into the flat shape the feed expects
      const flat = (data || []).map((e: any): Record<string, any> => ({
          ...e,
          opponent: e.team_schedule?.opponent ?? null,
          home_away: e.team_schedule?.home_away ?? null,
          location: e.team_schedule?.location ?? null,
          // Use legacy_schedule_id so read-tracking keys stay stable
          id: e.legacy_schedule_id ?? e.id,
        }));
      return { data: flat, error: null };
    })(),
    supabaseAdmin
      .from('team_results')
      .select('id, team_id, game_date, opponent, home_away, our_score, their_score, profiles:author_user_id (display_name)')
      .in('team_id', teamIds)
      .order('game_date', { ascending: false })
      .limit(50),
  ]);

  // 3. Read state
  const readKeys = new Set<string>();
  const { data: reads } = await supabaseAdmin
    .from('feed_reads')
    .select('post_table, post_id')
    .eq('user_id', userId);
  if (reads) {
    for (const r of reads) {
      readKeys.add(`${r.post_table}:${r.post_id}`);
    }
  }

  // 4. Merge into a single sorted feed
  const feed: FeedPost[] = [];

  for (const n of newsRes.data || []) {
    const t = teamMap.get(n.team_id);
    if (!t) continue;
    const authorData = n.profiles as unknown as { display_name: string | null } | null;
    feed.push({
      id: n.id,
      type: 'news',
      team_id: n.team_id,
      team_name: t.name,
      team_slug: t.slug,
      author_name: authorData?.display_name || null,
      title: n.title,
      body: n.body,
      created_at: n.published_at,
    });
  }
  for (const s of scheduleRes.data || []) {
    const t = teamMap.get(s.team_id);
    if (!t) continue;
    const authorData = s.profiles as unknown as { display_name: string | null } | null;
    feed.push({
      id: s.id,
      type: 'schedule',
      team_id: s.team_id,
      team_name: t.name,
      team_slug: t.slug,
      author_name: authorData?.display_name || null,
      title: `vs ${s.opponent}`,
      body: s.team_schedule?.notes || `${s.home_away === 'home' ? 'Home' : s.home_away === 'away' ? 'Away' : 'Neutral'} game${s.location ? ` at ${s.location}` : ''}.`,
      created_at: s.starts_at,
      game_date: s.starts_at,
      opponent: s.opponent,
      home_away: s.home_away as 'home' | 'away' | 'neutral',
      start_at: s.starts_at,
      location: s.location || undefined,
    });
  }
  for (const r of resultsRes.data || []) {
    const t = teamMap.get(r.team_id);
    if (!t) continue;
    const authorData = r.profiles as unknown as { display_name: string | null } | null;
    const won = r.our_score > r.their_score;
    const tied = r.our_score === r.their_score;
    const resultText = won ? 'Win' : tied ? 'Tie' : 'Loss';
    feed.push({
      id: r.id,
      type: 'result',
      team_id: r.team_id,
      team_name: t.name,
      team_slug: t.slug,
      author_name: authorData?.display_name || null,
      title: `${resultText}: ${r.our_score}-${r.their_score} vs ${r.opponent}`,
      body: `${r.home_away === 'home' ? 'Home' : r.home_away === 'away' ? 'Away' : 'Neutral'} game on ${fmtDate(r.game_date)}.`,
      created_at: r.game_date + 'T00:00:00Z',
      game_date: r.game_date,
      opponent: r.opponent,
      home_away: r.home_away as 'home' | 'away' | 'neutral',
      our_score: r.our_score,
      their_score: r.their_score,
    });
  }

  // Sort by created_at DESC
  feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Apply filter
  const filtered = filter === 'all' ? feed : feed.filter((p) => p.type === filter);

  // Stats
  const unread = feed.filter((p) => !readKeys.has(`${p.type === 'news' ? 'team_news' : p.type === 'schedule' ? 'team_schedule' : 'team_results'}:${p.id}`)).length;
  const counts = {
    all: feed.length,
    news: feed.filter((p) => p.type === 'news').length,
    schedule: feed.filter((p) => p.type === 'schedule').length,
    result: feed.filter((p) => p.type === 'result').length,
  };

  const filterChips: Array<{ value: string; label: string; count: number }> = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'news', label: 'News', count: counts.news },
    { value: 'schedule', label: 'Schedule', count: counts.schedule },
    { value: 'result', label: 'Results', count: counts.result },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Coach Feed</h1>
        <p className="mt-1 text-slate-600">
          Updates from coaches of the {teamIds.length} team{teamIds.length === 1 ? '' : 's'} you are on.
        </p>
      </header>

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {filterChips.map((c) => {
          const isActive = filter === c.value;
          return (
            <Link
              key={c.value}
              href={c.value === 'all' ? '/dashboard/coach-feed' : `/dashboard/coach-feed?type=${c.value}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-[#041E42] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{c.label}</span>
              <span className={`rounded-full px-1.5 text-xs ${isActive ? 'bg-white/20' : 'bg-white'}`}>
                {c.count}
              </span>
            </Link>
          );
        })}
        {unread > 0 && (
          <span className="ml-auto inline-flex items-center rounded-full bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-900">
            {unread} unread
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
          <p className="text-lg">No posts in this category yet.</p>
          <p className="mt-1 text-sm">Coaches will post here when there's news, schedule changes, or game results.</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {filtered.map((post) => {
            const isRead = readKeys.has(`${post.type === 'news' ? 'team_news' : post.type === 'schedule' ? 'team_schedule' : 'team_results'}:${post.id}`);
            return (
              <li key={`${post.type}-${post.id}`}>
                <FeedItem post={post} isRead={isRead} meta={FOCUS_META[post.type]} fmtRelative={fmtRelative} fmtDate={fmtDate} fmtTime={fmtTime}>
                  {!isRead && (
                    <MarkReadButton
                      postTable={post.type === 'news' ? 'team_news' : post.type === 'schedule' ? 'team_schedule' : 'team_results'}
                      postId={post.id}
                    />
                  )}
                </FeedItem>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
