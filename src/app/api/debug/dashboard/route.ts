/**
 * DEBUG-ONLY: traces the dashboard layout code path to identify the source of
 * the 500. Returns the full error stack as JSON so we can see exactly what's
 * crashing server-side. Safe to keep — only exposes info about the calling
 * session, and the user already has full access to their own data via Clerk.
 *
 * DELETE THIS FILE once the dashboard is fixed.
 */
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const log: Array<{ step: string; ok: boolean; err?: string; data?: unknown }> = [];

  // Step 1: auth()
  let userId: string | null = null;
  try {
    const a = await auth();
    userId = a.userId;
    log.push({ step: 'auth()', ok: !!userId, data: { userId, sessionId: a.sessionId } });
  } catch (e: any) {
    log.push({ step: 'auth()', ok: false, err: e?.message || String(e) });
    return NextResponse.json({ log }, { status: 500 });
  }

  if (!userId) {
    return NextResponse.json({ log, msg: 'no userId' }, { status: 401 });
  }

  // Step 2: currentUser()
  try {
    const u = await currentUser();
    log.push({
      step: 'currentUser()',
      ok: !!u,
      data: {
        firstName: u?.firstName,
        lastName: u?.lastName,
        email: u?.emailAddresses?.[0]?.emailAddress,
        hasImage: !!u?.imageUrl,
        publicMetadata: u?.publicMetadata,
      },
    });
  } catch (e: any) {
    log.push({ step: 'currentUser()', ok: false, err: e?.message || String(e) });
    return NextResponse.json({ log, msg: 'currentUser() threw' }, { status: 500 });
  }

  // Step 3: profiles.role lookup (the same one the layout does)
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    log.push({
      step: 'profiles.role lookup',
      ok: !error,
      data: { role: data?.role },
      err: error?.message,
    });
  } catch (e: any) {
    log.push({ step: 'profiles.role lookup', ok: false, err: e?.message || String(e) });
  }

  // Step 4: connections pending count
  try {
    const { count, error } = await supabaseAdmin
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .eq('status', 'pending')
      .neq('initiated_by', userId);
    log.push({
      step: 'connections pending count',
      ok: !error,
      data: { count },
      err: error?.message,
    });
  } catch (e: any) {
    log.push({ step: 'connections pending count', ok: false, err: e?.message || String(e) });
  }

  // Step 5: connections accepted (used to find threads for unread count)
  try {
    const { data, error } = await supabaseAdmin
      .from('connections')
      .select('id')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .eq('status', 'accepted');
    log.push({
      step: 'connections accepted',
      ok: !error,
      data: { count: data?.length ?? 0, sample: data?.slice(0, 3) },
      err: error?.message,
    });
  } catch (e: any) {
    log.push({ step: 'connections accepted', ok: false, err: e?.message || String(e) });
  }

  // Step 6: profile_account_types (business check)
  try {
    const { count, error } = await supabaseAdmin
      .from('profile_account_types')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('account_type', 'business');
    log.push({
      step: 'profile_account_types business check',
      ok: !error,
      data: { count },
      err: error?.message,
    });
  } catch (e: any) {
    log.push({ step: 'profile_account_types business check', ok: false, err: e?.message || String(e) });
  }

  return NextResponse.json({ log, userId, msg: 'all steps completed' });
}
