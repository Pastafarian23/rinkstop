/**
 * Client-side analytics helper.
 *
 * Thin wrapper around POST /api/track for browser components. Uses
 * navigator.sendBeacon when available (so the event survives navigation),
 * falls back to fetch with keepalive.
 *
 * Why a client helper instead of importing trackEvent directly:
 * - src/lib/analytics.ts imports next/headers, supabaseAdmin (service role),
 *   and pulls env vars. None of that is safe to ship to the browser.
 * - Server events use trackEvent() directly (e.g. claim_started from the
 *   /api/claims route). Client events use this helper.
 *
 * Usage (client component):
 *   import { trackClient } from '@/lib/client-track';
 *   <button onClick={() => trackClient('claim_button_clicked', { listing_type: 'rink' })}>Claim it</button>
 *
 * The allowlist on the server side rejects unknown event names, so an
 * accidental wrong name returns 400 — silent fail, never a 500.
 */
'use client';

import { useEffect } from 'react';

/**
 * Track a client-side event. Safe to call from any browser handler.
 * Never throws. If /api/track is unreachable, the event is dropped
 * silently (we don't queue — Vercel Web Analytics / GA4 already cover
 * the universal case; this is for our custom funnel events).
 */
export function trackClient(
  name: string,
  props?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;
  const pathname = window.location.pathname;
  const referrer = document.referrer || undefined;
  const payload = JSON.stringify({
    name,
    pathname,
    referrer,
    props: props ?? null,
  });

  // Prefer sendBeacon (survives page unload). Fallback to fetch keepalive.
  if (navigator.sendBeacon) {
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const ok = navigator.sendBeacon('/api/track', blob);
      if (ok) return;
    } catch {
      // fall through to fetch
    }
  }
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * React hook: fire an event once on mount. Useful for page-view events
 * (tool_viewed, listing_viewed) where the act of navigating to the page
 * is the event itself.
 */
export function useTrackPageView(
  name: string,
  props?: Record<string, unknown>
): void {
  useEffect(() => {
    trackClient(name, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
