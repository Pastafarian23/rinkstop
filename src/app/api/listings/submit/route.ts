import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const MATON_API_KEY = '***REMOVED***';
const ZOHO_ACCOUNT_ID = '2958661000000008002';

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
    chat_id: '6543104235',
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

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err) {
    console.error('Submit listing error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}