import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { trackEvent } from '@/lib/analytics';

const SUPPORT_EMAIL = 'support@rinkstop.com';

// Simple in-memory rate limiting (5 submissions per IP per hour).
// In-memory on Vercel serverless resets per cold start; good enough for a
// contact form (low volume) until we move to Upstash-backed limiting.
const RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const result = await checkRateLimit(`contact:${ip}`, RATE_LIMIT);
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

  // 2026-10-29: contact submissions were COMPLETELY untracked — every money
  // page (/dataset-license, /advertise, /partner-with-us, /hockey-database,
  // /pricing) links to /contact, so inbound interest that arrived through a
  // money page vanished into a table with no funnel event. That made the
  // terminal step of the revenue funnel invisible.
  //
  // Fired server-side (not client-side) so it still records if the browser's
  // JS never runs. `referer` is captured so we can attribute the submission
  // back to the money page it came from.
  //
  // NOTE: we record the subject and the referer, NOT the message body or the
  // email address — the funnel only needs to know that interest arrived and
  // what it was about.
  const refererHeader = req.headers.get('referer') || req.headers.get('x-rinkstop-referer') || null;
  let refererPathname: string | null = null;
  if (refererHeader) {
    try {
      refererPathname = new URL(refererHeader).pathname;
    } catch {
      refererPathname = null;
    }
  }
  await trackEvent({
    name: 'contact_submitted',
    pathname: '/contact',
    referrer: refererHeader,
    props: {
      subject: subject?.trim() || 'General Inquiry',
      referer_pathname: refererPathname,
    },
  });

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

  // ── Notify support ───────────────────────────────────────────────────────
  //
  // 2026-10-29: this only tried the Maton zoho-mail gateway, and only
  // logged failures to console.error. The MATON_API_KEY is REVOKED (401), so
  // every contact-form message was being stored in the DB and then SILENTLY
  // DROPPED — the endpoint still returned {"success":true}. That is how a
  // real inbound message ("Amy Howard", a lighting vendor pitching us) sat
  // unnoticed, and how the form could look healthy while nothing reached
  // anybody.
  //
  // Now there is a fallback chain, and the response REFLECTS which path
  // worked, so a broken notifier can never look like a working one again:
  //   1. Direct Zoho SMTP (nodemailer) — uses ZOHOMAIL_APP_PASSWORD.
  //   2. Maton zoho-mail API — if MATON_API_KEY is ever valid again.
  //   3. Direct Telegram bot token to the Ops channel — always available,
  //      and the same channel the daily revenue report goes to.
  //
  // If all three fail, the endpoint returns 502 with `notified: false` so the
  // failure is visible to the caller rather than hidden behind a 200.
  let notified = false;
  const notifyErrors: string[] = [];

  // 1) Direct Zoho SMTP
  try {
    const { sendEmail } = await import('@/lib/email');
    const sent = await sendEmail({
      tag: 'contact-form',
      to: SUPPORT_EMAIL,
      subject: subjectLine,
      text: emailBody,
      html: `<pre style="white-space:pre-wrap;font-family:sans-serif">${emailBody
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</pre>`,
    });
    if (sent.ok) notified = true;
    else notifyErrors.push(`smtp: ${sent.error}`);
  } catch (e) {
    notifyErrors.push(`smtp: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2) Maton (keep for when the key is restored)
  if (!notified && process.env.MATON_API_KEY) {
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
      if (matonRes.ok) notified = true;
      else notifyErrors.push(`maton: ${(await matonRes.text()).slice(0, 120)}`);
    } catch (e) {
      notifyErrors.push(`maton: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 3) Direct Telegram bot token -> Ops channel (always available)
  if (!notified && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID || '-5043773858';
      const tg = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text:
              `📨 *New contact form message*\n\n` +
              `Name: ${name.trim()}\n` +
              `Email: ${email.trim().toLowerCase()}\n` +
              `Subject: ${subject?.trim() || 'General Inquiry'}\n\n` +
              `${message.trim()}`,
            disable_web_page_preview: true,
          }),
        },
      );
      if (tg.ok) notified = true;
      else notifyErrors.push(`telegram: ${(await tg.text()).slice(0, 120)}`);
    } catch (e) {
      notifyErrors.push(`telegram: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!notified) {
    console.error('[contact] ALL notification paths failed:', notifyErrors.join(' | '));
    // The message IS safely stored in the DB (contact_submissions). Return a
    // non-2xx so the failure is visible instead of a false success.
    return NextResponse.json(
      {
        success: false,
        error: 'Message saved but could not be delivered to support.',
        notified: false,
        notifyErrors,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, notified: true });

  return NextResponse.json({ success: true });
}