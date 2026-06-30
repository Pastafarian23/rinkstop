import { NextResponse, NextRequest } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/profile-debug
 *
 * Returns what the server thinks the signed-in user is, in three layers:
 *   1. Clerk session-level identity (who you are, regardless of Clerk user row)
 *   2. Supabase `profiles` row for the signed-in Clerk user_id
 *   3. Match against OWNER_EMAILS + any duplicate profile rows for the same email
 *
 * This is the diagnostic endpoint for resolving "which Clerk account am I?"
 * confusion, e.g. when OAuth sign-in produces a fresh Clerk user instead of
 * linking to the existing email-based one.
 *
 * Safe to expose: returns only what the caller already has access to (their
 * own Clerk user data + their own Supabase profile). Public users calling
 * without a session get a 401.
 */
export const dynamic = 'force-dynamic';

const OWNER_EMAILS = new Set([
  'arnellarracas@gmail.com',
]);

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cu = await currentUser();
  const primaryEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const username = cu?.username || '';
  const displayName = [cu?.firstName, cu?.lastName].filter(Boolean).join(' ');
  const lastSignInAt = cu?.lastSignInAt ? new Date(cu.lastSignInAt).toISOString() : null;
  const clerkCreatedAt = cu?.createdAt ? new Date(cu.createdAt).toISOString() : null;
  const publicMeta = cu?.publicMetadata || {};

  // Fetch the profile row tied to this Clerk user_id
  const { data: myProfile } = await supabaseAdmin
    .from('profiles')
    .select('user_id, role, tier, subscription_status, is_founding_member, tier_expires_at, display_name, email, username, location')
    .eq('user_id', userId)
    .maybeSingle();

  // If the signed-in email is in OWNER_EMAILS, also list ALL profile rows
  // that match the email or display_name "Arnel Larracas" — surfaces any
  // ghost duplicates so we can decide which to keep.
  let duplicateProfiles: any[] = [];
  if (OWNER_EMAILS.has(primaryEmail)) {
    const { data: byName } = await supabaseAdmin
      .from('profiles')
      .select('user_id, role, tier, subscription_status, is_founding_member, display_name, username, location, updated_at')
      .eq('display_name', 'Arnel Larracas')
      .order('updated_at', { ascending: false });
    duplicateProfiles = byName || [];
  }

  // Compute the dashboard's effective state under the current code, so the
  // caller can see exactly which render branch fires for them right now.
  const isFounderByRole = myProfile?.role === 'super_admin';
  const isFounderByEmail = OWNER_EMAILS.has(primaryEmail);
  const effectiveIsFounder = isFounderByRole || isFounderByEmail;
  const effectiveIsSuperAdmin = isFounderByRole || isFounderByEmail;

  return NextResponse.json({
    clerk_session: {
      userId,
      primaryEmail,
      username,
      displayName,
      clerkCreatedAt,
      lastSignInAt,
      publicMetadata: publicMeta,
    },
    profiles_row_for_this_user: myProfile || null,
    duplicate_profiles_for_owner_email: OWNER_EMAILS.has(primaryEmail) ? duplicateProfiles : undefined,
    effective_flags: {
      isSuperAdmin: effectiveIsSuperAdmin,
      isFounder: effectiveIsFounder,
      isFounderByRole,
      isFounderByEmail,
    },
    note:
      'If effective_flags.isFounder is true but you still see "Founding Member" in the dashboard, hard-refresh (Cmd/Ctrl+Shift+R). Vercel Edge caches dashboard route responses briefly. If still wrong after refresh, the deploy has not propagated — give the build ~30s.',
  });
}
