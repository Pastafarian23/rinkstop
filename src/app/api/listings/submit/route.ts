import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { checkRateLimit, getClientIP, applyRateLimitHeaders } from '@/lib/rateLimit';

// Env validation deferred to first request: module-scope throws break
// next build's "Collecting page data" phase.
const MATON_API_KEY = process.env.MATON_API_KEY;
const ZOHO_ACCOUNT_ID = '2958661000000008002';
// OWASP A05 audit 2026-08-26: chat_id was hardcoded — moved to env var
// so the Telegram notify target can be rotated without a code change.
const TELEGRAM_NOTIFY_CHAT_ID = process.env.TELEGRAM_NOTIFY_CHAT_ID || '6543104235';

async function sendTelegramNotification(submission: {
  listingType: string;
  name: string;
  city: string;
  country: string;
  website: string;
  description: string;
  email: string;
  id: string;
}) {
  const status = `📥 **NEW LISTING SUBMISSION**\n\n`;
  const details = [
    `🆔 ID: \`${submission.id}\``,
    `📋 Type: ${submission.listingType}`,
    `🏷️ Name: ${submission.name}`,
    submission.city ? `📍 City: ${submission.city}` : null,
    submission.country ? `🌍 Country: ${submission.country}` : null,
    submission.website ? `🔗 Website: ${submission.website}` : null,
    submission.description ? `📝 Description: ${submission.description}` : null,
    `📧 Submitter Email: ${submission.email}`,
    `⏰ Status: pending`,
  ].filter(Boolean).join('\n');

  const payload = {
    chat_id: TELEGRAM_NOTIFY_CHAT_ID,
    text: `${status}${details}`,
    parse_mode: 'Markdown',
  };

  // 2026-10-29: this ONLY fetched the bot token via the Maton gateway, whose
  // API key is revoked (401). So the "new listing submission" Telegram ping
  // has been silently failing — and because the failure was swallowed, the
  // daily revenue report showed "2 submissions, 0 replied to" with no
  // indication that the notification channel itself was dead.
  //
  // Now: prefer the DIRECT bot token (TELEGRAM_BOT_TOKEN, already set in
  // Vercel and used by other cron routes), and fall back to the Maton path in
  // case that key is ever restored.
  const errors: string[] = [];
  const directToken = process.env.TELEGRAM_BOT_TOKEN;
  if (directToken) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${directToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return;
      errors.push(`direct: ${(await res.text()).slice(0, 120)}`);
    } catch (err) {
      errors.push(`direct: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  try {
    // Fallback: Maton gateway (in case its key is restored).
    const tokenRes = await fetch('https://gateway.maton.ai/telegram/bot-token', {
      headers: { Authorization: `Bearer ${MATON_API_KEY}` },
    });
    if (!tokenRes.ok) throw new Error(`Could not get Telegram token: ${tokenRes.status}`);
    const { token } = await tokenRes.json();

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) errors.push(`maton: ${(await res.text()).slice(0, 120)}`);
  } catch (err) {
    errors.push(`maton: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.error('[listing-submit] Telegram notification failed:', errors.join(' | '));
}

async function sendEmailNotification(submission: {
  listingType: string;
  name: string;
  city: string;
  country: string;
  website: string;
  description: string;
  email: string;
  id: string;
}) {
  const subject = `New Listing Submission: ${submission.name} (${submission.listingType})`;
  const body = `
New listing submitted to RinkStop:

Type: ${submission.listingType}
Name: ${submission.name}
${submission.city ? `City: ${submission.city}` : ''}
${submission.country ? `Country: ${submission.country}` : ''}
${submission.website ? `Website: ${submission.website}` : ''}
${submission.description ? `Description: ${submission.description}` : ''}

Submitter Email: ${submission.email}
Submission ID: ${submission.id}
Status: pending

Review in Supabase → listing_submissions table.
  `.trim();

  const payload = {
    to: [{ email: 'arnellarracas@gmail.com', name: 'Arnel Larracas' }],
    subject,
    body,
  };

  // 2026-10-29: this only tried the Maton zoho-mail gateway, whose API key
  // is revoked (401). The "new listing submission" email to Arnel was
  // therefore never delivered — silently, because the fetch's response was
  // never checked. Arnel learned about the two real leads only because I
  // queried the database directly.
  //
  // Now: direct SMTP first (the same helper every other route uses), with
  // the Maton path kept as a fallback for when its key is restored.
  const errors: string[] = [];
  try {
    const { sendEmail } = await import('@/lib/email');
    const sent = await sendEmail({
      tag: 'listing-submission-admin',
      to: 'arnellarracas@gmail.com',
      subject,
      text: body,
      html: `<pre style="white-space:pre-wrap;font-family:sans-serif">${body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</pre>`,
    });
    if (sent.ok) return;
    errors.push(`smtp: ${sent.error}`);
  } catch (err) {
    errors.push(`smtp: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const res = await fetch(
      `https://gateway.maton.ai/zoho-mail/api/accounts/${ZOHO_ACCOUNT_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MATON_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) errors.push(`maton: ${(await res.text()).slice(0, 120)}`);
  } catch (err) {
    errors.push(`maton: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.error('[listing-submit] Email notification failed:', errors.join(' | '));
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 submissions per IP per hour. This is a public endpoint that
  // writes to the DB and sends Telegram + email notifications — unrate-limited
  // it can be trivially abused to spam admins.
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`listings-submit:${ip}`, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  });
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfter },
      { status: 429 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  try {
    const body = await request.json();
    const { listingType, name, city, country, website, description, email } = body;

    if (!listingType || !name || !email) {
      return NextResponse.json({ error: 'Listing type, name, and email are required.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('listing_submissions')
      .insert({
        listing_type: listingType,
        name,
        city: city || null,
        country: country || null,
        website: website || null,
        description: description || null,
        email,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to submit listing. Please try again.' }, { status: 500 });
    }

    // Send notifications in parallel (don't block the response)
    const submission = { listingType, name, city, country, website, description, email, id: data.id };
    sendTelegramNotification(submission);
    sendEmailNotification(submission);

    // Confirmation to the submitter (best-effort, async).
    void sendEmail({
      to: email,
      subject: `We got your ${listingType} submission`,
      template: 'listing-submission-confirmation',
      data: {
        listingType,
        name,
        submissionId: data.id,
      },
      tag: 'listing-confirmation',
    });

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err) {
    console.error('Submit listing error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}