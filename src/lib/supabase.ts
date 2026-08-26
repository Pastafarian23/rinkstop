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
 * call-site shape across 216 routes — no rewrites needed.
 */

type AnyClient = SupabaseClient<any, any, any>;

let _supabase: AnyClient | null = null;
let _supabaseAdmin: AnyClient | null = null;
let _supabaseWarned = false;

function getSupabase(): AnyClient {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set',
    );
  }
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

function getSupabaseAdmin(): AnyClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL must be set before creating the admin client.',
    );
  }
  if (!supabaseServiceKey) {
    throw new Error(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY must be set. The admin client cannot fall back to the anon client — that would silently bypass RLS on 200+ server routes.',
    );
  }
  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  return _supabaseAdmin;
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
 * Public client (anon key). Safe to use anywhere — RLS-enforced.
 * Used by client components and SSR pages.
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
 */
export const supabaseAdmin: AnyClient = new Proxy({} as AnyClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});