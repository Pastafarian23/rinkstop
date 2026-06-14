import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'edge';

/**
 * POST /api/email-capture
 * Captures a soft-signup intent: email + context (entity, intent, source page).
 * Used to follow up with users who haven't completed account creation.
 *
 * Body: { email, entityType?, entityId?, intent, sourcePath?, sourceUrl? }
 * Returns: { id } on success, { error } on failure
 *
 * Idempotent: if the email already exists, returns the existing record (no duplicate).
 * This means users can update their intent without errors.
 */
export async function POST(req: NextRequest) {
  let body: {
    email?: string;
    entityType?: string;
    entityId?: string;
    intent?: string;
    sourcePath?: string;
    sourceUrl?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, entityType, entityId, intent, sourcePath, sourceUrl } = body;

  // Basic email validation
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // Whitelist valid entity types and intents
  const VALID_ENTITY_TYPES = ['rink', 'team', 'player', 'league', 'business', 'user'];
  const VALID_INTENTS = [
    'follow', 'save', 'message', 'email_capture',
    'newsletter', 'tryout_reminder', 'schedule_alert',
  ];

  if (entityType && !VALID_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 });
  }
  if (intent && !VALID_INTENTS.includes(intent)) {
    return NextResponse.json({ error: 'Invalid intent' }, { status: 400 });
  }

  const resolvedIntent = intent || 'email_capture';

  const resolvedSourcePath = sourcePath || req.nextUrl.pathname;
  const resolvedSourceUrl =
    sourceUrl ||
    `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host') || 'rinkstop.com'}${resolvedSourcePath}`;

  const clerkUserId = req.headers.get('x-clerk-user-id') || undefined;

  try {
    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('email_captures')
      .upsert(
        {
          email: email.trim().toLowerCase(),
          entity_type: entityType || null,
          entity_id: entityId || null,
          intent: resolvedIntent,
          source_path: resolvedSourcePath,
          source_url: resolvedSourceUrl,
          email_verified: false,
          clerk_user_id: clerkUserId || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email', ignoreDuplicates: false },
      )
      .select('id')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('email_captures')
          .select('id')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();
        return NextResponse.json({ id: existing?.id, updated: true }, { status: 200 });
      }
      console.error('[email-capture] Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ id: data?.id }, { status: 200 });
  } catch (err) {
    console.error('[email-capture] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/email-capture
 * Returns whether an email is already captured (for UX feedback).
 * Does NOT expose the full record (privacy).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 });
  }

  try {
    const supabase = supabaseAdmin;
    const { data } = await supabase
      .from('email_captures')
      .select('id, created_at')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    return NextResponse.json({ captured: !!data, createdAt: data?.created_at || null });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
