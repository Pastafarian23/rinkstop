'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

/**
 * Tier-aware CTA for the home page hero.
 *
 * The home page is statically rendered (ISR, 5 min revalidate), so the
 * "Join Now" button used to be baked into the HTML for every visitor —
 * including signed-in premium users. That's wrong: premium users should
 * see "Go to Dashboard" instead.
 *
 * Strategy: render the static fallback (Explore Directory + Join Now) on
 * the server, then upgrade the right-hand button on the client once we
 * know the user is signed in. This keeps the page statically cacheable
 * (no forced dynamic rendering) while making the CTA correct.
 *
 * Three states:
 *  - Anonymous (or unknown): "Join Now" → /sign-up
 *  - Free user:              "Join Now" → /sign-up (works as upgrade hook)
 *  - Paid / founding:        "Go to Dashboard" → /dashboard
 */
export default function HomeCtaButtons() {
  const { isLoaded, isSignedIn } = useUser();
  const [tier, setTier] = useState<string>('free');
  const [tierLoaded, setTierLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setTierLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profiles/me', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setTierLoaded(true);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setTier(data.profile?.tier || 'free');
      } catch {
        // Silent — fall through to free behavior
      } finally {
        if (!cancelled) setTierLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  const isPaid = tierLoaded && isSignedIn && tier && tier !== 'free';
  const ctaLabel = isPaid ? 'Go to Dashboard' : 'Join Now';
  const ctaHref = isPaid ? '/dashboard' : '/sign-up';
  const ctaClass = isPaid ? 'btn btn-red' : 'btn btn-yellow';

  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <Link href="/directory" className="btn btn-red">Explore Directory</Link>
      <Link href={ctaHref} className={ctaClass}>{ctaLabel}</Link>
    </div>
  );
}
