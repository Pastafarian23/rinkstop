/**
 * src/app/api/cron/conversion-snapshot/route.ts
 *
 * Vercel cron route (daily). Aggregates the analytics_events table for
 * the conversion-relevant events of the day (UTC) and upserts one row
 * into conversion_daily_snapshots. Powers Phase 12 trend reporting.
 *
 * Schedule: vercel.json cron "5 5 * * *" (05:05 UTC daily). Idempotent —
 * unique on snapshot_date.
 *
 * Auth: Bearer CRON_SECRET (matches the pattern used by /api/cron/scores-refresh
 * and /api/cron/auto-publish). Service-role key bypasses RLS for the upsert.
 *
 * Failure modes:
 *   - Missing CRON_SECRET = 500 "CRON_SECRET not configured".
 *   - Wrong Authorization = 401.
 *   - DB failure = 500 with error detail.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COUNTED_EVENTS = [
  'homepage_search',
  'directory_search',
  // 2026-11-13 (conversion assessment): the DIRECTORY search bar
  // (CategorySearchBar, used on /directory/teams, /directory/leagues,
  // /directory/rinks, /directory/players, /directory/free-agents) fires
  // `search_query` — NOT `directory_search`. `directory_search` is only
  // emitted by the CommandPalette/SearchBar island. So the snapshot was
  // summing two event names that the directory never emits, and reading
  // `searches_total: 0` every single day while 99 real directory
  // searches happened. Counting `search_query` makes the snapshot
  // reflect actual events.
  'search_query',
  'listing_viewed',
  'tool_viewed',
  'calculator_used',
  'pricing_viewed',
  'checkout_started',
  'checkout_completed',
  'free_account_created',
  'tool_upsell_clicked',
  'tool_free_account_clicked',
  'claim_started',
  'claim_button_clicked',
  'claim_submitted',
  'claim_approved',
] as const;

type CountedEvent = (typeof COUNTED_EVENTS)[number];

// Map event name -> column in conversion_daily_snapshots.
const EVENT_COLUMN: Record<CountedEvent, string> = {
  homepage_search: 'searches_total',
  directory_search: 'searches_total',
  search_query: 'searches_total',
  listing_viewed: 'listing_views_total',
  tool_viewed: 'tool_views',
  calculator_used: 'calculator_used',
  pricing_viewed: 'pricing_viewed',
  checkout_started: 'checkout_started',
  checkout_completed: 'checkout_completed',
  free_account_created: 'free_account_created',
  tool_upsell_clicked: 'tool_upsell_clicked',
  tool_free_account_clicked: 'tool_free_account_clicked',
  claim_started: 'claim_started',
  claim_button_clicked: 'claim_button_clicked',
  claim_submitted: 'claim_submitted',
  claim_approved: 'claim_approved',
};

function todayUtcDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, msg: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, msg: 'unauthorized' }, { status: 401 });
  }

  const today = todayUtcDate();
  const dayStart = new Date(today + 'T00:00:00.000Z');
  const dayEnd = new Date(today + 'T23:59:59.999Z');

  // Single query: group by event name for the day.
  //
  // 2026-11-13: this query had NO pagination. PostgREST caps every
  // response at 1,000 rows, so on any day with more than 1,000 tracked
  // events the result was silently truncated — the snapshot then
  // reported a plausible-but-wrong number instead of the truth. Paginate
  // explicitly, and use `count: 'exact'` per event name instead of
  // counting rows, which is both exact and far cheaper.
  const counts: Record<CountedEvent, number> = Object.fromEntries(
    COUNTED_EVENTS.map((e) => [e, 0])
  ) as Record<CountedEvent, number>;

  for (const ev of COUNTED_EVENTS) {
    const { count, error: countErr } = await supabaseAdmin
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('name', ev)
      .gte('ts', dayStart.toISOString())
      .lte('ts', dayEnd.toISOString());
    if (countErr) {
      return NextResponse.json(
        { ok: false, msg: `count failed for ${ev}: ${countErr.message}` },
        { status: 500 },
      );
    }
    counts[ev] = count ?? 0;
  }

  // Build the row from counts using EVENT_COLUMN.
  const updateRow: Record<string, unknown> = {
    snapshot_date: today,
    degraded: false,
    notes: null,
  };
  // Aggregate per-column
  for (const ev of COUNTED_EVENTS) {
    const col = EVENT_COLUMN[ev];
    // For the two aggregated counters (searches_total, listing_views_total)
    // we accumulate across multiple event names.
    if (col in updateRow) {
      (updateRow[col] as number) += counts[ev];
    } else {
      updateRow[col] = counts[ev];
    }
  }

  const { error: upErr } = await supabaseAdmin
    .from('conversion_daily_snapshots')
    .upsert(updateRow, { onConflict: 'snapshot_date' });

  if (upErr) {
    return NextResponse.json({ ok: false, msg: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    snapshot_date: today,
    counts,
  });
}