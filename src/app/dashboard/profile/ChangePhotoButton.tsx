'use client';

import { useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Day 7 (2026-06-23, Arnel): users couldn't find a way to add a profile
 * photo on /dashboard/profile. The page only has fields for username,
 * bio, and location. The avatar in the page header comes from
 * Clerk's `user.imageUrl`, and Clerk's `<UserProfile />` is at
 * /user-profile — but that route was undiscovered.
 *
 * This component adds a "Change photo" button next to the avatar that
 * opens an inline file picker. On submit, calls Clerk's
 * `user.setProfileImage({ file })`. Clerk handles upload, crop, and
 * storage on its side. We just refresh the page to show the new
 * image from `user.imageUrl`.
 *
 * Why this instead of the existing /user-profile link:
 * - One click vs. two clicks + a page navigation
 * - Inline, so users see their current photo right next to the upload
 *   button (better discoverability)
 * - Doesn't change the page's content model: profile fields stay on
 *   the RinkStop page, account-level fields (name/email/photo) stay
 *   on Clerk
 */
export default function ChangePhotoButton() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isLoaded) return null;
  if (!user) return null;

  const hasPhoto = !!user.imageUrl;

  async function handleFile(file: File) {
    setError(null);
    setSuccess(false);
    if (!ALLOWED.includes(file.type)) {
      setError('Please choose a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 5 MB.');
      return;
    }
    setBusy(true);
    try {
      await user!.setProfileImage({ file });
      setSuccess(true);
      // Refresh the server component so the new imageUrl shows up
      // (user.imageUrl on the client is now updated, but the page
      // was rendered server-side with the old URL).
      router.refresh();
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        data-testid="change-photo-button"
        style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.85)',
          padding: '0.4rem 0.85rem',
          borderRadius: 6,
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer',
          border: '1px solid rgba(255,255,255,0.15)',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Uploading…' : hasPhoto ? 'Change photo' : 'Add photo'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        data-testid="change-photo-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Reset so picking the same file again still triggers onChange
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />
      {error && (
        <span style={{ color: '#C8102E', fontSize: '0.75rem', marginLeft: 8 }}>{error}</span>
      )}
      {success && (
        <span style={{ color: '#14B8A6', fontSize: '0.75rem', marginLeft: 8 }}>✓ Photo updated</span>
      )}
    </>
  );
}
