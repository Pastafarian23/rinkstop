/**
 * One-time admin route to apply the booking payment columns migration.
 * Gate: ADMIN_SECRET env var must match query param ?s=<secret>
 * Deploy → hit once → delete route.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SQL = `
ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS quoted_price_cents       INTEGER,
  ADD COLUMN IF NOT EXISTS payment_intent_id        TEXT,
  ADD COLUMN IF NOT EXISTS payment_session_url      TEXT,
  ADD COLUMN IF NOT EXISTS payment_session_id       TEXT,
  ADD COLUMN IF NOT EXISTS payment_expires_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_status           TEXT NOT NULL DEFAULT 'pending'
                                          CHECK (payment_status IN ('pending','paid','refunded','disputed')),
  ADD COLUMN IF NOT EXISTS paid_at                  TIMESTAMPTZ;

ALTER TABLE rink_owners
  ADD COLUMN IF NOT EXISTS stripe_account_id         TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_started_at TIMESTAMPTZ;
`;

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('s');

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Try via SQL editor function if available
    const { data, error } = await supabase.rpc('exec_sql', { sql: SQL }).catch(() => ({ data: null, error: { message: 'RPC not available' } }));

    if (error?.message === 'RPC not available') {
      // Fallback: ALTER TABLE is not available via REST, but we can try raw PostgREST
      return NextResponse.json({
        ok: false,
        message: 'No SQL execution function available. Please run migration in Supabase Dashboard → SQL Editor.',
        sql: SQL,
      }, { status: 501 });
    }

    if (error) {
      console.error('[apply-booking-migration] failed', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Migration applied successfully.' });
  } catch (err) {
    console.error('[apply-booking-migration] error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
