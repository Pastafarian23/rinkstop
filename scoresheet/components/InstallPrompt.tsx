'use client';

/**
 * PWA install prompt.
 *
 * Surfaces the browser's deferred install prompt as a dismissible
 * banner so users can add the scoresheet to their home screen.
 *
 * The beforeinstallprompt event fires on Chromium-based browsers
 * (Android Chrome, Edge, etc) when the PWA meets the install
 * criteria. We don't show the prompt proactively — only after the
 * user has had a chance to use the app (3+ seconds on page) and
 * has dismissed it at most once.
 *
 * On iOS Safari (no beforeinstallprompt support), we show a
 * different banner with manual instructions: "Tap Share → Add to
 * Home Screen".
 */

import { useEffect, useState } from 'react';

interface Props {
  /** Delay before the prompt appears, in ms. Default 3000. */
  delayMs?: number;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'rs-install-dismissed';
const DISMISS_DAYS = 14;

export function InstallPrompt({ delayMs = 3000 }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Skip if user dismissed recently.
    const last = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (Date.now() - last < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

    // iOS detection — show the manual-help banner instead.
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = (navigator as any).standalone === true;
    if (isIos && !isStandalone) {
      const t = setTimeout(() => setIosHelp(true), delayMs);
      return () => clearTimeout(t);
    }

    // Chrome/Edge: wait for beforeinstallprompt.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      const t = setTimeout(() => setVisible(true), delayMs);
      // Cleanup needs to clear the timeout if the component unmounts
      return () => clearTimeout(t);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  }, [delayMs]);

  function dismiss() {
    setVisible(false);
    setIosHelp(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore (private mode, etc)
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        // ignore
      }
    }
    setDeferred(null);
  }

  if (!visible && !iosHelp) return null;

  return (
    <div
      role="dialog"
      aria-label="Install RinkStop Scoresheet"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 480,
        margin: '0 auto',
        background: 'rgba(15,23,42,0.98)',
        border: '1px solid #FFB81C',
        borderRadius: 12,
        padding: '1rem',
        zIndex: 40,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div
          aria-hidden
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'radial-gradient(circle at 30% 30%, #FFD66B 0%, #FFB81C 60%, #B45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#041E42',
            fontWeight: 700,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          RS
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 0.25rem',
            }}
          >
            Install RinkStop Scoresheet
          </p>
          {visible && (
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.45,
                margin: '0 0 0.75rem',
              }}
            >
              Add to your home screen for one-tap access at the rink.
            </p>
          )}
          {iosHelp && (
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.45,
                margin: '0 0 0.75rem',
              }}
            >
              Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {visible && (
              <button
                type="button"
                onClick={install}
                className="rs-btn-primary"
                style={{ flex: 1, fontSize: '0.8125rem', padding: '0.5rem 0.75rem', minHeight: 36 }}
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rs-btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem', minHeight: 36 }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
