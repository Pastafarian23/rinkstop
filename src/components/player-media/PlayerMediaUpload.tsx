'use client';

/**
 * PlayerMediaUpload — Phase 1b-3.
 *
 * Multi-file picker (1-5, 100MB cap, mime-validated). For photos, the
 * client generates thumbnail/medium/full variants via <canvas> before
 * upload. Each variant is uploaded to Supabase Storage via signed URL.
 * Then the metadata + storage paths are POSTed to /api/player-media.
 *
 * v1: HEIC is rejected (.heic files can't be decoded by all browsers for
 *     canvas variant generation). .mp4 / .webm videos uploaded as-is.
 */

import { useRef, useState } from 'react';

const MAX_FILES = 5;
const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED_PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/webm']);

interface StagedItem {
  localId: string;
  file: File;
  mediaType: 'photo' | 'video';
  caption: string;
  isPrimary: boolean;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  /** For photos: { original, thumbnail, medium, full } → all storage paths.
   *  For videos: { original } only. */
  storagePaths: Record<string, string>;
  fileSize: number;
  status: 'staged' | 'uploading' | 'uploaded' | 'failed';
  error?: string;
}

interface PlayerMediaUploadProps {
  playerId: string;
  onAdded?: () => void;
}

const PHOTO_VARIANT_SIZES = [
  { name: 'thumbnail', width: 200 },
  { name: 'medium', width: 800 },
  { name: 'full', width: 1600 },
];

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Could not load image'));
    img.src = URL.createObjectURL(file);
  });
}

async function generatePhotoVariants(
  file: File
): Promise<{ blob: Blob; variant: string }[]> {
  const img = await loadImage(file);
  const out: { blob: Blob; variant: string }[] = [];
  for (const { width, name } of PHOTO_VARIANT_SIZES) {
    if (img.naturalWidth <= width) continue;
    const scale = width / img.naturalWidth;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    if (blob) out.push({ blob, variant: name });
  }
  URL.revokeObjectURL(img.src);
  return out;
}

function sanitizeFilename(name: string): string {
  return (name || 'media').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);
}

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/webm') return 'webm';
  return 'bin';
}

export default function PlayerMediaUpload({ playerId, onAdded }: PlayerMediaUploadProps) {
  const [stage, setStage] = useState<'idle' | 'form' | 'saving'>('idle');
  const [items, setItems] = useState<StagedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setItems([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setStage('idle');
  }

  async function handleFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const incoming = Array.from(files);
    const allowed = MAX_FILES - items.length;
    if (incoming.length > allowed) {
      setError(`You can upload at most ${MAX_FILES} media items per batch. You tried to add ${incoming.length}; only ${allowed} slots left.`);
      return;
    }
    for (const f of incoming) {
      if (f.size <= 0 || f.size > MAX_BYTES) {
        setError(`"${f.name}" is too large. Max is 100 MB; got ${(f.size / 1024 / 1024).toFixed(2)} MB.`);
        return;
      }
      const isPhoto = ALLOWED_PHOTO_MIME.has(f.type);
      const isVideo = ALLOWED_VIDEO_MIME.has(f.type);
      if (!isPhoto && !isVideo) {
        setError(`"${f.name}" is not a supported file type. Allowed: JPEG, PNG, WEBP, MP4, WebM. Got: ${f.type || 'unknown'}.`);
        return;
      }
    }

    const newItems: StagedItem[] = [];
    for (const file of incoming) {
      const isPhoto = ALLOWED_PHOTO_MIME.has(file.type);
      const mediaType: 'photo' | 'video' = isPhoto ? 'photo' : 'video';
      let width: number | null = null;
      let height: number | null = null;
      let durationSec: number | null = null;
      if (isPhoto) {
        try {
          const img = await loadImage(file);
          width = img.naturalWidth;
          height = img.naturalHeight;
          URL.revokeObjectURL(img.src);
        } catch {
          // ignore dimension extraction failure
        }
      } else {
        // Try to read video duration
        try {
          await new Promise<void>((resolve, reject) => {
            const v = document.createElement('video');
            v.preload = 'metadata';
            v.onloadedmetadata = () => {
              durationSec = Math.round(v.duration);
              URL.revokeObjectURL(v.src);
              resolve();
            };
            v.onerror = () => { URL.revokeObjectURL(v.src); reject(new Error('Could not read video')); };
            v.src = URL.createObjectURL(file);
          });
        } catch {
          // ignore duration read failure
        }
      }
      newItems.push({
        localId: crypto.randomUUID(),
        file,
        mediaType,
        caption: '',
        isPrimary: false,
        width,
        height,
        durationSec,
        storagePaths: {},
        fileSize: file.size,
        status: 'staged',
      });
    }
    setItems((prev) => [...prev, ...newItems]);
    setStage('form');
  }

  function updateItem(localId: string, patch: Partial<StagedItem>) {
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)));
  }

  function removeItem(localId: string) {
    setItems((prev) => {
      const next = prev.filter((it) => it.localId !== localId);
      if (next.length === 0) {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      return next;
    });
  }

  async function handleSave() {
    if (items.length === 0) {
      setError('Add at least one media item.');
      return;
    }
    for (const it of items) {
      if (it.caption.length > 200) {
        setError(`Caption for "${it.file.name}" is too long (200 char max).`);
        return;
      }
    }
    setStage('saving');
    setError(null);

    try {
      // Step 1: For each item, generate variants (photos) and upload each
      // file to Supabase Storage via signed upload URLs.
      const newItems: StagedItem[] = [];
      for (const it of items) {
        const mediaId = crypto.randomUUID();
        const baseName = sanitizeFilename(it.file.name.replace(/\.[^.]+$/, ''));
        const baseExt = extFromMime(it.file.type);
        const paths: Record<string, string> = {};

        if (it.mediaType === 'photo') {
          // Always upload the original
          const origPath = `${playerId}/${mediaId}/${baseName}.${baseExt}`;
          await uploadToStorage(it.file, origPath, it.file.type);
          paths.original = origPath;

          // Generate variants
          try {
            const variants = await generatePhotoVariants(it.file);
            for (const { blob, variant } of variants) {
              const variantPath = `${playerId}/${mediaId}/${baseName}.${variant}.webp`;
              await uploadToStorage(blob, variantPath, 'image/webp');
              paths[variant] = variantPath;
            }
          } catch (e) {
            // Variant generation failed — keep original, skip variants
            console.warn('Variant generation failed for', it.file.name, e);
          }
        } else {
          // Video: original only
          const origPath = `${playerId}/${mediaId}/${baseName}.${baseExt}`;
          await uploadToStorage(it.file, origPath, it.file.type);
          paths.original = origPath;
        }

        newItems.push({ ...it, storagePaths: paths, status: 'uploaded' });
      }

      // Step 2: POST the metadata to the server route
      const fd = new FormData();
      fd.set('player_id', playerId);
      newItems.forEach((it, idx) => {
        fd.set(`items[${idx}][media_type]`, it.mediaType);
        if (it.caption) fd.set(`items[${idx}][caption]`, it.caption);
        if (it.width) fd.set(`items[${idx}][width_px]`, String(it.width));
        if (it.height) fd.set(`items[${idx}][height_px]`, String(it.height));
        if (it.durationSec) fd.set(`items[${idx}][duration_sec]`, String(it.durationSec));
        fd.set(`items[${idx}][storage_paths]`, JSON.stringify(it.storagePaths));
        fd.set(`items[${idx}][file_size_bytes]`, String(it.fileSize));
        if (it.isPrimary) fd.set(`items[${idx}][is_primary]`, 'true');
      });

      const res = await fetch('/api/player-media', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Upload failed (${res.status})`);
      }

      reset();
      onAdded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage('form');
    }
  }

  async function uploadToStorage(blob: Blob, path: string, contentType: string) {
    // Get a signed upload URL from the server
    const urlRes = await fetch('/api/player-media/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId, path, size: blob.size, mime: contentType }),
    });
    if (!urlRes.ok) {
      const body = await urlRes.json().catch(() => ({}));
      throw new Error(`upload_url_failed: ${body?.error || urlRes.status}`);
    }
    const { upload_url, token } = await urlRes.json();
    // PUT the file to the signed URL
    const putRes = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType, 'Authorization': `Bearer ${token}` },
      body: blob,
    });
    if (!putRes.ok) {
      throw new Error(`storage_upload_failed: ${putRes.status}`);
    }
  }

  if (stage === 'idle') {
    return (
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        data-testid="player-media-upload-trigger"
        style={{
          marginTop: '0.75rem',
          padding: '0.55rem 1rem',
          background: '#14B8A6',
          color: '#0a0a0a',
          border: 'none',
          borderRadius: 6,
          fontSize: '0.85rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        + Upload media
      </button>
    );
  }

  return (
    <div
      data-testid="player-media-upload-form"
      style={{
        marginTop: '0.75rem',
        padding: '0.75rem',
        background: '#0a0a0a',
        border: '1px solid #1e1e1e',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
        multiple
        onChange={(e) => handleFilesPicked(e.target.files)}
        style={{ display: 'none' }}
      />
      {error ? (
        <div
          role="alert"
          style={{
            padding: '0.4rem 0.6rem',
            background: 'rgba(200,16,46,0.12)',
            border: '1px solid rgba(200,16,46,0.4)',
            borderRadius: 6,
            color: '#FF6B7A',
            fontSize: '0.8rem',
          }}
        >
          {error}
        </div>
      ) : null}
      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={stage === 'saving'}
          style={{
            padding: '0.5rem',
            background: '#141414',
            border: '1px dashed #2a2a2a',
            borderRadius: 6,
            color: 'rgba(255,255,255,0.65)',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          + Add more media (1-5)
        </button>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((it) => (
            <li
              key={it.localId}
              data-testid="player-media-staged-row"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '0.5rem',
                background: '#141414',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                <span style={{ color: it.mediaType === 'photo' ? '#14B8A6' : '#FFB81C' }}>
                  {it.mediaType === 'photo' ? '🖼️' : '🎬'}
                </span>
                <span style={{ color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.file.name}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                  {(it.fileSize / 1024 / 1024).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(it.localId)}
                  disabled={stage === 'saving'}
                  style={{
                    padding: '0.2rem 0.4rem',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 4,
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={it.caption}
                onChange={(e) => updateItem(it.localId, { caption: e.target.value })}
                maxLength={200}
                placeholder="Optional caption"
                disabled={stage === 'saving'}
                style={{
                  padding: '0.4rem 0.5rem',
                  background: '#0a0a0a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: '0.8rem',
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                <input
                  type="checkbox"
                  checked={it.isPrimary}
                  onChange={(e) => updateItem(it.localId, { isPrimary: e.target.checked })}
                  disabled={stage === 'saving'}
                />
                Set as primary {it.mediaType}
              </label>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && items.length < MAX_FILES ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={stage === 'saving'}
          style={{
            padding: '0.4rem',
            background: '#141414',
            border: '1px dashed #2a2a2a',
            borderRadius: 6,
            color: 'rgba(255,255,255,0.55)',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          + Add more ({MAX_FILES - items.length} slot{MAX_FILES - items.length === 1 ? '' : 's'} left)
        </button>
      ) : null}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={reset}
          disabled={stage === 'saving'}
          style={{
            padding: '0.4rem 0.9rem',
            background: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            color: '#0a0a0a',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: stage === 'saving' ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={stage === 'saving' || items.length === 0}
          style={{
            padding: '0.4rem 1.1rem',
            background: stage === 'saving' || items.length === 0 ? '#9ca3af' : '#14B8A6',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: stage === 'saving' || items.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {stage === 'saving' ? 'Uploading…' : `Save ${items.length} item${items.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
