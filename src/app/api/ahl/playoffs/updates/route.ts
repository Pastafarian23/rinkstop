import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('ahl_playoff_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json((data || []).map((r: any) => ({ ...r, text: r.content })));
  } catch {
    return NextResponse.json([]);
  }
}

// 2026-09-30 SECURITY: POST disabled (was unauthenticated service-role write).
// Returns 410 Gone. Use /api/admin/playoffs/updates for admin writes.
export async function POST() {
  return NextResponse.json(
    {
      error: 'POST disabled 2026-09-30 — use POST /api/admin/playoffs/updates with admin auth',
      migration: 'supabase/migrations/2026-09-30_playoff_updates_rls.sql',
    },
    { status: 410 },
  );
}
