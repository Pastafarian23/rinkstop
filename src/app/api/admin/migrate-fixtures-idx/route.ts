import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  const sql = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'fixtures'
          AND indexname = 'idx_fixtures_scheduled_at'
      ) THEN
        CREATE INDEX idx_fixtures_scheduled_at
          ON public.fixtures (scheduled_at DESC);
      END IF;
    END $$;
  `;

  const { error } = await supabaseAdmin.rpc('exec_sql', { sql });

  if (error) {
    // Fallback: try via management API or return error
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
