import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * DEBUG endpoint — captures production error details to a Supabase table
 * so we can diagnose dashboard errors that Next.js strips from the client.
 *
 * Temporary: this endpoint, the error.tsx red box, and the
 * dashboard_error_logs table will all be removed once the underlying
 * bug is found and fixed.
 *
 * Why POST: a client component (error.tsx) can't write to the DB directly,
 * but it can fetch. The endpoint does the privileged write.
 *
 * Access control: any authenticated user can log errors (it's their own
 * browser sending the data). Reads from the table are RLS-gated to
 * super_admin (in the migration).
 *
 * Rate-limit: best-effort via DB unique constraint on (digest, captured_at)
 * is NOT in place — the table is small enough that we don't need it.
 * Clean-up: once the bug is fixed, drop the table and remove this route.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asStr(v: unknown, maxLen = 1000): string | null {
  if (v == null) return null;
  if (typeof v !== 'string') return null;
  return v.slice(0, maxLen);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const errorName = asStr(body.errorName, 200) ?? 'Error';
  const errorMessage = asStr(body.errorMessage, 4000) ?? '';
  const errorStack = asStr(body.errorStack, 16000) ?? '';
  const digest = asStr(body.digest, 200) ?? null;
  const pathname = asStr(body.pathname, 500) ?? null;
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;

  // Reject if neither errorMessage nor errorStack is provided — protects
  // the table from being filled with empty rows.
  if (!errorMessage && !errorStack) {
    return NextResponse.json({ error: 'empty_error' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('dashboard_error_logs')
    .insert({
      user_id: userId ?? null,
      pathname,
      digest,
      error_name: errorName,
      error_message: errorMessage,
      error_stack: errorStack,
      user_agent: userAgent,
    })
    .select('id, captured_at')
    .single();

  if (error) {
    console.error('[debug/log-error] insert failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}