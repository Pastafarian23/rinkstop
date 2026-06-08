import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || '';

// Verify Clerk webhook signature
function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('svix-signature') || '';
  const body = await request.text();

  // Verify signature
  if (WEBHOOK_SECRET && !verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: { type: string; data: Record<string, any> };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Handle user.created — create or update profile
  if (event.type === 'user.created' || event.type === 'user.updated') {
    const user = event.data;
    const userId = user.id;
    const primary_email = user.email_addresses?.find(
      (e: any) => e.id === user.primary_email_address_id
    );
    const email = primary_email?.email_address || '';
    const first_name = user.first_name || '';
    const last_name = user.last_name || '';
    const avatar_url = user.image_url || '';

    const display_name = [first_name, last_name].filter(Boolean).join(' ') || null;

    // Upsert into profiles table (service role — RLS would block this on anon key)
    const { error } = await supabaseAdmin.from('profiles').upsert(
      {
        user_id: userId,
        display_name: display_name,
        avatar_url: avatar_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Clerk webhook: profile upsert failed', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`Clerk webhook: synced user ${userId}`);
  }

  return NextResponse.json({ received: true });
}