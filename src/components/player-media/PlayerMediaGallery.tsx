'use client';

/**
 * PlayerMediaGallery — Phase 1b-3.
 * Read-only thumbnail grid. 4 columns. Click to expand to a simple
 * lightbox (image or video). Set-as-primary + archive actions.
 */

import { useEffect, useState } from 'react';

export interface PlayerMedia {
  id: string;
  player_id: string;
  media_type: 'photo' | 'video';
  caption: string | null;
  storage_paths: Record<string, string>;
  width_px: number | null;
  height_px: number | null;
  duration_sec: number | null;
  file_size_bytes: number;
  is_primary: boolean;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

interface PlayerMediaGalleryProps {
  playerId: string;
  media: PlayerMedia[];
  onChange?: () => void;
}

const MIME_ICON: Record<string, string> = {
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/webp': '🖼️',
  'image/heic': '🖼️',
  'video/mp4': '🎬',
  'video/webm': '🎬',
  'video/quicktime': '🎬',
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function inferMimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mov') return 'video/quicktime';
  return 'image/jpeg';
}

export default function PlayerMediaGallery({ playerId: _playerId, media, onChange }: PlayerMediaGalleryProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = media.filter((m) => m.status === 'active');
  const archived = media.filter((m) => m.status === 'archived');
  const visible = active;

  if (visible.length === 0) {
    return (
      <div
        data-testid="player-media-empty"
        style={{
          padding: '1rem',
          background: '#0a0a0a',
          border: '1px dashed rgba(255,255,255,0.15)',
          borderRadius: 10,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.85rem',
        }}
      >
        No media yet. Upload a photo or short video to start your child's media library.
      </div>
    );
  }

  async function handleSetPrimary(id: string) {
    setError(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/player-media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Set primary failed (${res.status})`);
      }
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this media? It will be hidden from the gallery but the file is kept on file.')) {
      return;
    }
    setError(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/player-media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Archive failed (${res.status})`);
      }
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleLightboxAction(action: 'primary' | 'archive') {
    if (lightboxIdx === null) return;
    const item = visible[lightboxIdx];
    if (action === 'primary') {
      await handleSetPrimary(item.id);
    } else {
      await handleArchive(item.id);
      setLightboxIdx(null);
    }
  }

  return (
    <div data-testid="player-media-gallery">
      {error ? (
        <div
          role="alert"
          style={{
            padding: '0.5rem 0.75rem',
            background: 'rgba(200,16,46,0.12)',
            border: '1px solid rgba(200,16,46,0.4)',
            borderRadius: 8,
            color: '#FF6B7A',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
          }}
        >
          {error}
        </div>
      ) : null}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 8,
        }}
      >
        {visible.map((m, i) => {
          const thumbPath = m.storage_paths.thumbnail || m.storage_paths.medium || m.storage_paths.full || m.storage_paths.original;
          const mime = thumbPath ? inferMimeFromPath(thumbPath) : 'image/jpeg';
          const isVideo = m.media_type === 'video' || mime.startsWith('video/');
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setLightboxIdx(i)}
              data-testid="player-media-thumb"
              style={{
                position: 'relative',
                aspectRatio: '1',
                background: '#0a0a0a',
                border: '1px solid #141414',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {thumbPath ? (
                <SignedThumb path={thumbPath} mime={mime} isVideo={isVideo} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2rem' }}>
                  {MIME_ICON[mime] || '📄'}
                </div>
              )}
              {m.is_primary ? (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    background: '#14B8A6',
                    color: '#0a0a0a',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.3rem',
                    borderRadius: 3,
                  }}
                >
                  PRIMARY
                </span>
              ) : null}
              {m.caption ? (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))',
                    color: '#fff',
                    fontSize: '0.7rem',
                    padding: '1.5rem 0.4rem 0.3rem',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.caption}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {archived.length > 0 ? (
        <div
          style={{
            marginTop: '0.75rem',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.75rem',
            textAlign: 'center',
          }}
        >
          {archived.length} archived (v1 has no restore; v2 adds it)
        </div>
      ) : null}

      {lightboxIdx !== null ? (
        <Lightbox
          item={visible[lightboxIdx]}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setLightboxIdx((i) => (i !== null && i < visible.length - 1 ? i + 1 : i))}
          onAction={handleLightboxAction}
          busy={busy === visible[lightboxIdx]?.id}
        />
      ) : null}
    </div>
  );
}

function SignedThumb({ path, mime, isVideo }: { path: string; mime: string; isVideo: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/player-media/thumb-url?path=${encodeURIComponent(path)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d) setUrl(d.url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path]);
  if (!url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.5rem' }}>
        {MIME_ICON[mime] || '📄'}
      </div>
    );
  }
  if (isVideo) {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        <video src={url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span style={{ position: 'absolute', top: 4, right: 4, color: '#fff', fontSize: '1.2rem' }}>🎬</span>
      </div>
    );
  }
  return <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}

function Lightbox({
  item,
  onClose,
  onPrev,
  onNext,
  onAction,
  busy,
}: {
  item: PlayerMedia;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onAction: (action: 'primary' | 'archive') => void;
  busy: boolean;
}) {
  const [urls, setUrls] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/player-media/${item.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d) setUrls(d.urls); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item.id]);

  const fullPath = item.storage_paths.full || item.storage_paths.original;
  const fullUrl = urls?.[item.storage_paths.full ? 'full' : 'original'] || urls?.original;
  const mime = fullPath ? inferMimeFromPath(fullPath) : 'image/jpeg';
  const isVideo = item.media_type === 'video' || mime.startsWith('video/');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {fullUrl ? (
          isVideo ? (
            <video
              src={fullUrl}
              controls
              autoPlay
              muted
              style={{ maxWidth: '90vw', maxHeight: '70vh', borderRadius: 8 }}
            />
          ) : (
            <img
              src={fullUrl}
              alt={item.caption || ''}
              style={{ maxWidth: '90vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
            />
          )
        ) : (
          <div style={{ color: '#fff', padding: '2rem' }}>Loading…</div>
        )}
        {item.caption ? (
          <div style={{ color: '#fff', fontSize: '0.9rem', textAlign: 'center', maxWidth: 480 }}>{item.caption}</div>
        ) : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => onAction('primary')}
            disabled={busy || item.is_primary}
            style={{
              padding: '0.5rem 1rem',
              background: item.is_primary ? '#9ca3af' : '#14B8A6',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: busy || item.is_primary ? 'not-allowed' : 'pointer',
            }}
          >
            {item.is_primary ? 'Already primary' : 'Set as primary'}
          </button>
          <button
            type="button"
            onClick={() => onAction('archive')}
            disabled={busy}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Archive
          </button>
          <button
            type="button"
            onClick={onPrev}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Next →
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
