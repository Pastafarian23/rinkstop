'use client';

import { useEffect, useRef, useState } from 'react';
import {
  buildIntentUrl,
  DESKTOP_PLATFORMS,
  PLATFORM_LABELS,
  SharePayload,
  SharePlatform,
} from '@/lib/share';

interface ShareButtonProps {
  payload: SharePayload;
  /** When true, render as a compact icon-only button (for toolbars). */
  compact?: boolean;
  /** Visual variant. 'light' (default) is the standard white button. 'dark'
   * matches the SocialActions dark toolbar (used inside detail pages). */
  variant?: 'light' | 'dark';
  /** Optional className passthrough. */
  className?: string;
}

/**
 * Renders a single "Share" button that:
 *  - On mobile (or any device with `navigator.share`): opens the native
 *    share sheet on tap.
 *  - On desktop (no Web Share API): opens a small popover with one-tap
 *    links to X, Facebook, LinkedIn, WhatsApp, Reddit, Email, Copy link.
 *
 * Public users get the same experience — no auth required.
 */
export default function ShareButton({ payload, compact = false, variant = 'light', className = '' }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasWebShare, setHasWebShare] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Detect Web Share API support on mount (client-only).
  useEffect(() => {
    setHasWebShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  // Close popover on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  async function handlePrimary() {
    if (hasWebShare) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
        return;
      } catch (err) {
        // User cancelled or browser blocked — fall through to popover.
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    setOpen((v) => !v);
  }

  function handlePlatform(p: SharePlatform) {
    if (p === 'copy') {
      void copyToClipboard();
      return;
    }
    const url = buildIntentUrl(p, payload);
    // Open in a new tab for everything except mailto (which opens the OS mail client).
    if (p === 'email') {
      window.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    setOpen(false);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(payload.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for older browsers: select-and-copy via a temp textarea.
      const ta = document.createElement('textarea');
      ta.value = payload.url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        // give up silently
      }
      document.body.removeChild(ta);
    }
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={handlePrimary}
        className={
          (compact
            ? variant === 'dark'
              ? 'inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/10'
              : 'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'
            : variant === 'dark'
              ? 'inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10'
              : 'inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50') +
          ' ' +
          className
        }
        aria-label="Share this page"
        aria-haspopup={!hasWebShare}
        aria-expanded={open}
        data-testid="share-button"
      >
        <ShareIcon className="h-4 w-4" />
        <span>{compact ? 'Share' : 'Share'}</span>
      </button>

      {open && !hasWebShare && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md border border-slate-200 bg-white shadow-lg"
          data-testid="share-popover"
        >
          <ul className="py-1">
            {DESKTOP_PLATFORMS.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handlePlatform(p)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  data-testid={`share-option-${p}`}
                >
                  <PlatformIcon platform={p} className="h-4 w-4 text-slate-500" />
                  <span className="flex-1">
                    {p === 'copy' && copied ? 'Copied!' : PLATFORM_LABELS[p]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ShareIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function PlatformIcon({ platform, className = '' }: { platform: SharePlatform; className?: string }) {
  // Lightweight inline icons. Single-color, currentColor — matches the
  // menu row's text color. Keep them simple; brand-accurate logos are not
  // necessary in a popover list and add bytes.
  switch (platform) {
    case 'twitter':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396v8.01Z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
        </svg>
      );
    case 'reddit':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.74a1.41 1.41 0 0 1 1.39 1.42 1.41 1.41 0 0 1-1.39 1.41 1.41 1.41 0 0 1-1.4-1.41 1.41 1.41 0 0 1 1.4-1.42zM12 5.07c2.85 0 5.31 1.46 6.61 3.57.61-.07 1.21.15 1.65.6.66.66.79 1.65.4 2.46-.13.27-.32.51-.55.7-.02.31-.06.62-.13.93-.65 3.06-3.71 5.36-7.55 5.36-3.84 0-6.9-2.3-7.55-5.36-.07-.31-.11-.62-.13-.93a2.18 2.18 0 0 1-.55-.7 2.05 2.05 0 0 1 .4-2.46c.44-.45 1.04-.67 1.65-.6C6.69 6.53 9.15 5.07 12 5.07zm-5.05 7.3a1.27 1.27 0 1 0 0 2.54 1.27 1.27 0 0 0 0-2.54zm10.1 0a1.27 1.27 0 1 0 0 2.54 1.27 1.27 0 0 0 0-2.54zm-6.13 1.07c-.36 0-.65.32-.65.71 0 .81.81 1.45 1.83 1.45 1.02 0 1.83-.64 1.83-1.45 0-.39-.29-.71-.65-.71-.16 0-.31.06-.43.16-.27.27-.65.43-1.04.43a1.4 1.4 0 0 1-1.04-.43.59.59 0 0 0-.43-.16z" />
        </svg>
      );
    case 'email':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case 'copy':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
  }
}
