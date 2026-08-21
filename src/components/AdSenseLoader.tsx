'use client';

/**
 * AdSenseLoader — re-adds the AdSense publisher script, gated on user
 * consent. PR #145 (2026-08-21). Required for the AdSense resubmit
 * because PR #139 removed the script along with the rest of the ad
 * platform. Without it, no ad requests are made and the policy reviewer
 * can't see a live AdSense integration.
 *
 * Behavior:
 *   1. On mount, read `localStorage.cookie_consent`. If 'accepted'
 *      AND the server passed `enabled=true`, inject the publisher
 *      snippet (crossOrigin="anonymous") so the page can later call
 *      adsbygoogle.push().
 *   2. If the user has not yet decided, do not load. Listen for the
 *      ConsentBanner dispatch ("cookie_consent-change" window event)
 *      and the storage event so we react when they finally accept.
 *   3. If `enabled=false` (excluded route — privacy/terms/cookies/
 *      dashboard/admin/youth-hockey/guides-youth/about/contact/
 *      advertise/...), never load, even after consent. The excluded
 *      list is server-computed in src/app/layout.tsx (ADSENSE_*
 *      constants) and is the policy source of truth.
 *   4. If the script has already been added (window.adsbygoogle
 *      defined), no-op so we don't double-inject.
 *
 * Why we can't use next/script here:
 *   next/script runs at server render or hydration regardless of
 *   localStorage. AdSense policy requires that the script NOT load
 *   until the user has recorded an accept. A dynamic <script> tag
 *   after hydration is the only path that satisfies that contract.
 *
 * No personal data is read or sent by this component. The AdSense
 * client snippet sets its own cookies after consent.
 */

import { useEffect } from 'react';

const SCRIPT_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3703811522107586';
const STORAGE_KEY = 'cookie_consent';
const CONSENT_EVENT = 'cookie_consent-change';

function hasInjected(): boolean {
  return (window as any).adsbygoogle !== undefined;
}

function injectScript(): void {
  if (hasInjected()) return;
  const s = document.createElement('script');
  s.src = SCRIPT_SRC;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.setAttribute('data-ad-loader', 'first-party-consent');
  document.head.appendChild(s);
  (window as any).adsbygoogle = (window as any).adsbygoogle || [];
}

export default function AdSenseLoader({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled) return;

    const tryLoad = () => {
      try {
        const v = window.localStorage.getItem(STORAGE_KEY);
        if (v === 'accepted') injectScript();
      } catch {
        // localStorage blocked (private mode, quota) — no-op.
      }
    };

    // 1. Try immediately on mount (the user may have already accepted
    //    on a previous page; the banner only shows when consent is null).
    tryLoad();

    // 2. Listen for ConsentBanner's dispatch when the user accepts/declines
    //    on the current page (storage event only fires cross-tab).
    const onConsent = () => tryLoad();
    window.addEventListener(CONSENT_EVENT, onConsent);
    // 3. Cross-tab sync — accept in another tab should activate ads here.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) tryLoad();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(CONSENT_EVENT, onConsent);
      window.removeEventListener('storage', onStorage);
    };
  }, [enabled]);

  return null;
}