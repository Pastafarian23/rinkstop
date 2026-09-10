// /api/public-booking
//
// Public (anonymous) booking inquiry submission. Called from
// /ice-marketplace/[id]/book when a non-logged-in visitor wants to
// inquire about a listing.
//
// Validates input, looks up the listing + rink, inserts into
// public_booking_inquiries, returns a thank-you HTML page (form post,
// not JSON — the visitor landed here from a form submit, give them
// a confirmation page not a 200/empty response).
//
// The rink owner is notified via email (logged server-side for now;
// could be wired to Resend/SMTP later — task #2).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { headers } from 'next/headers';
import { checkRateLimit, applyRateLimitHeaders } from '@/lib/rateLimit';
import { notifyBookingRequestCreated } from '@/lib/rink-notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Anti-spam: 10 inquiries / hour per IP. Public form — needs a hard cap.
const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 60 * 1000 };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function errorPage(message: string, status: number = 400): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Booking inquiry — please check the form</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0F172A; color: #fff; margin: 0; padding: 3rem 1rem; }
    .wrap { max-width: 480px; margin: 0 auto; }
    h1 { font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; margin: 0 0 1rem; }
    a { color: #FFB81C; }
    .alert { background: rgba(200,16,46,0.15); border: 2px solid #C8102E; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="alert"><strong>${escapeHtml(message)}</strong></div>
    <p><a href="/ice-marketplace">← Back to the ice marketplace</a></p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function thankYouPage(rinkName: string, contactName: string, listingTitle: string): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Inquiry sent — RinkStop</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0F172A; color: #fff; margin: 0; padding: 3rem 1rem; }
    .wrap { max-width: 640px; margin: 0 auto; }
    h1 { font-family: 'Bebas Neue', sans-serif; font-size: 3rem; margin: 0 0 1rem; letter-spacing: 0.02em; }
    .check { font-size: 4rem; color: #38BDF8; margin-bottom: 1rem; }
    .card { background: #0a1a36; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; }
    a { color: #FFB81C; }
    ol, ul { color: rgba(255,255,255,0.85); line-height: 1.6; padding-left: 1.25rem; }
    ol li, ul li { margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="check">✓</div>
    <h1>Inquiry sent to ${escapeHtml(rinkName)}</h1>
    <p>Thanks, ${escapeHtml(contactName)}. Your inquiry about <strong>${escapeHtml(listingTitle)}</strong> is on its way.</p>

    <div class="card">
      <strong>What happens next:</strong>
      <ol>
        <li>The rink owner gets an email with your inquiry (usually within minutes)</li>
        <li>They'll review and either accept, propose a different time, or ask questions</li>
        <li>You'll get an email reply — usually within 1 business day</li>
        <li>Once accepted, you'll get a secure payment link to confirm the booking</li>
      </ol>
    </div>

    <p>To make this faster, you can also:</p>
    <ul>
      <li><a href="/sign-up?intent=booking&next=/dashboard">Create a RinkStop account</a> to track this inquiry in your dashboard</li>
      <li><a href="/ice-marketplace">Browse more open ice</a></li>
    </ul>

    <p style="margin-top: 2rem;"><a href="/">← Back to RinkStop</a></p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return errorPage('Service unavailable. Please email partners@rinkstop.com directly.', 503);
  }

  // Rate limit by IP
  const h = await headers();
  const forwardedFor = h.get('x-forwarded-for') || '';
  const ip = forwardedFor.split(',')[0].trim() || 'unknown';
  const rateKey = `public-booking:ip:${ip}`;
  const rateResult = await checkRateLimit(rateKey, RATE_LIMIT);
  if (!rateResult.allowed) {
    const resp = errorPage('Too many inquiries from this network. Please try again later.', 429);
    return applyRateLimitHeaders(resp, rateResult);
  }

  const form = await request.formData();

  const listingId = String(form.get('listing_id') || '').trim();
  const contactName = String(form.get('contact_name') || '').trim();
  const contactEmail = String(form.get('contact_email') || '').trim();
  const contactPhone = String(form.get('contact_phone') || '').trim() || null;
  const teamOrOrg = String(form.get('team_or_org') || '').trim() || null;
  const notes = String(form.get('notes') || '').trim() || null;
  const source = String(form.get('source') || 'ice_marketplace').trim() || null;
  const sourceUrl = String(form.get('source_url') || '').trim() || null;
  const userAgent = h.get('user-agent') || null;

  // Validation
  if (!listingId) return errorPage('Missing listing. Please go back to the marketplace and try again.');
  if (!contactName) return errorPage('Please enter your name.');
  if (!contactEmail || !contactEmail.includes('@')) {
    return errorPage('Please enter a valid email address.');
  }

  // Look up the listing
  const { data: listing, error: lookupErr } = await supabaseAdmin
    .from('ice_listings')
    .select(`
      id, rink_id, title, status, visibility, requested_price_cents, currency,
      start_time, end_time,
      rink:rinks(id, name, slug)
    `)
    .eq('id', listingId)
    .maybeSingle();

  if (lookupErr || !listing) {
    return errorPage('Listing not found. It may have been removed.');
  }
  if (listing.status !== 'available' || listing.visibility !== 'public') {
    return errorPage('This listing is no longer accepting inquiries.');
  }

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('public_booking_inquiries')
    .insert({
      listing_id: listing.id,
      rink_id: listing.rink_id,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      team_or_org: teamOrOrg,
      requested_start: listing.start_time,
      requested_end: listing.end_time,
      requested_price_cents: listing.requested_price_cents,
      notes,
      source,
      source_url: sourceUrl,
      status: 'new',
      ip_address: ip,
      user_agent: userAgent,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    console.error('[public-booking] insert failed', { insertErr, listingId, contactEmail });
    return errorPage('We could not save your inquiry right now. Please try again or email the rink directly.', 500);
  }

  // Best-effort: notify rink owner (in-app + email). Never block the
  // visitor's thank-you page on notification failure — the inquiry row
  // is saved, owner can still see it in their dashboard.
  try {
    const { data: claims } = await supabaseAdmin
      .from('claims')
      .select('user_id')
      .eq('claim_type', 'rink')
      .eq('entity_id', listing.rink_id)
      .eq('status', 'approved');

    const rinkOwnerUserIds = (claims || [])
      .map((c: any) => c.user_id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

    if (rinkOwnerUserIds.length > 0) {
      await notifyBookingRequestCreated({
        rinkId: listing.rink_id,
        rinkOwnerUserIds,
        requesterName: contactName,
        requestedAt: listing.start_time,
        rinkName: (listing.rink as any)?.name || 'your rink',
        callerInsertId: `public_booking_inquiry:${inserted.id}`,
      });

      await supabaseAdmin
        .from('public_booking_inquiries')
        .update({ status: 'emailed_rink' })
        .eq('id', inserted.id);
    } else {
      console.warn('[public-booking] no approved rink owner claim found', {
        rinkId: listing.rink_id,
        listingId,
      });
    }
  } catch (notifyErr) {
    console.error('[public-booking] owner notification failed (inquiry still saved)', {
      notifyErr,
      inquiryId: inserted.id,
    });
  }

  const rinkName = (listing.rink as any)?.name || 'the rink';
  return thankYouPage(rinkName, contactName, listing.title);
}
