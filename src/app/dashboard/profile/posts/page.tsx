'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface Post {
  id: string;
  body: string;
  media_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProfilePostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const deleteConfirm = useRef<string | null>(null);

  const MAX_CHARS = 1000;

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch('/api/profile-posts/me');
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
    if (!body.trim()) return;
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
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.05em', color: '#fff', marginBottom: '1.5rem' }}>
        Post an Update
      </h1>

      {/* Composer */}
      <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '1.25rem', marginBottom: '2rem' }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Share an update with your followers..."
          maxLength={MAX_CHARS}
          rows={4}
          style={{
            width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, color: '#fff', fontSize: '0.95rem', padding: '0.75rem',
            resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(200,16,46,0.6)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
          <input
            type="url"
            value={mediaUrl}
            onChange={e => setMediaUrl(e.target.value)}
            placeholder="Image URL (optional)"
            style={{
              flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6, color: '#fff', fontSize: '0.85rem', padding: '0.4rem 0.6rem',
              marginRight: '0.75rem', outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(200,16,46,0.6)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
          />
          <span style={{ fontSize: '0.75rem', color: body.length > 900 ? '#e53' : 'rgba(255,255,255,0.4)', marginRight: '0.75rem' }}>
            {body.length}/{MAX_CHARS}
          </span>
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            style={{
              background: submitting ? 'rgba(200,16,46,0.5)' : 'var(--red, #C8102E)',
              color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.25rem',
              fontSize: '0.85rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em',
            }}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
        {error && <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
        {success && <p style={{ color: '#51cf66', fontSize: '0.85rem', marginTop: '0.5rem' }}>{success}</p>}
      </form>

      {/* Post list */}
      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
        Your Posts
      </h2>
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Loading...</p>
      ) : posts.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem' }}>No posts yet. Share your first update above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map(post => (
            <div key={post.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '1rem' }}>
              <p style={{ color: '#fff', fontSize: '0.95rem', whiteSpace: 'pre-wrap', margin: '0 0 0.75rem' }}>{post.body}</p>
              {post.media_url && (
                <img src={post.media_url} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8, marginBottom: '0.75rem' }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>{formatDate(post.created_at)}</span>
                <button
                  onClick={() => handleDelete(post.id)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '0.78rem', padding: '0.2rem 0.5rem', borderRadius: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e53')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                >
                  {deleteConfirm.current === post.id ? 'Confirm delete' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
