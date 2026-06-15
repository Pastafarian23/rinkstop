import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminEvent } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

const VALID_ROLES = ['user', 'admin', 'super_admin'] as const;
type ValidRole = (typeof VALID_ROLES)[number];

/**
 * PATCH /api/admin/users/[userId]/role
 * Body: { role: 'user' | 'admin' | 'super_admin' }
 * Updates BOTH Clerk publicMetadata.role AND Supabase profiles.role.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  const admin = auth.admin;

  // Only super_admin can change roles
  if (!admin.isSuperAdmin) {
    return NextResponse.json({ error: 'Only super admins can change roles' }, { status: 403 });
  }

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const role = body.role as ValidRole;
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  // Don't let an admin demote themselves
  if (admin.userId === userId && role !== 'super_admin') {
    return NextResponse.json({ error: 'You cannot demote yourself' }, { status: 400 });
  }

  // Capture old role from the Supabase profile (or 'user' if no row yet)
  // so the audit log can show the transition.
  const { data: oldProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  const oldRole = (oldProfile?.role as string) || 'user';

  // Update Clerk publicMetadata
  if (CLERK_SECRET_KEY) {
    const r = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_metadata: { role } }),
    });
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ error: `Clerk update failed: ${r.status} ${t}` }, { status: 502 });
    }
  }

  // Update Supabase profiles.role
  const { error: dbError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      user_id: userId,
      role,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (dbError) {
    return NextResponse.json({ error: `Supabase update failed: ${dbError.message}` }, { status: 500 });
  }

  await logAdminEvent({
    admin: admin,
    request,
    action: 'role_change',
    entityType: 'user',
    entityId: userId,
    diff: { from: oldRole, to: role },
  });

  return NextResponse.json({ success: true, userId, role });
}
