import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

// Simple in-memory rate limiting (10 submissions per IP per hour).
const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const result = await checkRateLimit(`newsletter-subscribe:${ip}`, RATE_LIMIT);
  maybeCleanup();

  if (!result.allowed) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Too many submissions. Please try again later.' }),
      { status: 429 }
    );
    applyRateLimitHeaders(response, result);
    response.headers.set('Content-Type', 'application/json');
    return response;
  }

  let body: { email: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  // Save to Supabase (uses the shared admin client — was previously using a
  // hardcoded placeholder URL that would have broken the endpoint. Fixes L1
  // from the 2026-06-11 security audit.)
  const { error: dbErr, data } = await supabaseAdmin
    .from('newsletter_subscribers')
    .upsert(
      { email: email.trim().toLowerCase() },
      { onConflict: 'email' }
    )
    .select()
    .single();

  if (dbErr) {
    console.error('Newsletter subscription DB error:', dbErr);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  // Check if this was a new subscription or update
  const isNew = data && data.subscribed_at && new Date(data.subscribed_at).getTime() === Date.now();

  return NextResponse.json({ 
    success: true, 
    message: isNew ? 'Successfully subscribed!' : 'Email already subscribed.',
    isNew
  });
}