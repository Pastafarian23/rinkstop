'use client';

/**
 * ProfileFeed — renders the post list + delete controls on a profile page.
 *
 * The post composer and the blue "+" FAB moved to a layout-level
 * PostComposer component (mounted in src/app/layout.tsx). They used to
 * live here; extracting them makes the FAB persistent across pages the
 * same way RoleAwareTabBar is.
 *
 * Why a window event instead of a shared store?
 *   - The composer is mounted at the layout root and the feed is mounted
 *     deep in the route tree. A custom DOM event lets the empty-state
 *     "Write your first post" button ask the composer to open without
 *     prop-drilling or context plumbing.
 *   - The event listener also re-fetches posts when a post is created
 *     from anywhere (FAB on /dashboard, FAB on /directory, etc.) so the
 *     feed updates without a full page reload.
 *
 * Rules of hooks: no early returns above hook calls. Auth gates happen
 * at the parent (page.tsx) which only mounts this when relevant.
 */

import { useState, useEffect, useRef } from 'react';
import styles from './ProfileFeed.module.css';

interface Post {
  id: string;
  body: string;
  media_url: string | null;
  media_thumb?: string | null;
  created_at: string;
  sport?: string | null;
}

// The sport values the POST endpoint accepts (mirrors ALLOWED_SPORTS in
// src/app/api/profile-posts/route.ts).
const SPORTS = [
  'hockey', 'figure_skating', 'speed_skating',
  'basketball', 'soccer', 'baseball', 'other',
] as const;

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url) || url.includes('/post-media/');
}

/** The media type a post carries, used for the badge + render branch. */
function postMediaKind(url: string): 'video' | 'image' {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url) ? 'video' : 'image';
}

interface Props {
  isOwner: boolean;
  username: string;
  userId?: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function ProfileFeed({ isOwner, username, userId }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  // Per-post action menu (the "⋯" dropdown). null = no menu open.
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  // Post that's been confirmed for deletion but the DELETE request is
  // still in flight. We render a faded state so the user sees feedback.
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Edit-post state (2026-11-05, Arnel: "can only delete not edit so add
  // edit functionality"). `editingPostId` is the post being edited (null =
  // not editing), `editBody` is the draft text, `editSport` the sport picker
  // value, `editSaving` the in-flight flag.
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editSport, setEditSport] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Fetch posts for this profile.
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/profile-posts?user_id=${userId}`);
        if (r.ok) {
          const { data } = await r.json();
          if (!cancelled) setPosts(data ?? []);
        }
      } catch { /* noop */ }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  // Listen for posts created elsewhere (FAB on another page) so this
  // feed refreshes when the user navigates back to a profile they own.
  useEffect(() => {
    if (!isOwner || !userId) return undefined;
    function onPostCreated() {
      // Re-fetch posts.
      fetch(`/api/profile-posts?user_id=${userId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.data) setPosts(d.data);
        })
        .catch(() => { /* silent */ });
    }
    window.addEventListener('rinkstop:post-created', onPostCreated);
    return () => window.removeEventListener('rinkstop:post-created', onPostCreated);
  }, [isOwner, userId]);

  function openGlobalComposer() {
    window.dispatchEvent(new CustomEvent('rinkstop:open-composer'));
  }

  async function confirmDelete(id: string) {
    setMenuPostId(null);
    setDeletingPostId(id);
    try {
      const r = await fetch(`/api/profile-posts/${id}`, { method: 'DELETE' });
      if (r.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        // Restore the post if delete failed.
        setDeletingPostId(null);
      }
    } catch {
      setDeletingPostId(null);
    }
  }

  function startEdit(post: Post) {
    setMenuPostId(null);
    setEditingPostId(post.id);
    setEditBody(post.body ?? '');
    setEditSport(post.sport ?? null);
    setEditError('');
  }

  function cancelEdit() {
    setEditingPostId(null);
    setEditBody('');
    setEditSport(null);
    setEditError('');
  }

  async function saveEdit(postId: string) {
    setEditSaving(true);
    setEditError('');
    try {
      const r = await fetch(`/api/profile-posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editBody, sport: editSport }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setEditError(j.error || 'Could not save the post.');
        setEditSaving(false);
        return;
      }
      const j = await r.json().catch(() => ({}));
      const updated = j.post;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                body: updated?.body ?? editBody,
                sport: updated?.sport ?? editSport,
              }
            : p,
        ),
      );
      cancelEdit();
    } catch {
      setEditError('Could not save the post. Check your connection and try again.');
      setEditSaving(false);
    }
  }

  // Close the post action menu when clicking outside of it.
  useEffect(() => {
    if (!menuPostId) return undefined;
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest('[data-post-menu]')) {
        setMenuPostId(null);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [menuPostId]);

  const mediaPosts = posts.filter((p) => p.media_url && isVideoUrl(p.media_url));
  const textPosts = posts.filter((p) => !p.media_url || !isVideoUrl(p.media_url));

  return (
    <section id="posts" className="space-y-4">
      {/* Section heading — the posts feed had no header at all, which is
          why it read as unorganized: the About card above it had a visible
          "About" label but this one did not. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '0.25rem',
        }}
      >
        <h2
          className="font-sport uppercase"
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
          }}
        >
          Posts
        </h2>
        {!loading && posts.length > 0 && (
          <span
            style={{
              fontSize: '0.5625rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </span>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingPosts}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.postSkeleton} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden>🏒</div>
          <h2
            className="font-sport"
            style={{ fontSize: '1.25rem', color: '#fff', margin: '0 0 0.5rem' }}
          >
            {isOwner ? 'Share your first update' : 'No posts yet'}
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.55)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {isOwner
              ? 'Post updates, share highlights, and write about your hockey journey. Posts are public and indexed by search.'
              : 'When this profile starts posting, updates from their hockey journey will appear here.'}
          </p>
          {isOwner && (
            <button onClick={openGlobalComposer} className={styles.emptyPostBtn}>
              Write your first post →
            </button>
          )}
        </div>
      ) : (
        <div className={styles.postList}>
          {posts.map((post) => (
            <article key={post.id} className={styles.postCard}>
              {editingPostId === post.id ? (
                // Inline editor (2026-11-05). Editing happens in place rather
                // than in a modal so the post stays in context, and the
                // character count mirrors the 1,000-char limit the POST
                // endpoint enforces.
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    maxLength={1000}
                    autoFocus
                    aria-label="Edit post text"
                    style={{
                      width: '100%',
                      minHeight: '5.5rem',
                      resize: 'vertical',
                      padding: '0.75rem',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#fff',
                      fontSize: '0.95rem',
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <select
                      value={editSport ?? ''}
                      onChange={(e) => setEditSport(e.target.value || null)}
                      aria-label="Sport"
                      style={{
                        padding: '0.4rem 0.55rem',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        fontSize: '0.8rem',
                      }}
                    >
                      <option value="">No sport</option>
                      {SPORTS.map((sp) => (
                        <option key={sp} value={sp}>
                          {sp.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                      {editBody.length}/1000
                    </span>
                    <button
                      type="button"
                      onClick={() => saveEdit(post.id)}
                      disabled={editSaving || !editBody.trim()}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 6,
                        border: 'none',
                        background: editSaving || !editBody.trim() ? 'rgba(255,255,255,0.15)' : '#C8102E',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: editSaving || !editBody.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      style={{
                        padding: '0.4rem 0.7rem',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  {editError ? (
                    <p role="alert" style={{ margin: 0, fontSize: '0.8rem', color: '#FF6B6B' }}>
                      {editError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className={styles.postBody}>{post.body}</p>
              )}
              {post.media_url && (
                postMediaKind(post.media_url) === 'video' ? (
                  // Videos must render as <video>, not <img>. An <img> pointed
                  // at an mp4 fails to decode, fires onError, and gets hidden —
                  // which is why a posted video appeared as an empty card with
                  // only the timestamp. (Arnel, 2026-10-22)
                  <video
                    src={post.media_url}
                    poster={post.media_thumb ?? undefined}
                    controls
                    playsInline
                    preload="metadata"
                    // Park on a frame so the player shows a poster rather than
                    // a black 0:00 box before the user taps play.
                    ref={(el) => {
                      if (el && el.currentTime === 0) {
                        try { el.currentTime = 0.1; } catch { /* not seekable yet */ }
                      }
                    }}
                    className={styles.postImage}
                    style={{ aspectRatio: '16 / 9', objectFit: 'contain', background: '#000' }}
                  />
                ) : (
                  <img
                    src={post.media_url}
                    alt={post.body ? `Media from post: ${post.body.slice(0, 80)}` : 'Post image'}
                    className={styles.postImage}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )
              )}
              <div className={styles.postFooter}>
                <time className={styles.postTime}>{timeAgo(post.created_at)}</time>
                {isOwner && (
                  <button
                    type="button"
                    className={styles.postMenuTrigger}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuPostId(menuPostId === post.id ? null : post.id);
                    }}
                    aria-label="Post actions"
                    aria-haspopup="menu"
                    aria-expanded={menuPostId === post.id}
                    data-post-menu
                  >
                    ⋯
                  </button>
                )}
              </div>
              {isOwner && menuPostId === post.id && (
                <div
                  className={styles.postMenu}
                  role="menu"
                  data-post-menu
                >
                  <button
                    type="button"
                    className={styles.postMenuItem}
                    onClick={() => startEdit(post)}
                    role="menuitem"
                  >
                    Edit post
                  </button>
                  <button
                    type="button"
                    className={`${styles.postMenuItem} ${styles.postMenuItemDanger}`}
                    onClick={() => confirmDelete(post.id)}
                    role="menuitem"
                    disabled={deletingPostId === post.id}
                  >
                    {deletingPostId === post.id ? 'Deleting…' : 'Delete post'}
                  </button>
                </div>
              )}
              {deletingPostId === post.id && (
                // Visual feedback that the post is being removed. We don't
                // unmount until the network call returns so the user sees
                // the spinner-style state for at least one frame.
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Removing…</span>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <div id="media">
        <div
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '1.5rem',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2
              className="font-sport uppercase"
              style={{
                fontSize: '0.75rem',
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.5)',
                margin: 0,
              }}
            >
              Media
            </h2>
            {mediaPosts.length > 0 && (
              <span
                style={{
                  fontSize: '0.5625rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                {mediaPosts.length} {mediaPosts.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          {mediaPosts.length > 0 ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                }}
              >
                {mediaPosts.slice(0, 9).map((post) => (
                  <a
                    key={`media-${post.id}`}
                    href={post.media_url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 6,
                      overflow: 'hidden',
                      display: 'block',
                      border: '1px solid rgba(255,255,255,0.08)',
                      position: 'relative',
                    }}
                  >
                    {postMediaKind(post.media_url ?? '') === 'video' ? (
                      <video
                        src={post.media_url ?? undefined}
                        poster={post.media_thumb ?? undefined}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={post.media_thumb || post.media_url || undefined}
                        alt={post.body ? `Media from post: ${post.body.slice(0, 80)}` : 'Post media'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    )}
                  </a>
                ))}
              </div>
              <p
                className="mt-3"
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.4)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Photos and videos shared by this profile. Tap one to open it.
              </p>
            </>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1 / 1',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px dashed rgba(255,255,255,0.1)',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      color: 'rgba(255,255,255,0.15)',
                    }}
                    aria-hidden
                  />
                ))}
              </div>
              <p
                className="mt-3"
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.4)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {isOwner
                  ? 'Share a photo or video and it will show up here.'
                  : 'Photos and videos shared by this profile will appear here.'}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
