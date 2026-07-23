'use client';

import { useEffect, useRef } from 'react';

interface ClaimAbandonTrackerProps {
  queryHash: number | null;
  queryLength: number;
  resultCount: number;
  entityType: 'rink' | 'team' | 'player';
}

/**
 * Fires a `claim_search_abandoned` analytics event on pagehide if the user
 * typed a search query and left without clicking a claim button.
 *
 * Coordination with ClaimButton: the button writes a sessionStorage flag
 * `claim_btn_clicked_session`=1 before navigating. We check it on pagehide.
 * This avoids needing a shared React ref through multiple result cards.
 *
 * Why sendBeacon, not beforeunload: sendBeacon is fire-and-forget; browsers
 * cancel beforeunload listeners if the user navigates away quickly. We don't
 * want a slow Supabase roundtrip to block their nav.
 *
 * Idempotency: the ref guards against double-fire on visibility flips.
 */
export function ClaimAbandonTracker({
  queryHash,
  queryLength,
  resultCount,
  entityType,
}: ClaimAbandonTrackerProps): null {
  const firedRef = useRef(false);

  useEffect(() => {
    // Only consider abandonment if the user typed a query (>=2 chars).
    if (queryLength < 2 || typeof window === 'undefined') return;

    const fire = () => {
      if (firedRef.current) return;
      // If the user clicked "Claim & Verify" before navigating, skip.
      try {
        if (window.sessionStorage.getItem('claim_btn_clicked_session') === '1') {
          return;
        }
      } catch {
        // sessionStorage may be blocked — treat as no click
      }
      firedRef.current = true;
      try {
        const payload = JSON.stringify({
          name: 'claim_search_abandoned',
          pathname: '/claim-your-listing',
          props: {
            query_hash: queryHash,
            query_length: queryLength,
            result_count: resultCount,
            entity_type: entityType,
            had_results: resultCount > 0,
          },
        });
        const blob = new Blob([payload], { type: 'application/json' });
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon('/api/track', blob);
        } else {
          fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // never block teardown on analytics failure
      }
    };

    // Use pagehide (fired on bfcache, navigation, close) instead of beforeunload.
    // visibilitychange alone misses tab-close on mobile in some browsers.
    window.addEventListener('pagehide', fire);
    return () => {
      window.removeEventListener('pagehide', fire);
    };
  }, [queryHash, queryLength, resultCount, entityType]);

  return null;
}
