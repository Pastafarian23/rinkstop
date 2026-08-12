/**
 * Client → server analytics endpoint.
 *
 * Used by navigator.sendBeacon from the browser when we want to log
 * an event that depends on user action (e.g. "clicked checkout button")
 * and the corresponding server call may not be made (e.g. if the user
 * abandons before submitting the form).
 *
 * Backed by the same Supabase table as /lib/analytics.ts. Always logs
 * to console first; Supabase insert is best-effort. Never throws.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, msg: 'invalid json' }, { status: 400 });
  }

  const { name, props } = body || {};
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ ok: false, msg: 'name required' }, { status: 400 });
  }

  // Allowlist event names so a bad client (or attacker) can't fill the table.
  const ALLOWED = new Set([
    'checkout_started',
    'checkout_abandoned',
    'pricing_card_clicked',
    'founding_urgency_viewed',
    'claim_started',
    'claim_button_clicked',
    'claim_submitted',
    'claim_approved',
    'checkout_completed',
    'lead_form_submitted',
    'affiliate_clicked',
    'homepage_cta_clicked',
    'outbound_share_clicked',
    'calculator_used',
    'tool_viewed',
    'claim_search_viewed',
    'claim_search_abandoned',
    'claim_sign_in_cta_clicked',
    'add_listing_intent',
    'add_listing_intent_viewed',
    'add_listing_submitted',
    'add_listing_no_match_cta_click',
  ]);
  if (!ALLOWED.has(name)) {
    return NextResponse.json({ ok: false, msg: 'event not allowed' }, { status: 400 });
  }

  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  const log = {
    name,
    userId: userId ?? null,
    pathname: body.pathname ?? null,
    referrer: req.headers.get('referer') || null,
    utm_source: body.utm?.source ?? null,
    utm_medium: body.utm?.medium ?? null,
    utm_campaign: body.utm?.campaign ?? null,
    props: props ?? null,
    ts: new Date().toISOString(),
  };

  console.log('[analytics]', JSON.stringify(log));

  try {
    // WS9 PR2: upsert + ignoreDuplicates. The partial UNIQUE indexes added in
    // 2026-07-23_analytics_events_dedup.sql silently dedupe:
    //   - same (name, user_id, pathname, 1-second bucket) for signed-in users
    //   - same (name, props->>'sessionId') for Stripe events
    // For events that match NEITHER index, upsert falls back to a plain
    // insert (no conflict to ignore). The onConflict string is a no-op
    // when the index doesn't fire.
    await supabaseAdmin.from('analytics_events').upsert(
      {
        name: log.name,
        // WS9 PR2: coalesce NULL user_id to '' so the non-partial UNIQUE
        // index on (name, user_id, pathname, ts_second) treats two anonymous
        // events in the same second as a single row. Postgres treats NULL
        // as distinct in unique indexes, so without this the dedup wouldn't
        // work for anonymous visitors.
        user_id: log.userId ?? '',
        pathname: log.pathname,
        referrer: log.referrer,
        utm_source: log.utm_source,
        utm_medium: log.utm_medium,
        utm_campaign: log.utm_campaign,
        props: log.props,
      },
      {
        onConflict: 'name,user_id,pathname,ts_second',
        ignoreDuplicates: true,
      }
    );
  } catch (e: any) {
    console.error('[analytics] supabase insert failed:', e?.message ?? e);
  }

  return NextResponse.json({ ok: true });
}
