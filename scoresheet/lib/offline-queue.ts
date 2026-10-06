/**
 * scoresheet/lib/offline-queue.ts
 *
 * IndexedDB-backed offline event queue for the scorekeeper.
 *
 * When the user is offline (or the server is unreachable), event writes
 * (recordEvent, setClock, setPeriod, undoLast, finalize) get serialized
 * into this queue. A background flush runs on:
 *   - The 'online' window event (browser detects connectivity back)
 *   - A message from the service worker (background sync)
 *   - Every successful page load (online + on app focus)
 *
 * The queue is per-game. Each entry has the action name + the input
 * payload. The flush replays them in order via the same server actions
 * the page uses online.
 *
 * Schema:
 *   db: 'scoresheet-offline' (version 1)
 *   store: 'pending' (keyPath: 'id', autoIncrement: true)
 *   index: 'by-game' on gameId
 *
 * Why IndexedDB and not localStorage:
 *   - Survives browser restarts (we need this for offline)
 *   - Higher quota (most browsers give 50%+ of disk)
 *   - Async API (doesn't block the main thread)
 *
 * The queue is a write-only safety net; reads come from the server
 * (which is the source of truth). On a fresh page load, we re-fetch
 * the events from the server; the queue is the diff we still owe.
 */

export type QueuedAction =
  | { kind: 'recordEvent'; gameId: string; input: any }
  | { kind: 'setClock'; gameId: string; running: boolean }
  | { kind: 'setPeriod'; gameId: string; period: number }
  | { kind: 'undoLast'; gameId: string }
  | { kind: 'finalize'; gameId: string }
  | { kind: 'startGame'; gameId: string };

export type QueueEntry = QueuedAction & {
  id: number;
  enqueuedAt: number;
};

const DB_NAME = 'scoresheet-offline';
const DB_VERSION = 1;
const STORE = 'pending';
const GAME_INDEX = 'by-game';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex(GAME_INDEX, 'gameId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Add an action to the queue. Returns the assigned id. */
export async function enqueue(action: QueuedAction): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).add({ ...action, enqueuedAt: Date.now() });
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

/** Get all pending actions for a single game, in enqueue order. */
export async function listForGame(gameId: string): Promise<QueueEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index(GAME_INDEX);
    const req = idx.getAll(gameId);
    req.onsuccess = () => resolve((req.result as QueueEntry[]) || []);
    req.onerror = () => reject(req.error);
  });
}

/** Total pending count across all games. */
export async function totalPending(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

/** Get all pending entries across all games, grouped by game. */
export async function listAllGrouped(): Promise<Record<string, QueueEntry[]>> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const grouped: Record<string, QueueEntry[]> = {};
      for (const e of (req.result as QueueEntry[]) || []) {
        if (!grouped[e.gameId]) grouped[e.gameId] = [];
        grouped[e.gameId].push(e);
      }
      // Sort each by enqueue time so the replay order is stable.
      for (const list of Object.values(grouped)) list.sort((a, b) => a.enqueuedAt - b.enqueuedAt);
      resolve(grouped);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Remove a single entry by id (after a successful flush). */
export async function removeEntry(id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Wipe the entire queue. Use sparingly (e.g. on final confirm after flush). */
export async function clearAll(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
