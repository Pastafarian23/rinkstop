import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set',
  );
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
 *
 * Security audit 2026-08-26 follow-up: if SUPABASE_SERVICE_ROLE_KEY is
 * missing, we THROW at module-load time instead of silently degrading
 * to the anon client. The previous `supabase ?? supabaseAdmin` fallback
 * was the root cause of audit finding #2 (blog/publish) — if the service
 * key was unset, every `supabaseAdmin` call would silently fall through
 * to anon, RLS would block the write, and the user would see a 500 with
 * no actionable diagnostic. Fail loud at startup so the operator knows
 * immediately.
 */
if (!supabaseServiceKey) {
  throw new Error(
    '[supabase] SUPABASE_SERVICE_ROLE_KEY must be set. The admin client cannot fall back to the anon client — that would silently bypass RLS on 200+ server routes.',
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
