// /api/launch-signup
//
// Receives the founding partner signup from /launch. Validates input,
// inserts into Supabase, returns a thank-you page.
//
// Why server-rendered instead of API+JSON: the form is a simple
// non-JS form, and the user expects to land on a confirmation page
// after submit. Doing it as a form POST that returns HTML keeps it
// simple and works without React hydration.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ORG_TYPES = new Set(['rink', 'club', 'league', 'federation', 'arena', 'other']);
const TIER_OPTIONS = new Set([
  'club_starter',
  'club_pro',
  'club_elite',
  'league',
  'business_listing',
  'business_plus',
]);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validationError(field: string, message: string): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Sign up — please check the form</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #041E42; color: #fff; margin: 0; padding: 3rem 1rem; }
    .wrap { max-width: 480px; margin: 0 auto; }
    h1 { font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; margin: 0 0 1rem; }
    a { color: #FFB81C; }
    .alert { background: rgba(200,16,46,0.15); border: 2px solid #C8102E; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="alert">
      <strong>${escapeHtml(message)}</strong>
    </div>
    <p><a href="/launch">← Back to the signup form</a></p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function thankYouPage(orgName: string, contactName: string): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Application received — RinkStop</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #041E42; color: #fff; margin: 0; padding: 3rem 1rem; }
    .wrap { max-width: 640px; margin: 0 auto; }
    h1 { font-family: 'Bebas Neue', sans-serif; font-size: 3rem; margin: 0 0 1rem; letter-spacing: 0.02em; }
    .check { font-size: 4rem; color: #FFB81C; margin-bottom: 1rem; }
    .card { background: #0a1a36; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; }
    a { color: #FFB81C; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="check">✓</div>
    <h1>Application received</h1>
    <p>Thanks, ${escapeHtml(contactName)}. We have your application for <strong>${escapeHtml(orgName)}</strong> and will email you within 2 business days with onboarding steps.</p>

    <div class="card">
      <strong>What happens next:</strong>
      <ol>
        <li>We review your application (usually same day)</li>
        <li>If accepted, we email you a Stripe Express onboarding link so we can pay you out</li>
        <li>Once your account is verified, you can start listing open ice from the RinkStop dashboard</li>
        <li>Your 6-month 0% take-rate window starts when you publish your first listing</li>
      </ol>
    </div>

    <p>In the meantime:</p>
    <ul>
      <li>Browse the <a href="/ice-marketplace">ice marketplace</a></li>
      <li>Check out the <a href="/directory/rinks">rink directory</a></li>
      <li>Email <a href="mailto:support@rinkstop.com">support@rinkstop.com</a> with any questions</li>
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
    return validationError('', 'Service unavailable. Please email support@rinkstop.com.');
  }

  const form = await request.formData();

  const contactName = String(form.get('contact_name') || '').trim();
  const contactEmail = String(form.get('contact_email') || '').trim();
  const contactPhone = String(form.get('contact_phone') || '').trim() || null;
  const orgName = String(form.get('org_name') || '').trim();
  const orgType = String(form.get('org_type') || '').trim();
  const orgWebsite = String(form.get('org_website') || '').trim() || null;
  const orgCity = String(form.get('org_city') || '').trim();
  const orgState = String(form.get('org_state') || '').trim() || null;
  const orgCountry = String(form.get('org_country') || '').trim();
  const tierInterest = String(form.get('tier_interest') || '').trim();
  const monthlyIceHoursRaw = String(form.get('monthly_ice_hours_estimate') || '').trim();
  const currentBookingSystem = String(form.get('currently_uses_bookingsystem') || '').trim() || null;
  const notes = String(form.get('notes') || '').trim() || null;
  const source = String(form.get('source') || 'launch_page').trim() || null;
  const sourceUrl = String(form.get('source_url') || '').trim() || null;

  // Validation
  if (!contactName) return validationError('contact_name', 'Please enter your name.');
  if (!contactEmail || !contactEmail.includes('@')) {
    return validationError('contact_email', 'Please enter a valid email address.');
  }
  if (!orgName) return validationError('org_name', 'Please enter your organization name.');
  if (!ORG_TYPES.has(orgType)) return validationError('org_type', 'Please select an organization type.');
  if (!orgCity) return validationError('org_city', 'Please enter your city.');
  if (!orgCountry) return validationError('org_country', 'Please enter your country.');
  if (!TIER_OPTIONS.has(tierInterest)) {
    return validationError('tier_interest', 'Please select a tier you are interested in.');
  }

  const monthlyIceHours = monthlyIceHoursRaw ? parseInt(monthlyIceHoursRaw, 10) : null;
  if (monthlyIceHours !== null && (Number.isNaN(monthlyIceHours) || monthlyIceHours < 0)) {
    return validationError('monthly_ice_hours_estimate', 'Please enter a valid number of hours.');
  }

  // Get user agent + IP for the record
  const h = await headers();
  const userAgent = h.get('user-agent') || null;
  const forwardedFor = h.get('x-forwarded-for') || '';
  const ip = forwardedFor.split(',')[0].trim() || null;

  const { error } = await supabaseAdmin.from('founding_partner_signups').insert({
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    org_name: orgName,
    org_type: orgType,
    org_website: orgWebsite,
    org_city: orgCity,
    org_state: orgState,
    org_country: orgCountry,
    tier_interest: tierInterest,
    monthly_ice_hours_estimate: monthlyIceHours,
    currently_uses_bookingsystem: currentBookingSystem,
    notes,
    source,
    source_url: sourceUrl,
    status: 'new',
  });

  if (error) {
    // Log to console for me to see; show a friendly error to the user
    console.error('[launch-signup] supabase insert error', { error, contactEmail, orgName });
    return validationError(
      '',
      'We could not save your application right now. Please try again or email support@rinkstop.com directly.'
    );
  }

  return thankYouPage(orgName, contactName);
}
