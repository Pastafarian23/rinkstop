import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 1000 };

const VALID_SUBJECTS = [
  'general',
  'incorrect_info',
  'claim_listing',
  'bug',
  'partnership',
  'other',
] as const;
type Subject = (typeof VALID_SUBJECTS)[number];

const SUBJECT_LABELS: Record<Subject, string> = {
  general: 'General question',
  incorrect_info: 'Report incorrect information',
  claim_listing: 'Claim a listing',
  bug: 'Report a bug',
  partnership: 'Business partnership',
  other: 'Other',
};

function isValidSubject(s: unknown): s is Subject {
  return typeof s === 'string' && (VALID_SUBJECTS as readonly string[]).includes(s);
}

// POST /api/support — submit a support ticket
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`support:${ip}`, RATE_LIMIT);
  maybeCleanup();

  const { userId } = await auth();
  let email = '';
  let name = '';

  if (userId) {
    // Logged-in user: pull verified email/name from Clerk
    const user = await currentUser();
    email = user?.emailAddresses?.[0]?.emailAddress || '';
    name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  }

  let body: { subject?: string; message?: string; email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    return applyRateLimitHeaders(res, result);
  }

  if (!isValidSubject(body.subject)) {
    const res = NextResponse.json(
      { error: `subject must be one of: ${VALID_SUBJECTS.join(', ')}` },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, result);
  }
  const message = (body.message || '').trim();
  if (message.length < 5) {
    const res = NextResponse.json({ error: 'Message is too short.' }, { status: 400 });
    return applyRateLimitHeaders(res, result);
  }
  if (message.length > 5000) {
    const res = NextResponse.json({ error: 'Message is too long (5000 max).' }, { status: 400 });
    return applyRateLimitHeaders(res, result);
  }

  // If not logged in, require an email
  if (!userId) {
    email = (body.email || '').trim();
    name = (body.name || '').trim();
    if (!email || !email.includes('@')) {
      const res = NextResponse.json(
        { error: 'Email is required when not signed in.' },
        { status: 400 }
      );
      return applyRateLimitHeaders(res, result);
    }
  }

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      user_id: userId,
      email,
      name: name || null,
      subject: body.subject,
      message,
      status: 'open',
    })
    .select('id, created_at')
    .maybeSingle();

  if (error) {
    console.error('support: insert failed', error);
    const res = NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 });
    return applyRateLimitHeaders(res, result);
  }

  const res = NextResponse.json({
    success: true,
    ticket: { id: data?.id, created_at: data?.created_at },
  });
  return applyRateLimitHeaders(res, result);
}

// GET /api/support — list current user's tickets
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`support:${ip}`, RATE_LIMIT);
  maybeCleanup();

  const { userId } = await auth();
  if (!userId) {
    const res = NextResponse.json({ tickets: [] });
    return applyRateLimitHeaders(res, result);
  }

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('id, subject, message, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    const res = NextResponse.json({ error: 'Lookup failed.' }, { status: 500 });
    return applyRateLimitHeaders(res, result);
  }

  const res = NextResponse.json({ tickets: data || [] });
  return applyRateLimitHeaders(res, result);
}
