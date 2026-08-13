import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Public client (anon key). Safe to use anywhere — RLS-enforced.
 * Used by client components and SSR pages.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Service-role client. BYPASSES RLS. Server-only.
 * Use only for trusted server-side operations: cron jobs, backfills,
 * admin tools, webhooks. Never expose to the client.
 *
 * If the service role key is missing, fall back to the anon client
 * so RSC pages don't crash on module import. Callers that need
 * admin privileges should handle the degraded client explicitly.
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;
