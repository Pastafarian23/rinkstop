'use client';

/**
 * ConsentBanner — first-party cookie consent UI for AdSense / EEA / UK / CH.
 *
 * AdSense policy requires that any ad network the publisher uses gates ad
 * requests on user consent in EEA / UK / Switzerland. The privacy policy
 * text on disk (src/app/privacy/page.tsx + src/app/cookies/page.tsx)
 * describes a first-party banner that records the user's choice to
 * `localStorage.cookie_consent` and re-prompts when the stored choice
 * has expired. The actual code for that banner was removed in commit
 * 28ede9ee along with the rest of the ad components. This file restores
 * it as a first-party banner so the policy text on disk has matching
 * live UI.
 *
 * Source of truth for consent choice: `localStorage.cookie_consent`. Valid
 * values are `"accepted"`, `"declined"`, or absent (re-prompt). The
 * previous WS16 PR3 Funding Choices CMP also used this key, so the
 * persistence path is identical to what the deleted components wrote.
 *
 * No Google Funding Choices / Privacy & Messaging API is loaded. The
 * first-party banner is sufficient for the AdSense policy requirement,
 * and Funding Choices has been paused for new publishers by Google as
 * of 2024.
 *
 * Surface rules:
 *  - First-render: read `localStorage.cookie_consent`. If absent, show.
 *  - Accept: write `"accepted"`, dismiss.
 *  - Decline: write `"declined"`, dismiss.
 *  - Footer link on /privacy and /cookies re-prompts by clearing the key.
 *
 * Non-Adsense behavior: do not load any ad script until consent is
 * "accepted". The downstream AdSense script loader (when re-added)
 * must read this same key and gate requests.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ConsentValue = 'accepted' | 'declined';
const STORAGE_KEY = 'cookie_consent';

function readConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'declined') return v;
    return null;
  } catch {
    // localStorage blocked (private mode, quota, etc.). Treat as
    // un-prompted so the user can still see the banner.
    return null;
  }
}

function writeConsent(v: ConsentValue): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // ignore — user can re-decide later
  }
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer to next tick so SSR doesn't try to read localStorage during
    // hydration; only show on the client where we can read the stored
    // choice. If the user has already decided, hidden by default.
    const t = window.setTimeout(() => {
      setVisible(readConsent() === null);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      data-testid="consent-banner"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 1000,
        background: 'rgba(4,30,66,0.96)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        padding: '16px 20px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <strong style={{ display: 'block', marginBottom: 4, fontSize: 15 }}>
          We use cookies
        </strong>
        <span style={{ color: 'rgba(255,255,255,0.78)' }}>
          RinkStop uses cookies and similar technologies to operate the site, measure
          traffic, and (with your consent) display personalized advertising from Google
          AdSense. Choose Accept to enable personalized ads, or Decline to keep ads
          non-personalized. You can change your choice anytime in our{' '}
          <Link href="/cookies" style={{ color: '#FFB81C', textDecoration: 'underline' }}>
            Cookie Policy
          </Link>
          .
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => {
            writeConsent('declined');
            setVisible(false);
          }}
          style={{
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => {
            writeConsent('accepted');
            setVisible(false);
          }}
          style={{
            background: '#C8102E',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
