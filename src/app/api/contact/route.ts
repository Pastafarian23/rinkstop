import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const SUPPORT_EMAIL = 'support@rinkstop.com';

// Simple in-memory rate limiting (5 submissions per IP per hour).
// In-memory on Vercel serverless resets per cold start; good enough for a
// contact form (low volume) until we move to Upstash-backed limiting.
const RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const result = await checkRateLimit(ip, RATE_LIMIT);
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

  let body: { name: string; email: string; subject?: string; message: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, email, subject, message } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  if (message.length > 5000) {
    return NextResponse.json({ error: 'Message too long (max 5000 characters).' }, { status: 400 });
  }

  // Save to Supabase (uses the shared admin client — was previously using a
  // hardcoded placeholder URL + `process.env.SB_SECRET!` which was a typo and
  // silently failed. Fixes M6 from the 2026-06-11 security audit.)
  const { error: dbErr } = await supabaseAdmin.from('contact_submissions').insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject: subject?.trim() || 'General Inquiry',
    message: message.trim(),
    status: 'new',
  });

  if (dbErr) {
    console.error('Contact form DB error:', dbErr);
  }

  // Forward to support email via Maton email API
  const subjectLine = subject ? `[RinkStop] ${subject}` : '[RinkStop] New Contact Form Submission';
  const emailBody = `
New message from RinkStop Contact Form

Name: ${name.trim()}
Email: ${email.trim().toLowerCase()}
Subject: ${subject?.trim() || 'General Inquiry'}

Message:
${message.trim()}
  `.trim();

  try {
    const matonRes = await fetch('https://gateway.maton.ai/zoho-mail/api/v1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MATON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { address: 'info@sativaexchange.com' },
        to: [{ email_address: SUPPORT_EMAIL }],
        subject: subjectLine,
        body: emailBody,
      }),
    });

    if (!matonRes.ok) {
      const errText = await matonRes.text();
      console.error('Maton email send failed:', errText);
    }
  } catch (e) {
    console.error('Failed to send email via Maton:', e);
  }

  return NextResponse.json({ success: true });
}