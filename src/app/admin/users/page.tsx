import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import UsersTable from './UsersTable';

export const dynamic = 'force-dynamic';

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

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

async function getUsers() {
  if (!CLERK_SECRET_KEY) {
    return { users: [], summary: null };
  }

  // Fetch all Clerk users (paginated)
  const allClerkUsers: ClerkUser[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const r = await fetch(`https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`, {
      headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` },
    });
    if (!r.ok) break;
    const batch: ClerkUser[] = await r.json();
    allClerkUsers.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
    if (offset > 1000) break;
  }

  // Fetch all profiles
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

  const users = allClerkUsers.map((u) => {
    const profile = profileMap.get(u.id);
    const email = u.email_addresses[0]?.email_address || '(no email)';
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || profile?.display_name || email.split('@')[0];
    const clerkRole = u.public_metadata?.role || null;
    const dbRole = profile?.role || null;
    const role: 'user' | 'admin' | 'super_admin' = (clerkRole as any) || (dbRole as any) || 'user';
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

  users.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));

  const summary = {
    totalUsers: users.length,
    foundingMembers: users.filter((u) => u.isFoundingMember).length,
    activeSubs: users.filter((u) => u.subscriptionStatus === 'active').length,
    admins: users.filter((u) => u.role !== 'user').length,
  };

  return { users, summary };
}

export default async function UsersPage() {
  const admin = await requireAdmin();
  const { users, summary } = await getUsers();

  return (
    <div>
      <div className="page-header">
        <h1><span aria-hidden="true">👥</span> Users</h1>
        <p>Manage user roles and view subscription status. Source of truth: Clerk publicMetadata.role.</p>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="admin-card p-4" style={{ marginBottom: 0 }}>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Users</div>
            <div className="text-2xl font-bold text-white">{summary.totalUsers.toLocaleString()}</div>
          </div>
          <div className="admin-card p-4" style={{ marginBottom: 0 }}>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Admins</div>
            <div className={`text-2xl font-bold ${summary.admins > 0 ? 'text-teal-400' : 'text-slate-500'}`}>
              {summary.admins.toLocaleString()}
            </div>
          </div>
          <div className="admin-card p-4" style={{ marginBottom: 0 }}>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Active Subs</div>
            <div className="text-2xl font-bold text-white">{summary.activeSubs.toLocaleString()}</div>
          </div>
          <div className="admin-card p-4" style={{ marginBottom: 0 }}>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Founding</div>
            <div className="text-2xl font-bold text-amber-400">{summary.foundingMembers.toLocaleString()}</div>
          </div>
        </div>
      )}

      <UsersTable users={users} currentUserId={admin.userId} isSuperAdmin={admin.isSuperAdmin} />
    </div>
  );
}
