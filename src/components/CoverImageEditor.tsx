'use client';

/**
 * CoverImageEditor — owner-only UI for picking / cropping / repositioning /
 * removing the cover image on /profile/[slug].
 *
 * What's new in this version (vs the prior "Add cover image" button):
 *   1. Real cropper — react-easy-crop with zoom slider and draggable area.
 *      Output is a cropped JPEG/WebP/PNG blob that matches the banner's
 *      5:2 aspect ratio, so the upstream `<img>` never has to crop.
 *   2. Modal is rendered through a React portal to `document.body`. The
 *      parent banner uses CSS `isolation: isolate`, which traps the old
 *      modal's z-index inside the banner's stacking context — that's why
 *      the modal was painting *under* the avatar sibling. A portal exits
 *      that context, so the modal floats above everything on the page.
 *   3. After a successful upload we call `router.refresh()` so the page
 *      re-fetches the profile row from the server. Without it the new
 *      image only appeared after the user manually reloaded (because the
 *      profile page is a server component).
 *
 * Auth: Clerk's useUser() is used to gate the editor UI to the owner. The
 * API route at /api/profile/cover-image does its own server-side auth
 * check (Clerk auth() required), so this is purely a UX hint.
 *
 * Style: matches the dark navy theme used on the rest of the profile page.
 * No external UI lib other than react-easy-crop.
 */

import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Cropper, { Area } from 'react-easy-crop';

type Position = 'center' | 'top' | 'bottom';

interface CoverImageEditorProps {
  /** Current cover URL from the profile row. Null = no cover set. */
  currentUrl: string | null;
  /** Current position from the profile row. Defaults to 'center'. Kept
   *  for back-compat with the prior position-toggle schema; the new
   *  cropper writes the cropped blob directly so position is moot. */
  currentPosition?: Position;
  /** Whether the viewer is the owner. If false, the editor renders nothing. */
  isOwner: boolean;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ASPECT = 5 / 2; // matches `aspectRatio: '5 / 2'` on the banner
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;
const CROP_OUTPUT_QUALITY = 0.92;

export default function CoverImageEditor({
  currentUrl,
  isOwner,
}: CoverImageEditorProps) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isLoaded) return null;
  if (!isOwner || !isSignedIn) return null;

  function revokeBlobUrl(url: string | null) {
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      setError('Unsupported image type. Use JPEG, PNG, or WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image too large. Max 5 MB.');
      return;
    }
    if (file.size === 0) {
      setError('Empty file.');
      return;
    }

    setError(null);
    setSourceFile(file);
    revokeBlobUrl(sourceUrl);
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setCroppedBlob(null);
    revokeBlobUrl(croppedPreviewUrl);
    setCroppedPreviewUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function resetModal() {
    setOpen(false);
    setBusy(false);
    setError(null);
    setSourceFile(null);
    setCroppedBlob(null);
    revokeBlobUrl(sourceUrl);
    setSourceUrl(null);
    revokeBlobUrl(croppedPreviewUrl);
    setCroppedPreviewUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Convert the cropped region into a Blob using a hidden canvas.
  async function buildCroppedBlob(): Promise<Blob> {
    if (!sourceUrl || !croppedAreaPixels) {
      throw new Error('No crop area set.');
    }
    const img = await loadImage(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(croppedAreaPixels.width);
    canvas.height = Math.round(croppedAreaPixels.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context.');
    ctx.drawImage(
      img,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
    const mime = sourceFile?.type && ALLOWED_MIME.includes(sourceFile.type)
      ? sourceFile.type
      : 'image/jpeg';
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Crop failed.'))),
        mime,
        CROP_OUTPUT_QUALITY
      );
    });
  }

  async function previewCrop() {
    if (!sourceFile) return;
    setError(null);
    try {
      const blob = await buildCroppedBlob();
      revokeBlobUrl(croppedPreviewUrl);
      const url = URL.createObjectURL(blob);
      setCroppedBlob(blob);
      setCroppedPreviewUrl(url);
    } catch (e: any) {
      setError(e?.message || 'Crop failed.');
    }
  }

  async function upload() {
    if (!sourceFile) {
      setError('Pick an image first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Build the cropped blob if we don't have one yet.
      let blob = croppedBlob;
      if (!blob) blob = await buildCroppedBlob();

      const formData = new FormData();
      const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      formData.append('file', blob, `cover.${ext}`);
      formData.append('position', 'center');

      const res = await fetch('/api/profile/cover-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed.');
        setBusy(false);
        return;
      }
      // Re-fetch the server component so the new <img src> shows up
      // without the user having to manually refresh.
      router.refresh();
      resetModal();
    } catch (e: any) {
      setError(e?.message || 'Upload failed.');
      setBusy(false);
    }
  }

  async function remove() {
    if (!currentUrl) return;
    if (!confirm('Remove your cover image? Previous covers in your history will be kept.')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/cover-image', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Remove failed.');
        setBusy(false);
        return;
      }
      router.refresh();
      setBusy(false);
    } catch (e: any) {
      setError(e?.message || 'Network error.');
      setBusy(false);
    }
  }

  // Render the modal via a portal so CSS `isolation: isolate` on the
  // parent banner doesn't trap our z-index. This is the structural fix
  // for the "modal painted behind the avatar" bug.
  function renderModal() {
    if (!open) return null;
    if (typeof document === 'undefined') return null;

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cover image editor"
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) resetModal();
        }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2147483647, // max int — covers iOS share-sheet edge cases too
          padding: '1rem',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(180deg, #0A1A33 0%, #041E42 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            maxWidth: 560,
            width: '100%',
            padding: '1.25rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            color: '#fff',
            maxHeight: 'calc(100dvh - 2rem)',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Cover image
            </h2>
            <button
              onClick={resetModal}
              aria-label="Close"
              style={{
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                border: 'none',
                fontSize: 20,
                lineHeight: 1,
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
              }}
            >
              ×
            </button>
          </div>

          {!sourceUrl ? (
            <div
              onClick={pickFile}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') pickFile();
              }}
              style={{
                width: '100%',
                aspectRatio: `${ASPECT}`,
                borderRadius: 8,
                border: '2px dashed rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 8,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <span style={{ fontSize: 32 }}>📷</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                Click to pick an image
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                JPEG, PNG, or WebP · max 5 MB · will be cropped to 5:2
              </span>
            </div>
          ) : (
            <>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: `${ASPECT}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#000',
                }}
              >
                <Cropper
                  image={sourceUrl}
                  crop={crop}
                  zoom={zoom}
                  minZoom={ZOOM_MIN}
                  maxZoom={ZOOM_MAX}
                  zoomSpeed={0.5}
                  aspect={ASPECT}
                  showGrid={false}
                  restrictPosition
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  style={{
                    containerStyle: { background: '#000' },
                    mediaStyle: { objectFit: 'contain' },
                  }}
                />
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: 6,
                  }}
                >
                  <span>Zoom</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{zoom.toFixed(1)}×</span>
                </label>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={ZOOM_STEP}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#FFB81C' }}
                  aria-label="Zoom"
                />
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={pickFile}
                  style={{
                    background: 'transparent',
                    color: '#FFB81C',
                    border: '1px solid rgba(255,184,28,0.4)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Pick different image
                </button>
                {sourceFile && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    {sourceFile.name} · {(sourceFile.size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>

              {croppedPreviewUrl && (
                <div style={{ marginTop: '1rem' }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.5)',
                      marginBottom: 6,
                    }}
                  >
                    Preview
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={croppedPreviewUrl}
                    alt="Cropped preview"
                    style={{
                      width: '100%',
                      aspectRatio: `${ASPECT}`,
                      objectFit: 'cover',
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                </div>
              )}
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />

          {error && (
            <div
              style={{
                background: 'rgba(200,16,46,0.15)',
                border: '1px solid rgba(200,16,46,0.4)',
                color: '#FFB81C',
                padding: '0.6rem 0.8rem',
                borderRadius: 6,
                fontSize: 12,
                marginTop: '1rem',
              }}
            >
              {error}
            </div>
          )}

          {sourceUrl && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={resetModal}
                disabled={busy}
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '0.5rem 1rem',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={previewCrop}
                disabled={busy}
                style={{
                  background: 'rgba(255,184,28,0.15)',
                  color: '#FFB81C',
                  border: '1px solid rgba(255,184,28,0.4)',
                  padding: '0.5rem 1rem',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.5 : 1,
                }}
              >
                Preview crop
              </button>
              <button
                type="button"
                onClick={upload}
                disabled={busy}
                style={{
                  background: busy ? 'rgba(200,16,46,0.4)' : 'var(--red)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1.2rem',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: busy ? 'default' : 'pointer',
                }}
              >
                {busy ? 'Uploading…' : 'Save cover'}
              </button>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={() => setOpen(true)}
          style={{
            background: 'rgba(0,0,0,0.45)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.18)',
            padding: '0.4rem 0.85rem',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}
        >
          {currentUrl ? 'Edit cover' : 'Add cover image'}
        </button>

        {currentUrl && (
          <button
            onClick={remove}
            disabled={busy}
            style={{
              background: 'rgba(200,16,46,0.15)',
              color: '#FFB81C',
              border: '1px solid rgba(255,184,28,0.4)',
              padding: '0.4rem 0.85rem',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
              backdropFilter: 'blur(4px)',
            }}
          >
            {busy ? 'Removing…' : 'Remove cover'}
          </button>
        )}
      </div>

      {renderModal()}
    </>
  );
}

// Helpers (kept module-scope to avoid re-creation per render).
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image.'));
    img.src = src;
  });
}
