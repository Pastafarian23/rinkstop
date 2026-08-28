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
  created_at: string;
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

  return (
    <section id="posts" className="space-y-4">
      {loading ? (
        <div className={styles.loadingPosts}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.postSkeleton} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden>📝</div>
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
              : 'When this profile starts posting, the updates will appear here.'}
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
              <p className={styles.postBody}>{post.body}</p>
              {post.media_url && (
                <img
                  src={post.media_url}
                  alt="Post image"
                  className={styles.postImage}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
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
            <span
              style={{
                fontSize: '0.5625rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              Coming soon
            </span>
          </div>
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
            Photos and videos uploaded by this profile will appear here.
          </p>
        </div>
      </div>
    </section>
  );
}
