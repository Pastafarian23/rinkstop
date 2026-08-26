import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { checkRateLimit, getClientIP, applyRateLimitHeaders } from '@/lib/rateLimit';

const MATON_API_KEY = process.env.MATON_API_KEY;
if (!MATON_API_KEY) {
  throw new Error('MATON_API_KEY is not set');
}
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

  try {
    // Get the Telegram bot token from openclaw config
    const tokenRes = await fetch('https://gateway.maton.ai/telegram/bot-token', {
      headers: { Authorization: `Bearer ${MATON_API_KEY}` },
    });
    if (!tokenRes.ok) throw new Error('Could not get Telegram token');
    const { token } = await tokenRes.json();

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[listing-submit] Telegram notification failed:', err);
  }
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

  try {
    await fetch(`https://gateway.maton.ai/zoho-mail/api/accounts/${ZOHO_ACCOUNT_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MATON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[listing-submit] Email notification failed:', err);
  }
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