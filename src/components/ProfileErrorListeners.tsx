'use client';

/**
 * ProfileErrorListeners — client-only wrapper that attaches the
 * window-level error / unhandledrejection listeners for the profile
 * page. Kept in its own file so page.tsx (a server component) never
 * references `window` directly.
 */

import { useEffect } from 'react';

export default function ProfileErrorListeners(): null => {
  useEffect(() => {
    function onError(ev: ErrorEvent) {
      const info = {
        message: ev.message,
        filename: (ev as any).filename ?? null,
        lineno: (ev as any).lineno ?? null,
        colno: (ev as any).colno ?? null,
        stack: (ev as any).error?.stack ?? null,
      };
      fetch('/api/log/profile-page-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
        keepalive: true,
      }).catch(() => { /* noop */ });
    }

    function onUnhandledRejection(ev: PromiseRejectionEvent) {
      const reason = ev.reason instanceof Error
        ? { message: ev.reason.message, stack: ev.reason.stack }
        : { value: ev.reason };
      fetch('/api/log/profile-page-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unhandledRejection: reason }),
        keepalive: true,
      }).catch(() => { /* noop */ });
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
