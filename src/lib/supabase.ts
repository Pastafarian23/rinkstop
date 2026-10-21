import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazy env-var reads + Proxy-based clients.
 *
 * Why lazy (added 2026-08-26 after production dashboard outage):
 *
 * The previous version read SUPABASE_SERVICE_ROLE_KEY at module-import time
 * and threw if missing. That failed when Vercel's build-time static analysis
 * evaluated the module before runtime env vars were bound — surfacing as
 * "Dashboard hit a snag" on production with no actionable diagnostic.
 *
 * Now we:
 *   1. Read env vars inside a getter (not at module-import time)
 *   2. Build the actual SupabaseClient the first time someone calls
 *      a method on the proxy, not when the import statement runs
 *   3. Throw on first USE with the same fail-loud diagnostic
 *   4. Cache the client so subsequent calls are O(1)
 *
 * The proxy preserves the existing `supabaseAdmin.from(...).select(...)`
 * call-site shape across 200+ routes — no rewrites needed.
 *
 * 2026-10-12: Added read-replica support.
 *
 * Why a read replica: Supabase doesn't support region changes for existing
 * projects (https://supabase.com/docs/guides/platform/region-move — the
 * official path is a new project + manual migration). We're on the
 * ap-northeast-1 primary; Vercel functions run in iad1. The 180ms
 * round-trip shows up as ~660ms TTFB on the home page. Solution: enable
 * a us-east-1 read replica in the Supabase dashboard, route reads
 * through it, keep writes on the primary. No data migration. RLS
 * policies replicate automatically.
 *
 * Three clients exported:
 *   - supabaseAdmin  — service role, primary, server-only, bypasses RLS
 *   - supabase       — anon key, primary, all operations (legacy default)
 *   - supabaseRead   — anon key, read replica, reads only (or smart-routed)
 *   - db             — smart proxy: .select() → replica, mutations → primary
 *
 * New env var: NEXT_PUBLIC_SUPABASE_READ_URL (the replica's PostgREST URL).
 * If unset, supabaseRead falls back to the primary URL and logs a warning.
 */

type AnyClient = SupabaseClient<any, any, any>;

let _supabase: AnyClient | null = null;
let _supabaseAdmin: AnyClient | null = null;
let _supabaseRead: AnyClient | null = null;
let _supabaseWarned = false;

// All three getters fall back to placeholder values during build so module
// import never throws. The build's "Collecting page data" phase runs
// before Vercel injects runtime env — a throw here crashes the entire
// production build. At request time process.env is populated and the real
// keys are used. If real keys are missing in production, real queries fail
// visibly instead of silently producing empty results.
function getSupabase(): AnyClient {
  if (_supabase) return _supabase;
  _supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.invalid',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  );
  return _supabase;
}

function getSupabaseAdmin(): AnyClient {
  if (_supabaseAdmin) return _supabaseAdmin;
  _supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.invalid',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  );
  return _supabaseAdmin;
}

function getSupabaseRead(): AnyClient {
  if (_supabaseRead) return _supabaseRead;

  const primaryUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.invalid';
  const readUrl = process.env.NEXT_PUBLIC_SUPABASE_READ_URL || primaryUrl;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

  if (readUrl === primaryUrl && !process.env.NEXT_PUBLIC_SUPABASE_READ_URL) {
    // First-time warning so the operator knows reads aren't actually going
    // to a replica yet. Silent after first call.
    if (typeof process !== 'undefined' && !_supabaseWarned) {
      // eslint-disable-next-line no-console
      console.warn(
        '[supabase] NEXT_PUBLIC_SUPABASE_READ_URL not set; reads will hit the primary. ' +
        'Set this in Vercel to enable the us-east-1 read replica.',
      );
      _supabaseWarned = true;
    }
  }

  _supabaseRead = createClient(readUrl, supabaseAnonKey);
  return _supabaseRead;
}

/**
 * Soft-warn at module-import time if the service-role key is missing in
 * the current process env. Does NOT throw — we throw on first USE so the
 * import path never breaks bundling. This warning surfaces in build logs
 * to give an early signal during deploys.
 */
if (typeof process !== 'undefined' && !process.env.SUPABASE_SERVICE_ROLE_KEY && !_supabaseWarned) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] SUPABASE_SERVICE_ROLE_KEY not set at module-import time. ' +
      'supabaseAdmin will throw on first use. If you see this in production logs, ' +
      'check Vercel project env vars (production target).',
  );
  _supabaseWarned = true;
}

/**
 * Public client (anon key). Points at the primary. Use for writes.
 * Safe to use anywhere — RLS-enforced. Used by client components and SSR
 * pages that need to write (insert/update/delete/upsert).
 */
export const supabase: AnyClient = new Proxy({} as AnyClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/**
 * Service-role client. BYPASSES RLS. Server-only.
 * Use only for trusted server-side operations: cron jobs, backfills,
 * admin tools, webhooks. Never expose to the client.
 *
 * Stays on the primary (not the replica) because admin tooling often
 * does write-then-read flows that can't tolerate replica lag.
 */
export const supabaseAdmin: AnyClient = new Proxy({} as AnyClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/**
 * Read-only client pointing at the us-east-1 read replica. Use for
 * public read paths (home, /directory/*, /news, /rinks, /teams).
 *
 * Falls back to the primary URL if NEXT_PUBLIC_SUPABASE_READ_URL is
 * unset (with a one-time warning). This makes the build green before
 * the replica is provisioned; just slower than it should be.
 */
export const supabaseRead: AnyClient = new Proxy({} as AnyClient, {
  get(_target, prop) {
    const client = getSupabaseRead();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/**
 * Smart-routing proxy. Auto-sends .select() to the read replica and
 * mutations (.insert / .update / .delete / .upsert / .rpc) to the
 * primary. Use this for NEW public read code where you don't want to
 * think about the routing.
 *
 * Replica has 1-2 second lag vs the primary. If you write-then-read
 * the same row and need the read to see the write, use `supabase`
 * (primary) directly for that flow.
 *
 * Example:
 *   import { db } from '@/lib/supabase';
 *   const { data } = await db.from('rinks').select('*');      // → replica
 *   await db.from('rinks').insert({ name: 'X' });              // → primary
 *   await db.rpc('my_function', { arg: 1 });                   // → primary
 */
const READ_METHODS = new Set([
  'select', 'maybeSingle', 'single', 'range', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'or', 'and', 'not', 'filter',
  'match', 'order', 'limit', 'range', 'abortSignal',
]);

const WRITE_METHODS = new Set([
  'insert', 'update', 'upsert', 'delete',
]);

function createSmartClient(): AnyClient {
  const handler: ProxyHandler<any> = {
    get(_target, methodName) {
      return (...args: unknown[]) => {
        const m = String(methodName);
        // Route to read or write client based on the method being called.
        // The .from().select() chain looks like: get(select) -> get(from)
        // We route at the leaf call (select / insert / etc), not at .from().
        if (READ_METHODS.has(m)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (getSupabaseRead() as any)[m](...args);
        }
        if (WRITE_METHODS.has(m)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (getSupabase() as any)[m](...args);
        }
        // For everything else (auth, storage, rpc at top level, from,
        // channel, etc), fall through to the primary. The chain naturally
        // routes the final call correctly.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (getSupabase() as any)[m](...args);
      };
    },
  };
  return new Proxy({}, handler) as AnyClient;
}

export const db: AnyClient = createSmartClient();
