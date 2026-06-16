'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Lightweight sign-out button. Replaces Clerk's <UserButton> in the dashboard
 * header. We hit it in commit 14d029b because <UserButton> was throwing during
 * server-side render of the dashboard layout — the throw happened *after* the
 * layout's try/catch returned, so it bubbled up to the route's error.tsx and
 * produced the "Application error: 1026421780" page.
 *
 * Why this works:
 * - This is a Client Component, so it never runs on the server (no SSR throw)
 * - useClerk() is the same hook <UserButton> uses internally; we call its
 *   signOut() method directly
 * - On click, it signs the user out of Clerk, then we navigate to /
 * - No avatar/dropdown UI, no "manage account" link — keep it minimal
 */
export default function SignOutButton({
  initials,
  size = 36,
}: {
  initials: string;
  size?: number;
}) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        try {
          await signOut({ redirectUrl: '/' });
          router.push('/');
          router.refresh();
        } catch (e) {
          // Fall back to a hard redirect if Clerk's signOut throws
          window.location.href = '/';
        }
      }}
      title={busy ? 'Signing out…' : 'Sign out'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: busy ? 'rgba(200,16,46,0.6)' : '#C8102E',
        color: '#fff',
        border: '2px solid #C8102E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 700,
        cursor: busy ? 'wait' : 'pointer',
        padding: 0,
        fontFamily: 'inherit',
        transition: 'background 120ms ease, transform 120ms ease',
      }}
      onMouseEnter={(e) => {
        if (!busy) e.currentTarget.style.background = '#a30d24';
      }}
      onMouseLeave={(e) => {
        if (!busy) e.currentTarget.style.background = '#C8102E';
      }}
    >
      {busy ? '…' : (initials || '?').toUpperCase()}
    </button>
  );
}
