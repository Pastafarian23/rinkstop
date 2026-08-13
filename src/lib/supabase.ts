import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Dev / missing-env safety: if the service key is absent, fall back to the anon client.
// This avoids crashing module load for users and surfaces the real error
// only when a service-only route actually needs admin privileges.
let supabaseAdmin = supabase;
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
} else {
  // Intentionally silent on startup so RSC pages don't die on import.
  // Caller should handle reduced permissions / log as needed.
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
