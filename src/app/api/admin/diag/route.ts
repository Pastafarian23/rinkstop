/**
 * One-time admin diagnostic endpoint.
 *
 * Returns the full state the dashboard layout sees for the current user:
 *   - Clerk userId + email
 *   - Clerk publicMetadata.role (live from Clerk API)
 *   - Supabase profiles.role + tier + is_founding_member
 *   - isAdmin / isSuperAdmin booleans (what the layout computes)
 *
 * This route is auth-gated by requireAdmin so it can only be hit by an
 * existing admin. If the user is signed in but NOT admin, it returns 403
 * with the same diagnostic info so we can see what Clerk/Supabase say.
 */
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await auth();
  if (!session.userId) {
    return Response.json(
      { error: 'not signed in', sessionClaims: session.sessionClaims ?? null },
      { status: 401 }
    );
  }

  const user = await currentUser();
  if (!user) {
    return Response.json(
      { error: 'currentUser() returned null despite having userId', userId: session.userId },
      { status: 500 }
    );
  }

  const clerkRole = (user.publicMetadata as any)?.role as string | undefined;
  const email = user.emailAddresses[0]?.emailAddress || '';

  // Look up Supabase profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, tier, is_founding_member, display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const profileRole = profile?.role || null;
  const isSuperAdmin = clerkRole === 'super_admin' || profileRole === 'super_admin';
  const isAdmin =
    isSuperAdmin || clerkRole === 'admin' || profileRole === 'admin';

  return Response.json({
    userId: user.id,
    email,
    clerk: {
      role: clerkRole ?? null,
      publicMetadata: user.publicMetadata,
    },
    supabase: {
      role: profileRole,
      tier: profile?.tier ?? null,
      is_founding_member: profile?.is_founding_member ?? null,
      display_name: profile?.display_name ?? null,
    },
    computed: {
      isSuperAdmin,
      isAdmin,
      adminLinkWillShow: isAdmin,
    },
    debug: {
      instance: process.env.CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_')
        ? 'PROD'
        : process.env.CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_')
        ? 'DEV'
        : 'UNKNOWN',
      sessionUserId: session.userId,
      sessionClaims: session.sessionClaims ?? null,
    },
  });
}
