// Day 7 (Arnel, 2026-06-23 06:17 CDT): keep-warm endpoint.
//
// Pings /api/health on a cron every 4 minutes. This keeps Vercel's
// edge functions for /login, /sign-up, /dashboard, etc. warm so
// first-time visitors don't hit a 500 from a cold start.
//
// Returned shape: { ok: true, ts: <iso>, service: 'rinkstop' }
// Status: always 200 unless the runtime is genuinely broken.
//
// Cost: 0 (cron is an internal call, no Clerk/Supabase fetches).
//
// This route also doubles as a basic liveness check — if the cron
// ever reports a 5xx, we know the deployment is broken even if no
// one is visiting the site.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    service: 'rinkstop',
  });
}
