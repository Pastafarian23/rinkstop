'use client';

/**
 * PassportRefreshWrapper — client-side wrapper that listens for the
 * 'rinkstop:passport-updated' event and triggers a router.refresh().
 *
 * Mounted around the server-rendered PassportSections async server
 * component. When the user adds a record via the inline modal, the
 * modal dispatches the event, the wrapper hears it, and Next.js
 * re-renders the server tree (refetching the Supabase queries).
 *
 * Why a wrapper and not direct router.refresh() in the modal:
 *   - The modal lives in a separate subtree. Calling refresh from
 *     there would force a refresh of the whole route, including the
 *     nav and other heavy chrome. The wrapper keeps it scoped to the
 *     passport area.
 *   - Future: same event can trigger refresh in multiple places
 *     (dashboard counts, completeness badge, etc.) — single source.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PassportRefreshWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    function onPassportUpdated() {
      router.refresh();
    }
    window.addEventListener('rinkstop:passport-updated', onPassportUpdated);
    return () => window.removeEventListener('rinkstop:passport-updated', onPassportUpdated);
  }, [router]);

  return <>{children}</>;
}
