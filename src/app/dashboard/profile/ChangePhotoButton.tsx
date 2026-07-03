'use client';

import { useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Day 7 (Arnel, 2026-06-23): profile photo upload with full preview flow.
 *
 * State machine:
 *   idle    → pick file        → preview
 *   preview → click "Save"     → saving → saved → idle (refreshed)
 *   preview → click "Cancel"   → idle
 *   idle    → click "Remove"   → removing → removed → idle (refreshed)
 *
 * Why the preview step:
 *   - Earlier version uploaded on file-pick. Bad UX — no way to cancel,
 *     no way to compare against current photo, no way to back out
 *     accidentally. Arnel flagged this 2026-06-23 04:35 CDT.
 *
 * Why this lives in a Client Component:
 *   - Reads from useUser() (Clerk) and writes via user.setProfileImage()
 *   - On success, calls our /api/profiles/me/photo endpoint to also
 *     write to Supabase (Clerk webhook is the other sync path; this
 *     guarantees the change is visible immediately without waiting
 *     for the webhook to fire)
 */
export default function ChangePhotoButton() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [phase, setPhase] = useState<'idle' | 'preview' | 'saving' | 'removing' | 'saved' | 'removed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  if (!isLoaded || !user) return null;
  const hasPhoto = !!user.imageUrl;

  function pickFile() {
    setError(null);
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      setError('Please choose a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 5 MB.');
      return;
    }
    setError(null);
    setPendingFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPhase('preview');
  }

  function cancel() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    setError(null);
    setPhase('idle');
  }

  async function save() {
    if (!pendingFile) return;
    setPhase('saving');
    setError(null);
    try {
      // 1. Upload to Clerk
      await user!.setProfileImage({ file: pendingFile });
      // 2. Force Clerk to refresh the user object so imageUrl reflects
      //    the new photo. Without this, the client `user` object may
      //    still hold the old (default-initials) imageUrl for a few
      //    seconds, which causes the public profile to keep showing
      //    initials after a successful upload. (Arnel hit this
      //    2026-07-03 05:55 CDT — first photo save captured the
      //    pre-upload URL.)
      await user!.reload();
      // 3. Read back the new imageUrl from the user (Clerk updates the
      //    user object on success). Falls back to publicUrl from the
      //    ImageResource return value (in case Clerk returns a different
      //    shape in some future version).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated: any = user!;
      const newUrl: string | null = updated.imageUrl ?? updated.avatarUrl ?? null;
      // 4. Tell RinkStop to also write to Supabase (so the public profile
      //    page sees the new image immediately, without waiting for the
      //    webhook to fire). This also appends a history row.
      const res = await fetch('/api/profiles/me/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_url: newUrl,
          source: 'manual',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save to RinkStop failed');
      }
      setPhase('saved');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPendingFile(null);
      router.refresh();
      setTimeout(() => setPhase('idle'), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setPhase('preview'); // stay on preview so they can retry or cancel
    }
  }

  async function removePhoto() {
    if (!confirm('Remove your profile photo? You will appear as your initials.')) return;
    setPhase('removing');
    setError(null);
    try {
      await user!.setProfileImage({ file: null });
      // After setProfileImage({file:null}), Clerk reverts to the
      // generated-initials image. Reload the user so imageUrl reflects
      // the post-removal state.
      await user!.reload();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated: any = user!;
      const newUrl: string | null = updated.imageUrl ?? updated.avatarUrl ?? null;
      const res = await fetch('/api/profiles/me/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_url: newUrl,
          removed: true,
          source: 'manual',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Remove from RinkStop failed');
      }
      setPhase('removed');
      router.refresh();
      setTimeout(() => setPhase('idle'), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Remove failed');
      setPhase('idle');
    }
  }

  return (
    <>
      {/* IDLE: pick new / change / remove */}
      {phase === 'idle' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={pickFile}
            data-testid="change-photo-button"
            style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.85)',
              padding: '0.4rem 0.85rem',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {hasPhoto ? 'Change photo' : 'Add photo'}
          </button>
          {hasPhoto && (
            <button
              type="button"
              onClick={removePhoto}
              data-testid="remove-photo-button"
              style={{
                display: 'inline-block',
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                padding: '0.4rem 0.85rem',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              Remove photo
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            data-testid="change-photo-input"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          {error && (
            <span style={{ color: '#C8102E', fontSize: '0.75rem' }}>✗ {error}</span>
          )}
        </div>
      )}

      {/* PREVIEW: show picked image, save / cancel */}
      {phase === 'preview' && previewUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <img
            src={previewUrl}
            alt="Preview"
            data-testid="photo-preview"
            style={{
              width: 64, height: 64, borderRadius: '50%', objectFit: 'cover',
              border: '2px solid #FFB81C',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={save}
              data-testid="save-photo-button"
              style={{
                background: '#C8102E', color: '#fff',
                padding: '0.4rem 1rem', borderRadius: 6,
                fontSize: '0.8rem', fontWeight: 600,
                border: 'none', cursor: 'pointer',
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              data-testid="cancel-photo-button"
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.6)',
                padding: '0.4rem 0.85rem', borderRadius: 6,
                fontSize: '0.8rem', fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
          {pendingFile && (
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
              {(pendingFile.size / 1024 / 1024).toFixed(2)} MB
            </span>
          )}
          {error && (
            <span style={{ color: '#C8102E', fontSize: '0.75rem' }}>✗ {error}</span>
          )}
        </div>
      )}

      {/* SAVING / REMOVING: spinner state */}
      {(phase === 'saving' || phase === 'removing') && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
            {phase === 'saving' ? 'Uploading…' : 'Removing…'}
          </span>
        </div>
      )}

      {/* SAVED / CLEARED: confirmation */}
      {(phase === 'saved' || phase === 'removed') && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#14B8A6', fontSize: '0.8rem' }}>
            ✓ {phase === 'saved' ? 'Photo updated' : 'Photo cleared'}
          </span>
        </div>
      )}

      {/* Inline error from remove attempts (when phase falls back to idle) */}
      {error && phase === 'idle' && (
        <div style={{ marginTop: 6 }}>
          <span style={{ color: '#C8102E', fontSize: '0.75rem' }}>✗ {error}</span>
        </div>
      )}
    </>
  );
}
