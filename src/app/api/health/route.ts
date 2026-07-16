// Day 7 (Arnel, 2026-06-23 06:17 CDT): keep-warm endpoint.
//
// Pings /api/health on a cron every 4 minutes. This keeps Vercel's
// edge functions for /login, /sign-up, /dashboard, etc. warm so
// first-time visitors don't hit a 500 from a cold start.
//
// Default response (cheap): { ok: true, ts: <iso>, service: 'rinkstop' }
// Status: always 200 unless the runtime is genuinely broken.
//
// Cost: 0 (cron is an internal call, no Clerk/Supabase fetches).
//
// This route also doubles as a basic liveness check — if the cron
// ever reports a 5xx, we know the deployment is broken even if no
// one is visiting the site.
//
// Deep check: pass ?check=supabase (or any subsystem name) to verify
// connectivity. Returns { ok, checks: { supabase: 'ok' | 'error', ... } }.
// Used for manual ops verification, not the keep-warm cron.

import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const check = url.searchParams.get('check');

  if (!check) {
    return Response.json({
      ok: true,
      ts: new Date().toISOString(),
      service: 'rinkstop',
    });
  }

  const checks: Record<string, 'ok' | 'error'> = {};

  if (check === 'supabase' || check === 'all') {
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .limit(1);
      checks.supabase = error ? 'error' : 'ok';
    } catch {
      checks.supabase = 'error';
    }
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  return Response.json(
    {
      ok: allOk,
      ts: new Date().toISOString(),
      service: 'rinkstop',
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}

