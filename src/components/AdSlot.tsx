'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdsbygoogleQueue } from '@/lib/adsense';
import { ADSENSE_PUBLISHER_ID } from '@/lib/adsense';

/**
 * AdSlot — wraps a single Google AdSense ad unit.
 *
 * Behavior:
 * - Renders nothing if the publisher ID is empty (legacy env-var path —
 *   no longer used since commit 1ba8093b hardcoded the snippet in <head>).
 * - Renders nothing if the slot ID prop is empty (placeholder mode —
 *   pre-approval we ship the code so Google can verify placement,
 *   but no ad fills until real slot IDs are set in src/lib/adsense.ts).
 * - Renders nothing until the user has accepted cookies. We poll
 *   localStorage.cookie_consent and also listen for the
 *   'rinkstop:consent-changed' window event so the CMP in WS16 PR3
 *   can broadcast updates.
 * - Defers the actual ad request with IntersectionObserver so ads
 *   below the fold don't slow down initial paint.
 * - Uses strategy="lazyLoad" via next/script semantics (we hand-roll
 *   it because we need consent gating before the script can run).
 *
 * Slot types: 'display' (default), 'in-article', 'in-feed'.
 * Each has its own responsive shape and a unique ad slot ID slot-* prop.
 */

const CONSENT_KEY = 'cookie_consent';
const CONSENT_EVENT = 'rinkstop:consent-changed';

export type AdSlotType = 'display' | 'in-article' | 'in-feed';

interface AdSlotProps {
  slot: string; // AdSense ad unit ID, e.g. "1234567890". Empty string = placeholder.
  type?: AdSlotType;
  layout?: string; // for in-feed: layout-key
  className?: string;
  style?: React.CSSProperties;
  /** Min height for the slot container (helps avoid layout shift before fill). */
  minHeight?: number;
}

function readConsent(): 'accepted' | 'declined' | 'unset' {
  if (typeof window === 'undefined') return 'unset';
  const v = window.localStorage.getItem(CONSENT_KEY);
  if (v === 'accepted') return 'accepted';
  if (v === 'declined') return 'declined';
  return 'unset';
}

export default function AdSlot({
  slot,
  type = 'display',
  layout,
  className,
  style,
  minHeight = 90,
}: AdSlotProps) {
  const publisherId = ADSENSE_PUBLISHER_ID;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [consent, setConsent] = useState<'accepted' | 'declined' | 'unset'>('unset');
  const [visible, setVisible] = useState(false);
  const [pushed, setPushed] = useState(false);

  // Watch consent state (initial + event-driven).
  useEffect(() => {
    setConsent(readConsent());
    const handler = () => setConsent(readConsent());
    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, []);

  // Lazy-load: only request the ad when the slot enters the viewport.
  useEffect(() => {
    if (!containerRef.current || visible || consent !== 'accepted') return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px' }
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [consent, visible]);

  // Once visible + consented, push the ad.
  useEffect(() => {
    if (!visible || pushed || consent !== 'accepted' || !publisherId) return;
    try {
      const queue = (window.adsbygoogle = window.adsbygoogle || []) as AdsbygoogleQueue;
      queue.push({});
      setPushed(true);
    } catch (err) {
      // Don't crash the page if AdSense throws (e.g. blocked script).
      console.warn('[AdSlot] push failed', err);
    }
  }, [visible, pushed, consent, publisherId]);

  if (!publisherId) return null; // No env var → silently no-op (dev / pre-launch)
  if (!slot) return null; // Empty slot ID = placeholder mode, no-op
  if (consent !== 'accepted') return null; // Not consented → render nothing

  // AdSense wants the <ins> rendered first, then a push() call to fill it.
  // We render the <ins> regardless of pushed state so the script can target it.
  const adStyle: React.CSSProperties = {
    display: 'block',
    minHeight,
    ...style,
  };

  const dataAdClient = publisherId;
  const dataAdSlot = slot;

  if (type === 'in-article') {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ margin: '1.5rem auto', maxWidth: '728px', ...adStyle }}
      >
        <ins
          className="adsbygoogle"
          style={adStyle}
          data-ad-client={dataAdClient}
          data-ad-slot={dataAdSlot}
          data-ad-layout="in-article"
          data-ad-format="fluid"
        />
      </div>
    );
  }

  if (type === 'in-feed') {
    return (
      <div ref={containerRef} className={className} style={adStyle}>
        <ins
          className="adsbygoogle"
          style={adStyle}
          data-ad-client={dataAdClient}
          data-ad-slot={dataAdSlot}
          data-ad-format="fluid"
          data-ad-layout-key={layout}
        />
      </div>
    );
  }

  // Default: display
  return (
    <div
      ref={containerRef}
      className={className}
      style={{ margin: '1.5rem 0', textAlign: 'center', ...adStyle }}
    >
      <ins
        className="adsbygoogle"
        style={adStyle}
        data-ad-client={dataAdClient}
        data-ad-slot={dataAdSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}