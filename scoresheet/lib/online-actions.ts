/**
 * scoresheet/lib/online-actions.ts
 *
 * Wraps the server actions in app/actions/gameplay.ts so that when the
 * browser is offline, calls are queued in IndexedDB instead of failing.
 *
 * Each wrapper:
 *   1. Checks navigator.onLine.
 *   2. If online: calls the server action directly. On success, returns
 *      the result. On network error: falls back to the offline queue.
 *   3. If offline: enqueues the action and returns a synthetic success
 *      so the UI updates optimistically.
 *
 * The queue is flushed by flushQueueForGame() (called from the page on
 * 'online' events and on focus). Each replayed action is removed from
 * the queue on success.
 */

import * as actions from '@/app/actions/gameplay';
import {
  enqueue,
  listForGame,
  removeEntry,
  type QueuedAction,
} from './offline-queue';

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as any)?.message || err);
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Network request failed')
  );
}

async function callOrQueue<T extends ActionResult<any>>(
  action: QueuedAction,
  onlineCall: () => Promise<T>
): Promise<T | { ok: true; queued: true }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueue(action);
    return { ok: true, queued: true } as any;
  }
  try {
    return await onlineCall();
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueue(action);
      return { ok: true, queued: true } as any;
    }
    throw err;
  }
}

// ─── Wrapped actions ────────────────────────────────────────────────

export function startGame(gameId: string) {
  return callOrQueue({ kind: 'startGame', gameId }, () => actions.startGameAction(gameId));
}

export function setClock(gameId: string, running: boolean) {
  return callOrQueue({ kind: 'setClock', gameId, running }, () =>
    actions.setClockAction(gameId, running)
  );
}

export function setPeriod(gameId: string, period: number) {
  return callOrQueue({ kind: 'setPeriod', gameId, period }, () =>
    actions.setPeriodAction(gameId, period)
  );
}

export function recordEvent(gameId: string, input: any) {
  return callOrQueue({ kind: 'recordEvent', gameId, input }, () =>
    actions.recordEventAction(gameId, input)
  );
}

export function undoLastEvent(gameId: string) {
  return callOrQueue({ kind: 'undoLast', gameId }, () => actions.undoLastEventAction(gameId));
}

export function finalizeGame(gameId: string) {
  return callOrQueue({ kind: 'finalize', gameId }, () => actions.finalizeGameAction(gameId));
}

// ─── Queue flush ────────────────────────────────────────────────────

/**
 * Replay all queued actions for a single game, in enqueue order.
 * Each action is removed from the queue on success. If an action
 * fails (non-network error), the flush stops so we don't lose order.
 */
export async function flushQueueForGame(gameId: string): Promise<{ flushed: number; failed: number }> {
  const queue = await listForGame(gameId);
  let flushed = 0;
  let failed = 0;
  for (const entry of queue) {
    let r: ActionResult | undefined;
    try {
      switch (entry.kind) {
        case 'startGame':
          r = await actions.startGameAction(entry.gameId);
          break;
        case 'setClock':
          r = await actions.setClockAction(entry.gameId, entry.running);
          break;
        case 'setPeriod':
          r = await actions.setPeriodAction(entry.gameId, entry.period);
          break;
        case 'recordEvent':
          r = await actions.recordEventAction(entry.gameId, entry.input);
          break;
        case 'undoLast':
          r = await actions.undoLastEventAction(entry.gameId);
          break;
        case 'finalize':
          r = await actions.finalizeGameAction(entry.gameId);
          break;
      }
      if (r && r.ok) {
        await removeEntry(entry.id);
        flushed++;
      } else {
        failed++;
        break; // preserve order
      }
    } catch (err) {
      if (isNetworkError(err)) {
        // Lost connectivity mid-flush. Try again later.
        break;
      }
      // Server rejected (game already finalized, ownership changed, etc).
      // Drop the entry — keeping it would block subsequent flushes.
      await removeEntry(entry.id);
      failed++;
    }
  }
  return { flushed, failed };
}
