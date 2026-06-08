import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

interface ClerkUser {
  id: string;
  email_addresses: { email_address: string }[];
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: number;
  last_sign_in_at: number | null;
  public_metadata: { role?: string };
}

interface CombinedUser {
  clerkId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'user' | 'admin' | 'super_admin';
  clerkRole: string | null;
  tier: string | null;
  subscriptionStatus: string | null;
  isFoundingMember: boolean;
  joinedAt: string;
  lastSignInAt: string | null;
}

/**
 * GET /api/admin/users
 * List all users from Clerk, enriched with profile data from Supabase.
 */
export async function GET(_req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  if (!CLERK_SECRET_KEY) {
    return NextResponse.json({ error: 'CLERK_SECRET_KEY not configured' }, { status: 500 });
  }

  // Fetch all Clerk users (paginated)
  const allClerkUsers: ClerkUser[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const r = await fetch(`https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`, {
      headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` },
    });
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ error: `Clerk API error: ${r.status} ${t}` }, { status: 502 });
    }
    const batch: ClerkUser[] = await r.json();
    allClerkUsers.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
    if (offset > 1000) break; // safety cap
  }

  // Fetch all profiles (for tier + role data)
  let allProfiles: any[] = [];
  let page = 0;
  while (true) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('user_id, role, tier, subscription_status, is_founding_member, display_name')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    allProfiles = allProfiles.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  const profileMap = new Map<string, any>(allProfiles.map((p) => [p.user_id, p]));

  const users: CombinedUser[] = allClerkUsers.map((u) => {
    const profile = profileMap.get(u.id);
    const email = u.email_addresses[0]?.email_address || '(no email)';
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || profile?.display_name || email.split('@')[0];

    const clerkRole = u.public_metadata?.role || null;
    const dbRole = profile?.role || null;
    const role: 'user' | 'admin' | 'super_admin' =
      (clerkRole as any) || (dbRole as any) || 'user';

    return {
      clerkId: u.id,
      email,
      name,
      avatarUrl: u.image_url,
      role,
      clerkRole,
      tier: profile?.tier || null,
      subscriptionStatus: profile?.subscription_status || null,
      isFoundingMember: !!profile?.is_founding_member,
      joinedAt: new Date(u.created_at).toISOString(),
      lastSignInAt: u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString() : null,
    };
  });

  // Sort by joinedAt desc
  users.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));

  // Summary stats
  const totalUsers = users.length;
  const foundingMembers = users.filter((u) => u.isFoundingMember).length;
  const activeSubs = users.filter((u) => u.subscriptionStatus === 'active').length;
  const admins = users.filter((u) => u.role !== 'user').length;

  return NextResponse.json({ users, summary: { totalUsers, foundingMembers, activeSubs, admins } });
}
