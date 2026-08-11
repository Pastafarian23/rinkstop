'use client';

import Link from 'next/link';

interface Props {
  href: string;
  testId: string;
  source: 'empty_state' | 'no_results';
  entityType: 'rink' | 'team' | 'player';
  query?: string;
  queryHash?: number | null;
  queryLength?: number;
  style: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Tiny client wrapper for the "Add a new listing" links on
 * /claim-your-listing. The previous in-page onClick handler was a
 * client-side function attached to a server-rendered Link, which caused
 * a 500 error after the hot-patch redirect was removed.
 *
 * This wrapper preserves the sendBeacon analytics (`add_listing_intent`)
 * while keeping the rest of the page as a server component.
 */
export default function AddListingLink({ href, testId, source, entityType, query, queryHash, queryLength, style, children }: Props) {
  const handleClick = () => {
    try {
      const payload = JSON.stringify({
        name: 'add_listing_intent',
        pathname: '/claim-your-listing',
        props: {
          entity_type: entityType,
          source,
          query_hash: queryHash ?? null,
          query_length: queryLength ?? 0,
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
      // never block on analytics
    }
  };

  return (
    <Link href={href} onClick={handleClick} data-testid={testId} style={style}>
      {children}
    </Link>
  );
}
