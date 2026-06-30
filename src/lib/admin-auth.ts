import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export type AdminRole = 'admin' | 'super_admin';

/**
 * Canonical owner emails. Sign-ins with these emails get super_admin-level
 * access regardless of profiles.role or Clerk publicMetadata.role, as long as
 * they pass the regular Clerk session check. This is the God-mode fallback
 * for the case where Clerk OAuth creates a duplicate user (account-linking
 * off) and the new profile row has no role assigned.
 *
 * Keep this set SMALL. Each entry is a God-mode credential; only the actual
 * project owner(s) belong here.
 *
 * Single source of truth — also used by dashboard/page.tsx and
 * dashboard/layout.tsx. Update here, not at the call sites.
 */
export const OWNER_EMAILS: ReadonlySet<string> = new Set([
  'arnellarracas@gmail.com',
]);

interface AdminContext {
  userId: string;
  email: string;
  role: AdminRole;
  isSuperAdmin: boolean;
}

/**
 * Server-side guard for /admin routes and /api/admin endpoints.
 *
 * Flow:
 *  1. Require Clerk session (redirects to /login if not signed in)
 *  2. Check OWNER_EMAILS — God-mode bypass for the project owner regardless
 *     of Clerk/Supabase role state
 *  3. Check Clerk publicMetadata.role — source of truth for fast checks
 *  4. If not set there, check profiles.role in Supabase (fallback)
 *  5. If none match, redirect to /login?error=admin_only
 *
 * The publicMetadata is the source of truth because:
 *  - It's set once via Clerk dashboard/API and never changes automatically
 *  - It's available in the JWT session - no DB query needed
 *  - It's managed outside the app, so even DB compromise can't escalate roles
 */
export async function requireAdmin(): Promise<AdminContext> {
  const session = await auth();
  if (!session.userId) {
    redirect('/login?error=admin_only');
  }

  const user = await currentUser();
  if (!user) {
    redirect('/login?error=admin_only');
  }

  const email = user.emailAddresses[0]?.emailAddress || '';
  const metaRole = (user.publicMetadata?.role as string) || '';

  // OWNER_EMAILS bypass — God-mode fallback for the project owner. If their
  // Clerk publicMetadata or profiles.role gets wiped (e.g. webhook overwrote
  // a fresh duplicate Clerk user), they still get super_admin via this path.
  if (OWNER_EMAILS.has(email)) {
    return {
      userId: session.userId,
      email,
      role: 'super_admin',
      isSuperAdmin: true,
    };
  }

  // Check Clerk publicMetadata first
  if (metaRole === 'super_admin' || metaRole === 'admin') {
    return {
      userId: session.userId,
      email,
      role: metaRole as AdminRole,
      isSuperAdmin: metaRole === 'super_admin',
    };
  }

  // Fallback: check Supabase profiles.role (for users promoted outside Clerk)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', session.userId)
    .single();

  const dbRole = (profile?.role as string) || '';
  if (dbRole === 'super_admin' || dbRole === 'admin') {
    return {
      userId: session.userId,
      email,
      role: dbRole as AdminRole,
      isSuperAdmin: dbRole === 'super_admin',
    };
  }

  redirect('/login?error=admin_only');
}

/**
 * For API routes - returns the admin context or a NextResponse with 401/403.
 * Use this in route.ts handlers.
 */
export async function getAdminFromRequest(): Promise<{ admin: AdminContext } | { response: Response }> {
  const session = await auth();
  if (!session.userId) {
    return { response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
  }

  const user = await currentUser();
  if (!user) {
    return { response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
  }

  const email = user.emailAddresses[0]?.emailAddress || '';
  const metaRole = (user.publicMetadata?.role as string) || '';

  // OWNER_EMAILS bypass — God-mode fallback for the project owner. Mirrors
  // the same bypass in requireAdmin() above. If their Clerk publicMetadata
  // or profiles.role gets wiped, owner still gets super_admin via this path.
  if (OWNER_EMAILS.has(email)) {
    return {
      admin: {
        userId: session.userId,
        email,
        role: 'super_admin',
        isSuperAdmin: true,
      },
    };
  }

  if (metaRole === 'super_admin' || metaRole === 'admin') {
    return {
      admin: {
        userId: session.userId,
        email,
        role: metaRole as AdminRole,
        isSuperAdmin: metaRole === 'super_admin',
      },
    };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', session.userId)
    .single();

  const dbRole = (profile?.role as string) || '';
  if (dbRole === 'super_admin' || dbRole === 'admin') {
    return {
      admin: {
        userId: session.userId,
        email,
        role: dbRole as AdminRole,
        isSuperAdmin: dbRole === 'super_admin',
      },
    };
  }

  return { response: new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } }) };
}

/**
 * Canonical-user-id resolver.
 *
 * Owner-email fallback for the orphan-Clerk-session bug: when the user's
 * email is in OWNER_EMAILS and the authed Clerk user_id is not the
 * canonical profile row, return the canonical user_id. Otherwise return
 * the authed userId unchanged.
 *
 * This is the structural fix for the band-aid pattern of adding OWNER_EMAILS
 * fallback to every individual page/API. Centralize here, call from one
 * place per request, pass the result to all downstream queries.
 *
 * Returns the original userId if the lookup fails or the email doesn't match
 * OWNER_EMAILS — i.e. it never changes behavior for non-owner users.
 *
 * Usage:
 *   const userId = await resolveCanonicalUserId(authUserId, userEmail);
 *   // userId is now either authUserId (normal case) or the canonical row's
 *   // user_id (orphan session + owner email case).
 */
export async function resolveCanonicalUserId(
  authUserId: string,
  userEmail: string | null | undefined,
): Promise<string> {
  if (!userEmail || !OWNER_EMAILS.has(userEmail)) return authUserId;
  if (!authUserId) return authUserId;

  try {
    const { data: byEmail } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .ilike('email', userEmail)
      .neq('user_id', authUserId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail?.user_id) return byEmail.user_id;
  } catch {
    // Fall through — never block the request on a failed lookup
  }
  return authUserId;
}

/**
 * One-call helper: resolve canonical-user_id for the current Clerk session.
 * Reads the session + email via Clerk, then calls resolveCanonicalUserId.
 *
 * Use this at the top of every server route/page that needs to read/write
 * profiles or any FK-locked table tied to profiles.user_id.
 */
export async function getCurrentCanonicalUserId(): Promise<{ userId: string; email: string } | null> {
  const session = await auth();
  if (!session.userId) return null;
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, email);
  return { userId, email };
}
