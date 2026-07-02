import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

// POST /api/leads/listing-inquiry
// Body: { listing_type, listing_id, submitter_name, email, submitter_phone?, message, website_url? }
// Behavior:
//   1. Verify the listing has an active approved claim by a Pro-tier user.
//   2. Insert a row into `leads` with source = listing_inquiry_<type>.
//   3. Return success.
//
// GET /api/leads/listing-inquiry
//   Authed user gets their own received inquiries (claimant_user_id = auth.userId).
//   Returns: { inquiries: [...] } ordered by created_at desc.

const RL = { maxRequests: 5, windowMs: 10 * 60 * 1000 };
const HONEYPOT = 'website_url';
const VALID_TYPES = ['rink', 'team', 'league'] as const;
type ListingType = (typeof VALID_TYPES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function getSourceForType(t: ListingType): string {
  return `listing_inquiry_${t}`;
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`listing-inquiry:${ip}`, RL);
  maybeCleanup();

  if (!result.allowed) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Too many submissions from your IP. Please try again in a few minutes.' }),
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

  const listing_type = String(body.listing_type || '').trim() as ListingType;
  const listing_id = String(body.listing_id || '').trim();
  const submitter_name = String(body.submitter_name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const submitter_phone = body.submitter_phone ? String(body.submitter_phone).trim() : null;
  const message = String(body.message || '').trim();
  const honeypot = String(body[HONEYPOT] || '').trim();
  const user_agent = request.headers.get('user-agent') || null;
  const referrer = request.headers.get('referer') || null;

  // Honeypot: silently accept and return success
  if (honeypot) {
    return NextResponse.json({ success: true, message: 'Sent.' }, { status: 200 });
  }

  // Validation
  if (!VALID_TYPES.includes(listing_type)) {
    return NextResponse.json({ error: 'Invalid listing_type.' }, { status: 400 });
  }
  if (!listing_id) {
    return NextResponse.json({ error: 'listing_id required.' }, { status: 400 });
  }
  if (!submitter_name || submitter_name.length > 200) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });
  }
  if (submitter_phone && submitter_phone.length > 50) {
    return NextResponse.json({ error: 'Phone number too long.' }, { status: 400 });
  }
  if (!message || message.length < 10) {
    return NextResponse.json({ error: 'Please add a short message (at least 10 characters).' }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: 'Message too long (max 4000 characters).' }, { status: 400 });
  }

  // Look up the listing's active approved claim, then verify the claimer is Pro tier.
  // Leagues are not a first-class claim type today, so we skip the gate for leagues
  // (or you can wire league claims later — see the claim endpoint for context).
  if (listing_type !== 'league') {
    const { data: claimRow, error: claimErr } = await supabaseAdmin
      .from('claims')
      .select('id, user_id')
      .eq('claim_type', listing_type)
      .eq('entity_id', listing_id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (claimErr) {
      console.error('listing-inquiry POST: claim lookup failed', claimErr);
      return NextResponse.json({ error: 'Failed to verify listing.' }, { status: 500 });
    }

    if (!claimRow) {
      // No active claim — don't reveal whether the listing exists, but the form
      // shouldn't be visible on unclaimed listings anyway. Return a generic error.
      return NextResponse.json({ error: 'This listing is not currently accepting inquiries.' }, { status: 404 });
    }

    // Lead capture is activity-gated, not tier-gated: any active claim renders
    // the form and accepts inquiries. Per SPEC 2026-06-17, we removed the
    // "Pro tier required" gate so a $19.99 Roster running a single rink
    // gets the same lead pipeline as a $299 Business Plus running 25 listings.

    // Get listing name for denormalized display
    const listingTable = listing_type === 'rink' ? 'rinks' : 'teams';
    const { data: listingRow } = await supabaseAdmin
      .from(listingTable)
      .select('name')
      .eq('id', listing_id)
      .maybeSingle();

    const { error: insertErr } = await supabaseAdmin
      .from('leads')
      .insert({
        email,
        source: getSourceForType(listing_type),
        listing_id,
        listing_type,
        listing_name: listingRow?.name || null,
        claimant_user_id: claimRow.user_id,
        submitter_name,
        submitter_phone,
        message,
        ip,
        user_agent,
        referrer,
        status: 'new',
      });

    if (insertErr) {
      console.error('listing-inquiry POST: insert failed', insertErr);
      return NextResponse.json({ error: 'Failed to send inquiry. Please try again.' }, { status: 500 });
    }
  } else {
    // Leagues — no claim system today, reject for now.
    return NextResponse.json({ error: 'League inquiries are not yet supported.' }, { status: 501 });
  }

  const response = NextResponse.json({
    success: true,
    message: 'Your inquiry was sent.',
  });
  return applyRateLimitHeaders(response, result);
}

export async function GET() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, listing_type, listing_id, listing_name, submitter_name, email, submitter_phone, message, status, created_at, read_at')
    .eq('claimant_user_id', userId)
    .in('source', ['listing_inquiry_rink', 'listing_inquiry_team'])
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('listing-inquiry GET: query failed', error);
    return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 });
  }

  return NextResponse.json({ inquiries: data || [] });
}
