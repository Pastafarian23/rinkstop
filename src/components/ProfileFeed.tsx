'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './ProfileFeed.module.css';

interface Post {
  id: string;
  body: string;
  media_url: string | null;
  created_at: string;
}

interface ProfileFeedProps {
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

export default function ProfileFeed({ isOwner, username, userId }: ProfileFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mountedRef = useRef(true);
  const MAX = 1000;

  // Load posts on mount
  useEffect(() => {
    mountedRef.current = true;
    if (userId) loadPosts();
    else setLoading(false);
    return () => {
      mountedRef.current = false;
    };
  }, [userId]);

  async function loadPosts() {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/profile-posts?user_id=${userId}`);
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        throw new Error((json as any).error || `Failed to load posts (${r.status})`);
      }
      const { data } = await r.json();
      if (mountedRef.current) {
        setPosts(data ?? []);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load posts');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  const openComposer = useCallback(() => {
    setComposerOpen(true);
    setError('');
  }, []);

  // Auto-focus textarea when composer opens
  useEffect(() => {
    if (composerOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [composerOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || submitting || body.trim().length > MAX) return;
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/profile-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          media_url: mediaUrl.trim() || undefined,
        }),
      });
      const json = await r.json();
      if (!r.ok) {
        setError(json.error ?? 'Failed to post');
        return;
      }
      setPosts(prev => [json.data, ...prev]);
      setBody('');
      setMediaUrl('');
      setComposerOpen(false);
    } catch {
      setError('Network error, try again');
    } finally {
      setSubmitting(false);
    }
  }

  function requestDelete(id: string) {
    if (deleteId === id) {
      // Second tap — confirm delete
      performDelete(id);
    } else {
      setDeleteId(id);
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
      deleteTimer.current = setTimeout(() => setDeleteId(null), 3000);
    }
  }

  async function performDelete(id: string) {
    setDeleteId(null);
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    try {
      const r = await fetch(`/api/profile-posts/${id}`, { method: 'DELETE' });
      if (r.ok) {
        setPosts(prev => prev.filter(p => p.id !== id));
      }
    } catch { /* silent */ }
  }

  const charsLeft = MAX - body.length;

  return (
    <>
      {/* ── Composer Modal ─────────────────────────────── */}
      {composerOpen && (
        <div className={styles.modalBackdrop} onClick={() => setComposerOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Write Post</span>
              <button
                className={styles.modalClose}
                onClick={() => setComposerOpen(false)}
                aria-label="Close composer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <textarea
                ref={textareaRef}
                className={styles.composerTextarea}
                placeholder={`What's on your mind, ${username}?`}
                value={body}
                onChange={e => setBody(e.target.value)}
                maxLength={MAX + 100}
                rows={4}
              />
              <div className={styles.charCount} data-warn={charsLeft < 50} data-over={charsLeft < 0}>
                {charsLeft < 50 ? `${charsLeft} left` : ''}
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Image URL <span className={styles.optional}>(optional)</span></label>
                <input
                  type="url"
                  className={styles.modalInput}
                  placeholder="https://..."
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                />
              </div>
              {error && <p className={styles.composerError}>{error}</p>}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setComposerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.postBtn}
                  disabled={!body.trim() || submitting || charsLeft < 0}
                >
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FAB — owner only ───────────────────────────── */}
      {isOwner && (
        <button
          className={styles.fab}
          onClick={openComposer}
          aria-label="Write post"
          title="Write post"
        >
          +
        </button>
      )}

      {/* ── Feed ──────────────────────────────────────── */}
      <section id="posts" className="space-y-4">
        {loading ? (
          <div className={styles.loadingPosts}>
            {[0, 1, 2].map(i => <div key={i} className={styles.postSkeleton} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden>📝</div>
            <h2 className="font-sport" style={{ fontSize: '1.25rem', color: '#fff', margin: '0 0 0.5rem' }}>
              {isOwner ? 'Share your first update' : 'No posts yet'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5 }}>
              {isOwner
                ? 'Post updates, share highlights, and write about your hockey journey. Posts are public and indexed by search.'
                : 'When this profile starts posting, the updates will appear here.'}
            </p>
            {isOwner && (
              <button
                onClick={openComposer}
                className={styles.emptyPostBtn}
              >
                Write your first post →
              </button>
            )}
          </div>
        ) : (
          <div className={styles.postList}>
            {posts.map(post => (
              <article key={post.id} className={styles.postCard}>
                <p className={styles.postBody}>{post.body}</p>
                {post.media_url && (
                  <img
                    src={post.media_url}
                    alt="Post image"
                    className={styles.postImage}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className={styles.postFooter}>
                  <time className={styles.postTime}>{timeAgo(post.created_at)}</time>
                  {isOwner && (
                    <button
                      className={`${styles.deleteBtn} ${deleteId === post.id ? styles.deleteBtnConfirm : ''}`}
                      onClick={() => requestDelete(post.id)}
                      title={deleteId === post.id ? 'Tap again to confirm delete' : 'Delete post'}
                    >
                      {deleteId === post.id ? 'Confirm delete?' : '🗑'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Media placeholder — preserved from original */}
        <div id="media">
          <div style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '1.5rem',
          }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-sport uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                Media
              </h2>
              <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
                Coming soon
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  aspectRatio: '1 / 1',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  color: 'rgba(255,255,255,0.15)',
                }} aria-hidden />
              ))}
            </div>
            <p className="mt-3" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
              Photos and videos uploaded by this profile will appear here.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
