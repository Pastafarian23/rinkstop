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
import { auth } from '@clerk/nextjs/server';
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
    'claim_submitted',
    'lead_form_submitted',
    'affiliate_clicked',
    'homepage_cta_clicked',
    'outbound_share_clicked',
    'calculator_used',
    'tool_viewed',
  ]);
  if (!ALLOWED.has(name)) {
    return NextResponse.json({ ok: false, msg: 'event not allowed' }, { status: 400 });
  }

  const { userId } = await auth();

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
    await supabaseAdmin.from('analytics_events').insert({
      name: log.name,
      user_id: log.userId,
      pathname: log.pathname,
      referrer: log.referrer,
      utm_source: log.utm_source,
      utm_medium: log.utm_medium,
      utm_campaign: log.utm_campaign,
      props: log.props,
    });
  } catch (e: any) {
    console.error('[analytics] supabase insert failed:', e?.message ?? e);
  }

  return NextResponse.json({ ok: true });
}
