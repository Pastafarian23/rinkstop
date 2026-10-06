'use client';

/**
 * Sticky banner shown at the top when the browser is offline OR
 * the offline event queue has pending writes.
 *
 * - Offline: red bar "Offline — events will save when you reconnect"
 * - Online with queue depth: amber bar "X events syncing..."
 * - Online with empty queue: nothing (no render)
 *
 * On mount, registers 'online' / 'offline' window listeners and
 * triggers a queue flush for the current gameId when reconnecting.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { totalPending, listForGame } from '@/lib/offline-queue';
import { flushQueueForGame } from '@/lib/online-actions';

interface Props {
  gameId?: string;
}

export function OfflineIndicator({ gameId }: Props) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [queueDepth, setQueueDepth] = useState(0);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setOnline(navigator.onLine);

    const onOnline = async () => {
      setOnline(true);
      if (gameId) {
        const { flushed } = await flushQueueForGame(gameId);
        if (flushed > 0) router.refresh();
      }
      // Refresh the badge after a flush.
      const t = await totalPending();
      setQueueDepth(t);
    };
    const onOffline = () => setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Poll queue depth every 5s while the page is open. Cheap (single
    // IndexedDB read) and reliable across tabs.
    let mounted = true;
    const tick = async () => {
      if (!mounted) return;
      try {
        const total = await totalPending();
        setQueueDepth(total);
      } catch {
        // ignore
      }
    };
    tick();
    const id = setInterval(tick, 5000);

    // Listen for service-worker messages (background sync requests).
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'flush-queue' && gameId) {
        flushQueueForGame(gameId).then(() => router.refresh());
      }
    };
    navigator.serviceWorker?.addEventListener?.('message', onMessage);

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(id);
      navigator.serviceWorker?.removeEventListener?.('message', onMessage);
    };
  }, [gameId, router]);

  if (online && queueDepth === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 56,
        zIndex: 9,
        padding: '0.5rem 0.75rem',
        background: online ? 'rgba(255,184,28,0.15)' : 'rgba(200,16,46,0.2)',
        borderTop: online ? '1px solid rgba(255,184,28,0.3)' : '1px solid rgba(200,16,46,0.4)',
        borderBottom: online ? '1px solid rgba(255,184,28,0.3)' : '1px solid rgba(200,16,46,0.4)',
        color: online ? '#FFD66B' : '#FCA5A5',
        fontSize: '0.8125rem',
        fontWeight: 600,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
      }}
    >
      {!online && <span aria-hidden>📡</span>}
      {online && queueDepth > 0 && <span aria-hidden>⏳</span>}
      <span>
        {!online
          ? 'Offline — events will sync when you reconnect.'
          : `${queueDepth} pending event${queueDepth === 1 ? '' : 's'} syncing…`}
      </span>
    </div>
  );
}
