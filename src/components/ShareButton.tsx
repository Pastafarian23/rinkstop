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
   * matches the SocialActions dark toolbar (used inside detail pages).
   * 'brand' matches the RinkStop navy/gold site branding (used on
   * public-facing pages like /profile/[slug]). */
  variant?: 'light' | 'dark' | 'brand';
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
export default function ShareButton({ payload, compact = false, variant = 'light' }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasWebShare, setHasWebShare] = useState<boolean>(false);
  const [hovered, setHovered] = useState(false);
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
        // Track the native share attempt. The actual platform is hidden by
        // the OS, so we log it as 'native' to distinguish from desktop popover clicks.
        try {
          void fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'outbound_share_clicked',
              props: { platform: 'native', url: payload.url },
            }),
            keepalive: true,
          });
        } catch {
          // silent
        }
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
    // Best-effort analytics. Never blocks the share. The 'outbound_share_clicked'
    // event is allowlisted in /api/track so a 400 from a stale deploy doesn't
    // prevent the share.
    try {
      void fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'outbound_share_clicked',
          props: { platform: p, url: payload.url },
        }),
        keepalive: true,
      });
    } catch {
      // silent
    }
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
    <div ref={popoverRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={handlePrimary}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={shareButtonStyle(variant, compact, hovered)}
        aria-label="Share this page"
        aria-haspopup={!hasWebShare}
        aria-expanded={open}
        data-testid="share-button"
      >
        <ShareIcon />
        <span>Share</span>
      </button>

      {open && !hasWebShare && (
        <div
          role="menu"
          style={sharePopoverStyle(variant)}
          data-testid="share-popover"
        >
          <ul style={{ padding: '0.25rem 0', margin: 0, listStyle: 'none' }}>
            {DESKTOP_PLATFORMS.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handlePlatform(p)}
                  style={popoverItemStyle(variant)}
                  data-testid={`share-option-${p}`}
                >
                  <PlatformIcon platform={p} />
                  <span style={{ flex: 1 }}>
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

function ShareIcon() {
  // Inline styles only — the Tailwind v4 pipeline in this project is
  // currently broken (globals.css uses v3 syntax `@tailwind` directives
  // but the installed package is @tailwindcss v4.3.0, which doesn't
  // process those directives). All component-level styling must use
  // inline styles until globals.css is migrated to v4 syntax.
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function PlatformIcon({ platform }: { platform: SharePlatform }) {
  // Lightweight inline icons. Single-color, currentColor — matches the
  // menu row's text color. Keep them simple; brand-accurate logos are not
  // necessary in a popover list and add bytes.
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true as const, style: { flexShrink: 0 } };
  switch (platform) {
    case 'twitter':
      return (
        <svg {...common} fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...common} fill="currentColor">
          <path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396v8.01Z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...common} fill="currentColor">
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg {...common} fill="currentColor">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
        </svg>
      );
    case 'reddit':
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.74a1.41 1.41 0 0 1 1.39 1.42 1.41 1.41 0 0 1-1.39 1.41 1.41 1.41 0 0 1-1.4-1.41 1.41 1.41 0 0 1 1.4-1.42zM12 5.07c2.85 0 5.31 1.46 6.61 3.57.61-.07 1.21.15 1.65.6.66.66.79 1.65.4 2.46-.13.27-.32.51-.55.7-.02.31-.06.62-.13.93-.65 3.06-3.71 5.36-7.55 5.36-3.84 0-6.9-2.3-7.55-5.36-.07-.31-.11-.62-.13-.93a2.18 2.18 0 0 1-.55-.7 2.05 2.05 0 0 1 .4-2.46c.44-.45 1.04-.67 1.65-.6C6.69 6.53 9.15 5.07 12 5.07zm-5.05 7.3a1.27 1.27 0 1 0 0 2.54 1.27 1.27 0 0 0 0-2.54zm10.1 0a1.27 1.27 0 1 0 0 2.54 1.27 1.27 0 0 0 0-2.54zm-6.13 1.07c-.36 0-.65.32-.65.71 0 .81.81 1.45 1.83 1.45 1.02 0 1.83-.64 1.83-1.45 0-.39-.29-.71-.65-.71-.16 0-.31.06-.43.16-.27.27-.65.43-1.04.43a1.4 1.4 0 0 1-1.04-.43.59.59 0 0 0-.43-.16z" />
        </svg>
      );
    case 'email':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case 'copy':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
  }
}

// ---------- style helpers ----------
//
// IMPORTANT: These return inline style objects, not Tailwind class strings.
// The project's Tailwind v4 install doesn't process the v3-syntax
// `@tailwind base/components/utilities` directives in globals.css, so
// utility classes aren't being generated. Component-level styling must
// use inline styles until globals.css is migrated to v4 syntax.
//
// See: project notes / memory — Tailwind v4 pipeline tracked separately.

function shareButtonStyle(variant: 'light' | 'dark' | 'brand', compact: boolean, hovered: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: compact ? 6 : 8,
    whiteSpace: 'nowrap',
    borderRadius: 6,
    border: '1px solid',
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.2,
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    padding: compact ? '0.4rem 0.75rem' : '0.6rem 1rem',
    textDecoration: 'none',
    fontFamily: 'inherit',
  };
  if (variant === 'brand') {
    return {
      ...base,
      background: hovered ? '#113C8C' : '#0A2A5E',
      borderColor: hovered ? 'rgba(255, 184, 28, 0.7)' : 'rgba(255, 184, 28, 0.4)',
      color: '#fff',
    };
  }
  if (variant === 'dark') {
    return {
      ...base,
      background: hovered ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
      borderColor: 'rgba(255, 255, 255, 0.15)',
      color: '#CBD5E1', // slate-300
    };
  }
  // 'light' default
  return {
    ...base,
    background: hovered ? '#f8fafc' : '#fff',
    borderColor: '#cbd5e1', // slate-300
    color: '#334155', // slate-700
  };
}

function sharePopoverStyle(variant: 'light' | 'dark' | 'brand'): React.CSSProperties {
  return {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 0.5rem)',
    zIndex: 50,
    width: 224, // 14rem = w-56
    background: '#fff',
    border: '1px solid ' + (variant === 'brand' ? 'rgba(255, 184, 28, 0.3)' : '#e2e8f0'),
    borderRadius: 6,
    boxShadow: variant === 'brand'
      ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
      : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    transformOrigin: 'top right',
  };
}

function popoverItemStyle(variant: 'light' | 'dark' | 'brand'): React.CSSProperties {
  return {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: 8,
    padding: '0.5rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    color: variant === 'brand' ? '#041E42' : '#334155',
    fontFamily: 'inherit',
  };
}
