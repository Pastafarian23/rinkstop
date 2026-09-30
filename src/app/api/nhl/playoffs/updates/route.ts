import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VALID_TYPES = ['update', 'analysis', 'goal', 'period', 'final', 'trade'];

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    );
    const { data, error } = await supabase
      .from('playoff_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    // Normalize content → text for frontend
    return NextResponse.json((data || []).map((r: any) => ({ ...r, text: r.content })));
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch updates' }, { status: 500 });
  }
}

// 2026-09-30 SECURITY: POST disabled. The previous handler used the anon key
// with no auth check, allowing anyone with the URL to inject content into
// `playoff_updates` (verified live: 'attacker injected this' was inserted via
// curl POST). The only consumer of this endpoint (src/app/directory/nhl/playoffs/page.tsx)
// only reads via GET. POST writes now go through /api/admin/playoffs/updates
// (service-role + admin auth gate). This handler returns 410 Gone so any
// monitoring/curl tests that hit POST get a clear signal the endpoint is
// intentionally disabled rather than silently 405.
export async function POST() {
  return NextResponse.json(
    {
      error: 'POST disabled 2026-09-30 — use POST /api/admin/playoffs/updates with admin auth',
      migration: 'supabase/migrations/2026-09-30_playoff_updates_rls.sql',
    },
    { status: 410 },
  );
}