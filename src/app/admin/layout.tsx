import { requireAdmin } from '@/lib/admin-auth';
import AdminShell from '@/components/AdminShell';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const user = await currentUser();
  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || ''
    : '';
  const avatarUrl = user?.imageUrl || '';

  return (
    <AdminShell
      email={admin.email}
      role={admin.role as 'admin' | 'super_admin'}
      displayName={displayName}
      avatarUrl={avatarUrl}
    >
      {children}
    </AdminShell>
  );
}
