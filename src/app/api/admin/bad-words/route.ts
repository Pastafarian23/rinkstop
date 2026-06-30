/**
 * src/app/api/admin/bad-words/route.ts
 *
 * GET  /api/admin/bad-words
 *   List bad_words with filters (?severity=hard|soft&search=xxx)
 *
 * PATCH /api/admin/bad-words
 *   Update severity of a word.
 *   Body: { id: uuid, severity: 'hard' | 'soft' }
 *
 * POST /api/admin/bad-words
 *   Add a new bad word.
 *   Body: { word: string, severity: 'hard' | 'soft', category?: string }
 *
 * DELETE /api/admin/bad-words
 *   Remove a bad word.
 *   Body: { id: uuid }
 *
 * Admin only. Service-role reads/writes. Same admin gate as
 * /api/admin/username-review.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = new Set([
  'arnellarracas@gmail.com',
  'support@rinkstop.com',
]);

async function requireAdmin(): Promise<{ userId: string } | { error: NextResponse }> {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, _deprecated_account_type, user_id')
    .eq('user_id', userId)
    .maybeSingle();
  const isSuper = profile?.role === 'super_admin' || profile?._deprecated_account_type === 'super_admin';
  if (!isSuper) {
    const user = await currentUser();
    const email = (user as any)?.emailAddresses?.[0]?.emailAddress;
    if (!email || !ADMIN_EMAILS.has(email)) {
      return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
    }
  }
  return { userId };
}

export async function GET(req: NextRequest) {
  const authz = await requireAdmin();
  if ('error' in authz) return authz.error;

  const { searchParams } = new URL(req.url);
  const severity = searchParams.get('severity');
  const search = searchParams.get('search')?.toLowerCase();

  let query = supabaseAdmin
    .from('bad_words')
    .select('id, word, severity, category, notes, created_at')
    .order('word');

  if (severity && ['hard', 'soft'].includes(severity)) {
    query = query.eq('severity', severity);
  }
  if (search) {
    query = query.ilike('word', `%${search}%`);
  }

  const { data, error } = await query.limit(500);
  if (error) {
    return NextResponse.json({ error: 'read_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data, count: data?.length ?? 0 });
}

export async function PATCH(req: NextRequest) {
  const authz = await requireAdmin();
  if ('error' in authz) return authz.error;

  const body = await req.json();
  const { id, severity } = body;
  if (!id || !['hard', 'soft'].includes(severity)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('bad_words')
    .update({ severity })
    .eq('id', id)
    .select('id, word, severity')
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, item: data });
}

export async function POST(req: NextRequest) {
  const authz = await requireAdmin();
  if ('error' in authz) return authz.error;

  const body = await req.json();
  const { word, severity, category, notes } = body;
  if (!word || typeof word !== 'string' || !['hard', 'soft'].includes(severity)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const normalized = word.toLowerCase().trim();
  if (normalized.length < 2) {
    return NextResponse.json({ error: 'word_too_short' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('bad_words')
    .upsert(
      { word: normalized, severity, category: category || 'profanity', notes: notes || null },
      { onConflict: 'word' },
    )
    .select('id, word, severity, category, notes')
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(req: NextRequest) {
  const authz = await requireAdmin();
  if ('error' in authz) return authz.error;

  const body = await req.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('bad_words')
    .delete()
    .eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
