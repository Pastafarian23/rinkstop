import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export type AdminRole = 'admin' | 'super_admin';

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
 *  2. Check Clerk publicMetadata.role - source of truth for fast checks
 *  3. If not set there, check profiles.role in Supabase (fallback)
 *  4. If neither has admin role, redirect to /login?error=admin_only
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
