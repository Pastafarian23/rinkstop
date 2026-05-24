import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://placeholder.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SB_SECRET!;
const SUPPORT_EMAIL = 'support@rinkstop.com';

// Simple in-memory rate limiting (5 submissions per IP per hour)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, max = 5, windowMs = 3600000): boolean {
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

  // Save to Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { error: dbErr } = await supabase.from('contact_submissions').insert({
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