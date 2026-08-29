'use client';

/**
 * PostComposer — global post composer + FAB.
 *
 * Mounted once at the layout level (next to RoleAwareTabBar). Renders a
 * mobile-only blue "+" FAB that opens a bottom-sheet modal for writing
 * a post. On desktop the FAB is hidden via CSS — the inline composer
 * on profile pages remains the desktop pattern.
 *
 * Multi-destination posting (2026-08-29):
 *   - Default target: personal profile.
 *   - Optional targets: team hubs and league hubs the user manages.
 *   - Destination list comes from /api/profiles/me/targets.
 *   - Server authorization is enforced in /api/profile-posts.
 *
 * Image upload:
 *   - File picker (no more pasting URLs — too error-prone for users)
 *   - Client-side EXIF strip via canvas redraw (privacy: don't leak
 *     GPS from phone photos)
 *   - Client-side downscale to max 1920px wide (saves bandwidth,
 *     keeps Supabase bill sane)
 *   - 10 MB cap (validated server-side)
 *   - Allowed: JPEG, PNG, WebP, GIF
 *   - Stored in Supabase bucket `post-media`
 *
 * Visibility:
 *   - Only renders when Clerk says the viewer is signed in.
 *   - Hidden on auth pages (/login, /sign-up, /onboarding).
 *
 * Rules of hooks: every hook MUST be called in the same order on
 * every render. No early returns above useState/useEffect etc. — gate
 * visibility in JSX, not in control flow that precedes hook calls.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import styles from './PostComposer.module.css';

interface ProfileMeResponse {
  profile?: { user_id: string; username: string; display_name?: string | null };
}

const MAX = 1000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGE_DIMENSION = 1920; // px — downscale anything larger
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface PendingImage {
  file: File;
  previewUrl: string;       // local blob URL for preview
  width: number;
  height: number;
  // EXIF-stripped + downscaled version (what we'll actually upload).
  // May equal `file` if no processing was needed (already under limit).
  processedFile: File;
}

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

async function postToMyProfile(
  body: string,
  image: PendingImage | null,
  destination: { target_type: string; target_id: string } | null,
  sport: string | null,
): Promise<Response> {
  const fd = new FormData();
  fd.append('body', body);
  if (destination) {
    fd.append('target_type', destination.target_type);
    fd.append('target_id', destination.target_id);
  }
  if (sport) {
    fd.append('sport', sport);
  }
  if (image) {
    fd.append('file', image.processedFile);
    fd.append('width', String(image.width));
    fd.append('height', String(image.height));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let r: Response;
  try {
    r = await fetch('/api/profile-posts', {
      method: 'POST',
      body: fd,
      signal: controller.signal,
    });
  } catch (netErr) {
    clearTimeout(timeoutId);
    if (netErr instanceof DOMException && netErr.name === 'AbortError') {
      throw new Error('Post timed out after 30 seconds. The file may be too large or the server is unreachable.');
    }
    throw new Error(
      netErr instanceof Error
        ? `Could not reach the server: ${netErr.message}`
        : 'Could not reach the server.',
    );
  }
  clearTimeout(timeoutId);
  return r;
}

/**
 * Read a File into an HTMLImageElement so we can redraw it on a
 * canvas (which strips EXIF metadata as a side-effect — the canvas
 * data URL has no metadata, only pixel data). Also downscales any
 * dimension that exceeds MAX_IMAGE_DIMENSION.
 *
 * Returns a NEW File in JPEG (or PNG if it had transparency, or GIF
 * if it was a GIF — we don't re-encode GIFs to JPEG because that
 * loses animation). For GIFs and PNGs-with-transparency we keep the
 * original format. For everything else we re-encode JPEG quality 0.92.
 */
async function processImage(file: File): Promise<{
  processedFile: File;
  width: number;
  height: number;
  previewUrl: string;
}> {
  if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
    throw new Error('Unsupported image type. Use JPEG, PNG, WebP, or GIF.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image too large. Max 10 MB.');
  }

  // GIFs: don't redraw through canvas — would lose animation. Pass
  // through as-is, dimensions reported by the original file via a
  // quick <img> load.
  if (file.type === 'image/gif') {
    const url = URL.createObjectURL(file);
    const dims = await loadImageDimensions(url);
    return {
      processedFile: file,
      width: dims.width,
      height: dims.height,
      previewUrl: url,
    };
  }

  const originalUrl = URL.createObjectURL(file);
  const img = await loadHtmlImage(originalUrl);

  const targetW = Math.min(img.naturalWidth, MAX_IMAGE_DIMENSION);
  const scale = targetW / img.naturalWidth;
  const targetH = Math.round(img.naturalHeight * scale);

  // Off-screen canvas, no DOM attachment (so it can never paint).
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(originalUrl);
    throw new Error('Could not initialize image processor.');
  }

  // PNG with transparency: redraw as PNG. Otherwise redraw as JPEG
  // (smaller, universal). Detecting "has transparency" requires a
  // pixel scan, which is expensive — instead, we trust the original
  // MIME. PNG in → PNG out. JPEG/WebP in → JPEG out.
  const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const outExt = outType === 'image/png' ? 'png' : 'jpg';
  const quality = outType === 'image/jpeg' ? 0.92 : undefined;

  ctx.drawImage(img, 0, 0, targetW, targetH);
  URL.revokeObjectURL(originalUrl);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Image encoding failed.'))),
      outType,
      quality,
    );
  });

  const processedFile = new File(
    [blob],
    file.name.replace(/\.[^.]+$/, `.${outExt}`),
    { type: outType, lastModified: Date.now() },
  );

  const previewUrl = URL.createObjectURL(processedFile);

  return { processedFile, width: targetW, height: targetH, previewUrl };
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read image.'));
    img.src = url;
  });
}

async function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  const img = await loadHtmlImage(url);
  return { width: img.naturalWidth, height: img.naturalHeight };
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [myProfile, setMyProfile] = useState<ProfileMeResponse['profile'] | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  // Image state machine: 'none' | 'processing' | 'ready' | 'uploading'
  const [image, setImage] = useState<PendingImage | null>(null);
  const [imageStage, setImageStage] = useState<'none' | 'processing' | 'ready' | 'uploading'>('none');
  const [destination, setDestination] = useState<{ target_type: string; target_id: string; name: string } | null>(null);
  const [destinations, setDestinations] = useState<{
    personal: { target_type: string; target_id: string; name: string };
    teams: { target_type: string; target_id: string; name: string; slug?: string }[];
    leagues: { target_type: string; target_id: string; name: string; slug?: string }[];
  } | null>(null);
  const [destinationsLoading, setDestinationsLoading] = useState(false);
  const [sport, setSport] = useState<string | null>(null);
  const [showDestinations, setShowDestinations] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Load managed destinations when the composer opens.
  useEffect(() => {
    if (!open || destinations) return;
    setDestinationsLoading(true);
    fetch('/api/profiles/me/targets')
      .then(async (r) => {
        if (!r.ok) return null;
        const json = await r.json();
        return json.data ?? null;
      })
      .then((data) => {
        if (data?.personal) {
          setDestination(data.personal);
          setDestinations(data);
        }
      })
      .catch(() => {
        // Safe fallback: if target discovery fails, still allow personal posting.
        const fallback = myProfile ? { target_type: 'user', target_id: myProfile.user_id, name: 'My profile' } : null;
        if (fallback) setDestination(fallback);
      })
      .finally(() => setDestinationsLoading(false));
  }, [open, destinations, myProfile]);

  // Focus the textarea shortly after the modal opens.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  // Listen for "open composer" requests from elsewhere on the page.
  useEffect(() => {
    function onOpenRequest(e: Event) {
      const detail = (e as CustomEvent<{ target_type?: string; target_id?: string; name?: string }>).detail;
      if (detail?.target_type && detail?.target_id) {
        setDestination({ target_type: detail.target_type, target_id: detail.target_id, name: detail.name || detail.target_type });
      }
      setOpen(true);
      setError('');
    }
    window.addEventListener('rinkstop:open-composer', onOpenRequest);
    return () => window.removeEventListener('rinkstop:open-composer', onOpenRequest);
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

  const openComposer = useCallback(() => {
    setOpen(true);
    setError('');
    setShowDestinations(false);
    setShowSportPicker(false);
    setSport(null);
  }, []);

  const closeComposer = useCallback(() => {
    setOpen(false);
    setBody('');
    setError('');
    // Revoke any blob URL we created for image preview.
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    setImageStage('none');
  }, [image]);

  // Don't render until we know auth state, and only for signed-in users.
  if (!isLoaded) return null;
  if (!isSignedIn) return null;
  if (onAuthPage) return null;

  const charsLeft = MAX - body.length;
  const isOver = charsLeft < 0;
  const hasBody = body.trim().length > 0;
  // Posts can be text-only, image-only, or both. Disable submit only
  // when there's no body AND no image ready, or when over the limit,
  // or when something else is in flight.
  const hasUsableImage = imageStage === 'ready' && image !== null;

  const postTargetLabel =
    destination?.name ??
    (myProfile?.display_name ? `${myProfile.display_name}'s profile` : 'your profile');

  const destinationOptions = destinations
    ? [
        destinations.personal,
        ...(destinations.teams ?? []),
        ...(destinations.leagues ?? []),
      ]
    : [];

  const sportOptions = [
    { value: '', label: 'General' },
    { value: 'hockey', label: 'Hockey' },
    { value: 'figure_skating', label: 'Figure skating' },
    { value: 'speed_skating', label: 'Speed skating' },
    { value: 'basketball', label: 'Basketball' },
    { value: 'soccer', label: 'Soccer' },
    { value: 'baseball', label: 'Baseball' },
    { value: 'other', label: 'Other' },
  ];

  function pickDestination(next: { target_type: string; target_id: string; name: string }) {
    setDestination(next);
    setShowDestinations(false);
  }

  function pickSport(next: string | null) {
    setSport(next);
    setShowSportPicker(false);
  }

  function openDestinations() {
    if (!destinations) return;
    setShowSportPicker(false);
    setShowDestinations(true);
  }

  function openSportPicker() {
    setShowSportPicker(true);
    setShowDestinations(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice fires onChange again.
    if (e.target) e.target.value = '';
    if (!file) return;
    setError('');
    setImageStage('processing');
    try {
      const result = await processImage(file);
      // Revoke any previous preview URL.
      if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
      setImage({
        file,
        previewUrl: result.previewUrl,
        width: result.width,
        height: result.height,
        processedFile: result.processedFile,
      });
      setImageStage('ready');
    } catch (err) {
      setImageStage('none');
      setError(err instanceof Error ? err.message : 'Could not process image.');
    }
  }

  function removeImage() {
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    setImageStage('none');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasBody && !hasUsableImage) return;
    if (isOver || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      if (image) setImageStage('uploading');
      const r = await postToMyProfile(body, image, destination, sport);
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setImageStage(image ? 'ready' : 'none');
        setError(json.error ?? `Failed to post (HTTP ${r.status}).`);
        return;
      }
      try {
        window.dispatchEvent(new CustomEvent('rinkstop:post-created'));
      } catch { /* noop */ }
      closeComposer();
    } catch (err) {
      setImageStage(image ? 'ready' : 'none');
      setError(err instanceof Error ? err.message : 'Network error, try again');
    } finally {
      setSubmitting(false);
    }
  }

  const submitDisabled =
    (!hasBody && !hasUsableImage) ||
    isOver ||
    submitting ||
    imageStage === 'processing' ||
    imageStage === 'uploading';

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
                  {destinationsLoading
                    ? 'Loading destinations…'
                    : `Posting to ${postTargetLabel}`}
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
              {/* Destination selector */}
              <div className={styles.destinationRow}>
                <button
                  type="button"
                  className={styles.destinationChip}
                  onClick={openDestinations}
                  disabled={!destinations || destinationsLoading}
                  title={destination ? `Destination: ${destination.name}` : 'Choose destination'}
                >
                  <span aria-hidden>📍</span>
                  <span>
                    {destination ? destination.name : 'Choose destination'}
                  </span>
                  <span className={styles.destinationChevron}>▾</span>
                </button>

                <button
                  type="button"
                  className={styles.sportChip}
                  onClick={openSportPicker}
                  title={sport ? `Sport filter: ${sport}` : 'Optional sport filter'}
                >
                  <span aria-hidden>🏒</span>
                  <span>{sport ? sport.replace(/_/g, ' ') : 'Sport'}</span>
                  <span className={styles.destinationChevron}>▾</span>
                </button>
              </div>

              {showDestinations && destinations && (
                <div className={styles.pickerBackdrop} onClick={() => setShowDestinations(false)}>
                  <div
                    className={styles.pickerSheet}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={styles.pickerTitle}>Post to</div>
                    {destinationOptions.map((opt) => {
                      const selected = destination?.target_type === opt.target_type && destination?.target_id === opt.target_id;
                      return (
                        <button
                          key={`${opt.target_type}:${opt.target_id}`}
                          type="button"
                          className={`${styles.pickerOption} ${selected ? styles.pickerOptionSelected : ''}`}
                          onClick={() => pickDestination(opt)}
                        >
                          <span className={styles.pickerOptionLabel}>{opt.name}</span>
                          <span className={styles.pickerOptionMeta}>
                            {opt.target_type === 'user' ? 'Profile' : opt.target_type === 'team' ? 'Team hub' : 'League hub'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {showSportPicker && (
                <div className={styles.pickerBackdrop} onClick={() => setShowSportPicker(false)}>
                  <div
                    className={styles.pickerSheet}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={styles.pickerTitle}>Sport</div>
                    {sportOptions.map((opt) => {
                      const selected = sport === opt.value;
                      return (
                        <button
                          key={opt.value || 'none'}
                          type="button"
                          className={`${styles.pickerOption} ${selected ? styles.pickerOptionSelected : ''}`}
                          onClick={() => pickSport(opt.value || null)}
                        >
                          <span className={styles.pickerOptionLabel}>{opt.label}</span>
                          {selected ? <span className={styles.pickerOptionCheck}>✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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

              {/* Image picker + preview */}
              <div className={styles.imageBlock}>
                {imageStage === 'none' && (
                  <button
                    type="button"
                    className={styles.imagePickerBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                  >
                    <span aria-hidden>📷</span>
                    <span>Add photo</span>
                  </button>
                )}

                {(imageStage === 'processing' || imageStage === 'uploading') && (
                  <div className={styles.imageProcessing}>
                    <div className={styles.spinner} aria-hidden />
                    <span>
                      {imageStage === 'processing'
                        ? 'Processing image…'
                        : 'Uploading…'}
                    </span>
                  </div>
                )}

                {imageStage === 'ready' && image && (
                  <div className={styles.imagePreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.previewUrl}
                      alt="Selected upload preview"
                      className={styles.imagePreviewImg}
                      style={{ aspectRatio: `${image.width} / ${image.height}` }}
                    />
                    <button
                      type="button"
                      className={styles.imageRemoveBtn}
                      onClick={removeImage}
                      aria-label="Remove image"
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_IMAGE_MIME.join(',')}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  aria-hidden
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
                  disabled={submitDisabled}
                >
                  {submitting
                    ? 'Posting…'
                    : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
