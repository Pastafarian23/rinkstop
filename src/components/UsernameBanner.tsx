'use client';

import { useState, useEffect } from 'react';
import UsernamePromptModal from './UsernamePromptModal';

interface Props {
  displayName: string;
  /**
   * Optional callback fired after the user successfully sets a username.
   * Server components cannot pass functions to client components, so this
   * is only callable when the parent is also a client component, OR when
   * the parent uses a server action pattern.
   *
   * Omit it when rendering from a Server Component — the page just
   * re-renders on its own after the modal sets the cookie.
   */
  onComplete?: () => void;
}

const DISMISS_KEY = 'rs.usernameBanner.dismissedAt';
const DISMISS_DAYS = 7;

/**
 * Branded inline card prompting the user to set a username.
 *
 * Design notes (Arnel 2026-06-16):
 * - Was previously a yellow Tailwind utility soup banner that clashed
 *   with the navy/red/ice brand palette. This card uses #041E42 navy
 *   with a red accent stripe, matching the dashboard header.
 * - Dismissible for 7 days (per-session). Stored in localStorage so the
 *   banner doesn't keep nagging the user.
 * - On username save, the modal calls window.location.reload() so the
 *   server-rendered parent re-fetches the profile and the banner
 *   disappears naturally.
 */
export default function UsernameBanner({ displayName, onComplete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const ts = parseInt(raw, 10);
        if (Number.isFinite(ts)) {
          const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
          if (ageDays < DISMISS_DAYS) setDismissed(true);
        }
      }
    } catch {
      // localStorage unavailable (e.g. private mode) — just show the banner
    }
  }, []);

  if (dismissed && !showModal) return null;

  function handleDismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <>
      <div
        data-testid="username-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: '#041E42',
          border: '1px solid rgba(200,16,46,0.35)',
          borderLeft: '4px solid #C8102E',
          borderRadius: 10,
          padding: '1rem 1.25rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(200,16,46,0.15)',
            border: '1px solid rgba(200,16,46,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            flexShrink: 0,
          }}
        >
          🏒
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.05rem',
              letterSpacing: '0.04em',
              color: '#fff',
              margin: 0,
            }}
          >
            CLAIM YOUR USERNAME
          </p>
          <p
            style={{
              color: 'rgba(238,245,255,0.7)',
              fontSize: '0.85rem',
              margin: '0.125rem 0 0',
              lineHeight: 1.4,
            }}
          >
            Get a shareable profile link like&nbsp;
            <span style={{ color: '#FFB81C', fontWeight: 600 }}>
              rinkstop.com/profile/you
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          data-testid="username-banner-cta"
          style={{
            background: '#C8102E',
            color: '#fff',
            border: '1px solid #C8102E',
            borderRadius: 6,
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          Set username
        </button>
        {mounted ? (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss for now"
            title="Dismiss for 7 days"
            style={{
              background: 'transparent',
              color: 'rgba(238,245,255,0.4)',
              border: 'none',
              fontSize: '1.2rem',
              lineHeight: 1,
              cursor: 'pointer',
              padding: '0 0.25rem',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      {showModal ? (
        <UsernamePromptModal
          displayName={displayName}
          onComplete={() => {
            setShowModal(false);
            onComplete?.();
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
          onSkip={() => setShowModal(false)}
        />
      ) : null}
    </>
  );
}
