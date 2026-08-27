'use client';
import { useState, useEffect, useRef } from 'react';
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
  userId?: string; // Clerk user_id for the profile being viewed
}

/**
 * Right column feed for the profile page. Posts / Updates surface.
 * Pulls from /api/profile-posts when userId is provided.
 */
export default function ProfileFeed({ isOwner, userId }: ProfileFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const deleteConfirm = useRef<string | null>(null);
  const MAX_CHARS = 1000;

  useEffect(() => {
    if (userId) {
      loadPosts();
    }
  }, [userId]);

  async function loadPosts() {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/profile-posts?user_id=${userId}`);
      if (res.ok) {
        const { data } = await res.json();
        setPosts(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/profile-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim(), media_url: mediaUrl.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to post');
        return;
      }
      setPosts(prev => [json.data, ...prev]);
      setBody('');
      setMediaUrl('');
      setShowComposer(false);
      setSuccess('Posted!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (deleteConfirm.current !== id) {
      deleteConfirm.current = id;
      return;
    }
    deleteConfirm.current = null;
    const res = await fetch(`/api/profile-posts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPosts(prev => prev.filter(p => p.id !== id));
    }
  }

  function formatDate(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const hasPosts = posts.length > 0;
  const showEmptyState = !loading && !hasPosts;

  return (
    <section id="posts" className={styles.section}>
      {/* Inline composer — shown when FAB is tapped on profile page */}
      {showComposer && (
        <div className={styles.composerOverlay} onClick={e => { if (e.target === e.currentTarget) setShowComposer(false); }}>
          <div className={styles.composerBox}>
            <div className={styles.composerHeader}>
              <span style={{ color: '#fff', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>New Update</span>
              <button onClick={() => setShowComposer(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <textarea
                autoFocus
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Share an update..."
                maxLength={MAX_CHARS}
                rows={4}
                className={styles.composerTextarea}
              />
              <div className={styles.composerFooter}>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  placeholder="Image URL (optional)"
                  className={styles.mediaInput}
                />
                <span style={{ fontSize: '0.7rem', color: body.length > 900 ? '#e53' : 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                  {body.length}/{MAX_CHARS}
                </span>
                <button type="submit" disabled={submitting || !body.trim()} className={styles.postBtn}>
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
              {error && <p className={styles.errorMsg}>{error}</p>}
              {success && <p className={styles.successMsg}>{success}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Feed */}
      {showEmptyState ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📝</div>
          <h2 className={styles.emptyTitle}>
            {isOwner ? 'Share your first update' : 'No posts yet'}
          </h2>
          <p className={styles.emptyText}>
            {isOwner
              ? 'Post updates, share highlights, and write about your hockey journey. Posts are public and indexed by search.'
              : 'When this profile starts posting, the updates will appear here.'}
          </p>
          {isOwner && (
            <button
              onClick={() => setShowComposer(true)}
              className={styles.fabButton}
              aria-label="Compose new post"
            >
              +
            </button>
          )}
        </div>
      ) : (
        <div className={styles.feedList}>
          {isOwner && (
            <button
              onClick={() => setShowComposer(true)}
              className={styles.fabButton}
              aria-label="Compose new post"
              style={{ marginBottom: '1rem' }}
            >
              +
            </button>
          )}
          {loading ? (
            <div className={styles.loadingState}>Loading...</div>
          ) : (
            posts.map(post => (
              <article key={post.id} className={styles.postCard}>
                <p className={styles.postBody}>{post.body}</p>
                {post.media_url && (
                  <img src={post.media_url} alt="" className={styles.postImage} />
                )}
                <div className={styles.postMeta}>
                  <span className={styles.postDate}>{formatDate(post.created_at)}</span>
                  {isOwner && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(post.id)}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e53')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                    >
                      {deleteConfirm.current === post.id ? 'Confirm delete' : 'Delete'}
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* Media placeholder */}
      <div id="media" style={{ scrollMarginTop: '5rem', marginTop: '1.5rem' }}>
        <div className={styles.mediaCard}>
          <div className={styles.mediaHeader}>
            <h2 className={styles.mediaTitle}>Media</h2>
            <span className={styles.comingSoonBadge}>Coming soon</span>
          </div>
          <div className={styles.mediaGrid}>
            {[0, 1, 2].map(i => (
              <div key={i} className={styles.mediaPlaceholder} />
            ))}
          </div>
          <p className={styles.mediaHint}>
            Photos and videos uploaded by this profile will appear here.
          </p>
        </div>
      </div>
    </section>
  );
}
