/**
 * scoresheet/lib/supabase.ts
 *
 * Supabase client factories for the scoresheet app.
 *
 * Shares the same Supabase project as rinkstop.com. The scoresheet adds
 * 4 tables (games, game_events, game_collaborators, user_favorite_teams)
 * to the shared project. RinkStop integration (Phase B) will use the
 * existing rinkstop tables.
 *
 * Three client flavors:
 *   - getServerSupabase()  : service-role, server-side, bypasses RLS
 *   - getBrowserSupabase(): anon-key, client-side, RLS-gated
 *   - getUserSupabase()    : per-request, uses Clerk session, RLS-gated
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

let _serviceClient: SupabaseClient | null = null;
let _anonClient: SupabaseClient | null = null;

function envOk(): { url: string; serviceKey: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) {
    console.error('[scoresheet-supabase] missing env: url=', !!url, 'service=', !!serviceKey, 'anon=', !!anonKey);
    return null;
  }
  return { url, serviceKey, anonKey };
}

/**
 * Server-side client with service-role privileges. Bypasses RLS.
 * Use only in server actions / route handlers, never expose to client.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (_serviceClient) return _serviceClient;
  const env = envOk();
  if (!env) return null;
  _serviceClient = createClient(env.url, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _serviceClient;
}

/**
 * Browser-safe client. RLS-gated. Use in client components.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (_anonClient) return _anonClient;
  const env = envOk();
  if (!env) return null;
  _anonClient = createClient(env.url, env.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _anonClient;
}

/**
 * Per-request client that uses the Clerk session token for RLS.
 * Use in server components / server actions that need to act as the
 * currently signed-in user (not the service role).
 */
export async function getUserSupabase(): Promise<{ client: SupabaseClient; userId: string } | null> {
  const env = envOk();
  if (!env) return null;
  const { userId, getToken } = await auth();
  if (!userId) return null;
  const token = await getToken({ template: 'supabase' }).catch(() => null);
  if (!token) {
    // No supabase template configured in Clerk. Fall back to a client
    // that uses the user's id as the auth header (requires RLS to allow
    // it) or to the service role for trusted operations.
    return null;
  }
  const client = createClient(env.url, env.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { client, userId };
}
