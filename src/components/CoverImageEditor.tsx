'use client';

/**
 * CoverImageEditor — owner-only UI for picking / repositioning / removing
 * the cover image on /profile/[slug].
 *
 * Renders three things:
 *   - An "Edit cover" button (when no current image) or "Edit cover" +
 *     "Remove" buttons (when an image is set).
 *   - A modal with file picker, position selector (center/top/bottom),
 *     upload progress, and error display.
 *   - The Remove action is a one-click DELETE (no confirmation) because
 *     the API is idempotent and the user can re-upload. If we want a
 *     confirm step later, that's a UI-only change.
 *
 * Auth: uses Clerk's useUser() to get the current user's id. The API route
 * also checks auth server-side, so this is just for UX (avoid showing the
 * editor to non-owners).
 *
 * Style: matches the dark navy theme used elsewhere on the profile page.
 * Glass surfaces (rgba backgrounds), gold/red accents, no external UI lib.
 */

import { useState, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

type Position = 'center' | 'top' | 'bottom';

interface CoverImageEditorProps {
  /** Current cover URL from the profile row. Null = no cover set. */
  currentUrl: string | null;
  /** Current position from the profile row. Defaults to 'center'. */
  currentPosition: Position;
  /** Whether the viewer is the owner. If false, the editor renders nothing. */
  isOwner: boolean;
  /** Callback after a successful upload so the parent can refresh. */
  onUpdated?: (url: string, position: Position) => void;
  /** Callback after a successful remove so the parent can refresh. */
  onRemoved?: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export default function CoverImageEditor({
  currentUrl,
  currentPosition,
  isOwner,
  onUpdated,
  onRemoved,
}: CoverImageEditorProps) {
  const { isLoaded, isSignedIn } = useUser();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>(currentPosition);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isLoaded) return null;
  if (!isOwner || !isSignedIn) return null;

  function pickFile() {
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function resetModal() {
    setOpen(false);
    setBusy(false);
    setError(null);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPosition(currentPosition);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function upload() {
    if (!selectedFile) {
      setError('Pick an image first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('position', position);

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
      onUpdated?.(data.url, position);
      resetModal();
    } catch (e: any) {
      setError(e?.message || 'Network error.');
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
      onRemoved?.();
      setBusy(false);
    } catch (e: any) {
      setError(e?.message || 'Network error.');
      setBusy(false);
    }
  }

  return (
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

      {open && (
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
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, #0A1A33 0%, #041E42 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              maxWidth: 520,
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              color: '#fff',
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: '1rem',
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Cover image
            </h2>

            {/* Preview / picker */}
            {previewUrl ? (
              <div
                style={{
                  width: '100%',
                  height: 160,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginBottom: '1rem',
                  background: '#000',
                }}
              >
                <img
                  src={previewUrl}
                  alt="Cover preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: position,
                  }}
                />
              </div>
            ) : currentUrl ? (
              <div
                style={{
                  width: '100%',
                  height: 160,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginBottom: '1rem',
                  background: '#000',
                }}
              >
                <img
                  src={currentUrl}
                  alt="Current cover"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: currentPosition,
                  }}
                />
              </div>
            ) : (
              <div
                onClick={pickFile}
                style={{
                  width: '100%',
                  height: 160,
                  borderRadius: 8,
                  border: '2px dashed rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: '1rem',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <span style={{ fontSize: 32 }}>📷</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  Click to pick an image
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  JPEG, PNG, or WebP · max 5 MB
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              style={{ display: 'none' }}
            />

            {selectedFile && (
              <div style={{ marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
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
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </span>
              </div>
            )}

            {/* Position picker */}
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)',
                  marginBottom: 8,
                }}
              >
                Crop position
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['center', 'top', 'bottom'] as Position[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPosition(p)}
                    style={{
                      flex: 1,
                      background: position === p ? 'rgba(255,184,28,0.15)' : 'rgba(255,255,255,0.05)',
                      color: position === p ? '#FFB81C' : 'rgba(255,255,255,0.7)',
                      border: position === p
                        ? '1px solid rgba(255,184,28,0.5)'
                        : '1px solid rgba(255,255,255,0.1)',
                      padding: '0.5rem',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(200,16,46,0.15)',
                  border: '1px solid rgba(200,16,46,0.4)',
                  color: '#FFB81C',
                  padding: '0.6rem 0.8rem',
                  borderRadius: 6,
                  fontSize: 12,
                  marginBottom: '1rem',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
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
                onClick={upload}
                disabled={busy || !selectedFile}
                style={{
                  background: selectedFile && !busy ? 'var(--red)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1.2rem',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: selectedFile && !busy ? 'pointer' : 'default',
                  opacity: selectedFile && !busy ? 1 : 0.5,
                }}
              >
                {busy ? 'Uploading…' : 'Save cover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
