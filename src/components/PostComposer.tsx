'use client';

/**
 * PostComposer — global post composer + FAB.
 *
 * Mounted once at the layout level (next to RoleAwareTabBar). Renders a
 * mobile-only blue "+" FAB that opens a quick-actions menu. Each action
 * opens a focused sub-form in the same bottom sheet.
 *
 * Quick-actions menu (2026-08-29):
 *   1. Write Post         → standard composer (existing)
 *   2. Rink Check-in     → search rinks, post "I'm at X"
 *   3. Log Skate/Workout → duration + notes + optional photo
 *   4. Share Highlight    → paste YouTube/TikTok URL, auto-fetch thumbnail
 *   5. RSVP to Event     → one-tap "I'm in" to team/league events
 *   6. Find a Game       → browse drop-in / open hockey sessions
 *   7. Log Stats         → quick 2G 1A style stat entry
 *   8. Find a Team       → tryout / open roster listings
 *
 * Rules of hooks: every hook MUST be called in the same order on
 * every render. No early returns above useState/useEffect etc.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import styles from './PostComposer.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ComposerMode =
  | 'menu'      // quick-actions grid
  | 'compose'   // standard write-post composer
  | 'checkin'   // rink check-in form
  | 'workout'   // log skate / workout
  | 'highlight' // share a highlight link
  | 'rsvp'      // RSVP to an event
  | 'findgame'  // find a drop-in game
  | 'stats'     // log stats
  | 'tryout';   // find a team / tryout

interface ProfileMeResponse {
  profile?: { user_id: string; username: string; display_name?: string | null };
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

interface HighlightMeta {
  url: string;
  title: string;
  thumbnail?: string;
  platform: 'youtube' | 'tiktok' | 'other';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX = 1000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ─── Image helpers ───────────────────────────────────────────────────────────

interface PendingImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  processedFile: File;
}

async function processImage(file: File): Promise<{
  processedFile: File; width: number; height: number; previewUrl: string;
}> {
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

// ─── Highlight URL parser ─────────────────────────────────────────────────────

function parseHighlightUrl(raw: string): HighlightMeta {
  const url = raw.trim();
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { url, title: 'YouTube video', platform: 'youtube' };
  const ttMatch = url.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/);
  if (ttMatch) return { url, title: 'TikTok video', platform: 'tiktok' };
  return { url, title: 'Highlight', platform: 'other' };
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

  // ── Rink check-in state ─────────────────────────────────────────────────────
  const [checkinQuery, setCheckinQuery] = useState('');
  const [checkinResults, setCheckinResults] = useState<Rink[]>([]);
  const [checkinSearching, setCheckinSearching] = useState(false);
  const [checkinSelected, setCheckinSelected] = useState<Rink | null>(null);
  const [checkinNote, setCheckinNote] = useState('');

  // ── Workout log state ────────────────────────────────────────────────────────
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [workoutType, setWorkoutType] = useState('skate');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [workoutImage, setWorkoutImage] = useState<PendingImage | null>(null);
  const [workoutImageStage, setWorkoutImageStage] = useState<'none' | 'processing' | 'ready' | 'uploading'>('none');

  // ── Highlight link state ─────────────────────────────────────────────────────
  const [highlightUrl, setHighlightUrl] = useState('');
  const [highlightMeta, setHighlightMeta] = useState<HighlightMeta | null>(null);
  const [highlightFetching, setHighlightFetching] = useState(false);

  // ── RSVP state ───────────────────────────────────────────────────────────────
  const [rsvpEvents, setRsvpEvents] = useState<RsvpEvent[]>([]);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpSelected, setRsvpSelected] = useState<RsvpEvent | null>(null);
  const [rsvpSuccess, setRsvpSuccess] = useState('');

  // ── Find game state ──────────────────────────────────────────────────────────
  const [findgameCity, setFindgameCity] = useState('');
  const [findgameResults, setFindgameResults] = useState<Rink[]>([]);
  const [findgameLoading, setFindgameLoading] = useState(false);

  // ── Stats log state ──────────────────────────────────────────────────────────
  const [statGoals, setStatGoals] = useState(0);
  const [statAssists, setStatAssists] = useState(0);
  const [statNotes, setStatNotes] = useState('');

  // ── Tryout search state ───────────────────────────────────────────────────────
  const [tryoutQuery, setTryoutQuery] = useState('');
  const [tryoutResults, setTryoutResults] = useState<{ name: string; type: string; location: string; link?: string }[]>([]);
  const [tryoutLoading, setTryoutLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workoutFileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Effects ──────────────────────────────────────────────────────────────────

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

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openComposer = useCallback(() => {
    setOpen(true);
    setMode('menu');
    setError('');
    setSuccess('');
  }, []);

  const goToMenu = useCallback(() => {
    setMode('menu');
    setError('');
    setSuccess('');
  }, []);

  const closeComposer = useCallback(() => {
    setOpen(false);
    setMode('menu');
    setBody('');
    setError('');
    setSuccess('');
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    setImageStage('none');
    setCheckinQuery(''); setCheckinResults([]); setCheckinSelected(null); setCheckinNote('');
    setHighlightUrl(''); setHighlightMeta(null);
    setWorkoutDuration(''); setWorkoutNotes(''); setWorkoutType('skate');
    if (workoutImage?.previewUrl) URL.revokeObjectURL(workoutImage.previewUrl);
    setWorkoutImage(null); setWorkoutImageStage('none');
    setRsvpEvents([]); setRsvpSelected(null); setRsvpSuccess('');
    setFindgameResults([]); setFindgameCity('');
    setStatGoals(0); setStatAssists(0); setStatNotes('');
    setTryoutResults([]); setTryoutQuery('');
  }, [image, workoutImage]);

  // Standard compose submit
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

  // Rink check-in submit
  async function handleCheckinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkinSelected || submitting) return;
    setSubmitting(true);
    setError('');
    const body_text = checkinNote.trim()
      ? `I'm at ${checkinSelected.name} in ${checkinSelected.city}! ${checkinNote.trim()}`
      : `I'm at ${checkinSelected.name} in ${checkinSelected.city}! 🏒`;
    try {
      const fd = new FormData();
      fd.append('body', body_text);
      fd.append('target_type', 'user');
      if (myProfile) fd.append('target_id', myProfile.user_id);
      const r = await fetch('/api/profile-posts', { method: 'POST', body: fd });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) { setError(json.error ?? 'Check-in failed'); return; }
      try { window.dispatchEvent(new CustomEvent('rinkstop:post-created')); } catch { /* noop */ }
      setSuccess(`Checked in at ${checkinSelected.name}!`);
      setTimeout(closeComposer, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  // Workout log submit
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
      fd.append('target_type', 'user');
      if (myProfile) fd.append('target_id', myProfile.user_id);
      if (workoutImage) { fd.append('file', workoutImage.processedFile); fd.append('width', String(workoutImage.width)); fd.append('height', String(workoutImage.height)); }
      const r = await fetch('/api/profile-posts', { method: 'POST', body: fd });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) { setError(json.error ?? 'Failed'); return; }
      try { window.dispatchEvent(new CustomEvent('rinkstop:post-created')); } catch { /* noop */ }
      setSuccess('Workout logged!');
      setTimeout(closeComposer, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  // Highlight share submit
  async function handleHighlightSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!highlightMeta || submitting) return;
    setSubmitting(true);
    setError('');
    const platformIcon = highlightMeta.platform === 'youtube' ? '▶️' : highlightMeta.platform === 'tiktok' ? '🎵' : '🎬';
    const body_text = `${platformIcon} Check this out: ${highlightMeta.url}`;
    try {
      const fd = new FormData();
      fd.append('body', body_text);
      fd.append('target_type', 'user');
      if (myProfile) fd.append('target_id', myProfile.user_id);
      const r = await fetch('/api/profile-posts', { method: 'POST', body: fd });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) { setError(json.error ?? 'Failed'); return; }
      try { window.dispatchEvent(new CustomEvent('rinkstop:post-created')); } catch { /* noop */ }
      setSuccess('Highlight shared!');
      setTimeout(closeComposer, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  // Stats submit
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
      setTimeout(closeComposer, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  // RSVP submit
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
      if (!r.ok) { setError(json.error ?? 'RSVP failed'); return; }
      try { window.dispatchEvent(new CustomEvent('rinkstop:post-created')); } catch { /* noop */ }
      setRsvpSuccess('RSVP posted!');
      setTimeout(() => { setRsvpSuccess(''); setRsvpSelected(null); }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Image handlers (workout) ─────────────────────────────────────────────────

  async function handleWorkoutFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    setError('');
    setWorkoutImageStage('processing');
    try {
      const result = await processImage(file);
      if (workoutImage?.previewUrl) URL.revokeObjectURL(workoutImage.previewUrl);
      setWorkoutImage({ file, previewUrl: result.previewUrl, width: result.width, height: result.height, processedFile: result.processedFile });
      setWorkoutImageStage('ready');
    } catch (err) {
      setWorkoutImageStage('none');
      setError(err instanceof Error ? err.message : 'Could not process image.');
    }
  }

  function removeWorkoutImage() {
    if (workoutImage?.previewUrl) URL.revokeObjectURL(workoutImage.previewUrl);
    setWorkoutImage(null);
    setWorkoutImageStage('none');
  }

  // ── Search handlers ─────────────────────────────────────────────────────────

  async function searchRinks(query: string) {
    if (!query.trim()) { setCheckinResults([]); return; }
    setCheckinSearching(true);
    try {
      const r = await fetch(`/api/rinks?search=${encodeURIComponent(query)}&limit=6`);
      if (!r.ok) throw new Error();
      const json = await r.json();
      setCheckinResults(json.data ?? json.rinks ?? []);
    } catch {
      setCheckinResults([]);
    } finally {
      setCheckinSearching(false);
    }
  }

  async function searchFindGame(city: string) {
    if (!city.trim()) { setFindgameResults([]); return; }
    setFindgameLoading(true);
    try {
      const r = await fetch(`/api/rinks?search=${encodeURIComponent(city)}&limit=8`);
      if (!r.ok) throw new Error();
      const json = await r.json();
      setFindgameResults(json.data ?? json.rinks ?? []);
    } catch {
      setFindgameResults([]);
    } finally {
      setFindgameLoading(false);
    }
  }

  async function loadRsvpEvents() {
    setRsvpLoading(true);
    try {
      const r = await fetch('/api/events/my-upcoming');
      if (!r.ok) throw new Error();
      const json = await r.json();
      setRsvpEvents(json.data ?? json.events ?? []);
    } catch {
      setRsvpEvents([]);
    } finally {
      setRsvpLoading(false);
    }
  }

  async function searchTryouts(q: string) {
    if (!q.trim()) { setTryoutResults([]); return; }
    setTryoutLoading(true);
    try {
      const r = await fetch(`/api/teams?search=${encodeURIComponent(q)}&limit=6`);
      if (!r.ok) throw new Error();
      const json = await r.json();
      const teams: { name: string; type: string; location: string; slug?: string }[] = json.data ?? json.teams ?? [];
      setTryoutResults(teams.map(t => ({
        name: t.name,
        type: 'Open roster / tryout',
        location: t.location ?? '',
        link: t.slug ? `/directory/teams/${t.slug}` : undefined,
      })));
    } catch {
      setTryoutResults([]);
    } finally {
      setTryoutLoading(false);
    }
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  if (!isLoaded) return null;
  if (!isSignedIn) return null;
  if (onAuthPage) return null;

  const hasBody = body.trim().length > 0;
  const hasUsableImage = imageStage === 'ready' && image !== null;
  const submitDisabled =
    (!hasBody && !hasUsableImage) ||
    submitting ||
    imageStage === 'processing' ||
    imageStage === 'uploading';

  const postTargetLabel =
    destination?.name ??
    (myProfile?.display_name ? `${myProfile.display_name.split(' ')[0]}'s profile` : 'your profile');

  const destinationOptions = destinations
    ? [destinations.personal, ...(destinations.teams ?? []), ...(destinations.leagues ?? [])]
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

  // ─── Mode labels ─────────────────────────────────────────────────────────
  const modeTitles: Record<ComposerMode, string> = {
    menu: 'What would you like to do?',
    compose: 'Write Post',
    checkin: 'Rink Check-in',
    workout: 'Log Skate / Workout',
    highlight: 'Share Highlight',
    rsvp: 'RSVP to Event',
    findgame: 'Find a Game',
    stats: 'Log Stats',
    tryout: 'Find a Team / Tryout',
  };

  // ─── Render ───────────────────────────────────────────────────────────────

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

            {/* ── MENU: Quick-actions grid ── */}
            {mode === 'menu' && (
              <div className={styles.actionGrid}>
                <ActionCard icon="✍️" label="Write Post" desc="Share an update" onClick={() => setMode('compose')} />
                <ActionCard icon="📍" label="Check In" desc="I'm at this rink" onClick={() => setMode('checkin')} />
                <ActionCard icon="💪" label="Log Workout" desc="Skate or training" onClick={() => setMode('workout')} />
                <ActionCard icon="▶️" label="Share Highlight" desc="YouTube or TikTok link" onClick={() => setMode('highlight')} />
                <ActionCard icon="🙋" label="RSVP" desc="I'm in for this event" onClick={() => { setMode('rsvp'); loadRsvpEvents(); }} />
                <ActionCard icon="🏒" label="Find a Game" desc="Drop-in near me" onClick={() => setMode('findgame')} />
                <ActionCard icon="📊" label="Log Stats" desc="2G, 1A tonight" onClick={() => setMode('stats')} />
                <ActionCard icon="🔍" label="Find a Team" desc="Tryouts & open roster" onClick={() => setMode('tryout')} />
              </div>
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
                      {sportOptions.map((opt) => {
                        const sel = sport === opt.value;
                        return (
                          <button key={opt.value || 'none'} type="button"
                            className={`${styles.pickerOption} ${sel ? styles.pickerOptionSelected : ''}`}
                            onClick={() => pickSport(opt.value || null)}>
                            <span className={styles.pickerOptionLabel}>{opt.label}</span>
                            {sel && <span className={styles.pickerOptionCheck}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <textarea ref={textareaRef} className={styles.composerTextarea}
                  placeholder={myProfile?.display_name ? `What's on your mind, ${myProfile.display_name.split(' ')[0]}?` : "What's on your mind?"}
                  value={body} onChange={(e) => setBody(e.target.value)} maxLength={MAX + 100} rows={4} />
                <div className={styles.charCount}>{MAX - body.length < 50 ? `${MAX - body.length} left` : ''}</div>

                <div className={styles.imageBlock}>
                  {imageStage === 'none' && (
                    <button type="button" className={styles.imagePickerBtn} onClick={() => fileInputRef.current?.click()} disabled={submitting}>
                      <span>📷</span><span>Add photo</span>
                    </button>
                  )}
                  {(imageStage === 'processing' || imageStage === 'uploading') && (
                    <div className={styles.imageProcessing}><div className={styles.spinner} /><span>{imageStage === 'processing' ? 'Processing…' : 'Uploading…'}</span></div>
                  )}
                  {imageStage === 'ready' && image && (
                    <div className={styles.imagePreview}>
                      <img src={image.previewUrl} alt="Preview" className={styles.imagePreviewImg} style={{ aspectRatio: `${image.width}/${image.height}` }} />
                      <button type="button" className={styles.imageRemoveBtn} onClick={() => { if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl); setImage(null); setImageStage('none'); }}>✕ Remove</button>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept={ALLOWED_IMAGE_MIME.join(',')} onChange={async (e) => {
                    const file = e.target.files?.[0]; if (e.target) e.target.value = '';
                    if (!file) return; setError(''); setImageStage('processing');
                    try {
                      const result = await processImage(file);
                      if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
                      setImage({ file, previewUrl: result.previewUrl, width: result.width, height: result.height, processedFile: result.processedFile });
                      setImageStage('ready');
                    } catch (err) { setImageStage('none'); setError(err instanceof Error ? err.message : 'Could not process image.'); }
                  }} style={{ display: 'none' }} aria-hidden />
                </div>

                {error && <p className={styles.composerError}>{error}</p>}
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={closeComposer} disabled={submitting}>Cancel</button>
                  <button type="submit" className={styles.postBtn} disabled={submitDisabled}>{submitting ? 'Posting…' : 'Post'}</button>
                </div>
              </form>
            )}

            {/* ── CHECK-IN ── */}
            {mode === 'checkin' && (
              <form onSubmit={handleCheckinSubmit}>
                <p className={styles.fieldHint}>Search for the rink you're at right now.</p>
                <input className={styles.modalInput} type="text" placeholder="Search rinks…"
                  value={checkinQuery}
                  onChange={(e) => { setCheckinQuery(e.target.value); searchRinks(e.target.value); }}
                  autoFocus />
                {checkinSearching && <div className={styles.searching}>Searching…</div>}
                {checkinResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {checkinResults.map((rink) => (
                      <button type="button" key={rink.id}
                        className={`${styles.searchResult} ${checkinSelected?.id === rink.id ? styles.searchResultSelected : ''}`}
                        onClick={() => { setCheckinSelected(rink); setCheckinResults([]); }}>
                        <span className={styles.searchResultName}>{rink.name}</span>
                        <span className={styles.searchResultMeta}>{rink.city}{rink.state_province ? `, ${rink.state_province}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
                {checkinSelected && (
                  <div className={styles.selectedRink}>
                    <span>📍 {checkinSelected.name}</span>
                    <button type="button" className={styles.clearBtn} onClick={() => setCheckinSelected(null)}>✕</button>
                  </div>
                )}
                <input className={styles.modalInput} type="text" placeholder="Add a note (optional)"
                  value={checkinNote} onChange={(e) => setCheckinNote(e.target.value)} style={{ marginTop: '0.5rem' }} />
                {error && <p className={styles.composerError}>{error}</p>}
                {success && <p className={styles.successMsg}>{success}</p>}
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={goToMenu}>Back</button>
                  <button type="submit" className={styles.postBtn} disabled={!checkinSelected || submitting}>{submitting ? 'Checking in…' : 'Check In'}</button>
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
                    <button type="button" className={styles.imagePickerBtn} onClick={() => workoutFileRef.current?.click()}><span>📷</span><span>Add photo</span></button>
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
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={goToMenu}>Back</button>
                  <button type="submit" className={styles.postBtn} disabled={submitting}>{submitting ? 'Logging…' : 'Log Workout'}</button>
                </div>
              </form>
            )}

            {/* ── HIGHLIGHT ── */}
            {mode === 'highlight' && (
              <form onSubmit={handleHighlightSubmit}>
                <p className={styles.fieldHint}>Paste a YouTube or TikTok link to share it as your post.</p>
                <input className={styles.modalInput} type="url" placeholder="https://youtube.com/… or https://tiktok.com/…"
                  value={highlightUrl} onChange={(e) => {
                    setHighlightUrl(e.target.value);
                    setHighlightMeta(e.target.value.trim() ? parseHighlightUrl(e.target.value) : null);
                  }} autoFocus />
                {highlightMeta && (
                  <div className={styles.highlightPreview}>
                    <span className={styles.highlightPlatform}>
                      {highlightMeta.platform === 'youtube' ? '▶️ YouTube' : highlightMeta.platform === 'tiktok' ? '🎵 TikTok' : '🎬 Link'}
                    </span>
                    <span className={styles.highlightUrl}>{highlightMeta.url}</span>
                  </div>
                )}
                {error && <p className={styles.composerError}>{error}</p>}
                {success && <p className={styles.successMsg}>{success}</p>}
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={goToMenu}>Back</button>
                  <button type="submit" className={styles.postBtn} disabled={!highlightMeta || submitting}>{submitting ? 'Sharing…' : 'Share'}</button>
                </div>
              </form>
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
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={goToMenu}>Back</button>
                  <button type="submit" className={styles.postBtn} disabled={!rsvpSelected || submitting}>{submitting ? 'RSVPing…' : "I'm In"}</button>
                </div>
              </form>
            )}

            {/* ── FIND A GAME ── */}
            {mode === 'findgame' && (
              <form onSubmit={(e) => { e.preventDefault(); searchFindGame(findgameCity); }}>
                <p className={styles.fieldHint}>Find open hockey sessions or drop-in games near you.</p>
                <div className={styles.searchRow}>
                  <input className={styles.modalInput} type="text" placeholder="City or rink name…"
                    value={findgameCity} onChange={(e) => setFindgameCity(e.target.value)} autoFocus />
                  <button type="submit" className={styles.searchBtn} disabled={findgameLoading}>
                    {findgameLoading ? '…' : '🔍'}
                  </button>
                </div>
                {findgameLoading && <div className={styles.searching}>Searching…</div>}
                {findgameResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {findgameResults.map((rink) => (
                      <div key={rink.id} className={styles.searchResult}>
                        <div>
                          <div className={styles.searchResultName}>{rink.name}</div>
                          <div className={styles.searchResultMeta}>{rink.city}{rink.state_province ? `, ${rink.state_province}` : ''}</div>
                        </div>
                        <a href={`/directory/rinks/${rink.id}`} className={styles.rinkLink}>View →</a>
                      </div>
                    ))}
                  </div>
                )}
                {!findgameLoading && findgameResults.length === 0 && findgameCity && (
                  <p className={styles.fieldHint} style={{ marginTop: '0.75rem' }}>No rinks found for "{findgameCity}". Try a different city.</p>
                )}
                <div className={styles.modalActions} style={{ marginTop: '1rem' }}>
                  <button type="button" className={styles.cancelBtn} onClick={goToMenu}>Back</button>
                </div>
              </form>
            )}

            {/* ── LOG STATS ── */}
            {mode === 'stats' && (
              <form onSubmit={handleStatsSubmit}>
                <p className={styles.fieldHint}>Log tonight's stats. They'll post to your profile.</p>
                <div className={styles.statsGrid}>
                  <div className={styles.statBox}>
                    <button type="button" className={styles.statBtn} onClick={() => setStatGoals(g => Math.max(0, g - 1))}>−</button>
                    <div className={styles.statNum}>{statGoals}</div>
                    <div className={styles.statLabel}>Goals</div>
                    <button type="button" className={styles.statBtn} onClick={() => setStatGoals(g => g + 1)}>+</button>
                  </div>
                  <div className={styles.statBox}>
                    <button type="button" className={styles.statBtn} onClick={() => setStatAssists(a => Math.max(0, a - 1))}>−</button>
                    <div className={styles.statNum}>{statAssists}</div>
                    <div className={styles.statLabel}>Assists</div>
                    <button type="button" className={styles.statBtn} onClick={() => setStatAssists(a => a + 1)}>+</button>
                  </div>
                </div>
                {statGoals > 0 || statAssists > 0 ? (
                  <div className={styles.statsPreview}>
                    📊 Tonight: {statGoals > 0 ? `${statGoals}G` : ''}{statGoals > 0 && statAssists > 0 ? ' + ' : ''}{statAssists > 0 ? `${statAssists}A` : ''}
                  </div>
                ) : null}
                <textarea className={styles.composerTextarea} placeholder="How did the game go? (optional)"
                  value={statNotes} onChange={(e) => setStatNotes(e.target.value)} rows={2} style={{ marginTop: '0.75rem' }} />
                {error && <p className={styles.composerError}>{error}</p>}
                {success && <p className={styles.successMsg}>{success}</p>}
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={goToMenu}>Back</button>
                  <button type="submit" className={styles.postBtn} disabled={(statGoals === 0 && statAssists === 0) || submitting}>
                    {submitting ? 'Logging…' : 'Log Stats'}
                  </button>
                </div>
              </form>
            )}

            {/* ── FIND A TEAM / TRYOUT ── */}
            {mode === 'tryout' && (
              <form onSubmit={(e) => { e.preventDefault(); searchTryouts(tryoutQuery); }}>
                <p className={styles.fieldHint}>Search for teams with open roster spots or upcoming tryouts.</p>
                <div className={styles.searchRow}>
                  <input className={styles.modalInput} type="text" placeholder="City, league, or team name…"
                    value={tryoutQuery} onChange={(e) => setTryoutQuery(e.target.value)} autoFocus />
                  <button type="submit" className={styles.searchBtn} disabled={tryoutLoading}>
                    {tryoutLoading ? '…' : '🔍'}
                  </button>
                </div>
                {tryoutLoading && <div className={styles.searching}>Searching…</div>}
                {tryoutResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {tryoutResults.map((item, i) => (
                      <div key={i} className={styles.searchResult}>
                        <div>
                          <div className={styles.searchResultName}>{item.name}</div>
                          <div className={styles.searchResultMeta}>{item.type} · {item.location}</div>
                        </div>
                        {item.link
                          ? <a href={item.link} className={styles.rinkLink}>View →</a>
                          : <span className={styles.rinkLink} style={{ opacity: 0.5 }}>No page</span>}
                      </div>
                    ))}
                  </div>
                )}
                {!tryoutLoading && tryoutResults.length === 0 && tryoutQuery && (
                  <p className={styles.fieldHint} style={{ marginTop: '0.75rem' }}>No teams found for "{tryoutQuery}". Try a different search.</p>
                )}
                <div className={styles.modalActions} style={{ marginTop: '1rem' }}>
                  <button type="button" className={styles.cancelBtn} onClick={goToMenu}>Back</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
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
