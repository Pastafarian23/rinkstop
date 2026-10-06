'use client';

/**
 * Registers the service worker on mount. Idempotent — the browser
 * handles re-registration; we just call it once per page load.
 *
 * In development (localhost), registration is skipped to avoid
 * caching stale dev builds.
 */

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Periodic update check — every 30 min.
        setInterval(() => reg.update().catch(() => undefined), 30 * 60 * 1000);
      })
      .catch((err) => {
        console.warn('[scoresheet] service worker registration failed:', err);
      });
  }, []);

  return null;
}
