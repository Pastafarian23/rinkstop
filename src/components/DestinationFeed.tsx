'use client';

/**
 * DestinationFeed — renders profile posts for a team or league hub.
 *
 * Composes with the global PostComposer by dispatching
 * `rinkstop:open-composer` with target details so a team/league admin
 * can post directly to this hub.
 */

import { useState, useEffect, useCallback } from 'react';
import styles from './ProfileFeed.module.css';

interface Post {
  id: string;
  body: string;
  media_url: string | null;
  created_at: string;
  target_type?: string | null;
  target_id?: string | null;
  user_id?: string | null;
}

interface Props {
  targetType: 'team' | 'league';
  targetId: string;
  name: string;
  viewerIsAdmin?: boolean;
  composerLabel?: string;
  initialPosts?: Post[];
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

export default function DestinationFeed({ targetType, targetId, name, viewerIsAdmin, composerLabel, initialPosts = [] }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loading, setLoading] = useState(true);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/profile-posts?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(targetId)}`);
      if (r.ok) {
        const { data } = await r.json();
        setPosts(data ?? []);
      }
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [targetType, targetId]);

  useEffect(() => {
    load();
    function onPostCreated() {
      if ((event as any).detail?.target_type === targetType && (event as any).detail?.target_id === targetId) {
        load();
      }
    }
    window.addEventListener('rinkstop:post-created', onPostCreated);
    return () => window.removeEventListener('rinkstop:post-created', onPostCreated);
  }, [load, targetType, targetId]);

  function openComposer() {
    window.dispatchEvent(new CustomEvent('rinkstop:open-composer', {
      detail: { target_type: targetType, target_id: targetId, name: composerLabel || name },
    }));
  }

  async function confirmDelete(id: string) {
    setMenuPostId(null);
    setDeletingPostId(id);
    try {
      const r = await fetch(`/api/profile-posts/${id}`, { method: 'DELETE' });
      if (r.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        setDeletingPostId(id);
      }
    } catch {
      setDeletingPostId(id);
    }
  }

  return (
    <div className={styles.feed}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', margin: 0 }}>
          {name} Hub
        </h3>
        {viewerIsAdmin && (
          <button
            type="button"
            onClick={openComposer}
            style={{
              padding: '0.35rem 0.75rem',
              background: 'var(--red)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + New post
          </button>
        )}
      </div>

      {loading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Loading posts…</p>}
      {!loading && posts.length === 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', margin: '0 0 0.5rem' }}>No posts yet.</p>
          {viewerIsAdmin && (
            <button
              type="button"
              onClick={openComposer}
              style={{
                padding: '0.35rem 0.75rem',
                background: 'var(--red)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Write the first post
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {posts.map((post) => (
          <div
            key={post.id}
            style={{
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.875rem 1rem',
              opacity: deletingPostId === post.id ? 0.5 : 1,
            }}
          >
            {post.body && <p style={{ color: '#fff', fontSize: '0.9375rem', lineHeight: 1.6, margin: '0 0 0.5rem' }}>{post.body}</p>}
            {post.media_url && (
              <img src={post.media_url} alt="" style={{ maxWidth: '100%', borderRadius: 6, marginBottom: '0.5rem' }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{timeAgo(post.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
