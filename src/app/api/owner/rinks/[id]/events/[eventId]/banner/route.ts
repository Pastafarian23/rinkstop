// src/app/api/owner/rinks/[id]/events/[eventId]/banner/route.ts
//
// WS17 PR3b - Owner event banner upload.
//
//   POST /api/owner/rinks/[id]/events/[eventId]/banner
//
// Upload a banner image for an event. Accepts JPEG, PNG, WebP up to 5 MB.
// Stores to Supabase Storage bucket 'event-banners'. Returns the public URL.
// RLS-gated: signed-in user must own the rink.

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 20, windowMs: 60 * 1000 };
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(['image/jpeg','image/png','image/webp']);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const rl = await checkRateLimit(`owner-banner-upload:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id, eventId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  // Verify the event belongs to this rink
  const { data: event } = await supabaseAdmin
    .from('rink_events')
    .select('id, slug')
    .eq('id', eventId)
    .eq('rink_id', owner.owner.rinkId)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be JSON.');
  }

  const b = body as { data?: string; filename?: string; contentType?: string };
  if (!b.data || typeof b.data !== 'string') {
    return badRequest('data (base64) is required.');
  }

  // Decode base64 to check content type and size
  let buffer: Buffer;
  try {
    const base64 = b.data.replace(/^data:[^;]+;base64,/, '');
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return badRequest('Invalid base64 data.');
  }

  if (buffer.length === 0) return badRequest('Empty file.');
  if (buffer.length > MAX_BYTES) return badRequest('File exceeds 5 MB limit.');

  const contentType = ALLOWED_TYPES.has(b.contentType as string) ? (b.contentType as string) : 'application/octet-stream';
  if (!ALLOWED_TYPES.has(contentType)) {
    return badRequest(`Unsupported file type: ${contentType}. Use JPEG, PNG, or WebP.`);
  }

  const ext = contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/png' ? 'png' : 'webp';
  const filename = `banner-${event.slug}-${Date.now()}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from('event-banners')
    .upload(filename, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error('[owner-banner] upload failed', uploadError);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('event-banners')
    .getPublicUrl(uploadData.path);

  // Update the event's banner_image_url
  await supabaseAdmin
    .from('rink_events')
    .update({ banner_image_url: urlData.publicUrl })
    .eq('id', eventId)
    .eq('rink_id', owner.owner.rinkId);

  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
}
