import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { getAdminFromRequest } from '@/lib/admin-auth';

// Rate limit: 5 signups per 10 minutes per IP. Generous for legit users,
// tight enough to deter spam bots that hammer the endpoint.
const RATE_LIMIT = { maxRequests: 5, windowMs: 10 * 60 * 1000 };

// Honeypot field name. Bots fill all fields, humans don't see this one.
const HONEYPOT = 'website_url';

const VALID_SOURCES = [
  'state_rink_list',       // /free/[state]-rink-list landing
  'directory_index_banner', // inline banner on /directory/rinks
  'follow_team',            // follow button on team page
  'follow_player',          // follow button on player page
  'follow_rink',            // follow button on rink page
  'homepage_hero',          // generic homepage CTA
  'claim_cta',              // anonymous claim CTA
  'other',
];

const VALID_ROLES = ['parent', 'player', 'coach', 'fan', 'rink_owner', 'league_manager', null];

// RFC 5322 is overkill — this is a sensible email regex.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(ip, RATE_LIMIT);
  maybeCleanup();

  if (!result.allowed) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Too many signups from your IP. Please try again in a few minutes.' }),
      { status: 429 }
    );
    applyRateLimitHeaders(response, result);
    response.headers.set('Content-Type', 'application/json');
    return response;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const source = String(body.source || '').trim();
  const honeypot = String(body[HONEYPOT] || '').trim();
  const role = body.role ? String(body.role).trim() : null;
  const state = body.state ? String(body.state).trim() : null;
  const mag_source = body.mag_source ? String(body.mag_source).trim() : null;
  const referrer = request.headers.get('referer') || null;
  const user_agent = request.headers.get('user-agent') || null;

  // Honeypot: silently accept and return success to waste bot's time
  if (honeypot) {
    return NextResponse.json({ success: true, message: 'Subscribed.' }, { status: 200 });
  }

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (email.length > 254) {
    return NextResponse.json({ error: 'Email too long.' }, { status: 400 });
  }
  if (!source || !VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: 'Invalid source.' }, { status: 400 });
  }
  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }
  if (state && state.length > 100) {
    return NextResponse.json({ error: 'State too long.' }, { status: 400 });
  }

  // Upsert on (email, source) — same person signing up for two lead magnets
  // gets two rows (different sources). Same person signing up twice for the
  // same source = no duplicate.
  const { error } = await supabaseAdmin
    .from('leads')
    .upsert(
      {
        email,
        source,
        role,
        state,
        mag_source,
        ip,
        user_agent,
        referrer,
        status: 'subscribed',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email,source', ignoreDuplicates: true }
    );

  if (error) {
    console.error('leads POST: upsert failed', error);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }

  const response = NextResponse.json({
    success: true,
    message: 'Subscribed. Check your inbox.',
  });
  return applyRateLimitHeaders(response, result);
}

// GET is for the admin/dashboard only — return counts by source for the last 30 days.
// Requires admin auth (closes H2 from the 2026-06-11 security audit — the previous
// "behind the Vercel firewall" comment was incorrect; the route was open to anyone).
export async function GET() {
  const admin = await getAdminFromRequest();
  if ('response' in admin) return admin.response;

  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('source')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.source] = (counts[row.source] || 0) + 1;
  }

  return NextResponse.json({
    total_30d: data?.length || 0,
    by_source: counts,
  });
}
