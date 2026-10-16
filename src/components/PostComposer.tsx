'use client';

/**
 * PostComposer — global post composer + FAB.
 *
 * Mounted once at the layout level. Renders a mobile "+" FAB that opens
 * a quick-actions menu. Each action opens a focused sub-form in the same
 * bottom sheet.
 *
 * Menu (2026-10-16):
 *   Write Post | Share Media | Schedule | Payments | Log Workout | RSVP | Log Stats | Team Tools
 *   ↓
 *   Schedule | Payments | Team Tools link to /dashboard/schedule, /dashboard/plans, /dashboard/team
 */

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import styles from './PostComposer.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ComposerMode =
  | 'menu'
  | 'compose'
  | 'media'
  | 'workout'
  | 'schedule'
  | 'payments'
  | 'rsvp'
  | 'stats'
  | 'org';

interface ProfileMeResponse {
  profile?: { user_id: string; username: string; display_name?: string | null; tier?: string };
}

interface Rink {
  id: string;
  name: string;
  city: string;
  state_province?: string;
  country: string;
}

interface RsvpEvent {
  id: string;
  title: string;
  team_name?: string;
  event_date: string;
  event_type: string;
}

interface PendingImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  processedFile: File;
}

interface PendingMedia {
  file: File;
  previewUrl: string;
  isVideo: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX = 1000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const ALLOWED_VIDEO_STR = 'video/mp4,video/quicktime,video/webm';
const ALLOWED_IMAGE_STR = 'image/jpeg,image/png,image/webp,image/gif';

// ─── Image helpers (module-level) ─────────────────────────────────────────────

interface ProcessImageResult {
  processedFile: File;
  width: number;
  height: number;
  previewUrl: string;
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

async function processImage(file: File): Promise<ProcessImageResult> {
  if (!ALLOWED_IMAGE_MIME.includes(file.type))
    throw new Error('Unsupported image type. Use JPEG, PNG, WebP, or GIF.');
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error('Image too large. Max 10 MB.');

  if (file.type === 'image/gif') {
    const url = URL.createObjectURL(file);
    const dims = await loadImageDimensions(url);
    return { processedFile: file, width: dims.width, height: dims.height, previewUrl: url };
  }

  const originalUrl = URL.createObjectURL(file);
  const img = await loadHtmlImage(originalUrl);
  const targetW = Math.min(img.naturalWidth, MAX_IMAGE_DIMENSION);
  const scale = targetW / img.naturalWidth;
  const targetH = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) { URL.revokeObjectURL(originalUrl); throw new Error('Could not initialize image processor.'); }
  const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const outExt = outType === 'image/png' ? 'png' : 'jpg';
  const quality = outType === 'image/jpeg' ? 0.92 : undefined;
  ctx.drawImage(img, 0, 0, targetW, targetH);
  URL.revokeObjectURL(originalUrl);
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Image encoding failed.')), outType, quality));
  const processedFile = new File([blob], file.name.replace(/\.[^.]+$/, `.${outExt}`), { type: outType, lastModified: Date.now() });
  return { processedFile, width: targetW, height: targetH, previewUrl: URL.createObjectURL(processedFile) };
}

// ─── Media file processing ─────────────────────────────────────────────────────

async function processMediaFile(file: File): Promise<PendingMedia> {
  const isVideo = ALLOWED_VIDEO_MIME.has(file.type);
  const isImage = ALLOWED_IMAGE_MIME.includes(file.type);
  if (!isVideo && !isImage) {
    throw new Error('Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, MOV, or WebM.');
  }
  const maxVideo = 100 * 1024 * 1024;
  const maxImage = 10 * 1024 * 1024;
  if (isVideo && file.size > maxVideo) throw new Error('Video too large. Max 100 MB.');
  if (!isVideo && file.size > maxImage) throw new Error('Image too large. Max 10 MB.');
  const previewUrl = URL.createObjectURL(file);
  return { file, previewUrl, isVideo };
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PostComposer() {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname() || '/';

  const onAuthPage =
    pathname === '/login' ||
    pathname.startsWith('/sign-') ||
    pathname === '/onboarding';

  // ── Core state ──────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ComposerMode>('menu');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Shareable card state ──────────────────────────────────────────────────
  const [shareCard, setShareCard] = useState<{
    type: 'checkin' | 'workout' | 'highlight' | 'stats' | 'rsvp';
    title: string;
    subtitle: string;
    meta?: string;
    shareText: string;
    shareUrl?: string;
  } | null>(null);

  const [myProfile, setMyProfile] = useState<ProfileMeResponse['profile'] | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // ── Standard compose state ──────────────────────────────────────────────────
  const [body, setBody] = useState('');
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

  // ── Media (photo/video) upload state ──────────────────────────────────────
  const [media, setMedia] = useState<PendingMedia | null>(null);
  const [mediaStage, setMediaStage] = useState<'none' | 'processing' | 'ready' | 'uploading' | 'gated'>('none');
  const [mediaBody, setMediaBody] = useState('');
  const mediaFileRef = useRef<HTMLInputElement>(null);

  // ── Workout log state ─────────────────────────────────────────────────────
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [workoutType, setWorkoutType] = useState('skate');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [workoutImage, setWorkoutImage] = useState<PendingImage | null>(null);
  const [workoutImageStage, setWorkoutImageStage] = useState<'none' | 'processing' | 'ready' | 'uploading'>('none');
  const workoutFileRef = useRef<HTMLInputElement>(null);

  // ── RSVP state ───────────────────────────────────────────────────────────
  const [rsvpEvents, setRsvpEvents] = useState<RsvpEvent[]>([]);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpSelected, setRsvpSelected] = useState<RsvpEvent | null>(null);
  const [rsvpSuccess, setRsvpSuccess] = useState('');

  // ── Stats log state ──────────────────────────────────────────────────────
  const [statGoals, setStatGoals] = useState(0);
  const [statAssists, setStatAssists] = useState(0);
  const [statNotes, setStatNotes] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Derived state ──────────────────────────────────────────────────────────
  const destinationOptions = destinations
    ? [destinations.personal, ...(destinations.teams ?? []), ...(destinations.leagues ?? [])]
    : [];

  // 2026-10-16: tier gate for video uploads. Photos are free for all;
  // video requires Hockey Passport Plus (identity_plus, personal track).
  const PERSONAL_VIDEO_TIER_RANK: Record<string, number> = {
    free: 0, verified_identity: 1, identity_plus: 2,
  };
  const canUploadVideo = (() => {
    const tier = (myProfile?.tier ?? 'free') as string;
    // Block business/org track users entirely (they belong on org tools, not personal posts).
    if (tier.startsWith('business_') || tier.startsWith('club_') || tier === 'league' || tier === 'federation') return false;
    return (PERSONAL_VIDEO_TIER_RANK[tier] ?? 0) >= 2;
  })();

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

  const modeTitles: Record<ComposerMode, string> = {
    menu: 'What would you like to do?',
    compose: 'Write Post',
    media: 'Share Media',
    workout: 'Log Skate / Workout',
    schedule: 'My Schedule',
    payments: 'Payments & Billing',
    rsvp: 'RSVP to Event',
    stats: 'Log Stats',
    org: 'Team Tools',
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  function openComposer() {
    setOpen(true);
    setMode('menu');
    setError('');
    setSuccess('');
  }

  function closeComposer() {
    setOpen(false);
    setMode('menu');
    setError('');
    setSuccess('');
    setShareCard(null);
    resetForms();
  }

  function goToMenu() {
    setMode('menu');
    setError('');
    setSuccess('');
  }

  function pickDestination(next: { target_type: string; target_id: string; name: string }) {
    setDestination(next);
    setShowDestinations(false);
  }

  function pickSport(next: string | null) {
    setSport(next);
    setShowSportPicker(false);
  }

  function removeMedia() {
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    setMedia(null);
    setMediaStage('none');
  }

  function removeWorkoutImage() {
    if (workoutImage?.previewUrl) URL.revokeObjectURL(workoutImage.previewUrl);
    setWorkoutImage(null);
    setWorkoutImageStage('none');
  }

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open || myProfile || profileLoading) return;
    setProfileLoading(true);
    fetch('/api/profiles/me')
      .then(async (r): Promise<ProfileMeResponse | null> => {
        if (!r.ok) return null;
        try { return await r.json() as ProfileMeResponse; }
        catch { return null; }
      })
      .then((d) => { setMyProfile(d?.profile ?? null); })
      .catch(() => setMyProfile(null))
      .finally(() => setProfileLoading(false));
  }, [open, myProfile, profileLoading]);

  useEffect(() => {
    if (!open || destinations) return;
    setDestinationsLoading(true);
    fetch('/api/profiles/me/targets')
      .then(async (r) => { if (!r.ok) return null; const json = await r.json(); return json.data ?? null; })
      .then((data) => {
        if (data?.personal) { setDestination(data.personal); setDestinations(data); }
      })
      .catch(() => {
        const fallback = myProfile ? { target_type: 'user', target_id: myProfile.user_id, name: 'My profile' } : null;
        if (fallback) setDestination(fallback);
      })
      .finally(() => setDestinationsLoading(false));
  }, [open, destinations, myProfile]);

  useEffect(() => {
    if (open && mode === 'compose') {
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, mode]);

  useEffect(() => {
    function onOpenRequest(e: Event) {
      const detail = (e as CustomEvent<{ target_type?: string; target_id?: string; name?: string }>).detail;
      if (detail?.target_type && detail?.target_id)
        setDestination({ target_type: detail.target_type, target_id: detail.target_id, name: detail.name || detail.target_type });
      setOpen(true);
      setMode('compose');
      setError('');
    }
    window.addEventListener('rinkstop:open-composer', onOpenRequest);
    return () => window.removeEventListener('rinkstop:open-composer', onOpenRequest);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
    return undefined;
  }, [open]);

  function resetForms() {
    setBody('');
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    setImageStage('none');
    setWorkoutDuration('');
    setWorkoutNotes('');
    setWorkoutType('skate');
    if (workoutImage?.previewUrl) URL.revokeObjectURL(workoutImage.previewUrl);
    setWorkoutImage(null);
    setWorkoutImageStage('none');
    removeMedia();
    setMediaBody('');
    setRsvpEvents([]);
    setRsvpSelected(null);
    setRsvpSuccess('');
    setStatGoals(0);
    setStatAssists(0);
    setStatNotes('');
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleComposeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasBody = body.trim().length > 0;
    const hasUsableImage = imageStage === 'ready' && image !== null;
    if (!hasBody && !hasUsableImage) return;
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      if (image) setImageStage('uploading');
      const fd = new FormData();
      fd.append('body', body);
      if (destination) { fd.append('target_type', destination.target_type); fd.append('target_id', destination.target_id); }
      if (sport) fd.append('sport', sport);
      if (image) { fd.append('file', image.processedFile); fd.append('width', String(image.width)); fd.append('height', String(image.height)); }
      const r = await fetch('/api/profile-posts', { method: 'POST', body: fd });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) { setImageStage(image ? 'ready' : 'none'); setError(json.error ?? `Failed (HTTP ${r.status})`); return; }
      try { window.dispatchEvent(new CustomEvent('rinkstop:post-created')); } catch { /* noop */ }
      closeComposer();
    } catch (err) {
      setImageStage(image ? 'ready' : 'none');
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWorkoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workoutDuration && !workoutNotes.trim()) return;
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const typeLabel = workoutType === 'skate' ? 'Skate' : workoutType === 'workout' ? 'Workout' : 'Off-ice';
    const body_text = workoutNotes.trim()
      ? `💪 ${typeLabel}: ${workoutDuration ? workoutDuration + ' min' : ''} — ${workoutNotes.trim()}`
      : `💪 ${typeLabel}: ${workoutDuration ? workoutDuration + ' min' : 'completed'}`;
    try {
      const fd = new FormData();
      fd.append('body', body_text);
      if (myProfile) fd.append('target_id', myProfile.user_id);
      if (workoutImage) { fd.append('file', workoutImage.processedFile); fd.append('width', String(workoutImage.width)); fd.append('height', String(workoutImage.height)); }
      const r = await fetch('/api/profile-posts', { method: 'POST', body: fd });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) { setError(json.error ?? 'Failed'); return; }
      try { window.dispatchEvent(new CustomEvent('rinkstop:post-created')); } catch { /* noop */ }
      setSuccess('Workout logged!');
      setShareCard({
        type: 'workout',
        title: typeLabel + ' logged',
        subtitle: workoutDuration ? `${workoutDuration} min` : 'Completed',
        shareText: body_text,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWorkoutFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorkoutImageStage('processing');
    setError('');
    try {
      const result = await processImage(file);
      setWorkoutImage({ ...result, file: result.processedFile });
      setWorkoutImageStage('ready');
    } catch (err) {
      setWorkoutImageStage('none');
      setError(err instanceof Error ? err.message : 'Could not process image.');
    }
  }

  async function handleMediaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!media || submitting) return;
    setSubmitting(true);
    setError('');
    setMediaStage('uploading');
    try {
      const fd = new FormData();
      if (mediaBody.trim()) fd.append('body', mediaBody.trim());
      if (destination) { fd.append('target_type', destination.target_type); fd.append('target_id', destination.target_id); }
      if (sport) fd.append('sport', sport);
      fd.append('file', media.file);
      const r = await fetch('/api/profile-posts', { method: 'POST', body: fd });
      const json = await r.json().catch(() => ({}));
      setMediaStage('none');
      if (!r.ok) {
        setError(json.error ?? `Failed (${r.status})`);
        return;
      }
      try { window.dispatchEvent(new CustomEvent('rinkstop:post-created')); } catch { /* noop */ }
      closeComposer();
    } catch (err) {
      setMediaStage('ready');
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMediaFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    // 2026-10-16: gate video uploads to Hockey Passport Plus. Photos are free.
    if (ALLOWED_VIDEO_MIME.has(file.type) && !canUploadVideo) {
      setMedia(null);
      setMediaStage('gated');
      // Clear the input so the user can re-pick a photo after upgrading.
      e.target.value = '';
      return;
    }
    setMediaStage('processing');
    try {
      const result = await processMediaFile(file);
      setMedia(result);
      setMediaStage('ready');
    } catch (err) {
      setMediaStage('none');
      setError(err instanceof Error ? err.message : 'Could not process file.');
    }
  }

  async function loadRsvpEvents() {
    setRsvpLoading(true);
    try {
      const r = await fetch('/api/profiles/me/events/upcoming');
      if (!r.ok) throw new Error();
      const json = await r.json();
      setRsvpEvents(json.data ?? []);
    } catch {
      setRsvpEvents([]);
    } finally {
      setRsvpLoading(false);
    }
  }

  async function handleRsvpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rsvpSelected || submitting) return;
    setSubmitting(true);
    setError('');
    const body_text = `🙋 I'm in: ${rsvpSelected.title} — ${new Date(rsvpSelected.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    try {
      const fd = new FormData();
      fd.append('body', body_text);
      fd.append('target_type', 'user');
      if (myProfile) fd.append('target_id', myProfile.user_id);
      const r = await fetch('/api/profile-posts', { method: 'POST', body: fd });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) { setError(json.error ?? 'Failed'); return; }
      try { window.dispatchEvent(new CustomEvent('rinkstop:post-created')); } catch { /* noop */ }
      setRsvpSuccess('RSVP sent!');
      setShareCard({
        type: 'rsvp',
        title: rsvpSelected.title,
        subtitle: new Date(rsvpSelected.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        shareText: body_text,
      });
      setTimeout(() => { if (!shareCard) closeComposer(); }, 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (statGoals === 0 && statAssists === 0) return;
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const parts = [];
    if (statGoals > 0) parts.push(`${statGoals}G`);
    if (statAssists > 0) parts.push(`${statAssists}A`);
    const body_text = `📊 Tonight: ${parts.join(' + ')} — ${statNotes.trim() || 'let us go!'}`.trim();
    try {
      const fd = new FormData();
      fd.append('body', body_text);
      fd.append('target_type', 'user');
      if (myProfile) fd.append('target_id', myProfile.user_id);
      const r = await fetch('/api/profile-posts', { method: 'POST', body: fd });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) { setError(json.error ?? 'Failed'); return; }
      try { window.dispatchEvent(new CustomEvent('rinkstop:post-created')); } catch { /* noop */ }
      setSuccess(`${statGoals}G + ${statAssists}A logged!`);
      const statShareText = `📊 Tonight: ${parts.join(' + ')} — ${statNotes.trim() || 'Let us go!'}`;
      setShareCard({
        type: 'stats',
        title: `${statGoals}G + ${statAssists}A`,
        subtitle: statNotes.trim() || "Tonight's stats",
        shareText: statShareText,
      });
      setTimeout(() => { if (!shareCard) closeComposer(); }, 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const submitDisabled = false;

  return (
    <>
      {/* FAB */}
      <button className={styles.fab} onClick={openComposer} aria-label="Open actions" title="Actions" type="button">
        +
      </button>

      {open && (
        <div className={styles.modalBackdrop} onClick={closeComposer}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">

            {/* ── Header ── */}
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>{modeTitles[mode]}</div>
                {mode !== 'menu' && (
                  <div className={styles.modalSubtitle}>Posting to your profile</div>
                )}
              </div>
              <button className={styles.modalClose} onClick={mode === 'menu' ? closeComposer : goToMenu} aria-label={mode === 'menu' ? 'Close' : 'Back'} type="button">
                {mode === 'menu' ? '✕' : '←'}
              </button>
            </div>

            {/* ── MENU ── */}
            {mode === 'menu' && (
              <>
                <div className={styles.actionGrid}>
                  <ActionCard icon="✍️" label="Write Post" desc="Share an update" onClick={() => setMode('compose')} />
                  <ActionCard icon="📷" label="Share Media" desc="Photo or video" onClick={() => setMode('media')} />
                  <ActionCard icon="📅" label="Schedule" desc="My schedule" onClick={() => setMode('schedule')} />
                  <ActionCard icon="💳" label="Payments" desc="Billing & invoices" onClick={() => setMode('payments')} />
                  <ActionCard icon="💪" label="Log Workout" desc="Skate or training" onClick={() => setMode('workout')} />
                  <ActionCard icon="🙋" label="RSVP" desc="I'm in for an event" onClick={() => { setMode('rsvp'); loadRsvpEvents(); }} />
                  <ActionCard icon="📊" label="Log Stats" desc="2G, 1A tonight" onClick={() => setMode('stats')} />
                  <ActionCard icon="🏒" label="Team Tools" desc="Manage your team" onClick={() => setMode('org')} />
                </div>
                <div className={styles.menuFooter}>
                  <a href="/dashboard" className={styles.menuFooterLink}>Full dashboard →</a>
                </div>
              </>
            )}

            {/* ── COMPOSE: Standard post ── */}
            {mode === 'compose' && (
              <form onSubmit={handleComposeSubmit}>
                <div className={styles.destinationRow}>
                  <button type="button" className={styles.destinationChip} onClick={() => setShowDestinations(true)} disabled={!destinations || destinationsLoading}>
                    <span>📍</span><span>{destination ? destination.name : 'Choose destination'}</span><span>▾</span>
                  </button>
                  <button type="button" className={styles.sportChip} onClick={() => setShowSportPicker(true)}>
                    <span>🏒</span><span>{sport ? sport.replace(/_/g, ' ') : 'Sport'}</span><span>▾</span>
                  </button>
                </div>

                {showDestinations && destinations && (
                  <div className={styles.pickerBackdrop} onClick={() => setShowDestinations(false)}>
                    <div className={styles.pickerSheet} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.pickerTitle}>Post to</div>
                      {destinationOptions.map((opt) => {
                        const sel = destination?.target_type === opt.target_type && destination?.target_id === opt.target_id;
                        return (
                          <button key={`${opt.target_type}:${opt.target_id}`} type="button"
                            className={`${styles.pickerOption} ${sel ? styles.pickerOptionSelected : ''}`}
                            onClick={() => pickDestination(opt)}>
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
                    <div className={styles.pickerSheet} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.pickerTitle}>Sport</div>
                      {sportOptions.map((opt) => (
                        <button key={opt.value} type="button"
                          className={`${styles.pickerOption} ${sport === opt.value ? styles.pickerOptionSelected : ''}`}
                          onClick={() => pickSport(opt.value || null)}>
                          <span className={styles.pickerOptionLabel}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  className={styles.composerTextarea}
                  placeholder="What's on your mind?"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={MAX}
                  rows={4}
                />
                <div className={styles.charCount}>{body.length}/{MAX}</div>

                {imageStage === 'none' && (
                  <button type="button" className={styles.imagePickerBtn} onClick={() => mediaFileRef.current?.click()}>
                    <span>📷</span><span>Add photo</span>
                  </button>
                )}
                {(imageStage === 'processing' || imageStage === 'uploading') && (
                  <div className={styles.imageProcessing}><div className={styles.spinner} /><span>{imageStage === 'processing' ? 'Processing…' : 'Uploading…'}</span></div>
                )}
                {imageStage === 'ready' && image && (
                  <div className={styles.imagePreview}>
                    <img src={image.previewUrl} alt="Preview" className={styles.imagePreviewImg} style={{ aspectRatio: `${image.width}/${image.height}` }} />
                    <button type="button" className={styles.imageRemoveBtn} onClick={() => {
                      if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
                      setImage(null);
                      setImageStage('none');
                    }}>✕ Remove</button>
                  </div>
                )}
                <input
                  ref={mediaFileRef}
                  type="file"
                  accept={ALLOWED_IMAGE_STR}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setError('');
                    setImageStage('processing');
                    try {
                      const result = await processImage(file);
                      setImage({ ...result, file: result.processedFile });
                      setImageStage('ready');
                    } catch (err) {
                      setImageStage('none');
                      setError(err instanceof Error ? err.message : 'Could not process image.');
                    }
                  }}
                  style={{ display: 'none' }}
                  aria-hidden />
                {error && <p className={styles.composerError}>{error}</p>}
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={closeComposer} disabled={submitting}>Cancel</button>
                  <button type="submit" className={styles.postBtn} disabled={submitDisabled}>{submitting ? 'Posting…' : 'Post'}</button>
                </div>
              </form>
            )}

            {/* ── MEDIA (photo/video) ── */}
            {mode === 'media' && (
              <form onSubmit={handleMediaSubmit}>
                <p className={styles.fieldHint}>Choose a photo or video from your device.</p>
                {mediaStage === 'gated' && (
                  <div style={{
                    background: 'rgba(200,16,46,0.08)',
                    border: '1px solid rgba(200,16,46,0.3)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginTop: '0.5rem',
                    color: '#fff',
                  }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      🔒 Video uploads are a Hockey Passport Plus feature
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem' }}>
                      Photos are free for everyone. Upgrade to Hockey Passport Plus to share videos, get verified identity, and unlock premium insights.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <a href="/dashboard/plans" className={styles.postBtn} style={{ textDecoration: 'none', display: 'inline-block' }}>
                        Upgrade to Plus →
                      </a>
                      <button type="button" className={styles.cancelBtn} onClick={() => mediaFileRef.current?.click()}>
                        Pick a photo instead
                      </button>
                    </div>
                  </div>
                )}
                {(mediaStage === 'none' || mediaStage === 'gated') && mediaStage !== 'gated' && (
                  <button type="button" className={styles.imagePickerBtn}
                    onClick={() => mediaFileRef.current?.click()}>
                    <span>📷</span><span>Choose photo or video</span>
                  </button>
                )}
                {mediaStage === 'none' && canUploadVideo === false && (
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.5rem' }}>
                    💡 Video uploads require <a href="/dashboard/plans" style={{ color: '#C8102E' }}>Hockey Passport Plus</a>. Photos are free.
                  </p>
                )}
                {mediaStage === 'processing' && (
                  <div className={styles.imageProcessing}><div className={styles.spinner} /><span>Processing…</span></div>
                )}
                {mediaStage === 'ready' && media && (
                  <div className={styles.imagePreview}>
                    {media.isVideo ? (
                      <video src={media.previewUrl} controls playsInline className={styles.imagePreviewImg}
                        style={{ aspectRatio: '16/9', width: '100%' }} />
                    ) : (
                      <img src={media.previewUrl} alt="Preview" className={styles.imagePreviewImg} />
                    )}
                    <button type="button" className={styles.imageRemoveBtn} onClick={removeMedia}>✕ Remove</button>
                  </div>
                )}
                {mediaStage === 'uploading' && (
                  <div className={styles.imageProcessing}><div className={styles.spinner} /><span>Uploading…</span></div>
                )}
                <input
                  ref={mediaFileRef}
                  type="file"
                  accept={`${ALLOWED_IMAGE_STR},${ALLOWED_VIDEO_STR}`}
                  onChange={handleMediaFileChange}
                  style={{ display: 'none' }}
                  aria-hidden />
                <div className={styles.fieldGroup} style={{ marginTop: '0.75rem' }}>
                  <label className={styles.fieldLabel}>Caption (optional)</label>
                  <textarea className={styles.composerTextarea} placeholder="Add a caption…"
                    value={mediaBody} onChange={(e) => setMediaBody(e.target.value)} rows={2} />
                </div>
                {error && <p className={styles.composerError}>{error}</p>}
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={goToMenu}>Back</button>
                  <button type="submit" className={styles.postBtn} disabled={mediaStage !== 'ready' || submitting}>
                    {submitting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </form>
            )}

            {/* ── WORKOUT LOG ── */}
            {mode === 'workout' && (
              <form onSubmit={handleWorkoutSubmit}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Type</label>
                  <div className={styles.segmentedControl}>
                    {[['skate', '🏒 Skate'], ['workout', '💪 Workout'], ['office', '🥌 Off-ice']].map(([val, label]) => (
                      <button type="button" key={val}
                        className={`${styles.segmentBtn} ${workoutType === val ? styles.segmentBtnActive : ''}`}
                        onClick={() => setWorkoutType(val)}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className={styles.fieldGroup} style={{ marginTop: '0.75rem' }}>
                  <label className={styles.fieldLabel}>Duration (minutes)</label>
                  <input className={styles.modalInput} type="number" placeholder="e.g. 60" min="1" max="480"
                    value={workoutDuration} onChange={(e) => setWorkoutDuration(e.target.value)} />
                </div>
                <div className={styles.fieldGroup} style={{ marginTop: '0.75rem' }}>
                  <label className={styles.fieldLabel}>Notes</label>
                  <textarea className={styles.composerTextarea} placeholder="How did it go?" rows={3}
                    value={workoutNotes} onChange={(e) => setWorkoutNotes(e.target.value)} />
                </div>
                <div className={styles.imageBlock} style={{ marginTop: '0.5rem' }}>
                  {workoutImageStage === 'none' && (
                    <button type="button" className={styles.imagePickerBtn} onClick={() => workoutFileRef.current?.click()}>
                      <span>📷</span><span>Add photo</span>
                    </button>
                  )}
                  {(workoutImageStage === 'processing' || workoutImageStage === 'uploading') && (
                    <div className={styles.imageProcessing}><div className={styles.spinner} /><span>{workoutImageStage === 'processing' ? 'Processing…' : 'Uploading…'}</span></div>
                  )}
                  {workoutImageStage === 'ready' && workoutImage && (
                    <div className={styles.imagePreview}>
                      <img src={workoutImage.previewUrl} alt="Preview" className={styles.imagePreviewImg} style={{ aspectRatio: `${workoutImage.width}/${workoutImage.height}` }} />
                      <button type="button" className={styles.imageRemoveBtn} onClick={removeWorkoutImage}>✕ Remove</button>
                    </div>
                  )}
                  <input ref={workoutFileRef} type="file" accept={ALLOWED_IMAGE_MIME.join(',')} onChange={handleWorkoutFileChange} style={{ display: 'none' }} aria-hidden />
                </div>
                {error && <p className={styles.composerError}>{error}</p>}
                {success && <p className={styles.successMsg}>{success}</p>}
                {shareCard && (
                  <div className={styles.shareCard}>
                    <div className={styles.shareCardIcon}>💪</div>
                    <div className={styles.shareCardText}>
                      <div className={styles.shareCardTitle}>{shareCard.title}</div>
                      <div className={styles.shareCardSubtitle}>{shareCard.subtitle}</div>
                    </div>
                    <div className={styles.shareCardActions}>
                      <button type="button" className={styles.shareBtn} onClick={() => handleShare(shareCard)}>Share ↗</button>
                      <button type="button" className={styles.cancelBtn} onClick={closeComposer} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>Done</button>
                    </div>
                  </div>
                )}
                {!shareCard && (
                  <div className={styles.modalActions}>
                    <button type="button" className={styles.cancelBtn} onClick={goToMenu}>Back</button>
                    <button type="submit" className={styles.postBtn} disabled={submitting}>{submitting ? 'Logging…' : 'Log Workout'}</button>
                  </div>
                )}
              </form>
            )}

            {/* ── SCHEDULE (stub) ── */}
            {mode === 'schedule' && (
              <div className={styles.stubsheet}>
                <p className={styles.fieldHint}>Your upcoming workouts, team events, and games appear here.</p>
                <a href="/dashboard/schedule" className={styles.stubLink} onClick={closeComposer}>
                  Open My Schedule →
                </a>
              </div>
            )}

            {/* ── PAYMENTS (stub) ── */}
            {mode === 'payments' && (
              <div className={styles.stubsheet}>
                <p className={styles.fieldHint}>Manage your subscription, view invoices, and update billing.</p>
                <a href="/dashboard/plans" className={styles.stubLink} onClick={closeComposer}>
                  Open Payments & Billing →
                </a>
              </div>
            )}

            {/* ── ORG / Team Tools (stub) ── */}
            {mode === 'org' && (
              <div className={styles.stubsheet}>
                <p className={styles.fieldHint}>Manage your team roster, post announcements, and more.</p>
                <a href="/dashboard/team" className={styles.stubLink} onClick={closeComposer}>
                  Open Team Dashboard →
                </a>
              </div>
            )}

            {/* ── RSVP ── */}
            {mode === 'rsvp' && (
              <form onSubmit={handleRsvpSubmit}>
                {rsvpLoading && <div className={styles.searching}>Loading your upcoming events…</div>}
                {!rsvpLoading && rsvpEvents.length === 0 && (
                  <p className={styles.fieldHint}>No upcoming events found. Events you RSVP to from team pages will appear here.</p>
                )}
                {!rsvpLoading && rsvpEvents.length > 0 && (
                  <div className={styles.eventList}>
                    {rsvpEvents.map((evt) => (
                      <button type="button" key={evt.id}
                        className={`${styles.eventCard} ${rsvpSelected?.id === evt.id ? styles.eventCardSelected : ''}`}
                        onClick={() => setRsvpSelected(evt)}>
                        <div className={styles.eventCardTitle}>{evt.title}</div>
                        <div className={styles.eventCardMeta}>
                          {evt.team_name ? `${evt.team_name} · ` : ''}
                          {new Date(evt.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {rsvpSuccess && <p className={styles.successMsg}>{rsvpSuccess}</p>}
                {error && <p className={styles.composerError}>{error}</p>}
                {shareCard && (
                  <div className={styles.shareCard}>
                    <div className={styles.shareCardIcon}>🙋</div>
                    <div className={styles.shareCardText}>
                      <div className={styles.shareCardTitle}>{shareCard.title}</div>
                      <div className={styles.shareCardSubtitle}>{shareCard.subtitle}</div>
                    </div>
                    <div className={styles.shareCardActions}>
                      <button type="button" className={styles.shareBtn} onClick={() => handleShare(shareCard)}>Share ↗</button>
                      <button type="button" className={styles.cancelBtn} onClick={closeComposer} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>Done</button>
                    </div>
                  </div>
                )}
                {!shareCard && (
                  <div className={styles.modalActions}>
                    <button type="button" className={styles.cancelBtn} onClick={goToMenu}>Back</button>
                    <button type="submit" className={styles.postBtn} disabled={!rsvpSelected || submitting}>{submitting ? 'RSVPing…' : "I'm In"}</button>
                  </div>
                )}
              </form>
            )}

            {/* ── STATS ── */}
            {mode === 'stats' && (
              <form onSubmit={handleStatsSubmit}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Goals (G)</label>
                  <div className={styles.statsRow}>
                    <button type="button" className={styles.statBtn} onClick={() => setStatGoals(Math.max(0, statGoals - 1))}>−</button>
                    <span className={styles.statValue}>{statGoals}</span>
                    <button type="button" className={styles.statBtn} onClick={() => setStatGoals(statGoals + 1)}>+</button>
                  </div>
                </div>
                <div className={styles.fieldGroup} style={{ marginTop: '0.75rem' }}>
                  <label className={styles.fieldLabel}>Assists (A)</label>
                  <div className={styles.statsRow}>
                    <button type="button" className={styles.statBtn} onClick={() => setStatAssists(Math.max(0, statAssists - 1))}>−</button>
                    <span className={styles.statValue}>{statAssists}</span>
                    <button type="button" className={styles.statBtn} onClick={() => setStatAssists(statAssists + 1)}>+</button>
                  </div>
                </div>
                <div className={styles.fieldGroup} style={{ marginTop: '0.75rem' }}>
                  <label className={styles.fieldLabel}>Notes</label>
                  <textarea className={styles.composerTextarea} placeholder="How did the game go?"
                    value={statNotes} onChange={(e) => setStatNotes(e.target.value)} rows={2} />
                </div>
                {error && <p className={styles.composerError}>{error}</p>}
                {success && <p className={styles.successMsg}>{success}</p>}
                {shareCard && (
                  <div className={styles.shareCard}>
                    <div className={styles.shareCardIcon}>📊</div>
                    <div className={styles.shareCardText}>
                      <div className={styles.shareCardTitle}>{shareCard.title}</div>
                      <div className={styles.shareCardSubtitle}>{shareCard.subtitle}</div>
                    </div>
                    <div className={styles.shareCardActions}>
                      <button type="button" className={styles.shareBtn} onClick={() => handleShare(shareCard)}>Share ↗</button>
                      <button type="button" className={styles.cancelBtn} onClick={closeComposer} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>Done</button>
                    </div>
                  </div>
                )}
                {!shareCard && (
                  <div className={styles.modalActions}>
                    <button type="button" className={styles.cancelBtn} onClick={goToMenu}>Back</button>
                    <button type="submit" className={styles.postBtn} disabled={submitting}>{submitting ? 'Logging…' : 'Log Stats'}</button>
                  </div>
                )}
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );

  // ── Share handler (used by workout, stats, rsvp) ───────────────────────────
  async function handleShare(card: NonNullable<typeof shareCard>) {
    if (!navigator.share) {
      try {
        await navigator.clipboard.writeText(card.shareUrl ? `${card.shareText} ${card.shareUrl}` : card.shareText);
      } catch { /* noop */ }
      return;
    }
    try {
      await navigator.share({ title: card.title, text: card.shareText, url: card.shareUrl });
    } catch { /* user cancelled or not supported */ }
  }
}

// ─── ActionCard sub-component ─────────────────────────────────────────────────

function ActionCard({ icon, label, desc, onClick }: { icon: string; label: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.actionCard} onClick={onClick}>
      <span className={styles.actionCardIcon}>{icon}</span>
      <span className={styles.actionCardLabel}>{label}</span>
      <span className={styles.actionCardDesc}>{desc}</span>
    </button>
  );
}
