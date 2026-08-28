'use client';

/**
 * PostComposer — global post composer + FAB.
 *
 * Mounted once at the layout level (next to RoleAwareTabBar). Renders a
 * mobile-only blue "+" FAB that opens a bottom-sheet modal for writing
 * a post. On desktop the FAB is hidden via CSS — the inline composer
 * on profile pages remains the desktop pattern.
 *
 * Posts land on the CURRENT USER's personal profile (resolved via
 * /api/profiles/me → /api/profile-posts). Future work: context-aware
 * composers ("post about this team" on team pages, "post about this
 * league" on league pages). Scoped out for now — see LEDGER.md.
 *
 * Visibility:
 *   - Only renders when Clerk says the viewer is signed in.
 *   - Hidden on auth pages (/login, /sign-up, /onboarding) where the
 *     composer would force an auth flow mid-modal.
 *
 * Rules of hooks (2026-08-28 fix): every hook MUST be called in the
 * same order on every render. No early returns above useState/useEffect
 * etc. — gate visibility in JSX, not in control flow that precedes
 * hook calls.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import styles from './PostComposer.module.css';

interface ProfileMeResponse {
  profile?: { user_id: string; username: string; display_name?: string | null };
}

const MAX = 1000;

function getMyProfile(): Promise<ProfileMeResponse | null> {
  return fetch('/api/profiles/me')
    .then(async (r): Promise<ProfileMeResponse | null> => {
      if (!r.ok) return null;
      try {
        return (await r.json()) as ProfileMeResponse;
      } catch {
        return null;
      }
    })
    .catch((): ProfileMeResponse | null => null);
}

function postToMyProfile(body: string, mediaUrl: string | null): Promise<Response> {
  return fetch('/api/profile-posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      body: body.trim(),
      media_url: mediaUrl?.trim() || undefined,
    }),
  });
}

export default function PostComposer() {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname() || '/';

  // Auth pages: never render. Gate after the hooks below so the hook
  // order is identical on every render.
  const onAuthPage =
    pathname === '/login' ||
    pathname.startsWith('/sign-') ||
    pathname === '/onboarding';

  // All hooks MUST run before any conditional returns.
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [myProfile, setMyProfile] = useState<ProfileMeResponse['profile'] | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resolve the current user's profile when the composer opens.
  useEffect(() => {
    if (!open || myProfile || profileLoading) return;
    setProfileLoading(true);
    getMyProfile()
      .then((d) => {
        setMyProfile(d?.profile ?? null);
      })
      .catch(() => setMyProfile(null))
      .finally(() => setProfileLoading(false));
  }, [open, myProfile, profileLoading]);

  // Focus the textarea shortly after the modal opens.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  // Listen for "open composer" requests from elsewhere on the page
  // (e.g. ProfileFeed's empty-state "Write your first post" button).
  // Mounted unconditionally; the function is a no-op if !isSignedIn
  // because the FAB/modal aren't rendered anyway.
  useEffect(() => {
    function onOpenRequest() {
      setOpen(true);
      setError('');
    }
    window.addEventListener('rinkstop:open-composer', onOpenRequest);
    return () => window.removeEventListener('rinkstop:open-composer', onOpenRequest);
  }, []);

  const openComposer = useCallback(() => {
    setOpen(true);
    setError('');
  }, []);

  const closeComposer = useCallback(() => {
    setOpen(false);
    setBody('');
    setMediaUrl('');
    setError('');
  }, []);

  // Body class to prevent background scroll while the modal is open.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
    return undefined;
  }, [open]);

  // Don't render until we know auth state, and only for signed-in users.
  if (!isLoaded) return null;
  if (!isSignedIn) return null;
  if (onAuthPage) return null;

  const charsLeft = MAX - body.length;
  const isOver = charsLeft < 0;
  const isEmpty = !body.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEmpty || isOver || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const r = await postToMyProfile(body, mediaUrl);
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(json.error ?? 'Failed to post');
        return;
      }
      // Best-effort: tell other tabs / same-tab ProfileFeed instances to reload.
      try {
        window.dispatchEvent(new CustomEvent('rinkstop:post-created'));
      } catch { /* noop */ }
      closeComposer();
      // Soft-reload the current page only if we're on the user's own
      // profile — that way the new post shows up immediately. Other
      // pages don't need a refresh; users navigate to their profile
      // when they want to see the post.
      if (myProfile?.username && pathname === `/profile/${myProfile.username}`) {
        // Force a server re-render so the new post appears.
        window.location.reload();
      }
    } catch {
      setError('Network error, try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* FAB — mobile only, hidden on desktop via CSS. */}
      <button
        className={styles.fab}
        onClick={openComposer}
        aria-label="Write a post"
        title="Write a post"
        type="button"
      >
        +
      </button>

      {/* Composer modal — bottom sheet on mobile, same look on desktop. */}
      {open && (
        <div className={styles.modalBackdrop} onClick={closeComposer}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-composer-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <div id="post-composer-title" className={styles.modalTitle}>
                  Write Post
                </div>
                <div className={styles.modalSubtitle}>
                  Posting to{myProfile?.display_name ? ` ${myProfile.display_name}'s profile` : ' your profile'}
                </div>
              </div>
              <button
                className={styles.modalClose}
                onClick={closeComposer}
                aria-label="Close composer"
                type="button"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <textarea
                ref={textareaRef}
                className={styles.composerTextarea}
                placeholder={
                  myProfile?.display_name
                    ? `What's on your mind, ${myProfile.display_name.split(' ')[0]}?`
                    : "What's on your mind?"
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={MAX + 100}
                rows={4}
              />
              <div
                className={styles.charCount}
                data-warn={charsLeft < 50 && charsLeft >= 0}
                data-over={isOver}
              >
                {charsLeft < 50 ? `${charsLeft} left` : ''}
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>
                  Image URL <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  type="url"
                  className={styles.modalInput}
                  placeholder="https://..."
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
              </div>
              {error && <p className={styles.composerError}>{error}</p>}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={closeComposer}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.postBtn}
                  disabled={isEmpty || isOver || submitting}
                >
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
