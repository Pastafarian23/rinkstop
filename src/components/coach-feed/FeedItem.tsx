import Link from 'next/link';

interface PostMeta {
  label: string;
  emoji: string;
  color: string;
}

interface FeedItemProps {
  post: {
    id: string;
    type: 'news' | 'schedule' | 'result';
    team_id: string;
    team_name: string;
    team_slug: string;
    author_name: string | null;
    title: string;
    body: string;
    created_at: string;
    game_date?: string;
    opponent?: string;
    home_away?: 'home' | 'away' | 'neutral';
    our_score?: number;
    their_score?: number;
    start_at?: string;
    location?: string;
  };
  isRead: boolean;
  meta: PostMeta;
  fmtRelative: (iso: string) => string;
  fmtDate: (iso: string) => string;
  fmtTime: (iso: string) => string;
  children?: React.ReactNode;
}

export default function FeedItem({ post, isRead, meta, fmtRelative, fmtDate, fmtTime, children }: FeedItemProps) {
  return (
    <article
      className={`rounded-lg border bg-white p-4 shadow-sm transition ${
        isRead ? 'border-slate-200' : 'border-[#FFB81C] ring-1 ring-[#FFB81C]/30'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
        </span>
        <Link
          href={`/dashboard/team/${post.team_slug}`}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
        >
          {post.team_name}
        </Link>
        <span className="text-xs text-slate-400">·</span>
        <span className="text-xs text-slate-500" title={new Date(post.created_at).toLocaleString()}>
          {fmtRelative(post.created_at)}
        </span>
        {!isRead && (
          <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-rose-500" aria-label="Unread" />
        )}
      </div>

      <h2 className={`text-lg font-semibold ${isRead ? 'text-slate-700' : 'text-slate-900'}`}>
        {post.title}
      </h2>

      {post.type === 'schedule' && post.start_at && (
        <p className="mt-1 text-sm text-slate-600">
          <strong>📅 {fmtDate(post.start_at)}</strong> at {fmtTime(post.start_at)}
          {post.location ? ` · ${post.location}` : ''}
        </p>
      )}

      {post.type === 'result' && typeof post.our_score === 'number' && typeof post.their_score === 'number' && (
        <p className="mt-1 text-sm text-slate-600">
          <span className={post.our_score > post.their_score ? 'font-semibold text-green-700' : post.our_score < post.their_score ? 'font-semibold text-red-700' : 'font-semibold text-slate-700'}>
            {post.our_score > post.their_score ? 'Win' : post.our_score < post.their_score ? 'Loss' : 'Tie'} {post.our_score}–{post.their_score}
          </span>
          {post.game_date ? ` · ${fmtDate(post.game_date)}` : ''}
        </p>
      )}

      {post.body && post.type === 'news' && (
        <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-slate-700">
          {post.body}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {post.author_name && <span>Posted by {post.author_name}</span>}
        {children}
      </div>
    </article>
  );
}
