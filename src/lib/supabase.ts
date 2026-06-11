import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}
if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
}
if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

/**
 * Public client (anon key). Safe to use anywhere — RLS-enforced.
 * Used by client components and SSR pages.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Service-role client. BYPASSES RLS. Server-only.
 * Use only for trusted server-side operations: cron jobs, backfills,
 * admin tools, webhooks. Never expose to the client.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
