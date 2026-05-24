import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Simple in-memory rate limiting (10 submissions per IP per hour)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, max = 10, windowMs = 3600000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (entry && entry.resetAt > now && entry.count >= max) return false;
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
  } else {
    entry.count++;
  }
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    );
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

  // Save to Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { error: dbErr, data } = await supabase
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
<<<<<<< Updated upstream
}// Force redeploy - Wed May 20 15:12:59 UTC 2026
=======
}
>>>>>>> Stashed changes
